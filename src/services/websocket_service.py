from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Set
import json
import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.printer_subscriptions: Dict[str, Set[WebSocket]] = {}
        self.connection_metadata: Dict[WebSocket, Dict] = {}
        self._cleanup_task = None
        self._shutdown_event = asyncio.Event()
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        """Acepta una nueva conexión WebSocket"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_metadata[websocket] = {
            'client_id': client_id or f"client_{len(self.active_connections)}_{datetime.now().timestamp()}",
            'connected_at': datetime.now(),
            'last_ping': datetime.now(),
            'subscriptions': set()
        }
        logger.info(f"Cliente conectado: {self.connection_metadata[websocket]['client_id']}")
        
        # Enviar mensaje de bienvenida
        await self.send_personal_message({
            'type': 'connection_established',
            'client_id': self.connection_metadata[websocket]['client_id'],
            'timestamp': datetime.now().isoformat()
        }, websocket)
        
        # Iniciar cleanup task solo si no existe
        if self._cleanup_task is None or self._cleanup_task.done():
            self._start_cleanup_task()
    
    def disconnect(self, websocket: WebSocket):
        """Desconecta un cliente WebSocket de forma segura"""
        if websocket in self.active_connections:
            # Remover de suscripciones de impresoras
            for printer_id, subscribers in list(self.printer_subscriptions.items()):
                subscribers.discard(websocket)
                # Limpiar suscripciones vacías
                if not subscribers:
                    del self.printer_subscriptions[printer_id]
            
            # Limpiar metadata
            client_info = self.connection_metadata.get(websocket, {})
            logger.info(f"Cliente desconectado: {client_info.get('client_id', 'unknown')}")
            
            self.active_connections.remove(websocket)
            self.connection_metadata.pop(websocket, None)
    
    async def subscribe_to_printer(self, websocket: WebSocket, printer_id: str):
        """Suscribe un cliente a actualizaciones de una impresora específica"""
        if printer_id not in self.printer_subscriptions:
            self.printer_subscriptions[printer_id] = set()
        
        self.printer_subscriptions[printer_id].add(websocket)
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]['subscriptions'].add(printer_id)
        
        logger.debug(f"Cliente suscrito a impresora: {printer_id}")
    
    async def unsubscribe_from_printer(self, websocket: WebSocket, printer_id: str):
        """Desuscribe un cliente de una impresora"""
        if printer_id in self.printer_subscriptions:
            self.printer_subscriptions[printer_id].discard(websocket)
            # Limpiar suscripciones vacías
            if not self.printer_subscriptions[printer_id]:
                del self.printer_subscriptions[printer_id]
        
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]['subscriptions'].discard(printer_id)
    
    async def broadcast_printer_data(self, printer_id: str, data: dict):
        """Envía datos de impresora a todos los clientes suscritos con timeout"""
        if printer_id not in self.printer_subscriptions:
            return
        
        message = {
            'type': 'printer_update',
            'printer_id': printer_id,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            await asyncio.wait_for(
                self._send_to_subscribers(printer_id, message),
                timeout=5.0  # Timeout de 5 segundos máximo
            )
        except asyncio.TimeoutError:
            logger.warning(f"Timeout enviando datos a suscriptores de {printer_id}")
        except Exception as e:
            logger.error(f"Error enviando broadcast para {printer_id}: {e}")
    
    async def _send_to_subscribers(self, printer_id: str, message: dict):
        """Envía mensaje a suscriptores con manejo robusto de errores"""
        disconnected_clients = []
        subscribers = list(self.printer_subscriptions.get(printer_id, set()))
        
        if not subscribers:
            return
        
        # Enviar mensajes en lotes para mejorar rendimiento
        tasks = []
        for websocket in subscribers:
            task = asyncio.create_task(
                self._send_message_safe(websocket, message),
                name=f"send_to_{self.connection_metadata.get(websocket, {}).get('client_id', 'unknown')}"
            )
            tasks.append((websocket, task))
        
        # Esperar todas las tareas con timeout individual
        for websocket, task in tasks:
            try:
                await asyncio.wait_for(task, timeout=2.0)
                # Actualizar último ping exitoso
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]['last_ping'] = datetime.now()
            except asyncio.TimeoutError:
                logger.warning(f"Timeout enviando mensaje a cliente")
                disconnected_clients.append(websocket)
                task.cancel()
            except Exception as e:
                logger.error(f"Error enviando mensaje: {e}")
                disconnected_clients.append(websocket)
        
        # Limpiar clientes desconectados
        for websocket in disconnected_clients:
            self.disconnect(websocket)
    
    async def _send_message_safe(self, websocket: WebSocket, message: dict):
        """Envía mensaje de forma segura con manejo de errores"""
        try:
            await websocket.send_text(json.dumps(message))
        except WebSocketDisconnect:
            raise  # Re-raise para manejo superior
        except Exception as e:
            logger.error(f"Error enviando mensaje a WebSocket: {e}")
            raise
    
    async def broadcast_to_all(self, message: dict):
        """Envía un mensaje a todos los clientes conectados con timeout"""
        message['timestamp'] = datetime.now().isoformat()
        disconnected_clients = []
        
        # Usar timeout para evitar bloqueos
        tasks = []
        for websocket in list(self.active_connections):
            task = asyncio.create_task(
                self._send_message_safe(websocket, message),
                name=f"broadcast_to_{self.connection_metadata.get(websocket, {}).get('client_id', 'unknown')}"
            )
            tasks.append((websocket, task))
        
        # Esperar todas las tareas con timeout
        for websocket, task in tasks:
            try:
                await asyncio.wait_for(task, timeout=2.0)
            except asyncio.TimeoutError:
                logger.warning("Timeout en broadcast a cliente")
                disconnected_clients.append(websocket)
                task.cancel()
            except Exception as e:
                logger.error(f"Error en broadcast: {e}")
                disconnected_clients.append(websocket)
        
        # Limpiar clientes desconectados
        for websocket in disconnected_clients:
            self.disconnect(websocket)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Envía un mensaje personal a un cliente específico"""
        try:
            message['timestamp'] = datetime.now().isoformat()
            await asyncio.wait_for(
                websocket.send_text(json.dumps(message)),
                timeout=3.0
            )
        except asyncio.TimeoutError:
            logger.warning("Timeout enviando mensaje personal")
            self.disconnect(websocket)
        except Exception as e:
            logger.error(f"Error enviando mensaje personal: {e}")
            self.disconnect(websocket)
    
    def get_connection_count(self) -> int:
        """Retorna el número de conexiones activas"""
        return len(self.active_connections)
    
    def get_printer_subscriber_count(self, printer_id: str) -> int:
        """Retorna el número de clientes suscritos a una impresora"""
        return len(self.printer_subscriptions.get(printer_id, set()))
    
    def _start_cleanup_task(self):
        """Inicia la tarea de limpieza automática de forma controlada"""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._shutdown_event.clear()
            self._cleanup_task = asyncio.create_task(
                self._cleanup_dead_connections(),
                name="websocket_cleanup_task"
            )
    
    async def _cleanup_dead_connections(self):
        """Tarea en segundo plano para limpiar conexiones muertas (optimizada)"""
        cleanup_interval = 60  # Aumentado a 60 segundos para reducir carga
        
        while not self._shutdown_event.is_set():
            try:
                # Verificar si hay conexiones que limpiar
                if not self.active_connections:
                    await asyncio.sleep(cleanup_interval)
                    continue
                
                # Esperar usando el evento de shutdown para respuesta rápida
                try:
                    await asyncio.wait_for(
                        self._shutdown_event.wait(),
                        timeout=cleanup_interval
                    )
                    break  # Shutdown solicitado
                except asyncio.TimeoutError:
                    # Timeout normal, proceder con limpieza
                    await self._check_and_cleanup_connections()
                    
            except asyncio.CancelledError:
                logger.info("Cleanup task cancelada")
                break
            except Exception as e:
                logger.error(f"Error en limpieza de conexiones: {e}")
                await asyncio.sleep(10)  # Pausa en caso de error
    
    async def _check_and_cleanup_connections(self):
        """Verifica y limpia conexiones muertas de forma eficiente"""
        if not self.active_connections:
            return
            
        disconnected_clients = []
        current_time = datetime.now()
        
        # Solo verificar conexiones que llevan mucho tiempo sin actividad
        for websocket in list(self.active_connections):
            try:
                metadata = self.connection_metadata.get(websocket, {})
                last_ping = metadata.get('last_ping', datetime.min)
                
                # Si lleva más de 5 minutos sin actividad, verificar estado
                if (current_time - last_ping) > timedelta(minutes=5):
                    if websocket.client_state.value != 1:  # No CONNECTED
                        disconnected_clients.append(websocket)
                        
            except Exception:
                disconnected_clients.append(websocket)
        
        # Limpiar conexiones muertas
        for websocket in disconnected_clients:
            self.disconnect(websocket)
        
        if disconnected_clients:
            logger.info(f"Limpiadas {len(disconnected_clients)} conexiones muertas")
    
    async def shutdown(self):
        """Limpieza al cerrar el servidor"""
        logger.info("Iniciando shutdown de WebSocketManager")
        
        # Señalar shutdown y esperar cleanup task
        self._shutdown_event.set()
        
        if self._cleanup_task and not self._cleanup_task.done():
            try:
                await asyncio.wait_for(self._cleanup_task, timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning("Timeout en cleanup task, forzando cancelación")
                self._cleanup_task.cancel()
                try:
                    await self._cleanup_task
                except asyncio.CancelledError:
                    pass
        
        # Cerrar todas las conexiones activas
        close_tasks = []
        for websocket in list(self.active_connections):
            try:
                task = asyncio.create_task(websocket.close(code=1000, reason="Server shutdown"))
                close_tasks.append(task)
            except Exception:
                pass
        
        # Esperar que se cierren las conexiones con timeout
        if close_tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*close_tasks, return_exceptions=True),
                    timeout=3.0
                )
            except asyncio.TimeoutError:
                logger.warning("Timeout cerrando conexiones WebSocket")
        
        self.active_connections.clear()
        self.connection_metadata.clear()
        self.printer_subscriptions.clear()
        
        logger.info("WebSocketManager shutdown completado")

# Instancia global del manager
websocket_manager = WebSocketManager()
