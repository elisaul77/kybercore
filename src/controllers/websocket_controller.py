from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.services.websocket_service import websocket_manager
from src.services.realtime_monitor import realtime_monitor
import json
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/fleet")
async def websocket_fleet_endpoint(websocket: WebSocket):
    """Endpoint WebSocket principal para monitoreo de flota con gestión mejorada"""
    client_id = None
    try:
        # Conectar cliente con timeout
        await asyncio.wait_for(
            websocket_manager.connect(websocket),
            timeout=5.0
        )
        client_id = websocket_manager.connection_metadata[websocket]['client_id']
        logger.info(f"Cliente WebSocket {client_id} conectado exitosamente")
        
        # Iniciar monitoreo si no está activo y hay clientes
        if not realtime_monitor.monitoring and websocket_manager.get_connection_count() > 0:
            await realtime_monitor.start_monitoring()
        
        # Enviar estado inicial con timeout
        try:
            await asyncio.wait_for(
                realtime_monitor.force_update_all(),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            logger.warning(f"Timeout enviando estado inicial a {client_id}")
        
        # Loop de manejo de mensajes del cliente
        while True:
            try:
                # Recibir mensaje del cliente con timeout
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=60.0  # 1 minuto timeout para recibir mensajes
                )
                
                try:
                    message = json.loads(data)
                    await handle_client_message(websocket, message)
                except json.JSONDecodeError:
                    await websocket_manager.send_personal_message({
                        'type': 'error',
                        'message': 'Formato de mensaje inválido'
                    }, websocket)
                    
            except asyncio.TimeoutError:
                # Enviar ping para mantener conexión viva
                try:
                    await websocket.ping()
                    continue
                except Exception:
                    logger.warning(f"Conexión perdida para cliente {client_id}")
                    break
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error procesando mensaje de cliente {client_id}: {e}")
                break
                
    except asyncio.TimeoutError:
        logger.warning("Timeout conectando cliente WebSocket")
    except WebSocketDisconnect:
        logger.info(f"Cliente {client_id} desconectado normalmente")
    except Exception as e:
        logger.error(f"Error en WebSocket para cliente {client_id}: {e}")
    finally:
        # Desconectar cliente de forma segura
        try:
            websocket_manager.disconnect(websocket)
            logger.info(f"Cliente {client_id} desconectado y limpiado")
        except Exception as e:
            logger.error(f"Error desconectando cliente {client_id}: {e}")
        
        # Detener monitoreo si no hay clientes conectados
        if websocket_manager.get_connection_count() == 0:
            try:
                await asyncio.wait_for(
                    realtime_monitor.stop_monitoring(),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                logger.warning("Timeout deteniendo monitoreo")
            except Exception as e:
                logger.error(f"Error deteniendo monitoreo: {e}")

async def handle_client_message(websocket: WebSocket, message: dict):
    """Maneja diferentes tipos de mensajes del cliente con timeouts"""
    message_type = message.get('type')
    
    try:
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
            # Suscribir a todas las impresoras disponibles con timeout
            from src.services.fleet_service import fleet_service
            
            try:
                printers = await asyncio.wait_for(
                    fleet_service.list_printers(),
                    timeout=8.0
                )
                
                for printer in printers:
                    await websocket_manager.subscribe_to_printer(websocket, printer.id)
                
                await websocket_manager.send_personal_message({
                    'type': 'subscription_all_confirmed',
                    'printer_count': len(printers)
                }, websocket)
                
            except asyncio.TimeoutError:
                await websocket_manager.send_personal_message({
                    'type': 'error',
                    'message': 'Timeout obteniendo lista de impresoras'
                }, websocket)
        
        elif message_type == 'ping':
            # Responder con pong para mantener conexión viva
            await websocket_manager.send_personal_message({
                'type': 'pong'
            }, websocket)
        
        elif message_type == 'get_initial_data':
            # Enviar datos iniciales de la flota
            from src.services.fleet_service import fleet_service
            
            try:
                printers = await asyncio.wait_for(
                    fleet_service.list_printers(),
                    timeout=8.0
                )
                
                # Convertir printers a diccionarios para JSON
                printers_data = []
                for printer in printers:
                    printer_dict = {
                        'id': printer.id,
                        'name': printer.name,
                        'model': printer.model,
                        'ip': printer.ip,
                        'status': printer.status,
                        'capabilities': printer.capabilities,
                        'location': printer.location,
                        'realtime_data': printer.realtime_data
                    }
                    printers_data.append(printer_dict)
                
                await websocket_manager.send_personal_message({
                    'type': 'initial_data',
                    'printers': printers_data
                }, websocket)
                
            except asyncio.TimeoutError:
                await websocket_manager.send_personal_message({
                    'type': 'error',
                    'message': 'Timeout obteniendo datos iniciales'
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
            
    except Exception as e:
        logger.error(f"Error manejando mensaje {message_type}: {e}")
        await websocket_manager.send_personal_message({
            'type': 'error',
            'message': f'Error procesando mensaje: {str(e)}'
        }, websocket)

@router.get("/ws/status")
async def get_websocket_status():
    """Endpoint REST para obtener estado de WebSockets"""
    try:
        return {
            'active_connections': websocket_manager.get_connection_count(),
            'monitoring_status': realtime_monitor.get_monitoring_status(),
            'printer_subscriptions': {
                printer_id: len(subscribers) 
                for printer_id, subscribers in websocket_manager.printer_subscriptions.items()
            }
        }
    except Exception as e:
        logger.error(f"Error obteniendo estado WebSocket: {e}")
        return {
            'error': str(e),
            'active_connections': 0,
            'monitoring_status': {'monitoring': False},
            'printer_subscriptions': {}
        }
