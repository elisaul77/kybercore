"""
Print Monitor Service
Monitorea impresiones en tiempo real y detecta anomalías
Proporciona datos vía API para el dashboard web
"""

import asyncio
import logging
import urllib.request
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from collections import deque

logger = logging.getLogger(__name__)


class PrintMonitorService:
    """
    Servicio de monitoreo de impresiones en tiempo real.
    Detecta atascos, colisiones y anomalías durante la impresión.
    """
    
    def __init__(self, moonraker_url: str, check_interval: float = 1.0):
        """
        Args:
            moonraker_url: URL base de Moonraker (ej: http://10.10.10.71:7126)
            check_interval: Intervalo de chequeo en segundos
        """
        self.moonraker_url = moonraker_url
        self.check_interval = check_interval
        
        # Historial de métricas (últimos 60 valores = 1 minuto)
        self.history = {
            'timestamps': deque(maxlen=60),
            'velocities': deque(maxlen=60),
            'e_velocities': deque(maxlen=60),
            'positions_e': deque(maxlen=60),
            'temperatures': deque(maxlen=60),
            'bed_temperatures': deque(maxlen=60),
        }
        
        # Estado actual
        self.current_metrics = {}
        self.anomalies = []
        self.is_monitoring = False
        self.monitor_task = None
        
        # Estadísticas de sesión
        self.session_stats = {
            'start_time': None,
            'total_anomalies': 0,
            'critical_anomalies': 0,
            'warnings': 0
        }
    
    def get_data(self, endpoint: str) -> Optional[Dict]:
        """Obtiene datos de un endpoint de Moonraker"""
        try:
            url = f"{self.moonraker_url}{endpoint}"
            with urllib.request.urlopen(url, timeout=3) as response:
                data = json.loads(response.read())
                return data.get('result', {}).get('status', {})
        except Exception as e:
            logger.error(f"Error obteniendo datos de {endpoint}: {e}")
            return None
    
    async def start_monitoring(self, printer_id: str) -> bool:
        """
        Inicia el monitoreo de una impresión.
        
        Args:
            printer_id: ID de la impresora a monitorear
            
        Returns:
            True si inició correctamente
        """
        if self.is_monitoring:
            logger.warning("Ya hay un monitoreo activo")
            return False
        
        self.is_monitoring = True
        self.session_stats['start_time'] = datetime.now()
        self.session_stats['total_anomalies'] = 0
        self.session_stats['critical_anomalies'] = 0
        self.session_stats['warnings'] = 0
        
        # Limpiar historial
        for key in self.history:
            self.history[key].clear()
        self.anomalies.clear()
        
        # Iniciar tarea de monitoreo
        self.monitor_task = asyncio.create_task(self._monitor_loop())
        
        logger.info(f"✅ Monitoreo iniciado para impresora {printer_id}")
        return True
    
    async def stop_monitoring(self):
        """Detiene el monitoreo"""
        self.is_monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("⏹️  Monitoreo detenido")
    
    async def _monitor_loop(self):
        """Loop principal de monitoreo"""
        try:
            while self.is_monitoring:
                # Obtener métricas
                metrics = await self._collect_metrics()
                
                if metrics:
                    # Actualizar estado actual
                    self.current_metrics = metrics
                    
                    # Agregar a historial
                    self._update_history(metrics)
                    
                    # Detectar anomalías
                    anomalies = self._detect_anomalies(metrics)
                    
                    if anomalies:
                        self.anomalies.extend(anomalies)
                        # Mantener solo últimas 50 anomalías
                        if len(self.anomalies) > 50:
                            self.anomalies = self.anomalies[-50:]
                        
                        # Actualizar estadísticas
                        for anomaly in anomalies:
                            self.session_stats['total_anomalies'] += 1
                            if anomaly['level'] == 'CRÍTICO':
                                self.session_stats['critical_anomalies'] += 1
                            else:
                                self.session_stats['warnings'] += 1
                
                await asyncio.sleep(self.check_interval)
                
        except asyncio.CancelledError:
            logger.info("Monitor loop cancelled")
        except Exception as e:
            logger.error(f"Error en monitor loop: {e}", exc_info=True)
            self.is_monitoring = False
    
    async def _collect_metrics(self) -> Optional[Dict]:
        """Recopila todas las métricas necesarias incluyendo datos TMC2209"""
        try:
            # Ejecutar en thread pool para no bloquear el event loop
            loop = asyncio.get_event_loop()
            
            stats = await loop.run_in_executor(None, self.get_data, "/printer/objects/query?print_stats")
            motion = await loop.run_in_executor(None, self.get_data, "/printer/objects/query?motion_report")
            toolhead = await loop.run_in_executor(None, self.get_data, "/printer/objects/query?toolhead")
            extruder = await loop.run_in_executor(None, self.get_data, "/printer/objects/query?extruder")
            bed = await loop.run_in_executor(None, self.get_data, "/printer/objects/query?heater_bed")
            
            # Obtener datos de drivers TMC2209 (hardware real)
            tmc_x = await loop.run_in_executor(None, self.get_data, "/printer/objects/query?tmc2209%20stepper_x")
            tmc_y = await loop.run_in_executor(None, self.get_data, "/printer/objects/query?tmc2209%20stepper_y")
            tmc_z = await loop.run_in_executor(None, self.get_data, "/printer/objects/query?tmc2209%20stepper_z")
            
            if not all([stats, motion, toolhead]):
                return None
            
            ps = stats.get('print_stats', {})
            m = motion.get('motion_report', {})
            th = toolhead.get('toolhead', {})
            e = extruder.get('extruder', {}) if extruder else {}
            b = bed.get('heater_bed', {}) if bed else {}
            
            # Extraer datos de TMC2209 (retroalimentación real de hardware)
            # NOTA: Solo cs_actual y stealth están disponibles. temperature=null, sg_result no existe
            tmc_data = {}
            for axis, data in [('x', tmc_x), ('y', tmc_y), ('z', tmc_z)]:
                if data:
                    tmc_info = data.get(f'tmc2209 stepper_{axis}', {})
                    drv_status = tmc_info.get('drv_status', {})
                    if drv_status is None:
                        drv_status = {}
                    
                    # Solo incluir datos que realmente existen
                    cs_actual = drv_status.get('cs_actual', 0)
                    stealth = drv_status.get('stealth', 0) == 1
                    stst = drv_status.get('stst', 0) == 1  # Standstill (motor detenido)
                    
                    tmc_data[axis] = {
                        'run_current': tmc_info.get('run_current', 0),
                        'actual_current': cs_actual,  # Corriente real (0-31)
                        'stealth_mode': stealth,  # Modo silencioso
                        'standstill': stst,  # Motor en reposo
                    }
            
            return {
                'timestamp': datetime.now().isoformat(),
                'state': ps.get('state', 'unknown'),
                'filename': ps.get('filename', ''),
                'print_duration': ps.get('print_duration', 0),
                'position': m.get('live_position', [0, 0, 0, 0]),
                'velocity': m.get('live_velocity', 0),
                'extruder_velocity': m.get('live_extruder_velocity', 0),
                'max_velocity': th.get('max_velocity', 150),
                'stalls': th.get('stalls', 0),
                'extruder_temp': e.get('temperature', 0),
                'extruder_target': e.get('target', 0),
                'bed_temp': b.get('temperature', 0),
                'bed_target': b.get('target', 0),
                'tmc_drivers': tmc_data,  # Datos reales de hardware
            }
            
        except Exception as e:
            logger.error(f"Error recopilando métricas: {e}")
            return None
    
    def _update_history(self, metrics: Dict):
        """Actualiza el historial de métricas"""
        self.history['timestamps'].append(metrics['timestamp'])
        self.history['velocities'].append(metrics['velocity'])
        self.history['e_velocities'].append(metrics['extruder_velocity'])
        self.history['positions_e'].append(metrics['position'][3])
        self.history['temperatures'].append(metrics['extruder_temp'])
        self.history['bed_temperatures'].append(metrics['bed_temp'])
    
    def _detect_anomalies(self, metrics: Dict) -> List[Dict]:
        """
        Detecta anomalías en las métricas actuales.
        
        Returns:
            Lista de anomalías detectadas
        """
        anomalies = []
        
        if metrics['state'] != 'printing':
            return anomalies
        
        if len(self.history['velocities']) < 3:
            return anomalies
        
        # 1. CAÍDA BRUSCA DE VELOCIDAD
        if len(self.history['velocities']) >= 2:
            vel_prev = list(self.history['velocities'])[-2]
            vel_current = metrics['velocity']
            vel_drop = vel_prev - vel_current
            
            if vel_prev > 20 and vel_drop > 15:
                anomalies.append({
                    'timestamp': metrics['timestamp'],
                    'type': 'velocity_drop',
                    'level': 'CRÍTICO',
                    'icon': '💥',
                    'title': 'CAÍDA DE VELOCIDAD',
                    'message': f'Bajó {vel_drop:.1f} mm/s (de {vel_prev:.1f} a {vel_current:.1f})',
                    'value': vel_drop
                })
        
        # 2. VELOCIDAD SOSTENIDA BAJA
        velocities = list(self.history['velocities'])
        avg_vel = sum(velocities) / len(velocities)
        
        if avg_vel > 5 and avg_vel < metrics['max_velocity'] * 0.4:
            anomalies.append({
                'timestamp': metrics['timestamp'],
                'type': 'low_velocity',
                'level': 'ADVERTENCIA',
                'icon': '🐌',
                'title': 'VELOCIDAD BAJA',
                'message': f'Promedio: {avg_vel:.1f} mm/s (esperado: >{metrics["max_velocity"]*0.4:.0f})',
                'value': avg_vel
            })
        
        # 3. EXTRUSOR BLOQUEADO
        if metrics['position'][3] > 50:
            if metrics['velocity'] > 15:
                if -0.5 < metrics['extruder_velocity'] < 0.8:
                    anomalies.append({
                        'timestamp': metrics['timestamp'],
                        'type': 'extruder_blocked',
                        'level': 'CRÍTICO',
                        'icon': '🚨',
                        'title': 'EXTRUSOR BLOQUEADO',
                        'message': f'Extrusor: {metrics["extruder_velocity"]:.3f} mm/s (cabezal a {metrics["velocity"]:.1f} mm/s)',
                        'value': metrics['extruder_velocity']
                    })
        
        # 4. PÉRDIDA DE PASOS
        if metrics['stalls'] > 0:
            anomalies.append({
                'timestamp': metrics['timestamp'],
                'type': 'motor_stall',
                'level': 'CRÍTICO',
                'icon': '⚡',
                'title': 'PÉRDIDA DE PASOS',
                'message': f'{metrics["stalls"]} stalls detectados - MOTOR BLOQUEADO',
                'value': metrics['stalls']
            })
        
        # 5. TEMPERATURA INESTABLE
        if metrics['extruder_target'] > 0:
            temp_diff = abs(metrics['extruder_temp'] - metrics['extruder_target'])
            if temp_diff > 8:
                anomalies.append({
                    'timestamp': metrics['timestamp'],
                    'type': 'temp_unstable',
                    'level': 'ADVERTENCIA',
                    'icon': '🌡️',
                    'title': 'TEMPERATURA INESTABLE',
                    'message': f'Diferencia de {temp_diff:.1f}°C (actual: {metrics["extruder_temp"]:.1f}°C)',
                    'value': temp_diff
                })
        
        # 6. ANÁLISIS TMC2209 (DATOS DE HARDWARE REAL)
        # IMPORTANTE: Solo cs_actual y stealth están disponibles en esta impresora
        tmc_drivers = metrics.get('tmc_drivers', {})
        
        for axis, tmc_data in tmc_drivers.items():
            # Corriente anormalmente baja (motor débil)
            run_current = tmc_data.get('run_current', 0)
            actual_current = tmc_data.get('actual_current', 0)
            
            # cs_actual es un valor de 0-31 que representa la corriente actual
            # Convertir a porcentaje: (cs_actual / 31) * 100
            if actual_current > 0 and metrics['velocity'] > 10:
                current_percent = (actual_current / 31.0) * 100
                
                if current_percent < 40:  # Menos del 40% de capacidad
                    anomalies.append({
                        'timestamp': metrics['timestamp'],
                        'type': 'low_current',
                        'level': 'ADVERTENCIA',
                        'icon': '⚡',
                        'title': f'CORRIENTE BAJA EN {axis.upper()}',
                        'message': f'Motor usando {current_percent:.1f}% de capacidad (cs_actual: {actual_current}/31)',
                        'value': current_percent
                    })
            
            # Detectar motor en standstill durante movimiento (problema)
            standstill = tmc_data.get('standstill', False)
            if standstill and metrics['velocity'] > 20:
                anomalies.append({
                    'timestamp': metrics['timestamp'],
                    'type': 'motor_standstill',
                    'level': 'CRÍTICO',
                    'icon': '🛑',
                    'title': f'MOTOR {axis.upper()} DETENIDO',
                    'message': f'Driver detecta motor en reposo pero debería moverse (vel: {metrics["velocity"]:.1f} mm/s)',
                    'value': 0
                })
        
        return anomalies
    
    def get_current_state(self) -> Dict:
        """Obtiene el estado actual del monitoreo"""
        return {
            'is_monitoring': self.is_monitoring,
            'current_metrics': self.current_metrics,
            'recent_anomalies': self.anomalies[-10:] if self.anomalies else [],
            'session_stats': {
                'start_time': self.session_stats['start_time'].isoformat() if self.session_stats['start_time'] else None,
                'total_anomalies': self.session_stats['total_anomalies'],
                'critical_anomalies': self.session_stats['critical_anomalies'],
                'warnings': self.session_stats['warnings']
            },
            'history': {
                'timestamps': list(self.history['timestamps'])[-20:],
                'velocities': list(self.history['velocities'])[-20:],
                'e_velocities': list(self.history['e_velocities'])[-20:],
                'temperatures': list(self.history['temperatures'])[-20:],
            }
        }


# Instancia global del servicio
print_monitor_service = None


def get_monitor_service(moonraker_url: str = "http://10.10.10.71:7126") -> PrintMonitorService:
    """Obtiene o crea la instancia global del servicio de monitoreo"""
    global print_monitor_service
    if print_monitor_service is None:
        print_monitor_service = PrintMonitorService(moonraker_url)
    return print_monitor_service
