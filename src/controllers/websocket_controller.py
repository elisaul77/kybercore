from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.services.websocket_service import websocket_manager
from src.services.realtime_monitor import realtime_monitor
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/fleet")
async def websocket_fleet_endpoint(websocket: WebSocket):
    """Endpoint WebSocket principal para monitoreo de flota"""
    client_id = None
    try:
        # Conectar cliente
        await websocket_manager.connect(websocket)
        client_id = websocket_manager.connection_metadata[websocket]['client_id']
        
        # Iniciar monitoreo si no está activo
        if not realtime_monitor.monitoring:
            await realtime_monitor.start_monitoring()
        
        # Enviar estado inicial de todas las impresoras
        await realtime_monitor.force_update_all()
        
        # Loop de manejo de mensajes del cliente
        while True:
            try:
                # Recibir mensaje del cliente
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Procesar diferentes tipos de mensajes
                await handle_client_message(websocket, message)
                
            except json.JSONDecodeError:
                await websocket_manager.send_personal_message({
                    'type': 'error',
                    'message': 'Formato de mensaje inválido'
                }, websocket)
            except Exception as e:
                logger.error(f"Error procesando mensaje de cliente {client_id}: {e}")
                
    except WebSocketDisconnect:
        logger.info(f"Cliente {client_id} desconectado")
    except Exception as e:
        logger.error(f"Error en WebSocket para cliente {client_id}: {e}")
    finally:
        # Desconectar cliente
        websocket_manager.disconnect(websocket)
        
        # Detener monitoreo si no hay clientes conectados
        if websocket_manager.get_connection_count() == 0:
            await realtime_monitor.stop_monitoring()

async def handle_client_message(websocket: WebSocket, message: dict):
    """Maneja diferentes tipos de mensajes del cliente"""
    message_type = message.get('type')
    
    if message_type == 'subscribe_printer':
        printer_id = message.get('printer_id')
        if printer_id:
            await websocket_manager.subscribe_to_printer(websocket, printer_id)
            await websocket_manager.send_personal_message({
                'type': 'subscription_confirmed',
                'printer_id': printer_id
            }, websocket)
    
    elif message_type == 'unsubscribe_printer':
        printer_id = message.get('printer_id')
        if printer_id:
            await websocket_manager.unsubscribe_from_printer(websocket, printer_id)
            await websocket_manager.send_personal_message({
                'type': 'unsubscription_confirmed',
                'printer_id': printer_id
            }, websocket)
    
    elif message_type == 'subscribe_all':
        # Suscribir a todas las impresoras disponibles
        from src.services.fleet_service import fleet_service
        printers = fleet_service.list_printers()
        for printer in printers:
            await websocket_manager.subscribe_to_printer(websocket, printer.id)
        
        await websocket_manager.send_personal_message({
            'type': 'subscription_all_confirmed',
            'printer_count': len(printers)
        }, websocket)
    
    elif message_type == 'ping':
        # Responder con pong para mantener conexión viva
        await websocket_manager.send_personal_message({
            'type': 'pong'
        }, websocket)
    
    elif message_type == 'get_status':
        # Enviar estado del monitoreo
        status = realtime_monitor.get_monitoring_status()
        await websocket_manager.send_personal_message({
            'type': 'status_response',
            'data': status
        }, websocket)
    
    else:
        await websocket_manager.send_personal_message({
            'type': 'error',
            'message': f'Tipo de mensaje desconocido: {message_type}'
        }, websocket)

@router.get("/ws/status")
async def get_websocket_status():
    """Endpoint REST para obtener estado de WebSockets"""
    return {
        'active_connections': websocket_manager.get_connection_count(),
        'monitoring_status': realtime_monitor.get_monitoring_status(),
        'printer_subscriptions': {
            printer_id: len(subscribers) 
            for printer_id, subscribers in websocket_manager.printer_subscriptions.items()
        }
    }
