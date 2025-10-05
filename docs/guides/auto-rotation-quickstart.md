# Guía Rápida: Sistema de Auto-Rotación Backend-Centric

## 🚀 Inicio Rápido

### Para Usuarios

1. **Abrir proyecto** en la galería
2. **Click en "Imprimir"** para abrir el wizard
3. **Completar pasos 1-4** (selección, material, modo, impresora)
4. **En Step 5 (STL Processing)**:
   - ✅ Activar checkbox "Habilitar Auto-Rotación"
   - 🎚️ Ajustar umbral con el slider (0-20%)
   - 🔘 Seleccionar método (dejar en "auto" o "gradient_descent")
5. **Click "Iniciar Procesamiento"**
6. **Ver progreso en tiempo real** (0% → 100%)
7. **Sistema procesa automáticamente** (paralelo, con retry)
8. **Revisar resultados** cuando completa

### Para Desarrolladores

```bash
# 1. Verificar servicios activos
docker ps | grep -E "kybercore|apislicer"

# 2. Ver logs del worker en tiempo real
docker logs -f kybercore | grep RotationWorker

# 3. Ver logs generales
docker compose logs -f kybercore

# 4. Probar endpoint de procesamiento
curl -X POST http://localhost:8000/api/print/process-with-rotation \
  -H "Content-Type: application/json" \
  -d '{
    "rotation_config": {
      "enabled": true,
      "method": "gradient_descent",
      "threshold": 5.0
    },
    "profile_config": {
      "filament_type": "PLA",
      "nozzle_temp": 210
    }
  }'

# 5. Consultar estado de tarea
curl http://localhost:8000/api/print/task-status/{task_id}

# 6. Verificar archivos procesados
ls -lh /tmp/kybercore_processing/temp_*/

# 7. Ver sesiones activas
cat base_datos/wizard_sessions.json | jq
```

---

## 📂 Archivos Clave

### Backend (Python)
```
src/
├── services/
│   └── rotation_worker.py                # Worker principal (573 líneas)
│       ├── RotationWorker class
│       ├── process_batch()               # Orquestador principal
│       ├── _process_single_file()        # Pipeline: rotate → slice → save
│       ├── _rotate_file_with_retry()     # Retry automático (3x)
│       └── _slice_file_with_retry()      # Retry automático (3x)
│
├── models/
│   └── task_models.py                    # Modelos de tracking (115 líneas)
│       ├── TaskStatusEnum
│       ├── TaskProgress
│       ├── FileProcessingResult
│       └── TaskStatus
│
├── controllers/
│   └── print_flow_controller.py
│       ├── process_with_rotation()       # Línea 970 - Inicia procesamiento
│       ├── get_task_status()             # Línea 1052 - Polling endpoint
│       ├── get_gcode_files()             # Línea 2298 - Lista G-code
│       └── get_gcode_content()           # Línea 2390 - Content viewer
│
└── api/
    └── main.py
        └── load_dotenv()                 # Carga .env

### Frontend (JavaScript)
```
src/web/static/js/modules/gallery/
└── project_modal.js
    ├── startSTLProcessingV2()            # Línea 1562 - Función principal V2
    ├── pollTaskProgress()                # Línea 1722 - Polling cada 2s
    └── updateProgressUI()                # Actualización de UI

### APISLICER (Servicio Externo)
```
APISLICER/app/
└── main.py
    ├── auto_rotate_stl_upload()          # Rotación con algoritmos
    ├── slice()                           # Generación de G-code
    ├── find_optimal_rotation_gradient()  # Gradient Descent
    └── calculate_contact_area()          # Cálculo de área

### Configuración
```
.env                                      # Variables de entorno
.env.example                              # Template
docker-compose.yml                        # Docker config
requirements.txt                          # Dependencias Python

---

## 🔧 Configuración

### Variables de Entorno (.env)

```bash
# ===== ROTATION WORKER CONFIGURATION =====
ROTATION_WORKER_POOL_SIZE=3        # Archivos simultáneos (default: 3)
ROTATION_MAX_RETRIES=3             # Reintentos por archivo (default: 3)
ROTATION_RETRY_DELAY=2             # Segundos entre reintentos (default: 2)
ENABLE_BACKEND_ROTATION=true       # Habilitar V2 (default: true)

# ===== APISLICER CONFIGURATION =====
APISLICER_BASE_URL=http://apislicer:8000
APISLICER_TIMEOUT=60               # Timeout en segundos
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  kybercore:
    env_file:
      - .env
    environment:
      - PYTHONUNBUFFERED=1
    ports:
      - "8000:8000"
  
  apislicer:
    environment:
      - PYTHONUNBUFFERED=1
      - DISPLAY=:99
    ports:
      - "8001:8000"
```

### Ajuste de Performance

**Para más throughput** (si tienes CPU potente):
```bash
# .env
ROTATION_WORKER_POOL_SIZE=5
```

**Para más confiabilidad** (si APISLICER es inestable):
```bash
# .env
ROTATION_MAX_RETRIES=5
ROTATION_RETRY_DELAY=3
```

**Para archivos grandes**:
```bash
# .env
APISLICER_TIMEOUT=120
```

---

## 🧪 Testing y Debugging

### Test 1: Probar Procesamiento Completo

```bash
# En navegador: abrir proyecto → wizard → Step 5
# Activar auto-rotación, click "Iniciar Procesamiento"
# Ver logs en tiempo real:
docker logs -f kybercore | grep -E "RotationWorker|Progreso"

# Deberías ver:
# [RotationWorker] 🚀 Iniciando procesamiento de batch
# [RotationWorker] ⚙️ Procesando archivo 1/2: Cover_USB.stl
# [RotationWorker] ✅ Rotación exitosa: Cover_USB.stl (Mejora: 22.76%)
# [RotationWorker] ✅ Laminado exitoso: Cover_USB.stl (51KB)
# [RotationWorker] 📊 Progreso actualizado: 50.0% (1/2 completados)
# [RotationWorker] ✅ Batch completado exitosamente
```

### Test 2: Verificar Archivos Generados

```bash
# Listar archivos procesados
ls -lh /tmp/kybercore_processing/temp_*/

# Deberías ver:
# drwxr-xr-x  temp_1_20251005_150251/
#   ├── gcode_temp_1_..._Cover_USB.gcode      (51KB)
#   ├── gcode_temp_1_..._back_frame.gcode     (2.8MB)
#   ├── rotated_Cover_USB.stl                 (archivo rotado)
#   └── rotated_back_frame.stl                (archivo rotado)

# Verificar contenido de G-code
head -50 /tmp/kybercore_processing/temp_*/gcode_*.gcode
```

### Test 3: Verificar Estado de Tarea

```bash
# Obtener task_id del frontend (consola del navegador)
TASK_ID="task_ad945e5c-1e94-48a3-89a1-e89830106e2d"

# Consultar estado
curl -s http://localhost:8000/api/print/task-status/$TASK_ID | jq

# Response esperado:
{
  "task_id": "task_ad945e5c...",
  "status": "completed",
  "progress": {
    "total_files": 2,
    "completed": 2,
    "failed": 0,
    "percentage": 100.0
  },
  "results": [
    {
      "filename": "Cover_USB.stl",
      "success": true,
      "rotation_applied": {
        "x": 180.0,
        "y": 0.0,
        "z": 0.0,
        "improvement_percent": 22.76
      }
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Problema: "Task not found"

```bash
# Causa: task_id incorrecto o servidor reiniciado
# Solución: Reiniciar procesamiento desde wizard

# Verificar logs:
docker logs kybercore | grep "task_"
```

### Problema: "Proyecto no encontrado"

```bash
# Causa: Session referencia proyecto inexistente
# Verificar proyectos disponibles:
cat base_datos/proyectos.json | jq '.proyectos[].id'

# Verificar session:
cat base_datos/wizard_sessions.json | jq '.["temp_1_..."].project_id'
```

### Problema: "APISLICER timeout"

```bash
# Verificar que APISLICER está corriendo:
docker ps | grep apislicer
curl http://localhost:8001/health

# Aumentar timeout en .env:
APISLICER_TIMEOUT=120

# Reducir concurrencia:
ROTATION_WORKER_POOL_SIZE=1

# Reiniciar:
docker compose restart kybercore
```

### Problema: "403 Forbidden en G-code viewer"

```bash
# Causa: Archivo fuera de directorio permitido
# Verificar ubicación:
docker exec kybercore ls -la /tmp/kybercore_processing/

# Verificar logs:
docker logs kybercore | grep "gcode-content"
```

### Problema: Procesamiento muy lento

```bash
# Ver configuración actual:
docker exec kybercore env | grep ROTATION

# Aumentar pool size (más CPU):
# En .env:
ROTATION_WORKER_POOL_SIZE=5
ROTATION_MAX_RETRIES=2

# Reiniciar:
docker compose restart kybercore
```

---

## 📊 Monitoreo

### Logs del Worker

```bash
# Ver procesamiento en tiempo real
docker logs -f kybercore | grep RotationWorker

# Logs importantes:
# [RotationWorker] 🚀 Iniciando procesamiento de batch
# [RotationWorker] ⚙️ Procesando archivo 1/2: filename.stl
# [RotationWorker] ✅ Rotación exitosa: filename.stl (Mejora: 22.76%)
# [RotationWorker] 📊 Progreso actualizado: 50.0% (1/2 completados)
# [RotationWorker] ✅ Batch completado exitosamente
```

### Métricas de Performance

```bash
# Tiempo de procesamiento
docker logs kybercore | grep "Batch completado" | tail -10

# Archivos procesados
docker logs kybercore | grep "archivos procesados"

# Espacio usado
du -sh /tmp/kybercore_processing/*/
```

### Monitoreo de APISLICER

```bash
# Ver llamadas a APISLICER
docker logs apislicer-slicer-api | grep -E "auto-rotate|slice" | tail -20

# Ver mejoras detectadas
docker logs apislicer-slicer-api | grep "Mejora" | tail -10
```

---

## 🔄 Limpieza y Mantenimiento

### Limpieza Manual

```bash
# Limpiar archivos procesados > 24 horas
find /tmp/kybercore_processing/ -type d -mtime +1 -exec rm -rf {} +

# Limpiar todos los archivos temporales
rm -rf /tmp/kybercore_processing/temp_*
rm -f /tmp/kybercore_gcode_*

# Reiniciar sesiones del wizard (si es necesario)
# Advertencia: esto borrará todas las sesiones activas
echo '{}' > base_datos/wizard_sessions.json
docker compose restart kybercore
```

### Limpieza Automática (Cron)

```bash
# Agregar a crontab
crontab -e

# Limpiar cada día a las 3 AM
0 3 * * * find /tmp/kybercore_processing/ -type d -mtime +1 -exec rm -rf {} + 2>/dev/null
0 3 * * * find /tmp/ -name "kybercore_gcode_*" -mtime +1 -delete 2>/dev/null
```

---

## 📚 Referencias Rápidas

### Endpoints Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/print/process-with-rotation` | POST | Inicia procesamiento asíncrono (202 Accepted) |
| `/api/print/task-status/{task_id}` | GET | Consulta progreso de tarea |
| `/api/print/gcode-files` | GET | Lista archivos G-code generados |
| `/api/print/gcode-content` | GET | Obtiene contenido de G-code para viewer |

### Variables de Entorno

| Variable | Default | Rango | Descripción |
|----------|---------|-------|-------------|
| `ROTATION_WORKER_POOL_SIZE` | `3` | 1-10 | Archivos procesados simultáneamente |
| `ROTATION_MAX_RETRIES` | `3` | 1-5 | Reintentos automáticos por archivo |
| `ROTATION_RETRY_DELAY` | `2` | 1-5 | Segundos entre reintentos |
| `APISLICER_TIMEOUT` | `60` | 30-300 | Timeout para llamadas APISLICER |

### Estados de Tarea

| Estado | Descripción | Acción Frontend |
|--------|-------------|----------------|
| `pending` | Tarea en cola | Seguir polling |
| `processing` | Procesando archivos | Actualizar progress bar |
| `completed` | ✅ Todos exitosos | Avanzar a siguiente paso |
| `failed` | ❌ Error fatal | Mostrar error y reintentar |
| `cancelled` | Cancelada por usuario | Volver a step 5 (futuro) |

### Códigos HTTP

| Código | Significado | Acción |
|--------|-------------|--------|
| 200 OK | ✅ Operación exitosa | Continuar |
| 202 Accepted | ✅ Procesamiento iniciado | Iniciar polling |
| 400 Bad Request | ❌ Parámetros inválidos | Verificar JSON |
| 403 Forbidden | ❌ Archivo no permitido | Verificar ruta |
| 404 Not Found | ❌ Recurso inexistente | Verificar task_id |
| 500 Server Error | ❌ Error interno | Ver logs backend |

---

## 💡 Tips y Mejores Prácticas

### Configuración por Escenario

**Desarrollo (velocidad sobre confiabilidad)**:
```bash
ROTATION_WORKER_POOL_SIZE=5
ROTATION_MAX_RETRIES=2
ROTATION_RETRY_DELAY=1
```

**Producción (balance óptimo)** ⭐:
```bash
ROTATION_WORKER_POOL_SIZE=3
ROTATION_MAX_RETRIES=3
ROTATION_RETRY_DELAY=2
```

**Alta confiabilidad (confiabilidad sobre velocidad)**:
```bash
ROTATION_WORKER_POOL_SIZE=2
ROTATION_MAX_RETRIES=5
ROTATION_RETRY_DELAY=3
```

### Recomendaciones de Umbral

| Umbral | Uso | Comportamiento |
|--------|-----|----------------|
| **0-3%** | Testing, máxima optimización | Rota casi todos los archivos |
| **5%** ⭐ | **Producción default** | Balance óptimo mejora/velocidad |
| **10-15%** | Solo mejoras notables | Procesa más rápido, menos rotaciones |
| **20%** | Solo mejoras dramáticas | Raramente rota, muy selectivo |

### Performance Best Practices

1. ✅ **Pool size 3-5** para CPU modernas (balance óptimo)
2. ✅ **Limpiar /tmp/ diariamente** con cron job
3. ✅ **Monitorear logs** para detectar patrones de fallo
4. ✅ **Aumentar timeout** para archivos > 50MB
5. ✅ **Reducir retries** si APISLICER es muy estable
6. ✅ **Usar umbral 5-10%** para producción
7. ✅ **Verificar disco** antes de procesar muchos archivos

---

## 🔗 Enlaces Útiles

- **📖 Documentación Completa**: [auto-rotation-backend-system.md](../architecture/auto-rotation-backend-system.md)
- **📝 Changelog**: [CHANGELOG-auto-rotation.md](../CHANGELOG-auto-rotation.md)
- **💻 Código RotationWorker**: `src/services/rotation_worker.py`
- **📊 Task Models**: `src/models/task_models.py`
- **🎛️ Print Controller**: `src/controllers/print_flow_controller.py`
- **🌐 Frontend**: `src/web/static/js/modules/gallery/project_modal.js`

---

**Última actualización**: Octubre 5, 2025  
**Versión**: 2.0.0 (Backend-Centric - Arquitectura Definitiva)  
**Mantenedor**: Equipo KyberCore

