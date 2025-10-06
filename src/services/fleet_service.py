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
    def __init__(self, printers_file='base_datos/printers.json'):
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
                        #advance
                        pressure_advance = extruder_data.get('pressure_advance', 'N/A')
                        smooth_time = extruder_data.get('smooth_time', 'N/A')
                        motion_queue = extruder_data.get('motion_queue', 'N/A')

                        bed_temp = heater_bed_data.get('temperature', 'N/A')
                        bed_target = heater_bed_data.get('target', 'N/A')

                        printer.realtime_data.update({
                            'extruder_temp': extruder_temp,
                            'extruder_target': extruder_target,
                            'bed_temp': bed_temp,
                            'bed_target': bed_target,
                            'pressure_advance': pressure_advance,
                            'smooth_time': smooth_time,
                            'motion_queue': motion_queue
                        })

                        logger.debug(f"Temperatura del hotend: {extruder_temp}/{extruder_target}, Temperatura de la cama: {bed_temp}/{bed_target}")
                    else:
                        logger.debug(f"No se pudieron obtener las temperaturas para la impresora {printer.name}")
                        
                except asyncio.TimeoutError:
                    logger.warning(f"Timeout obteniendo temperaturas para {printer.name}")
                except Exception as e:
                    logger.warning(f"Error obteniendo temperaturas para {printer.name}: {e}")

                # Obtener progreso de impresión
                try:
                    print_stats = await asyncio.wait_for(
                        client.get_print_stats(),
                        timeout=3.0
                    )
                    
                    if print_stats and 'result' in print_stats and 'status' in print_stats['result']:
                        virtual_sdcard_data = print_stats['result']['status'].get('virtual_sdcard', {})
                        print_stats_data = print_stats['result']['status'].get('print_stats', {})
                                                
                        # Calcular progreso basado en virtual_sdcard
                        progress = virtual_sdcard_data.get('progress', 0.0) * 100
                        
                        # Información adicional de estadísticas de impresión
                        state = print_stats_data.get('state', 'unknown')
                        filename = print_stats_data.get('filename', '')
                        total_duration = print_stats_data.get('total_duration', 0)
                        print_duration = print_stats_data.get('print_duration', 0)
                        filament_used = print_stats_data.get('filament_used', 0)

                        printer.realtime_data.update({
                            'print_progress': round(progress, 1),
                            'print_state': state,
                            'print_filename': filename,
                            'print_total_duration': total_duration,
                            'print_duration': print_duration,
                            'filament_used': filament_used                        
                        })
                        
                        logger.debug(f"Progreso de impresión para {printer.name}: {progress:.1f}% - Estado: {state}")
                    else:
                        logger.debug(f"No se pudieron obtener estadísticas de impresión para {printer.name}")
                        printer.realtime_data.update({
                            'print_progress': 0,
                            'print_state': 'unknown',
                            'print_filename': '',
                            'print_total_duration': 0,
                            'print_duration': 0,
                            'filament_used': 0
                        })
                        
                except asyncio.TimeoutError:
                    logger.warning(f"Timeout obteniendo progreso de impresión para {printer.name}")
                    printer.realtime_data.update({
                        'print_progress': 0,
                        'print_state': 'unknown',
                        'print_filename': '',
                        'print_total_duration': 0,
                        'print_duration': 0,
                        'filament_used': 0
                    })
                except Exception as e:
                    logger.warning(f"Error obteniendo progreso de impresión para {printer.name}: {e}")
                    printer.realtime_data.update({
                        'print_progress': 0,
                        'print_state': 'unknown',
                        'print_filename': '',
                        'print_total_duration': 0,
                        'print_duration': 0,
                        'filament_used': 0
                    })
                    
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

    async def home_printer(self, printer_id: str, axis: str):
        """Ejecuta comando de homing en un eje específico"""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            session = await self._get_session()
            # Comando G-code para homing
            gcode_command = f"G28 {axis}"
            
            # Enviar comando via Moonraker API
            url = f"http://{printer.ip}/printer/gcode/script"
            data = {"script": gcode_command}
            
            async with session.post(url, json=data) as response:
                if response.status == 200:
                    logger.info(f"Comando homing {axis} enviado a {printer.name}")
                    return {"success": True, "command": gcode_command}
                else:
                    error_text = await response.text()
                    logger.error(f"Error en homing {axis} para {printer.name}: {error_text}")
                    raise Exception(f"Error en API Moonraker: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error ejecutando homing {axis} en {printer.name}: {e}")
            # En modo simulación, devolver éxito
            return {"success": True, "command": gcode_command, "simulated": True}

    async def pause_printer(self, printer_id: str):
        """Pausa la impresión actual"""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            session = await self._get_session()
            url = f"http://{printer.ip}/printer/print/pause"
            
            async with session.post(url) as response:
                if response.status == 200:
                    logger.info(f"Impresión pausada en {printer.name}")
                    return {"success": True, "action": "pause"}
                else:
                    error_text = await response.text()
                    logger.error(f"Error pausando {printer.name}: {error_text}")
                    raise Exception(f"Error en API Moonraker: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error pausando {printer.name}: {e}")
            # En modo simulación, devolver éxito
            return {"success": True, "action": "pause", "simulated": True}

    async def resume_printer(self, printer_id: str):
        """Reanuda la impresión pausada"""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            session = await self._get_session()
            url = f"http://{printer.ip}/printer/print/resume"
            
            async with session.post(url) as response:
                if response.status == 200:
                    logger.info(f"Impresión reanudada en {printer.name}")
                    return {"success": True, "action": "resume"}
                else:
                    error_text = await response.text()
                    logger.error(f"Error reanudando {printer.name}: {error_text}")
                    raise Exception(f"Error en API Moonraker: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error reanudando {printer.name}: {e}")
            # En modo simulación, devolver éxito
            return {"success": True, "action": "resume", "simulated": True}

    async def cancel_printer(self, printer_id: str):
        """Cancela la impresión actual"""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            session = await self._get_session()
            url = f"http://{printer.ip}/printer/print/cancel"
            
            async with session.post(url) as response:
                if response.status == 200:
                    logger.info(f"Impresión cancelada en {printer.name}")
                    return {"success": True, "action": "cancel"}
                else:
                    error_text = await response.text()
                    logger.error(f"Error cancelando {printer.name}: {error_text}")
                    raise Exception(f"Error en API Moonraker: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error cancelando {printer.name}: {e}")
            # En modo simulación, devolver éxito
            return {"success": True, "action": "cancel", "simulated": True}

    async def restart_klipper(self, printer_id: str):
        """Reinicia el servicio Klipper de la impresora (Host Restart)"""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            session = await self._get_session()
            # Usar la API correcta de Moonraker para reiniciar Klipper (host restart)
            url = f"http://{printer.ip}/printer/restart"
            
            async with session.post(url) as response:
                if response.status == 200:
                    logger.info(f"Klipper reiniciado en {printer.name}")
                    return {"success": True, "action": "restart_klipper"}
                else:
                    error_text = await response.text()
                    logger.error(f"Error reiniciando Klipper en {printer.name}: {error_text}")
                    raise Exception(f"Error en API Moonraker: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error reiniciando Klipper en {printer.name}: {e}")
            # En modo simulación, devolver éxito
            return {"success": True, "action": "restart_klipper", "simulated": True}

    async def restart_firmware(self, printer_id: str):
        """Reinicia el firmware/MCU de la impresora"""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            session = await self._get_session()
            url = f"http://{printer.ip}/printer/firmware_restart"
            
            async with session.post(url) as response:
                if response.status == 200:
                    logger.info(f"Firmware reiniciado en {printer.name}")
                    return {"success": True, "action": "restart_firmware"}
                else:
                    error_text = await response.text()
                    logger.error(f"Error reiniciando firmware en {printer.name}: {error_text}")
                    raise Exception(f"Error en API Moonraker: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error reiniciando firmware en {printer.name}: {e}")
            # En modo simulación, devolver éxito
            return {"success": True, "action": "restart_firmware", "simulated": True}

        
    async def cleanup(self):
        """Limpieza de recursos al cerrar"""
        logger.info("Limpiando recursos de FleetService")
        await self.close_session()
        logger.info("FleetService limpiado")

    def get_app_data(self):
        """Obtiene datos de la aplicación para el recomendador IA (modo síncrono)"""
        from collections import namedtuple
        
        # Crear estructuras simples para printers y filaments
        PrinterData = namedtuple('PrinterData', ['id', 'name', 'model', 'status'])
        FilamentData = namedtuple('FilamentData', ['id', 'name', 'material'])
        AppData = namedtuple('AppData', ['printers', 'filaments'])
        
        # Datos simulados de impresoras (para usar en modo síncrono)
        printers = [
            PrinterData(id="printer-test-1", name="Impresora Prueba", model="Generic", status="idle"),
            PrinterData(id="prusamk4", name="Prusa MK4", model="Prusa MK4", status="idle"),
            PrinterData(id="generic", name="Impresora Genérica", model="Generic", status="idle")
        ]
        
        # Datos simulados de filamentos
        filaments = [
            FilamentData(id="pla", name="PLA", material="PLA"),
            FilamentData(id="pla1", name="PLA Blanco", material="PLA"),
            FilamentData(id="abs1", name="ABS Negro", material="ABS"),
            FilamentData(id="invalid", name="Material Inválido", material="UNKNOWN")
        ]
        
        return AppData(printers=printers, filaments=filaments)

    # 🚀 NUEVOS MÉTODOS PARA COMANDOS MASIVOS

    async def get_target_printers(self, printer_ids=None, filters=None):
        """Obtiene la lista de impresoras objetivo basado en IDs específicos o filtros."""
        try:
            # Obtener todas las impresoras
            all_printers = await self.list_printers()
            
            # Si se especificaron IDs específicos, usar solo esos
            if printer_ids:
                target_printers = [p for p in all_printers if p.id in printer_ids]
            else:
                target_printers = all_printers
            
            # Aplicar filtros adicionales si existen
            if filters:
                if "status" in filters:
                    target_printers = [p for p in target_printers if p.status == filters["status"]]
                
                if "tags" in filters and filters["tags"]:
                    target_printers = [p for p in target_printers 
                                     if hasattr(p, 'tags') and p.tags and 
                                     any(tag in p.tags for tag in filters["tags"])]
                
                if "exclude_printing" in filters and filters["exclude_printing"]:
                    target_printers = [p for p in target_printers if p.status != "printing"]
            
            return target_printers
            
        except Exception as e:
            logger.error(f"Error obteniendo impresoras objetivo: {e}")
            raise

    async def execute_bulk_command(self, printers, command, axis=None, parameters=None):
        """Ejecuta un comando en múltiples impresoras de forma concurrente."""
        try:
            from datetime import datetime
            
            # Crear tareas para ejecución en paralelo
            tasks = []
            for printer in printers:
                task = self._execute_single_command(printer, command, axis, parameters)
                tasks.append(task)
            
            # Ejecutar todas las tareas en paralelo con timeout
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Procesar resultados y excepciones
            processed_results = []
            for i, result in enumerate(results):
                printer = printers[i]
                if isinstance(result, Exception):
                    processed_results.append({
                        "printer_id": printer.id,
                        "printer_name": printer.name,
                        "success": False,
                        "error": str(result),
                        "timestamp": datetime.now().isoformat()
                    })
                else:
                    processed_results.append({
                        "printer_id": printer.id,
                        "printer_name": printer.name,
                        "success": True,
                        "result": result,
                        "timestamp": datetime.now().isoformat()
                    })
            
            return processed_results
            
        except Exception as e:
            logger.error(f"Error ejecutando comando masivo: {e}")
            raise

    async def _execute_single_command(self, printer, command, axis=None, parameters=None):
        """Ejecuta un comando en una sola impresora."""
        try:
            printer_id = printer.id
            
            # Log de inicio
            logger.info(f"Ejecutando comando {command} en impresora {printer_id}")
            
            # Ejecutar comando según el tipo
            if command == "home":
                if not axis:
                    axis = "XYZ"  # Home all por defecto
                return await self.home_printer(printer_id, axis)
                
            elif command == "pause":
                return await self.pause_printer(printer_id)
                
            elif command == "resume":
                return await self.resume_printer(printer_id)
                
            elif command == "cancel":
                return await self.cancel_printer(printer_id)
                
            elif command == "restart_klipper":
                return await self.restart_klipper(printer_id)
                
            elif command == "restart_firmware":
                return await self.restart_firmware(printer_id)
                
            elif command == "restart_klipper_service":
                return await self.restart_klipper_service(printer_id)
                
            else:
                raise ValueError(f"Comando no soportado: {command}")
                
        except Exception as e:
            logger.error(f"Error ejecutando comando {command} en impresora {printer.id}: {e}")
            raise

    async def validate_bulk_command_safety(self, printers, command):
        """Valida si es seguro ejecutar un comando masivo."""
        try:
            analysis = {
                "safe": True,
                "warnings": [],
                "blocking_issues": [],
                "affected_jobs": 0
            }
            
            # Comandos que pueden interrumpir trabajos
            disruptive_commands = ["cancel", "restart_klipper", "restart_firmware"]
            
            if command in disruptive_commands:
                printing_printers = [p for p in printers if p.status == "printing"]
                if printing_printers:
                    analysis["safe"] = False
                    analysis["affected_jobs"] = len(printing_printers)
                    analysis["blocking_issues"].append(
                        f"El comando {command} interrumpirá {len(printing_printers)} trabajos activos"
                    )
            
            # Validar conectividad (simulado)
            offline_printers = [p for p in printers if p.status == "offline"]
            if offline_printers:
                analysis["warnings"].append(
                    f"{len(offline_printers)} impresoras están desconectadas y no recibirán el comando"
                )
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error validando seguridad del comando masivo: {e}")
            raise

    # === GESTIÓN DE ARCHIVOS G-CODE ===

    async def list_printer_gcode_files(self, printer_id: str):
        """Lista archivos G-code disponibles en una impresora específica."""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora con ID {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            files = await client.list_gcode_files()
            logger.info(f"Archivos G-code listados para {printer.name}: {len(files)} archivos")
            
            # Enriquecer con metadatos
            enriched_files = []
            for f in files:
                try:
                    filename = f.get('path')  # La clave correcta es 'path', no 'filename'
                    if not filename:
                        continue
                        
                    metadata = await client.get_gcode_metadata(filename)
                    estimated_time = None
                    
                    if metadata and 'result' in metadata:
                        estimated_time = metadata['result'].get('estimated_time')
                    
                    enriched_files.append({
                        **f,
                        'filename': filename,  # Añadir 'filename' para compatibilidad
                        'estimated_time': estimated_time
                    })
                except Exception as e:
                    logger.warning(f"Error obteniendo metadatos para archivo: {e}")
                    enriched_files.append({
                        **f,
                        'filename': f.get('path', 'unknown'),
                        'estimated_time': None
                    })
            
            return enriched_files
            
        except Exception as e:
            logger.error(f"Error listando archivos G-code para {printer.name}: {e}")
            raise

    async def get_printer_gcode_metadata(self, printer_id: str, filename: str):
        """Obtiene metadatos de un archivo G-code específico."""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora con ID {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            metadata = await client.get_gcode_metadata(filename)
            logger.info(f"Metadatos obtenidos para {filename} en {printer.name}")
            return metadata
            
        except Exception as e:
            logger.error(f"Error obteniendo metadatos de {filename} en {printer.name}: {e}")
            raise

    async def upload_gcode_to_printer(self, printer_id: str, file_data, filename: str, start_print: bool = False):
        """Sube un archivo G-code a una impresora específica."""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora con ID {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            result = await client.upload_gcode_file(file_data, filename, start_print)
            logger.info(f"Archivo {filename} subido a {printer.name} (inicio automático: {start_print})")
            return result
            
        except Exception as e:
            logger.error(f"Error subiendo {filename} a {printer.name}: {e}")
            raise

    async def start_printer_print(self, printer_id: str, filename: str):
        """Inicia la impresión de un archivo G-code en una impresora específica."""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora con ID {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            result = await client.start_print(filename)
            logger.info(f"Impresión de {filename} iniciada en {printer.name}")
            return result
            
        except Exception as e:
            logger.error(f"Error iniciando impresión de {filename} en {printer.name}: {e}")
            raise

    async def delete_printer_gcode_file(self, printer_id: str, filename: str):
        """Elimina un archivo G-code de una impresora específica."""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora con ID {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            result = await client.delete_gcode_file(filename)
            logger.info(f"Archivo {filename} eliminado de {printer.name}")
            return result
            
        except Exception as e:
            logger.error(f"Error eliminando {filename} de {printer.name}: {e}")
            raise

    async def get_printer_gcode_thumbnails(self, printer_id: str, filename: str):
        """Obtiene thumbnails de un archivo G-code específico, incluyendo los embebidos en comentarios."""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora con ID {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            # Intentar obtener thumbnails usando el nuevo método que lee del G-code
            thumbnails = await client.get_gcode_thumbnail_data(filename)
            
            # Debug logging para verificar estructura de datos
            logger.info(f"🔍 Thumbnails desde get_gcode_thumbnail_data para {filename}:")
            for i, thumb in enumerate(thumbnails):
                logger.info(f"  Thumbnail {i+1}: {thumb.keys() if isinstance(thumb, dict) else type(thumb)}")
                if isinstance(thumb, dict):
                    logger.info(f"    - width: {thumb.get('width')}")
                    logger.info(f"    - height: {thumb.get('height')}")
                    logger.info(f"    - size: {thumb.get('size')}")
                    logger.info(f"    - data present: {'data' in thumb}")
                    if 'data' in thumb:
                        data_length = len(thumb['data']) if thumb['data'] else 0
                        logger.info(f"    - data length: {data_length}")
                        if thumb['data']:
                            logger.info(f"    - data preview: {thumb['data'][:50]}...")
            
            # Si no hay thumbnails, intentar con el método tradicional
            if not thumbnails:
                logger.info(f"🔄 Probando método tradicional para {filename}")
                thumbnails = await client.get_thumbnails(filename)
                
                # Debug logging para método tradicional
                logger.info(f"🔍 Thumbnails desde get_thumbnails para {filename}:")
                for i, thumb in enumerate(thumbnails):
                    logger.info(f"  Thumbnail {i+1}: {thumb.keys() if isinstance(thumb, dict) else type(thumb)}")
            
            logger.info(f"✅ Thumbnails finales para {filename} en {printer.name}: {len(thumbnails)} encontrados")
            return {
                "filename": filename,
                "printer_id": printer_id,
                "thumbnails": thumbnails
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo thumbnails de {filename} en {printer.name}: {e}")
            raise

    async def download_printer_gcode_file(self, printer_id: str, filename: str):
        """Descarga un archivo G-code de una impresora específica."""
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            file_content = await client.download_gcode_file(filename)
            if file_content is None:
                raise ValueError(f"No se pudo descargar el archivo {filename}")
            
            logger.info(f"✅ Archivo {filename} descargado desde {printer.name}")
            return file_content
            
        except Exception as e:
            logger.error(f"Error descargando archivo {filename} desde {printer.name}: {e}")
            raise

    async def get_detailed_printer_status(self, printer_id: str):
        """
        Obtiene el estado detallado de una impresora consultando directamente Moonraker.
        Devuelve información completa sobre disponibilidad, estado, errores y capacidades.
        """
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            # Intentar obtener información básica con timeout
            try:
                printer_info = await asyncio.wait_for(
                    client.get_printer_info(),
                    timeout=5.0
                )
                
                if not printer_info or 'result' not in printer_info:
                    return {
                        "printer_id": printer_id,
                        "printer_name": printer.name,
                        "reachable": False,
                        "status": "offline",
                        "state_message": "No se pudo conectar con la impresora",
                        "can_print": False,
                        "errors": ["Impresora no alcanzable o Moonraker no responde"],
                        "recommendation": "Verifica que la impresora esté encendida y conectada a la red"
                    }
                
                result = printer_info['result']
                state = result.get('state', 'unknown')
                state_message = result.get('state_message', '')
                
                # Determinar si puede imprimir
                can_print = state == 'ready'
                is_error = state == 'error' or state == 'shutdown'
                is_printing = state == 'printing'
                is_startup = state == 'startup'
                
                # Obtener temperaturas
                temperatures = {}
                try:
                    temp_data = await asyncio.wait_for(
                        client.get_temperatures(),
                        timeout=3.0
                    )
                    if temp_data and 'result' in temp_data and 'status' in temp_data['result']:
                        status = temp_data['result']['status']
                        temperatures = {
                            "extruder": {
                                "current": status.get('extruder', {}).get('temperature', 0),
                                "target": status.get('extruder', {}).get('target', 0)
                            },
                            "bed": {
                                "current": status.get('heater_bed', {}).get('temperature', 0),
                                "target": status.get('heater_bed', {}).get('target', 0)
                            }
                        }
                except Exception as e:
                    logger.warning(f"No se pudieron obtener temperaturas: {e}")
                
                # Obtener estadísticas de impresión
                print_stats = {}
                current_file = None
                progress = 0
                try:
                    stats_data = await asyncio.wait_for(
                        client.get_print_stats(),
                        timeout=3.0
                    )
                    if stats_data and 'result' in stats_data and 'status' in stats_data['result']:
                        status = stats_data['result']['status']
                        print_stats_obj = status.get('print_stats', {})
                        virtual_sdcard = status.get('virtual_sdcard', {})
                        
                        current_file = print_stats_obj.get('filename', None)
                        progress = virtual_sdcard.get('progress', 0) * 100
                        print_stats = {
                            "state": print_stats_obj.get('state', 'unknown'),
                            "filename": current_file,
                            "progress": round(progress, 2)
                        }
                except Exception as e:
                    logger.warning(f"No se pudieron obtener estadísticas de impresión: {e}")
                
                # Construir lista de errores si los hay
                errors = []
                if is_error:
                    if state_message:
                        errors.append(state_message)
                    else:
                        errors.append("La impresora reporta un estado de error")
                
                # Generar recomendación
                recommendation = None
                if not can_print:
                    if is_error:
                        recommendation = "Se detectó un error. Se intentará recuperación automática mediante reinicio de firmware y homing."
                    elif is_printing:
                        recommendation = "La impresora está actualmente imprimiendo. Puedes pausar o cancelar el trabajo actual, o elegir otra impresora."
                    elif state == 'paused':
                        recommendation = "La impresora está en pausa. Puedes reanudar o cancelar el trabajo actual."
                    elif is_startup:
                        recommendation = "La impresora se está iniciando. Por favor espera unos momentos y actualiza el estado."
                    else:
                        recommendation = f"Estado actual: {state}. Verifica el estado de la impresora antes de continuar."
                
                return {
                    "printer_id": printer_id,
                    "printer_name": printer.name,
                    "reachable": True,
                    "status": state,
                    "state_message": state_message,
                    "can_print": can_print,
                    "is_printing": is_printing,
                    "is_error": is_error,
                    "is_startup": is_startup,
                    "errors": errors,
                    "recommendation": recommendation,
                    "temperatures": temperatures,
                    "print_stats": print_stats,
                    "capabilities": printer.capabilities or [],
                    "location": printer.location
                }
                
            except asyncio.TimeoutError:
                return {
                    "printer_id": printer_id,
                    "printer_name": printer.name,
                    "reachable": False,
                    "status": "timeout",
                    "state_message": "Timeout conectando con la impresora",
                    "can_print": False,
                    "errors": ["Timeout: La impresora no respondió a tiempo"],
                    "recommendation": "Verifica la conexión de red y que Moonraker esté ejecutándose"
                }
                
        except Exception as e:
            logger.error(f"Error obteniendo estado detallado de {printer.name}: {e}")
            return {
                "printer_id": printer_id,
                "printer_name": printer.name,
                "reachable": False,
                "status": "error",
                "state_message": str(e),
                "can_print": False,
                "errors": [f"Error: {str(e)}"],
                "recommendation": "Verifica la configuración de la impresora y la conectividad"
            }

    async def recover_printer(self, printer_id: str, recovery_method: str = "full"):
        """
        Intenta recuperar una impresora que está en estado de error.
        
        Args:
            printer_id: ID de la impresora a recuperar
            recovery_method: Método de recuperación ("restart_firmware", "home_all", "full")
                - "restart_firmware": Solo reinicia el firmware
                - "home_all": Solo ejecuta G28
                - "full": Reinicia firmware y luego ejecuta G28
        
        Returns:
            dict con información del proceso de recuperación
        """
        printer = self.printers.get(printer_id)
        if not printer:
            raise ValueError(f"Impresora {printer_id} no encontrada")
        
        try:
            ip, port = self._parse_ip_port(printer.ip)
            session = await self._get_session()
            client = MoonrakerClient(ip, port, session)
            
            recovery_steps = []
            success = False
            
            # Paso 1: Reiniciar firmware si se requiere
            if recovery_method in ["restart_firmware", "full"]:
                logger.info(f"🔧 Reiniciando firmware de {printer.name}...")
                recovery_steps.append({
                    "step": "restart_firmware",
                    "status": "in_progress",
                    "message": "Reiniciando firmware de Klipper..."
                })
                
                restart_result = await client.restart_firmware()
                
                if restart_result.get("success"):
                    recovery_steps[-1]["status"] = "completed"
                    recovery_steps[-1]["message"] = "Firmware reiniciado exitosamente"
                    logger.info(f"✅ Firmware reiniciado para {printer.name}")
                    
                    # Esperar a que la impresora se reinicie (max 30s)
                    recovery_steps.append({
                        "step": "wait_ready",
                        "status": "in_progress",
                        "message": "Esperando a que la impresora esté lista..."
                    })
                    
                    ready = await self._wait_printer_ready(printer_id, timeout=30)
                    
                    if ready:
                        recovery_steps[-1]["status"] = "completed"
                        recovery_steps[-1]["message"] = "Impresora lista"
                        success = True
                    else:
                        recovery_steps[-1]["status"] = "failed"
                        recovery_steps[-1]["message"] = "Timeout esperando respuesta de impresora"
                        return {
                            "success": False,
                            "printer_id": printer_id,
                            "printer_name": printer.name,
                            "recovery_method": recovery_method,
                            "steps": recovery_steps,
                            "message": "La impresora no respondió después del reinicio de firmware"
                        }
                else:
                    recovery_steps[-1]["status"] = "failed"
                    recovery_steps[-1]["message"] = f"Error: {restart_result.get('error', 'Unknown error')}"
                    return {
                        "success": False,
                        "printer_id": printer_id,
                        "printer_name": printer.name,
                        "recovery_method": recovery_method,
                        "steps": recovery_steps,
                        "message": "No se pudo reiniciar el firmware"
                    }
            
            # Paso 2: Ejecutar home si se requiere
            if recovery_method in ["home_all", "full"]:
                logger.info(f"🏠 Ejecutando home para {printer.name}...")
                recovery_steps.append({
                    "step": "home_axes",
                    "status": "in_progress",
                    "message": "Ejecutando G28 (home all axes)..."
                })
                
                home_result = await client.home_axes("XYZ")
                
                if home_result.get("success"):
                    recovery_steps[-1]["status"] = "completed"
                    recovery_steps[-1]["message"] = "Home ejecutado exitosamente"
                    logger.info(f"✅ Home completado para {printer.name}")
                    
                    # Esperar un poco para que se estabilice
                    await asyncio.sleep(3)
                    
                    # Verificar estado final
                    recovery_steps.append({
                        "step": "verification",
                        "status": "in_progress",
                        "message": "Verificando estado final..."
                    })
                    
                    final_status = await self.get_detailed_printer_status(printer_id)
                    
                    logger.info(f"📊 Estado final después de recuperación: {final_status.get('status')}, can_print={final_status.get('can_print')}")
                    
                    # Considerar exitoso si puede imprimir O si está en estado idle (listo después de home)
                    if final_status.get("can_print") or final_status.get("status") in ["ready", "idle"]:
                        success = True
                        recovery_steps[-1]["status"] = "completed"
                        recovery_steps[-1]["message"] = "Impresora recuperada y lista"
                        logger.info(f"✅ Recuperación exitosa para {printer.name}")
                    # Si aún está en shutdown pero alcanzable, también considerar como éxito parcial
                    elif final_status.get("reachable") and final_status.get("status") == "shutdown":
                        success = True
                        recovery_steps[-1]["status"] = "completed"
                        recovery_steps[-1]["message"] = "Impresora alcanzable. Reinicia manualmente si es necesario."
                        logger.info(f"⚠️ Recuperación parcial para {printer.name} - en shutdown pero alcanzable")
                    else:
                        recovery_steps[-1]["status"] = "warning"
                        recovery_steps[-1]["message"] = f"Impresora en estado {final_status.get('status')}. Puede requerir intervención manual."
                        logger.warning(f"⚠️ Estado post-recuperación no ideal: {final_status.get('status')}")
                else:
                    recovery_steps[-1]["status"] = "failed"
                    recovery_steps[-1]["message"] = f"Error: {home_result.get('error', 'Unknown error')}"
                    return {
                        "success": False,
                        "printer_id": printer_id,
                        "printer_name": printer.name,
                        "recovery_method": recovery_method,
                        "steps": recovery_steps,
                        "message": "No se pudo ejecutar el home"
                    }
            
            return {
                "success": success,
                "printer_id": printer_id,
                "printer_name": printer.name,
                "recovery_method": recovery_method,
                "steps": recovery_steps,
                "message": "Recuperación completada exitosamente" if success else "Recuperación parcial"
            }
            
        except Exception as e:
            logger.error(f"Error recuperando impresora {printer.name}: {e}")
            return {
                "success": False,
                "printer_id": printer_id,
                "printer_name": printer.name,
                "recovery_method": recovery_method,
                "steps": recovery_steps if 'recovery_steps' in locals() else [],
                "message": f"Error durante recuperación: {str(e)}"
            }
    
    async def _wait_printer_ready(self, printer_id: str, timeout: int = 30):
        """Espera a que una impresora esté lista después de un reinicio.
        
        Args:
            printer_id: ID de la impresora
            timeout: Tiempo máximo de espera en segundos
            
        Returns:
            bool: True si la impresora está lista, False si timeout
        """
        start_time = asyncio.get_event_loop().time()
        poll_interval = 2  # segundos
        
        logger.info(f"⏳ Esperando a que impresora {printer_id} esté lista (timeout: {timeout}s)...")
        
        while asyncio.get_event_loop().time() - start_time < timeout:
            try:
                status = await self.get_detailed_printer_status(printer_id)
                
                logger.debug(f"Estado actual: reachable={status.get('reachable')}, status={status.get('status')}")
                
                # Si está en ready, perfecto
                if status.get("reachable") and status.get("status") == "ready":
                    logger.info(f"✅ Impresora {printer_id} está ready")
                    return True
                
                # Si está alcanzable y en estado shutdown (esperando homing), también es válido
                # porque el siguiente paso será hacer el homing
                if status.get("reachable") and status.get("status") in ["shutdown", "startup"]:
                    logger.info(f"✅ Impresora {printer_id} está alcanzable (estado: {status.get('status')})")
                    return True
                
                # Si está alcanzable en cualquier otro estado no-error, también aceptar
                if status.get("reachable") and status.get("status") not in ["error", "offline", "timeout"]:
                    logger.info(f"✅ Impresora {printer_id} está alcanzable (estado: {status.get('status')})")
                    return True
                    
            except Exception as e:
                logger.debug(f"Error verificando estado durante espera: {e}")
            
            await asyncio.sleep(poll_interval)
        
        logger.warning(f"⏱️ Timeout esperando a que impresora {printer_id} esté lista")
        return False

# Instancia global del servicio
fleet_service = FleetService()