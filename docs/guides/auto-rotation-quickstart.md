# Guía Rápida: Sistema de Auto-Rotación

## 🚀 Inicio Rápido

### Para Usuarios

1. **Abrir proyecto** en la galería
2. **Click en "Imprimir"** para abrir el wizard
3. **Completar pasos 1-4** (selección, material, modo, impresora)
4. **En Step 5 (STL Processing)**:
   - ✅ Activar checkbox "Habilitar Auto-Rotación"
   - 🎚️ Ajustar umbral con el slider (0-20%)
   - 🔘 Seleccionar método (dejar en "auto")
5. **Click "Iniciar Procesamiento"**
6. **Esperar** mientras se rotan y laminan los archivos
7. **Revisar resultados** en Step 6 (Validación)

### Para Desarrolladores

```bash
# 1. Verificar servicios activos
docker ps | grep -E "kybercore|apislicer"

# 2. Ver logs en tiempo real
docker logs -f apislicer-slicer-api
docker logs -f kybercore

# 3. Probar endpoint de rotación
curl -X POST http://localhost:8001/auto-rotate-upload \
  -F "file=@test.stl" \
  -F "method=auto" \
  -F "improvement_threshold=5.0"

# 4. Verificar archivos temporales
ls -lh /tmp/kybercore_rotated_stls/

# 5. Ver sesiones activas
cat base_datos/wizard_sessions.json | jq
```

---

## 📂 Archivos Clave

### Frontend
```
src/web/static/js/modules/gallery/
├── project_modal.js
│   ├── applyAutoRotationToSTLs()         # Línea 1603
│   ├── saveRotatedFilesToServer()        # Línea 1792
│   └── startSTLProcessing()              # Línea 1419
```

### Backend
```
src/controllers/
├── print_flow_controller.py
│   ├── save_rotated_stl()                # Línea 915
│   ├── process_stl_files()               # Línea 969
│   └── process_single_stl()              # Línea 1240
```

### APISLICER
```
APISLICER/app/
├── main.py
│   ├── auto_rotate_stl_upload()          # Línea 719
│   ├── find_optimal_rotation_gradient()  # Línea 166
│   ├── calculate_contact_area()          # Línea 77
│   └── apply_rotation_to_stl()           # Línea 711
```

---

## 🔧 Configuración

### Variables de Entorno

```bash
# En docker-compose.yml
services:
  apislicer:
    environment:
      - PYTHONUNBUFFERED=1
      - DISPLAY=:99
      - XVFB_RESOLUTION=1920x1080x24
    ports:
      - "8001:8000"  # Puerto para auto-rotate-upload
```

### CORS Headers (CRÍTICO)

```python
# APISLICER/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[  # ⚠️ Crucial para que frontend lea headers
        "X-Rotation-Applied",
        "X-Rotation-Degrees",
        "X-Improvement-Percentage",
        "X-Contact-Area",
        "X-Original-Area",
        "X-Improvement-Threshold"
    ]
)
```

---

## 🧪 Testing

### Test 1: Verificar Rotación Básica

```javascript
// En consola del navegador
const testRotation = async () => {
    const formData = new FormData();
    
    // Usar un archivo STL de prueba
    const response = await fetch('/api/gallery/projects/files/1/Cover_USB.stl');
    const blob = await response.blob();
    
    formData.append('file', blob, 'test.stl');
    
    const params = new URLSearchParams({
        method: 'auto',
        improvement_threshold: '0'  // Rotar siempre
    });
    
    const result = await fetch(`http://localhost:8001/auto-rotate-upload?${params}`, {
        method: 'POST',
        body: formData
    });
    
    console.log('Status:', result.status);
    console.log('Rotation Applied:', result.headers.get('X-Rotation-Applied'));
    console.log('Improvement:', result.headers.get('X-Improvement-Percentage'));
    console.log('Rotation Degrees:', result.headers.get('X-Rotation-Degrees'));
};

testRotation();
```

### Test 2: Verificar Guardado de Archivos

```bash
# Ejecutar procesamiento completo y verificar
SESSION_ID="wizard_test_123"

# 1. Verificar que se creó el directorio
ls -la /tmp/kybercore_rotated_stls/$SESSION_ID/

# 2. Verificar contenido de archivos STL
file /tmp/kybercore_rotated_stls/$SESSION_ID/*.stl

# 3. Verificar sesión actualizada
cat base_datos/wizard_sessions.json | jq ".\"$SESSION_ID\".rotated_files_map"
```

### Test 3: Verificar Laminado Usa Archivo Rotado

```bash
# Ver logs durante procesamiento
docker logs -f kybercore 2>&1 | grep -E "Usando archivo|rotated"

# Debería mostrar:
# INFO: 📐 Usando archivo rotado: /tmp/kybercore_rotated_stls/wizard_XXX/rotated_YYY_file.stl
# INFO:    Rotación aplicada: {'rotation': [180.0, 0.0, 0.0], 'improvement': 22.76}
```

---

## 🐛 Debugging

### Problema: Headers No Se Leen

```javascript
// Verificar en consola
fetch('http://localhost:8001/auto-rotate-upload?...', {
    method: 'POST',
    body: formData
}).then(response => {
    console.log('All headers:');
    for (let [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
    }
});

// Si no ves X-Rotation-*, verificar expose_headers en APISLICER
```

### Problema: Backend Usa Archivo Original

```python
# Agregar logs en print_flow_controller.py
logger.info(f"Rotated files map: {rotated_files_map}")
logger.info(f"Looking for: {piece_filename}")
logger.info(f"Found in map: {piece_filename in rotated_files_map}")
logger.info(f"Using path: {file_path}")
```

### Problema: Optimización Muy Lenta

```python
# Reducir iteraciones en APISLICER/app/main.py
# Para testing rápido:
@app.post("/auto-rotate-upload")
async def auto_rotate_stl_upload(
    max_iterations: int = 20,  # Default: 50
    max_rotations: int = 12,   # Default: 24
    ...
```

---

## 📊 Monitoreo

### Logs Importantes

```bash
# Monitorear todo el flujo
docker logs -f apislicer-slicer-api 2>&1 | grep -E "Rotación|mejora|umbral"
docker logs -f kybercore 2>&1 | grep -E "rotado|Usando archivo"
```

### Métricas de Performance

```bash
# Tiempo de rotación por archivo
docker logs apislicer-slicer-api | grep "Optimización finalizada" | tail -10

# Archivos procesados exitosamente
docker logs kybercore | grep "archivos procesados" | tail -5

# Espacio usado en /tmp/
du -sh /tmp/kybercore_rotated_stls/
```

---

## 🔄 Limpieza Manual

```bash
# Limpiar archivos rotados antiguos
find /tmp/kybercore_rotated_stls/ -type f -mtime +1 -delete
find /tmp/kybercore_rotated_stls/ -type d -empty -delete

# Limpiar G-codes generados
find /tmp/ -name "kybercore_gcode_*" -mtime +1 -delete

# Reiniciar sesiones del wizard
echo '{}' > base_datos/wizard_sessions.json
```

---

## 📚 Referencias Rápidas

### Parámetros de Optimización

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `method` | string | `"auto"` | Método: auto, gradient, grid |
| `improvement_threshold` | float | `5.0` | Umbral mínimo de mejora (%) |
| `rotation_step` | int | `15` | Paso de rotación para grid |
| `max_rotations` | int | `24` | Máx rotaciones para grid |
| `max_iterations` | int | `50` | Máx iteraciones para gradient |
| `learning_rate` | float | `0.1` | Tasa de aprendizaje |

### Response Headers

| Header | Tipo | Ejemplo | Descripción |
|--------|------|---------|-------------|
| `X-Rotation-Applied` | boolean | `"true"` | Si se aplicó rotación |
| `X-Rotation-Degrees` | array | `"[180.0, 0.0, 0.0]"` | Ángulos de rotación |
| `X-Improvement-Percentage` | float | `"22.76"` | Mejora en área (%) |
| `X-Contact-Area` | float | `"279.76"` | Área de contacto (mm²) |
| `X-Original-Area` | float | `"228.0"` | Área original (mm²) |
| `X-Improvement-Threshold` | float | `"5.0"` | Umbral usado |

### Códigos de Estado HTTP

| Código | Significado | Acción |
|--------|-------------|--------|
| 200 | ✅ OK | Rotación exitosa |
| 400 | ❌ Bad Request | Verificar parámetros |
| 404 | ❌ Not Found | Verificar ruta del archivo |
| 422 | ❌ Unprocessable | Verificar FormData |
| 500 | ❌ Server Error | Ver logs del servidor |

---

## 💡 Tips y Trucos

### Optimizar Performance

1. **Usar método "gradient"** para geometrías simples (más rápido)
2. **Aumentar rotation_step** en "grid" para búsquedas más rápidas
3. **Reducir max_iterations** en pruebas (ej: 20 en vez de 50)
4. **Cachear rotaciones** para archivos que se procesan frecuentemente

### Mejores Prácticas

1. **Umbral 5%** es un buen default para producción
2. **Umbral 0%** solo para testing (rota todo)
3. **Limpiar /tmp/** cada 24 horas
4. **Monitorear logs** para detectar fallos temprano
5. **Validar headers CORS** después de cada actualización de APISLICER

### Casos Especiales

```python
# Pieza muy grande (> 100MB STL)
# Aumentar timeout en aiohttp
async with session.post(url, data=data, timeout=120) as response:
    ...

# Muchos archivos (> 10)
# Procesar en paralelo
results = await asyncio.gather(*[
    rotate_file(f) for f in files
])

# Geometría muy compleja (> 50k faces)
# Forzar método "grid" con menos rotaciones
method = "grid"
max_rotations = 12
```

---

## 📞 Soporte

### Issues Comunes

1. **"422 Unprocessable Entity"** → Verificar FormData y tipos de datos
2. **"Headers no disponibles"** → Verificar `expose_headers` en CORS
3. **"Archivos originales laminados"** → Verificar `rotated_files_map` en sesión
4. **"Mejora siempre 0%"** → Verificar instalación de trimesh y scipy

### Contacto

- 📧 Email: soporte@kybercore.com
- 💬 Discord: KyberCore Community
- 📝 Issues: github.com/kybercore/issues

---

**Última actualización:** 4 de Octubre, 2025  
**Versión:** 1.0  
**Mantenedor:** Equipo KyberCore
