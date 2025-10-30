#!/usr/bin/env python3
"""
KyberCore - Print Monitor Dashboard
Dashboard web en tiempo real para monitoreo de impresiones
"""

# Importar eventlet antes que Flask para usar modo async
import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import asyncio
import threading
import sys
from pathlib import Path
import importlib.util

# Cargar el módulo directamente sin usar __init__.py
spec = importlib.util.spec_from_file_location(
    "print_monitor_service", 
    Path(__file__).parent / "src/services/print_monitor_service.py"
)
print_monitor_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(print_monitor_module)
get_monitor_service = print_monitor_module.get_monitor_service

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')
app.config['SECRET_KEY'] = 'kybercore-secret-key-2025'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Configuración
MOONRAKER_URL = "http://10.10.10.71:7126"
monitor_service = get_monitor_service(MOONRAKER_URL)

# Event loop para tareas async
loop = None
loop_thread = None


def start_event_loop():
    """Inicia el event loop en un thread separado"""
    global loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_forever()


def run_async(coro):
    """Ejecuta una coroutine en el event loop del thread"""
    if loop is None:
        return None
    future = asyncio.run_coroutine_threadsafe(coro, loop)
    return future.result(timeout=5)


@app.route('/')
def index():
    """Página principal del dashboard"""
    return render_template('monitor_dashboard.html')


@app.route('/api/status')
def get_status():
    """Obtiene el estado actual del monitoreo"""
    state = monitor_service.get_current_state()
    return jsonify(state)


@socketio.on('connect')
def handle_connect():
    """Cliente conectado vía WebSocket"""
    print(f'✅ Cliente conectado: {request.sid}')
    # Enviar estado actual al conectarse
    state = monitor_service.get_current_state()
    emit('status_update', state)
    
    # Auto-iniciar monitoreo si no está activo
    if not monitor_service.is_monitoring:
        try:
            result = run_async(monitor_service.start_monitoring('default'))
            if result:
                print(f'🚀 Monitoreo auto-iniciado para cliente {request.sid}')
                start_status_broadcast()
                emit('monitoring_started', {'success': True, 'auto': True})
        except Exception as e:
            print(f'⚠️ Error auto-iniciando monitoreo: {e}')


@socketio.on('disconnect')
def handle_disconnect():
    """Cliente desconectado"""
    print(f'❌ Cliente desconectado: {request.sid}')


@socketio.on('start_monitoring')
def handle_start_monitoring(data):
    """Inicia el monitoreo"""
    printer_id = data.get('printer_id', 'default')
    
    try:
        result = run_async(monitor_service.start_monitoring(printer_id))
        
        if result:
            emit('monitoring_started', {'success': True})
            # Iniciar envío periódico de updates
            start_status_broadcast()
        else:
            emit('monitoring_started', {'success': False, 'message': 'Ya hay monitoreo activo'})
    except Exception as e:
        emit('monitoring_started', {'success': False, 'message': str(e)})


@socketio.on('stop_monitoring')
def handle_stop_monitoring():
    """Detiene el monitoreo"""
    try:
        run_async(monitor_service.stop_monitoring())
        emit('monitoring_stopped', {'success': True})
    except Exception as e:
        emit('monitoring_stopped', {'success': False, 'message': str(e)})


def broadcast_status():
    """Envía el estado actual a todos los clientes conectados"""
    while monitor_service.is_monitoring:
        state = monitor_service.get_current_state()
        socketio.emit('status_update', state)
        socketio.sleep(0.5)  # Actualizar cada 0.5 segundos para tiempo real


def start_status_broadcast():
    """Inicia el broadcast de estado en un thread"""
    thread = threading.Thread(target=broadcast_status)
    thread.daemon = True
    thread.start()


if __name__ == '__main__':
    # Iniciar event loop en thread separado
    loop_thread = threading.Thread(target=start_event_loop, daemon=True)
    loop_thread.start()
    
    print("=" * 60)
    print("🖥️  KyberCore Print Monitor Dashboard")
    print("=" * 60)
    print(f"📡 Moonraker: {MOONRAKER_URL}")
    print(f"🌐 Dashboard: http://localhost:5555")
    print("=" * 60)
    print("\n✅ Servidor iniciado. Abre http://localhost:5555 en tu navegador\n")
    
    # Iniciar servidor Flask
    socketio.run(app, host='0.0.0.0', port=5555, debug=False, allow_unsafe_werkzeug=True)
