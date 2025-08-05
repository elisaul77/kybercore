import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from src.services.fleet_service import fleet_service
from src.services.websocket_service import websocket_manager

logger = logging.getLogger(__name__)

class RealtimeMonitor:
    def __init__(self):
        self.monitoring = False
        self.monitor_task: Optional[asyncio.Task] = None
        self.previous_data: Dict[str, Dict] = {}
        self.last_update: Dict[str, datetime] = {}
        self.update_interval = 5.0  # Aumentado a 5 segundos para reducir carga
        self.significant_temp_change = 1.0  # Aumentado a 1°C para reducir ruido
        self._shutdown_event = asyncio.Event()
        self._max_errors = 5
        self._error_count = 0
        
    async def start_monitoring(self):
        """Inicia el monitoreo en tiempo real"""
        if self.monitoring:
            logger.warning("El monitoreo ya está activo")
            return
            
        self.monitoring = True
        self._shutdown_event.clear()
        self._error_count = 0
        logger.info("Iniciando monitoreo en tiempo real de impresoras")
        
        # Crear la tarea con nombre para mejor tracking
        self.monitor_task = asyncio.create_task(
            self._monitor_loop(), 
            name="realtime_monitor_loop"
        )
        
    async def stop_monitoring(self):
        """Detiene el monitoreo en tiempo real de forma segura"""
        logger.info("Deteniendo monitoreo en tiempo real...")
        self.monitoring = False
        self._shutdown_event.set()
        
        if self.monitor_task and not self.monitor_task.done():
            try:
                # Dar tiempo para que el loop termine naturalmente
                await asyncio.wait_for(
                    asyncio.shield(self.monitor_task), 
                    timeout=2.0
                )
            except asyncio.TimeoutError:
                logger.warning("Forzando cancelación del monitor task")
                self.monitor_task.cancel()
                try:
                    await self.monitor_task
                except asyncio.CancelledError:
                    pass
            except Exception as e:
                logger.error(f"Error deteniendo monitor: {e}")
        
        logger.info("Monitoreo en tiempo real detenido completamente")
        
    async def _monitor_loop(self):
        """Loop principal de monitoreo con control de errores mejorado"""
        logger.info("Iniciando loop de monitoreo")
        
        while self.monitoring and not self._shutdown_event.is_set():
            try:
                # Verificar si hay clientes conectados antes de procesar
                if websocket_manager.get_connection_count() == 0:
                    logger.debug("No hay clientes conectados, pausando monitoreo")
                    await asyncio.sleep(self.update_interval)
                    continue
                
                # Procesar impresoras con timeout
                await asyncio.wait_for(
                    self._check_all_printers(),
                    timeout=10.0  # Timeout de 10 segundos máximo
                )
                
                # Reset error count en operación exitosa
                self._error_count = 0
                
                # Esperar usando el evento de shutdown para respuesta rápida
                try:
                    await asyncio.wait_for(
                        self._shutdown_event.wait(),
                        timeout=self.update_interval
                    )
                    break  # Shutdown solicitado
                except asyncio.TimeoutError:
                    continue  # Timeout normal, continuar loop
                    
            except asyncio.CancelledError:
                logger.info("Monitor loop cancelado")
                break
            except asyncio.TimeoutError:
                logger.warning("Timeout en verificación de impresoras")
                self._error_count += 1
            except Exception as e:
                logger.error(f"Error en monitor loop: {e}")
                self._error_count += 1
                
                # Si hay demasiados errores, pausar monitoreo
                if self._error_count >= self._max_errors:
                    logger.error("Demasiados errores, pausando monitoreo")
                    await asyncio.sleep(30)  # Pausa larga antes de reintentar
                    self._error_count = 0
                else:
                    await asyncio.sleep(2)  # Pausa corta entre errores
                
        logger.info("Loop de monitoreo finalizado")
        
    async def _check_all_printers(self):
        """Verifica todas las impresoras con límite de tiempo"""
        try:
            # Obtener datos con timeout
            printers = await asyncio.wait_for(
                fleet_service.list_printers(),
                timeout=8.0
            )
            
            # Procesar máximo 10 impresoras por ciclo para evitar sobrecarga
            for i, printer in enumerate(printers[:10]):
                if not self.monitoring or self._shutdown_event.is_set():
                    break
                    
                await self._process_printer_data(printer)
                
                # Yield entre impresoras para no bloquear
                if i % 3 == 0:
                    await asyncio.sleep(0.1)
                
        except asyncio.TimeoutError:
            logger.warning("Timeout obteniendo lista de impresoras")
        except Exception as e:
            logger.error(f"Error verificando impresoras: {e}")
            raise
            
    async def _process_printer_data(self, printer):
        """Procesa los datos de una impresora con control de errores mejorado"""
        try:
            printer_id = printer.id
            current_time = datetime.now()
            
            # Extraer datos relevantes para comparación
            current_data = {
                'status': printer.status,
                'extruder_temp': printer.realtime_data.get('extruder_temp', 0) if printer.realtime_data else 0,
                'extruder_target': printer.realtime_data.get('extruder_target', 0) if printer.realtime_data else 0,
                'bed_temp': printer.realtime_data.get('bed_temp', 0) if printer.realtime_data else 0,
                'bed_target': printer.realtime_data.get('bed_target', 0) if printer.realtime_data else 0,
            }
            
            # Verificar si hay cambios significativos
            should_update = self._should_send_update(printer_id, current_data)
            
            if should_update:
                # Preparar datos para enviar
                update_data = {
                    'id': printer.id,
                    'name': printer.name,
                    'model': printer.model,
                    'ip': printer.ip,
                    'status': printer.status,
                    'capabilities': printer.capabilities,
                    'location': printer.location,
                    'realtime_data': printer.realtime_data or {},
                    'last_update': current_time.isoformat()
                }
                
                # Enviar actualización vía WebSocket con timeout
                try:
                    await asyncio.wait_for(
                        websocket_manager.broadcast_printer_data(printer_id, update_data),
                        timeout=2.0
                    )
                    
                    # Actualizar datos previos y timestamp solo si envío fue exitoso
                    self.previous_data[printer_id] = current_data.copy()
                    self.last_update[printer_id] = current_time
                    
                    logger.debug(f"Enviada actualización para impresora {printer.name}")
                    
                except asyncio.TimeoutError:
                    logger.warning(f"Timeout enviando actualización para {printer.name}")
                except Exception as e:
                    logger.error(f"Error enviando actualización para {printer.name}: {e}")
                    
        except Exception as e:
            logger.error(f"Error procesando datos de impresora {printer.id}: {e}")
            
    def _should_send_update(self, printer_id: str, current_data: Dict) -> bool:
        """Determina si se debe enviar una actualización basada en cambios significativos"""
        # Si es la primera vez que vemos esta impresora, siempre enviar
        if printer_id not in self.previous_data:
            return True
            
        previous = self.previous_data[printer_id]
        
        # Verificar cambio de estado
        if current_data['status'] != previous['status']:
            logger.info(f"Cambio de estado detectado en {printer_id}: {previous['status']} -> {current_data['status']}")
            return True
            
        # Verificar cambios significativos de temperatura
        temp_fields = ['extruder_temp', 'extruder_target', 'bed_temp', 'bed_target']
        for field in temp_fields:
            current_temp = current_data.get(field, 0)
            previous_temp = previous.get(field, 0)
            
            # Convertir a float para comparación segura
            try:
                current_temp = float(current_temp) if current_temp != 'N/A' else 0
                previous_temp = float(previous_temp) if previous_temp != 'N/A' else 0
                
                if abs(current_temp - previous_temp) >= self.significant_temp_change:
                    logger.debug(f"Cambio significativo de temperatura en {printer_id}.{field}: {previous_temp} -> {current_temp}")
                    return True
            except (ValueError, TypeError):
                # Si hay error en conversión, enviar actualización por seguridad
                return True
                
        # Verificar si ha pasado mucho tiempo sin actualización (forzar cada 60 segundos)
        last_update_time = self.last_update.get(printer_id, datetime.min)
        if current_data and (datetime.now() - last_update_time) > timedelta(seconds=60):
            logger.debug(f"Forzando actualización periódica para {printer_id}")
            return True
            
        return False
        
    async def force_update_all(self):
        """Fuerza una actualización completa de todas las impresoras con control de errores"""
        try:
            logger.info("Forzando actualización completa de todas las impresoras")
            self.previous_data.clear()  # Limpiar datos previos para forzar actualizaciones
            
            # Usar timeout para evitar que se cuelgue
            await asyncio.wait_for(
                self._check_all_printers(),
                timeout=15.0
            )
        except asyncio.TimeoutError:
            logger.warning("Timeout en force_update_all")
        except Exception as e:
            logger.error(f"Error en force_update_all: {e}")
        
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Retorna el estado actual del monitoreo"""
        return {
            'monitoring': self.monitoring,
            'update_interval': self.update_interval,
            'printers_monitored': len(self.previous_data),
            'last_updates': {k: v.isoformat() for k, v in self.last_update.items()},
            'websocket_connections': websocket_manager.get_connection_count(),
            'error_count': getattr(self, '_error_count', 0),
            'task_status': 'running' if self.monitor_task and not self.monitor_task.done() else 'stopped'
        }
        
    async def cleanup(self):
        """Limpieza completa del monitor"""
        logger.info("Iniciando limpieza del monitor en tiempo real")
        await self.stop_monitoring()
        self.previous_data.clear()
        self.last_update.clear()
        logger.info("Limpieza del monitor completada")

# Instancia global del monitor
realtime_monitor = RealtimeMonitor()