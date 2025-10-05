# Guía de Migración: V1 → V2 (Arquitectura Backend-Centric)

## 📋 Tabla de Contenidos
1. [Resumen de Cambios](#resumen-de-cambios)
2. [Preparación](#preparación)
3. [Instalación y Configuración](#instalación-y-configuración)
4. [Activación de V2](#activación-de-v2)
5. [Verificación](#verificación)
6. [Rollback a V1](#rollback-a-v1)
7. [Monitoreo y Troubleshooting](#monitoreo-y-troubleshooting)
8. [FAQ](#faq)

---

## Resumen de Cambios

### ¿Qué cambió?

**V1 (Frontend-Heavy - LEGACY)**:
- El navegador descarga cada archivo STL
- El navegador envía cada STL a APISLICER para rotación
- El navegador guarda cada archivo rotado en el servidor
- El navegador solicita el slicing de cada archivo
- **~30 HTTP requests** para 10 archivos (3 por archivo)
- **Procesamiento secuencial** (uno por uno)
- **Sin retry automático** si algo falla
- **~20 segundos** para 10 archivos

**V2 (Backend-Centric - RECOMENDADO) ✨**:
- El navegador envía **1 solicitud** con la lista de archivos
- El backend orquesta todo el procesamiento
- **Procesamiento paralelo** (3 archivos simultáneos)
- **Retry automático** (3 intentos por archivo)
- El navegador solo hace **polling cada 2 segundos** para ver el progreso
- **~6 segundos** para 10 archivos
- **Mejor manejo de errores** y transaccionalidad

### Beneficios de V2

| Aspecto | V1 | V2 | Mejora |
|---------|----|----|--------|
| Requests HTTP | ~30 | 1 + polling | 95% menos tráfico |
| Tiempo (10 archivos) | ~20s | ~6s | 70% más rápido |
| Paralelización | No | Sí (3 archivos) | 3x throughput |
| Retry automático | No | Sí (3 intentos) | Mayor confiabilidad |
| Separación de concerns | ❌ | ✅ | Mejor arquitectura |
| Escalabilidad | Baja | Alta | Preparado para más load |
| Experiencia de usuario | Básica | Avanzada | Progress bar, % |

---

## Preparación

### Requisitos Previos

1. **Docker y Docker Compose instalados**
2. **KyberCore funcionando correctamente con V1**
3. **Acceso a los logs del contenedor**
4. **Navegador moderno** (Chrome/Firefox/Edge)

### Backup

Antes de proceder, haz backup de:

```bash
# Backup de la configuración actual
cp .env .env.backup

# Backup de la base de datos (si aplica)
cp -r base_datos/ base_datos_backup/

# Backup de los archivos subidos
cp -r /tmp/kybercore/ /tmp/kybercore_backup/
```

---

## Instalación y Configuración

### Paso 1: Actualizar Código

```bash
cd /home/elisaul77/KyberCore

# Asegúrate de tener la última versión
git pull origin main

# O si trabajas en una rama específica
git pull origin feature/backend-centric-rotation
```

### Paso 2: Configurar Variables de Entorno

El archivo `.env` ya debe existir. Verifica/ajusta estos parámetros:

```bash
# Editar el archivo .env
nano .env
```

**Parámetros clave para V2:**

```env
# Número de archivos procesados en paralelo (recomendado: 3-5)
ROTATION_WORKER_POOL_SIZE=3

# Número de reintentos por archivo (recomendado: 3)
ROTATION_MAX_RETRIES=3

# Tiempo entre reintentos en segundos (recomendado: 2)
ROTATION_RETRY_DELAY=2

# Timeout para operaciones de red (recomendado: 60)
ROTATION_TIMEOUT_SECONDS=60

# Habilitar V2 por defecto (true)
ENABLE_BACKEND_ROTATION=true
```

**Ajustes según hardware:**

| Escenario | POOL_SIZE | MAX_RETRIES | RETRY_DELAY |
|-----------|-----------|-------------|-------------|
| **Raspberry Pi 4** | 2 | 3 | 3 |
| **PC normal** | 3 | 3 | 2 |
| **Servidor potente** | 5 | 3 | 1 |
| **Red inestable** | 2 | 5 | 5 |

### Paso 3: Instalar Dependencias

```bash
# Instalar python-dotenv (nueva dependencia)
pip install -r requirements.txt

# O si usas Docker (recomendado)
docker compose down
docker compose up --build -d
```

### Paso 4: Verificar Logs de Inicio

```bash
# Ver los logs para confirmar que cargó la configuración
docker compose logs -f kybercore

# Deberías ver algo como:
# ✅ Variables de entorno cargadas desde: /app/.env
# 🚀 Iniciando KyberCore...
# 🔧 RotationWorker inicializado: pool_size=3, max_retries=3
```

---

## Activación de V2

### Opción A: Activar Globalmente (Recomendado)

V2 está **activado por defecto** si `ENABLE_BACKEND_ROTATION=true` en `.env`.

No necesitas hacer nada adicional - todos los usuarios usarán V2 automáticamente.

### Opción B: Activar por Usuario (Testing)

Si quieres que solo algunos usuarios prueben V2:

1. **Abrir la aplicación en el navegador**
2. **Abrir DevTools** (F12)
3. **Ir a la pestaña "Console"**
4. **Ejecutar:**

```javascript
// Activar V2 para este navegador
localStorage.setItem('use_backend_rotation', 'true');

// Recargar la página
location.reload();
```

5. **Verificar en la consola:**

```
🔧 Modo de procesamiento: V2 (Backend-Centric: true)
```

6. **El botón mostrará:** "Iniciar Procesamiento (V2)"

---

## Verificación

### Paso 1: Verificar la UI

1. Abre un proyecto en la galería
2. Ve al modal de nuevo trabajo
3. Completa los pasos hasta "Procesamiento"
4. El botón debe decir: **"Iniciar Procesamiento (V2)"**

### Paso 2: Procesar Archivos

1. Haz clic en "Iniciar Procesamiento (V2)"
2. **Deberías ver:**
   - Mensaje: "Procesando archivos en el servidor..."
   - **Progress bar animado**
   - **Porcentaje de progreso** (0% → 100%)
   - Menos flickering que V1

### Paso 3: Verificar Logs del Backend

```bash
# Ver logs en tiempo real
docker compose logs -f kybercore

# Buscar logs del RotationWorker
docker compose logs kybercore | grep "RotationWorker"
```

**Deberías ver algo como:**

```
🔄 [RotationWorker] Iniciando procesamiento de 10 archivos...
🔄 [RotationWorker] Procesando lote (3 workers en paralelo)
✅ [RotationWorker] cube.stl → rotado exitosamente (intento 1/3)
✅ [RotationWorker] sphere.stl → rotado exitosamente (intento 1/3)
✅ [RotationWorker] pyramid.stl → rotado exitosamente (intento 1/3)
📊 [RotationWorker] Progreso: 30.0% (3/10 archivos completados)
...
✅ [RotationWorker] Procesamiento completado: 10/10 exitosos, 0 fallos
```

### Paso 4: Verificar Performance

Con **DevTools Network** (F12 → Network):

**V1:**
- Verás ~30 requests a `/api/gallery/download-stl`, `/auto-rotate-upload`, `/save-rotated-stl`
- Requests secuenciales (una tras otra)

**V2:**
- Verás **1 request inicial** a `/api/print/process-with-rotation`
- Luego **requests de polling** cada 2s a `/api/print/task-status/{id}`
- Menos tráfico total, más limpio

### Paso 5: Validación Funcional

1. Después del procesamiento, verifica que:
   - Todos los archivos tienen ✅ verde
   - Puedes avanzar al paso de "Validación"
   - Los archivos rotados se ven correctos en la previsualización
   - Puedes completar el wizard sin errores

---

## Rollback a V1

Si algo no funciona correctamente, puedes volver a V1 inmediatamente:

### Rollback por Usuario (Inmediato)

```javascript
// En la consola del navegador (F12)
localStorage.setItem('use_backend_rotation', 'false');
location.reload();
```

El botón ahora dirá: **"Iniciar Procesamiento (V1)"**

### Rollback Global (Todos los Usuarios)

1. Editar `.env`:

```env
ENABLE_BACKEND_ROTATION=false
```

2. Reiniciar el contenedor:

```bash
docker compose restart kybercore
```

3. Verificar en logs:

```bash
docker compose logs kybercore | grep "backend rotation"
```

---

## Monitoreo y Troubleshooting

### Problema: El botón no muestra "(V2)"

**Síntomas:**
- El botón dice "Iniciar Procesamiento" sin versión

**Solución:**
```javascript
// Verificar qué versión está activa
console.log(localStorage.getItem('use_backend_rotation'));

// Si retorna null o undefined, activar explícitamente
localStorage.setItem('use_backend_rotation', 'true');
location.reload();
```

### Problema: Timeout después de 10 minutos

**Síntomas:**
- El procesamiento se detiene después de mucho tiempo
- Mensaje: "Timeout: procesamiento tomó más de 10 minutos"

**Solución:**

1. Revisa los logs del backend:
```bash
docker compose logs kybercore | tail -100
```

2. Posibles causas:
   - APISLICER no responde → verificar con `docker compose ps`
   - Archivos STL muy grandes → reducir `ROTATION_WORKER_POOL_SIZE`
   - Red lenta → aumentar `ROTATION_TIMEOUT_SECONDS`

### Problema: Algunos archivos fallan

**Síntomas:**
- El proceso completa pero algunos archivos tienen ❌

**Solución:**

1. Ver el error específico:
```bash
# En los logs del backend
docker compose logs kybercore | grep "ERROR\|FAILED"
```

2. Verificar APISLICER:
```bash
# Verificar que APISLICER esté activo
curl http://localhost:5000/health

# Reiniciar APISLICER si es necesario
docker compose restart apislicer
```

3. Aumentar reintentos temporalmente:
```env
ROTATION_MAX_RETRIES=5
ROTATION_RETRY_DELAY=3
```

### Problema: Procesamiento muy lento

**Síntomas:**
- V2 es más lento que V1 (no debería pasar)

**Diagnóstico:**

1. Verificar configuración:
```bash
cat .env | grep ROTATION
```

2. Ajustar según hardware:
```env
# Si tienes buena CPU/RAM
ROTATION_WORKER_POOL_SIZE=5

# Si la red es el cuello de botella
ROTATION_WORKER_POOL_SIZE=2
ROTATION_TIMEOUT_SECONDS=90
```

3. Verificar logs de tiempos:
```bash
docker compose logs kybercore | grep "Tiempo total"
```

### Logs Útiles

**Ver solo logs de rotación:**
```bash
docker compose logs kybercore | grep "RotationWorker"
```

**Ver errores:**
```bash
docker compose logs kybercore | grep "ERROR\|❌"
```

**Ver métricas de performance:**
```bash
docker compose logs kybercore | grep "Progreso:\|Tiempo total:"
```

**Ver actividad de un task específico:**
```bash
# Reemplaza {task_id} con el ID real
docker compose logs kybercore | grep "{task_id}"
```

---

## FAQ

### ¿Puedo usar V1 y V2 al mismo tiempo?

**Sí.** El sistema es totalmente compatible hacia atrás:
- Algunos usuarios pueden usar V1
- Otros usuarios pueden usar V2
- Se controla vía `localStorage` por navegador

### ¿Qué pasa si cierro el navegador durante el procesamiento?

**V2:** El procesamiento **continúa en el backend**. Al reabrir:
- Si el task sigue activo, puedes seguir haciendo polling
- Si ya terminó, verás el resultado inmediatamente

**V1:** El procesamiento **se detiene** porque todo pasa en el frontend.

### ¿Cuánto espacio adicional usa V2?

**Casi nada.** Los archivos rotados se guardan en `/tmp/` igual que en V1. La única diferencia es:
- Los objetos `TaskStatus` en memoria (~1-2 KB por task)
- Se limpian automáticamente después de 1 hora

### ¿V2 consume más CPU?

**No.** El trabajo total es el mismo, solo cambia quién lo hace:
- **V1:** El navegador descarga → el backend procesa
- **V2:** El backend lee del disco → el backend procesa

V2 puede ser **más eficiente** porque evita múltiples transferencias de red.

### ¿Debo actualizar APISLICER también?

**No.** V2 usa los mismos endpoints de APISLICER que V1:
- `/auto-rotate-upload`
- `/slice`

No hay cambios necesarios en APISLICER.

### ¿Puedo configurar diferentes POOL_SIZE para diferentes usuarios?

**No directamente.** El `ROTATION_WORKER_POOL_SIZE` es global para todos los usuarios.

Sin embargo, podrías:
1. Crear múltiples instancias de KyberCore con diferentes configuraciones
2. Usar un load balancer para dirigir usuarios a diferentes instancias

### ¿V2 funciona con archivos muy grandes (>100MB)?

**Sí**, pero puede requerir ajustes:

```env
# Aumentar timeouts
ROTATION_TIMEOUT_SECONDS=180

# Reducir paralelización para evitar OOM
ROTATION_WORKER_POOL_SIZE=1

# Aumentar límite de upload (si aplica)
MAX_UPLOAD_SIZE_MB=500
```

### ¿Cómo puedo ver el progreso en tiempo real más detallado?

Actualmente el frontend muestra **porcentaje global** (ej: 30%).

Para ver **progreso por archivo**, abre DevTools y ve a Network → busca las respuestas de `/task-status/{id}`:

```json
{
  "progress": {
    "total_files": 10,
    "completed": 3,
    "failed": 0,
    "percentage": 30.0
  },
  "results": [
    {"filename": "cube.stl", "success": true, "rotated_path": "..."},
    {"filename": "sphere.stl", "success": true, "rotated_path": "..."},
    {"filename": "pyramid.stl", "success": true, "rotated_path": "..."}
  ]
}
```

### ¿Cuándo debería usar V1 en lugar de V2?

Usa V1 solo si:
1. **Estás debuggeando** y necesitas ver cada paso individual
2. **Tienes problemas con V2** que no has podido resolver
3. **Tu backend tiene recursos muy limitados** (ej: Raspberry Pi Zero)

En general, **V2 es superior en todos los aspectos**.

---

## Soporte

Si tienes problemas:

1. **Revisa esta guía** y el documento técnico en `docs/architecture/auto_rotacion_arquitectura.md`
2. **Revisa los logs**: `docker compose logs -f kybercore`
3. **Intenta rollback a V1** para confirmar que no es un problema general
4. **Reporta el issue** con:
   - Versión de KyberCore
   - Configuración de `.env` (sin passwords)
   - Logs relevantes
   - Pasos para reproducir

---

**🎉 ¡Disfruta de la nueva arquitectura V2!**

Creado: $(date)
Última actualización: $(date)
