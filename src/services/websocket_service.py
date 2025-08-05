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
        self._start_cleanup_task()
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        """Acepta una nueva conexión WebSocket"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_metadata[websocket] = {
            'client_id': client_id or f"client_{len(self.active_connections)}",
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
    
    def disconnect(self, websocket: WebSocket):
        """Desconecta un cliente WebSocket"""
        if websocket in self.active_connections:
            # Remover de suscripciones de impresoras
            for printer_id, subscribers in self.printer_subscriptions.items():
                subscribers.discard(websocket)
            
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
        
        logger.info(f"Cliente suscrito a impresora: {printer_id}")
    
    async def unsubscribe_from_printer(self, websocket: WebSocket, printer_id: str):
        """Desuscribe un cliente de una impresora"""
        if printer_id in self.printer_subscriptions:
            self.printer_subscriptions[printer_id].discard(websocket)
        
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]['subscriptions'].discard(printer_id)
    
    async def broadcast_printer_data(self, printer_id: str, data: dict):
        """Envía datos de impresora a todos los clientes suscritos"""
        if printer_id not in self.printer_subscriptions:
            return
        
        message = {
            'type': 'printer_update',
            'printer_id': printer_id,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        
        await self._send_to_subscribers(printer_id, message)
    
    async def _send_to_subscribers(self, printer_id: str, message: dict):
        """Envía mensaje a suscriptores con manejo robusto de errores"""
        disconnected_clients = []
        subscribers = list(self.printer_subscriptions.get(printer_id, set()))
        
        for websocket in subscribers:
            try:
                # Verificar si la conexión está viva
                if not await self._is_connection_alive(websocket):
                    disconnected_clients.append(websocket)
                    continue
                    
                await websocket.send_text(json.dumps(message))
                # Actualizar último ping exitoso
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]['last_ping'] = datetime.now()
                    
            except WebSocketDisconnect:
                logger.info(f"Cliente desconectado durante envío de datos")
                disconnected_clients.append(websocket)
            except Exception as e:
                logger.error(f"Error enviando datos a cliente: {e}")
                disconnected_clients.append(websocket)
        
        # Limpiar clientes desconectados
        for websocket in disconnected_clients:
            self.disconnect(websocket)
    
    async def _is_connection_alive(self, websocket: WebSocket) -> bool:
        """Verifica si una conexión WebSocket está viva"""
        try:
            # Enviar ping si no se ha hecho recientemente
            metadata = self.connection_metadata.get(websocket, {})
            last_ping = metadata.get('last_ping', datetime.min)
            
            if datetime.now() - last_ping > timedelta(seconds=30):
                await websocket.ping()
                metadata['last_ping'] = datetime.now()
            
            return websocket.client_state.value == 1  # CONNECTED
        except Exception:
            return False
    
    async def broadcast_to_all(self, message: dict):
        """Envía un mensaje a todos los clientes conectados"""
        message['timestamp'] = datetime.now().isoformat()
        disconnected_clients = []
        
        for websocket in self.active_connections:
            try:
                await websocket.send_text(json.dumps(message))
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
            await websocket.send_text(json.dumps(message))
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
        """Inicia la tarea de limpieza automática"""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_dead_connections())
    
    async def _cleanup_dead_connections(self):
        """Tarea en segundo plano para limpiar conexiones muertas"""
        while True:
            try:
                await asyncio.sleep(30)  # Verificar cada 30 segundos
                await self._check_and_cleanup_connections()
            except Exception as e:
                logger.error(f"Error en limpieza de conexiones: {e}")
                await asyncio.sleep(5)
    
    async def _check_and_cleanup_connections(self):
        """Verifica y limpia conexiones muertas"""
        disconnected_clients = []
        
        for websocket in list(self.active_connections):
            try:
                if not await self._is_connection_alive(websocket):
                    logger.warning(f"Conexión muerta detectada, limpiando...")
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
        if self._cleanup_task:
            self._cleanup_task.cancel()
        
        # Cerrar todas las conexiones activas
        for websocket in list(self.active_connections):
            try:
                await websocket.close()
            except Exception:
                pass
        
        self.active_connections.clear()
        self.connection_metadata.clear()
        self.printer_subscriptions.clear()

# Instancia global del manager
websocket_manager = WebSocketManager()
