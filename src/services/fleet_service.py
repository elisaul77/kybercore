import uuid
import json
import os
import asyncio
import aiohttp
from src.models.printer import Printer
from src.schemas.printer import PrinterCreate
from src.services.moonraker_client import MoonrakerClient
import logging

# Configuración del logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FleetService:
    def __init__(self, printers_file='printers.json'):
        self.printers_file = printers_file
        self.printers = self._load_printers()
        self._session = None
        self._session_timeout = aiohttp.ClientTimeout(
            total=10,  # Timeout total de 10 segundos
            connect=3,  # Timeout de conexión de 3 segundos
            sock_read=5  # Timeout de lectura de 5 segundos
        )

    async def _get_session(self):
        """Obtiene o crea una sesión HTTP reutilizable"""
        if self._session is None or self._session.closed:
            connector = aiohttp.TCPConnector(
                limit=10,  # Máximo 10 conexiones concurrentes
                limit_per_host=5,  # Máximo 5 por host
                ttl_dns_cache=300,  # Cache DNS por 5 minutos
                use_dns_cache=True,
            )
            self._session = aiohttp.ClientSession(
                timeout=self._session_timeout,
                connector=connector
            )
        return self._session

    async def close_session(self):
        """Cierra la sesión HTTP de forma segura"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    def _load_printers(self):
        if os.path.exists(self.printers_file):
            try:
                with open(self.printers_file, 'r') as f:
                    printers_data = json.load(f)
                    return {p_id: Printer(**p_data) for p_id, p_data in printers_data.items()}
            except Exception as e:
                logger.error(f"Error cargando impresoras: {e}")
                return {}
        return {}

    def _save_printers(self):
        try:
            with open(self.printers_file, 'w') as f:
                printers_to_save = {p_id: p.model_dump(exclude={'realtime_data'}) for p_id, p in self.printers.items()}
                json.dump(printers_to_save, f, indent=4)
        except Exception as e:
            logger.error(f"Error guardando impresoras: {e}")

    async def list_printers(self):
        """Lista las impresoras y enriquece sus datos con el estado de Moonraker."""
        printers_list = list(self.printers.values())
        
        if not printers_list:
            return printers_list
        
        session = await self._get_session()
        
        # Procesar impresoras en lotes para evitar sobrecarga
        batch_size = 5
        for i in range(0, len(printers_list), batch_size):
            batch = printers_list[i:i + batch_size]
            tasks = [self._update_printer_status(printer, session) for printer in batch]
            
            try:
                # Ejecutar lote con timeout global
                await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=15.0
                )
            except asyncio.TimeoutError:
                logger.warning(f"Timeout procesando lote de impresoras {i}-{i+batch_size}")
            except Exception as e:
                logger.error(f"Error procesando lote de impresoras: {e}")
        
        return printers_list

    async def _update_printer_status(self, printer, session):
        """Actualiza el estado de una impresora con manejo de errores mejorado"""
        ip, port = self._parse_ip_port(printer.ip)
        logger.debug(f"Conectando a la impresora {printer.name} en {ip}:{port}")
        
        client = MoonrakerClient(ip, port, session)
        
        try:
            # Obtener información básica con timeout
            printer_info = await asyncio.wait_for(
                client.get_printer_info(), 
                timeout=5.0
            )
            
            if printer_info and 'result' in printer_info:
                logger.debug(f"Estado de la impresora {printer.name}: {printer_info['result'].get('state', 'unknown')}")
                printer.status = printer_info['result'].get('state', 'unknown')
                printer.realtime_data = printer_info['result']

                # Obtener temperaturas con timeout separado
                try:
                    temperatures = await asyncio.wait_for(
                        client.get_temperatures(),
                        timeout=3.0
                    )
                    
                    if temperatures and 'result' in temperatures and 'status' in temperatures['result']:
                        extruder_data = temperatures['result']['status'].get('extruder', {})
                        heater_bed_data = temperatures['result']['status'].get('heater_bed', {})

                        extruder_temp = extruder_data.get('temperature', 'N/A')
                        extruder_target = extruder_data.get('target', 'N/A')
                        bed_temp = heater_bed_data.get('temperature', 'N/A')
                        bed_target = heater_bed_data.get('target', 'N/A')

                        printer.realtime_data.update({
                            'extruder_temp': extruder_temp,
                            'extruder_target': extruder_target,
                            'bed_temp': bed_temp,
                            'bed_target': bed_target
                        })

                        logger.debug(f"Temperatura del hotend: {extruder_temp}/{extruder_target}, Temperatura de la cama: {bed_temp}/{bed_target}")
                    else:
                        logger.debug(f"No se pudieron obtener las temperaturas para la impresora {printer.name}")
                        
                except asyncio.TimeoutError:
                    logger.warning(f"Timeout obteniendo temperaturas para {printer.name}")
                except Exception as e:
                    logger.warning(f"Error obteniendo temperaturas para {printer.name}: {e}")
                    
            else:
                logger.warning(f"No se pudo conectar a la impresora {printer.name} en {ip}:{port}")
                printer.status = "unreachable"
                printer.realtime_data = None
                
        except asyncio.TimeoutError:
            logger.warning(f"Timeout conectando a impresora {printer.name}")
            printer.status = "timeout"
            printer.realtime_data = None
        except Exception as e:
            logger.error(f"Error conectando a impresora {printer.name}: {e}")
            printer.status = "error"
            printer.realtime_data = None
        finally:
            # Asegurar que realtime_data siempre existe
            if not hasattr(printer, 'realtime_data') or printer.realtime_data is None:
                printer.realtime_data = {}

    def _parse_ip_port(self, ip_field):
        """Extrae IP y puerto del campo ip. Si no hay puerto, usa 7125 por defecto."""
        if ':' in ip_field:
            ip, port = ip_field.split(':')
            return ip, int(port)
        return ip_field, 7125

    async def get_printer(self, printer_id):
        """Obtiene una impresora específica y actualiza su estado"""
        printer = self.printers.get(printer_id)
        if printer:
            session = await self._get_session()
            try:
                await asyncio.wait_for(
                    self._update_printer_status(printer, session),
                    timeout=8.0
                )
            except asyncio.TimeoutError:
                logger.warning(f"Timeout actualizando impresora {printer_id}")
            except Exception as e:
                logger.error(f"Error actualizando impresora {printer_id}: {e}")
        return printer

    def add_printer(self, printer_data: PrinterCreate):
        """Agrega una nueva impresora"""
        printer_id = str(uuid.uuid4())
        printer = Printer(id=printer_id, **printer_data.model_dump())
        self.printers[printer_id] = printer
        self._save_printers()
        return printer

    def update_printer(self, printer_id, printer_data: PrinterCreate):
        """Actualiza una impresora existente"""
        if printer_id in self.printers:
            printer = self.printers[printer_id]
            update_data = printer_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(printer, key, value)
            self._save_printers()
            return printer
        return None

    def delete_printer(self, printer_id):
        """Elimina una impresora"""
        if printer_id in self.printers:
            deleted_printer = self.printers.pop(printer_id)
            self._save_printers()
            return deleted_printer
        return None
        
    async def cleanup(self):
        """Limpieza de recursos al cerrar"""
        logger.info("Limpiando recursos de FleetService")
        await self.close_session()
        logger.info("FleetService limpiado")

# Instancia global del servicio
fleet_service = FleetService()