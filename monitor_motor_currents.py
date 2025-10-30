#!/usr/bin/env python3
"""
Monitor de Corrientes de Motores TMC2209 con Gráficas en Tiempo Real
=====================================================================
Muestra gráficas de corriente (cs_actual) de motores X, Y, Z, E en tiempo real.
"""

from flask import Flask, render_template
from flask_socketio import SocketIO
import eventlet
eventlet.monkey_patch()

import requests
import time
from datetime import datetime
from collections import deque
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kybercore_motors_2024'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

MOONRAKER_URL = "http://10.10.10.71:7126"
MAX_DATA_POINTS = 100  # Últimos 100 puntos en gráfica

# Almacenamiento de histórico
motor_history = {
    'X': deque(maxlen=MAX_DATA_POINTS),
    'Y': deque(maxlen=MAX_DATA_POINTS),
    'Z': deque(maxlen=MAX_DATA_POINTS),
    'E': deque(maxlen=MAX_DATA_POINTS),
}

time_history = deque(maxlen=MAX_DATA_POINTS)

def get_tmc_data():
    """Obtiene datos de corriente de todos los motores TMC2209"""
    try:
        # Consultar todos los TMC2209
        url = f"{MOONRAKER_URL}/printer/objects/query?tmc2209%20stepper_x&tmc2209%20stepper_y&tmc2209%20stepper_z&tmc2209%20extruder"
        response = requests.get(url, timeout=2)
        data = response.json()['result']['status']
        
        motors = {}
        
        # Motor X
        tmc_x = data.get('tmc2209 stepper_x', {})
        drv_x = tmc_x.get('drv_status', {}) or {}
        motors['X'] = {
            'cs_actual': drv_x.get('cs_actual', 0),
            'run_current': tmc_x.get('run_current', 0.608),
            'stealth': drv_x.get('stealth', 0),
        }
        
        # Motor Y
        tmc_y = data.get('tmc2209 stepper_y', {})
        drv_y = tmc_y.get('drv_status', {}) or {}
        motors['Y'] = {
            'cs_actual': drv_y.get('cs_actual', 0),
            'run_current': tmc_y.get('run_current', 0.608),
            'stealth': drv_y.get('stealth', 0),
        }
        
        # Motor Z
        tmc_z = data.get('tmc2209 stepper_z', {})
        drv_z = tmc_z.get('drv_status', {}) or {}
        motors['Z'] = {
            'cs_actual': drv_z.get('cs_actual', 0),
            'run_current': tmc_z.get('run_current', 0.608),
            'stealth': drv_z.get('stealth', 0),
        }
        
        # Motor Extrusor
        tmc_e = data.get('tmc2209 extruder', {})
        drv_e = tmc_e.get('drv_status', {}) or {}
        motors['E'] = {
            'cs_actual': drv_e.get('cs_actual', 0),
            'run_current': tmc_e.get('run_current', 0.5),
            'stealth': drv_e.get('stealth', 0),
        }
        
        return motors
        
    except Exception as e:
        print(f"Error obteniendo datos TMC: {e}")
        return None

def get_motion_data():
    """Obtiene datos de movimiento para contexto"""
    try:
        url = f"{MOONRAKER_URL}/printer/objects/query?motion_report&print_stats"
        response = requests.get(url, timeout=2)
        data = response.json()['result']['status']
        
        motion = data.get('motion_report', {})
        print_stats = data.get('print_stats', {})
        
        return {
            'velocity': motion.get('live_velocity', 0),
            'extruder_velocity': motion.get('live_extruder_velocity', 0),
            'state': print_stats.get('state', 'standby'),
        }
    except Exception as e:
        print(f"Error obteniendo motion: {e}")
        return None

def monitor_loop():
    """Loop principal de monitoreo"""
    print("🔄 Monitor loop iniciado")
    while True:
        try:
            # Obtener datos
            tmc_data = get_tmc_data()
            motion_data = get_motion_data()
            
            if not tmc_data:
                print("⚠️  No se pudieron obtener datos TMC")
                eventlet.sleep(1)
                continue
                
            if not motion_data:
                print("⚠️  No se pudieron obtener datos de movimiento")
                eventlet.sleep(1)
                continue
            
            if tmc_data and motion_data:
                current_time = datetime.now().strftime('%H:%M:%S')
                time_history.append(current_time)
                
                # Almacenar histórico
                for motor in ['X', 'Y', 'Z', 'E']:
                    cs_actual = tmc_data[motor]['cs_actual']
                    motor_history[motor].append(cs_actual)
                
                # Preparar datos para enviar
                chart_data = {
                    'time': list(time_history),
                    'motors': {
                        'X': list(motor_history['X']),
                        'Y': list(motor_history['Y']),
                        'Z': list(motor_history['Z']),
                        'E': list(motor_history['E']),
                    }
                }
                
                # Datos actuales
                current_data = {
                    'X': {
                        'cs_actual': tmc_data['X']['cs_actual'],
                        'percentage': round(tmc_data['X']['cs_actual'] / 31 * 100, 1),
                        'run_current': tmc_data['X']['run_current'],
                        'stealth': bool(tmc_data['X']['stealth']),
                    },
                    'Y': {
                        'cs_actual': tmc_data['Y']['cs_actual'],
                        'percentage': round(tmc_data['Y']['cs_actual'] / 31 * 100, 1),
                        'run_current': tmc_data['Y']['run_current'],
                        'stealth': bool(tmc_data['Y']['stealth']),
                    },
                    'Z': {
                        'cs_actual': tmc_data['Z']['cs_actual'],
                        'percentage': round(tmc_data['Z']['cs_actual'] / 31 * 100, 1),
                        'run_current': tmc_data['Z']['run_current'],
                        'stealth': bool(tmc_data['Z']['stealth']),
                    },
                    'E': {
                        'cs_actual': tmc_data['E']['cs_actual'],
                        'percentage': round(tmc_data['E']['cs_actual'] / 31 * 100, 1),
                        'run_current': tmc_data['E']['run_current'],
                        'stealth': bool(tmc_data['E']['stealth']),
                    },
                }
                
                # Contexto de movimiento
                motion_context = {
                    'velocity': round(motion_data['velocity'], 2),
                    'extruder_velocity': round(motion_data['extruder_velocity'], 2),
                    'state': motion_data['state'],
                }
                
                # Log de datos antes de emitir
                print(f"📊 [{current_time}] X:{current_data['X']['cs_actual']}/31 Y:{current_data['Y']['cs_actual']}/31 Z:{current_data['Z']['cs_actual']}/31 E:{current_data['E']['cs_actual']}/31")
                
                # Emitir datos
                socketio.emit('motor_update', {
                    'chart': chart_data,
                    'current': current_data,
                    'motion': motion_context,
                    'timestamp': current_time,
                })
            
            eventlet.sleep(0.5)  # Actualizar cada 0.5s
            
        except Exception as e:
            print(f"❌ Error en monitor loop: {e}")
            import traceback
            traceback.print_exc()
            eventlet.sleep(1)

@app.route('/')
def index():
    return render_template('motor_currents.html')

@socketio.on('connect')
def handle_connect():
    print(f"✅ Cliente conectado")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"❌ Cliente desconectado")

@socketio.on('start_monitor')
def handle_start():
    print("🚀 Iniciando monitoreo de motores...")

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🔌 Monitor de Corrientes TMC2209")
    print("="*60)
    print(f"📡 Moonraker: {MOONRAKER_URL}")
    print(f"🌐 Dashboard: http://localhost:5556")
    print("="*60)
    print("\n✅ Servidor iniciado. Abre http://localhost:5556 en tu navegador\n")
    
    # Iniciar loop de monitoreo en background
    socketio.start_background_task(monitor_loop)
    
    # Iniciar servidor
    socketio.run(app, host='0.0.0.0', port=5556, debug=False)
