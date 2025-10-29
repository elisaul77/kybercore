# 🖥️ KyberCore Print Monitor Dashboard

Dashboard web en tiempo real para monitoreo de impresiones 3D con detección automática de anomalías.

![Dashboard Preview](https://via.placeholder.com/800x400/667eea/ffffff?text=KyberCore+Monitor+Dashboard)

## 🎯 Características

- **📊 Monitoreo en Tiempo Real**: Actualización cada segundo de todas las métricas
- **⚡ Detección de Anomalías**: 8 algoritmos para detectar:
  - 💥 Caídas bruscas de velocidad
  - 🚨 Atascos del extrusor
  - 🐌 Velocidad sostenida baja
  - ⚡ Pérdida de pasos (stalls)
  - 🌡️ Inestabilidad de temperatura
  - 🔴 Extrusión nula
  - 📉 Patrones erráticos
- **📈 Gráficos Interactivos**: Plotly para visualizar tendencias
- **🔔 Alertas Visuales**: Notificaciones en tiempo real con niveles de severidad
- **📊 Estadísticas de Sesión**: Contador de anomalías críticas/advertencias
- **🌐 WebSocket**: Comunicación bidireccional eficiente

## 🚀 Inicio Rápido

### Opción 1: Script Automático (Recomendado)

```bash
./start_monitor.sh
```

### Opción 2: Manual

```bash
# Instalar dependencias (solo primera vez)
pip install -r requirements.txt

# Iniciar dashboard
python3 monitor_dashboard.py
```

### Opción 3: Con Docker (Futuro)

```bash
docker-compose up monitor-dashboard
```

## 📖 Uso

1. **Iniciar el Dashboard**:
   - Abre tu navegador en `http://localhost:5000`
   - Verás el dashboard con estado "Inactivo"

2. **Iniciar Monitoreo**:
   - Click en el botón **"▶️ Iniciar"**
   - El sistema comenzará a monitorear la impresora configurada
   - Las métricas se actualizarán en tiempo real

3. **Observar Anomalías**:
   - Si el sistema detecta problemas, aparecerán en la sección "⚠️ Anomalías Detectadas"
   - Niveles de severidad:
     - 🔴 **CRÍTICO**: Requiere atención inmediata
     - 🟡 **ADVERTENCIA**: Monitorear de cerca

4. **Detener Monitoreo**:
   - Click en **"⏹️ Detener"** cuando termines

## ⚙️ Configuración

### Cambiar IP de Moonraker

Edita `monitor_dashboard.py`:

```python
MOONRAKER_URL = "http://TU_IP:7126"  # Línea 16
```

### Ajustar Intervalo de Actualización

Edita `src/services/print_monitor_service.py`:

```python
def __init__(self, moonraker_url: str, check_interval: float = 1.0):
    # check_interval = segundos entre cada lectura
```

### Sensibilidad de Detección

Edita los umbrales en `src/services/print_monitor_service.py`:

```python
# Líneas 150-160 aproximadamente
vel_drop = 15  # Caída brusca (mm/s)
avg_vel < max_velocity * 0.4  # Velocidad baja (40% del máximo)
extruder_velocity < 0.8  # Extrusor bloqueado (mm/s)
```

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│         Frontend (HTML + Socket.IO)             │
│  ┌───────────┬───────────┬─────────────────┐   │
│  │ Métricas  │  Gráficos │   Anomalías     │   │
│  └───────────┴───────────┴─────────────────┘   │
└──────────────────┬──────────────────────────────┘
                   │ WebSocket (actualización 1s)
┌──────────────────▼──────────────────────────────┐
│      Backend (Flask + SocketIO)                 │
│  ┌──────────────────────────────────────────┐  │
│  │   PrintMonitorService                    │  │
│  │   - Collect metrics (async)              │  │
│  │   - Detect anomalies (8 algorithms)      │  │
│  │   - Maintain history (60 samples)        │  │
│  └──────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │ HTTP/WebSocket
┌──────────────────▼──────────────────────────────┐
│          Moonraker API                          │
│  /printer/objects/query?motion_report           │
│  /printer/objects/query?toolhead                │
│  /printer/objects/query?print_stats             │
└─────────────────────────────────────────────────┘
```

## 📊 Métricas Monitoreadas

| Métrica | Fuente | Propósito |
|---------|--------|-----------|
| `live_velocity` | motion_report | Velocidad real del cabezal |
| `live_extruder_velocity` | motion_report | Velocidad real de extrusión |
| `live_position` | motion_report | Posición [X, Y, Z, E] |
| `stalls` | toolhead | Pérdidas de pasos |
| `max_velocity` | toolhead | Velocidad máxima configurada |
| `temperature` | extruder/heater_bed | Temperaturas actuales |
| `target` | extruder/heater_bed | Temperaturas objetivo |
| `state` | print_stats | Estado de impresión |

## 🔍 Algoritmos de Detección

### 1. Caída Brusca de Velocidad
```python
if vel_prev > 20 and (vel_prev - vel_current) > 15:
    # CRÍTICO: Posible colisión
```

### 2. Velocidad Sostenida Baja
```python
if avg_velocity < max_velocity * 0.4:
    # ADVERTENCIA: Imprimiendo muy lento
```

### 3. Extrusor Bloqueado
```python
if velocity > 15 and -0.5 < extruder_velocity < 0.8:
    # CRÍTICO: Filamento atascado
```

### 4. Pérdida de Pasos
```python
if stalls > 0:
    # CRÍTICO: Motor bloqueado
```

### 5. Temperatura Inestable
```python
if abs(temperature - target) > 8:
    # ADVERTENCIA: Temperatura fuera de rango
```

## 🛠️ Desarrollo

### Estructura de Archivos

```
KyberCore/
├── monitor_dashboard.py          # Aplicación Flask principal
├── start_monitor.sh              # Script de inicio
├── templates/
│   └── monitor_dashboard.html    # Frontend del dashboard
├── src/
│   └── services/
│       └── print_monitor_service.py  # Lógica de monitoreo
└── requirements.txt              # Dependencias
```

### Agregar Nuevos Algoritmos de Detección

Edita `src/services/print_monitor_service.py`, método `_detect_anomalies()`:

```python
def _detect_anomalies(self, metrics: Dict) -> List[Dict]:
    anomalies = []
    
    # ... algoritmos existentes ...
    
    # TU NUEVO ALGORITMO
    if condicion_de_anomalia:
        anomalies.append({
            'timestamp': metrics['timestamp'],
            'type': 'tu_tipo',
            'level': 'CRÍTICO',  # o 'ADVERTENCIA'
            'icon': '🔥',
            'title': 'TÍTULO DE LA ANOMALÍA',
            'message': 'Descripción detallada',
            'value': valor_relevante
        })
    
    return anomalies
```

### Agregar Nuevas Métricas al Dashboard

1. **Backend** (`print_monitor_service.py`):
```python
async def _collect_metrics(self):
    # Agregar nueva query
    nueva_metrica = await loop.run_in_executor(
        None, self.get_data, "/printer/objects/query?tu_objeto"
    )
    
    return {
        # ... métricas existentes ...
        'tu_nueva_metrica': nueva_metrica.get('valor'),
    }
```

2. **Frontend** (`monitor_dashboard.html`):
```javascript
function updateMetrics(metrics) {
    container.innerHTML += `
        <div class="metric">
            <span class="metric-label">Tu Métrica</span>
            <span class="metric-value">${metrics.tu_nueva_metrica}</span>
        </div>
    `;
}
```

## 🐛 Troubleshooting

### "No se puede conectar a Moonraker"

1. Verifica que Moonraker esté ejecutándose:
   ```bash
   curl http://10.10.10.71:7126/printer/info
   ```

2. Revisa la IP y puerto en `monitor_dashboard.py`

3. Verifica firewall/permisos de red

### "ModuleNotFoundError: No module named 'flask'"

Instala las dependencias:
```bash
pip install -r requirements.txt
```

### "El dashboard no muestra datos"

1. Verifica que hay una impresión activa:
   ```bash
   curl http://10.10.10.71:7126/printer/objects/query?print_stats | grep state
   ```

2. Revisa la consola del navegador (F12) para errores JavaScript

3. Revisa logs del servidor en la terminal

### "Las anomalías no se detectan"

Los umbrales pueden ser muy altos. Edita `src/services/print_monitor_service.py` y reduce los valores de detección.

## 🔮 Próximas Mejoras

- [ ] Auto-pausa en anomalías críticas
- [ ] Notificaciones push/email
- [ ] Dashboard multi-impresora
- [ ] Histórico de anomalías en base de datos
- [ ] Exportar reportes PDF
- [ ] Integración con KyberCore principal
- [ ] Machine Learning para detección adaptativa
- [ ] Modo "aprendizaje" por impresora/material

## 📝 Licencia

MIT License - Ver archivo LICENSE

## 👥 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'Agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📧 Soporte

- Issues: https://github.com/elisaul77/KyberCore/issues
- Documentación: `docs/`
- Email: [tu-email]

---

Hecho con ❤️ para la comunidad de impresión 3D
