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
        self.update_interval = 1.0  # 1 segundo
        self.significant_temp_change = 0.1  # 0.1°C diferencia mínima para enviar update
        
    async def start_monitoring(self):
        """Inicia el monitoreo en tiempo real"""
        if self.monitoring:
            logger.warning("El monitoreo ya está activo")
            return
            
        self.monitoring = True
        logger.info("Iniciando monitoreo en tiempo real de impresoras")
        self.monitor_task = asyncio.create_task(self._monitor_loop())
        
    async def stop_monitoring(self):
        """Detiene el monitoreo en tiempo real"""
        self.monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Monitoreo en tiempo real detenido")
        
    async def _monitor_loop(self):
        """Loop principal de monitoreo"""
        while self.monitoring:
            try:
                await self._check_all_printers()
                await asyncio.sleep(self.update_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error en monitor loop: {e}")
                await asyncio.sleep(self.update_interval)
                
    async def _check_all_printers(self):
        """Verifica todas las impresoras y envía actualizaciones si hay cambios"""
        try:
            # Obtener datos actuales de todas las impresoras
            printers = fleet_service.list_printers()
            
            for printer in printers:
                await self._process_printer_data(printer)
                
        except Exception as e:
            logger.error(f"Error verificando impresoras: {e}")
            
    async def _process_printer_data(self, printer):
        """Procesa los datos de una impresora y envía actualizaciones si hay cambios"""
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
            
            # Enviar actualización vía WebSocket
            await websocket_manager.broadcast_printer_data(printer_id, update_data)
            
            # Actualizar datos previos y timestamp
            self.previous_data[printer_id] = current_data.copy()
            self.last_update[printer_id] = current_time
            
            logger.debug(f"Enviada actualización para impresora {printer.name}")
            
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
                
        # Verificar si ha pasado mucho tiempo sin actualización (forzar cada 30 segundos)
        last_update_time = self.last_update.get(printer_id, datetime.min)
        if current_data and (datetime.now() - last_update_time) > timedelta(seconds=30):
            logger.debug(f"Forzando actualización periódica para {printer_id}")
            return True
            
        return False
        
    async def force_update_all(self):
        """Fuerza una actualización completa de todas las impresoras"""
        logger.info("Forzando actualización completa de todas las impresoras")
        self.previous_data.clear()  # Limpiar datos previos para forzar actualizaciones
        await self._check_all_printers()
        
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Retorna el estado actual del monitoreo"""
        return {
            'monitoring': self.monitoring,
            'update_interval': self.update_interval,
            'printers_monitored': len(self.previous_data),
            'last_updates': {k: v.isoformat() for k, v in self.last_update.items()},
            'websocket_connections': websocket_manager.get_connection_count()
        }

# Instancia global del monitor
realtime_monitor = RealtimeMonitor()
