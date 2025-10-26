# 🧪 TESTING: Verificación de Parámetros de IA en Laminación

## 🎯 Objetivo
Verificar que los parámetros generados por OpenAI se usan correctamente en el proceso de laminación.

## 📋 Cambios Implementados

### 1. **rotation_worker.py** (líneas 697-740)
**Antes:**
```python
data.add_field('custom_profile', profile_config.get('job_id', ''))
```

**Ahora:**
```python
# Extraer parámetros del perfil de IA o usar defaults
layer_height = profile_config.get('layer_height', 0.2)
fill_density = profile_config.get('fill_density', 20)
nozzle_temp = profile_config.get('nozzle_temperature', 210)
bed_temp = profile_config.get('bed_temperature', 60)

data.add_field('layer_height', str(layer_height))
data.add_field('fill_density', str(int(fill_density)))
data.add_field('nozzle_temp', str(int(nozzle_temp)))
data.add_field('bed_temp', str(int(bed_temp)))

logger.info(f"   📤 Enviando a APISLICER: layer={layer_height}mm, infill={fill_density}%, nozzle={nozzle_temp}°C, bed={bed_temp}°C")
```

### 2. **print_flow_controller.py** (líneas 2745-2790)
Agregados logs de verificación:
```python
# LOG: Estructura de profile_data recibido del frontend
logger.info(f"📦 Profile data recibido:")
logger.info(f"   Type: {type(profile_data)}")
logger.info(f"   Keys: {profile_data.keys()}")

# LOG: Parámetros que se van a usar para laminar
logger.info(f"📋 Perfil de laminación:")
logger.info(f"   AI enabled: {ai_enabled}")
logger.info(f"   Layer height: {profile_config.get('layer_height')}mm")
logger.info(f"   Fill density: {profile_config.get('fill_density')}%")
logger.info(f"   Infill pattern: {profile_config.get('infill_pattern')}")
logger.info(f"   Support type: {profile_config.get('support_type')}")
```

## 🔬 Prueba de Verificación

### Paso 1: Ejecutar el workflow completo
1. Recarga la página (Ctrl+F5)
2. Abre el wizard de impresión
3. Completa hasta el paso 5 (stl_processing)
4. **MARCA el checkbox** "✨ Usar IA para optimizar perfil"
5. Haz clic en "🚀 Procesar y Generar G-code"

### Paso 2: Monitorear logs en tiempo real
En otra terminal, ejecuta:
```bash
docker compose logs -f kybercore apislicer | grep -E "(📦|📋|📤|Enviando a APISLICER|profile|layer_height|fill_density)"
```

### Paso 3: Verificar evidencia en los logs

**Deberías ver:**

```
✅ PASO 1: Profile data recibido del frontend
kybercore  | 📦 Profile data recibido:
kybercore  |    Type: <class 'dict'>
kybercore  |    Keys: dict_keys(['success', 'job_id', 'profile_name', 'settings', 'ai_enabled', 'ai_confidence'])
kybercore  |    Settings keys: dict_keys(['layer_height', 'fill_density', 'infill_pattern', 'nozzle_temperature', 'bed_temperature', ...])

✅ PASO 2: Parámetros extraídos para laminación
kybercore  | 📋 Perfil de laminación:
kybercore  |    AI enabled: True
kybercore  |    Layer height: 0.2mm  ← Valor de OpenAI
kybercore  |    Fill density: 20%    ← Valor de OpenAI
kybercore  |    Infill pattern: honeycomb  ← Valor de OpenAI
kybercore  |    Support type: tree   ← Valor de OpenAI
kybercore  |    Nozzle temp: 210°C
kybercore  |    Bed temp: 60°C

✅ PASO 3: Parámetros enviados a APISLICER
kybercore  |    📤 Enviando a APISLICER: layer=0.2mm, infill=20%, nozzle=210°C, bed=60°C

✅ PASO 4: APISLICER ejecuta con parámetros recibidos
apislicer  | INFO:__main__:Ejecutando: prusa-slicer --export-gcode --load /app/config/printer_config/ender3.ini 
apislicer  |   --layer-height 0.2     ← ✅ Parámetro de IA
apislicer  |   --fill-density 20%     ← ✅ Parámetro de IA
apislicer  |   --temperature 210      ← ✅ Parámetro de IA
apislicer  |   --bed-temperature 60   ← ✅ Parámetro de IA
```

### Paso 4: Verificar G-code generado

Una vez completado el proceso:

```bash
# Ver parámetros del G-code generado
docker exec kybercore grep -E "^; (layer_height|fill_density|fill_pattern|support|temperature)" \
  /tmp/kybercore_processing/wizard_*/gcode_*.gcode | head -20
```

**Deberías ver:**
```
; layer_height = 0.2           ← ✅ Coincide con IA
; fill_density = 20%           ← ✅ Coincide con IA
; fill_pattern = honeycomb     ← ✅ Coincide con IA (si APISLICER lo soporta)
; support_material = 1         ← ✅ Activado (tree)
; first_layer_temperature = 210 ← ✅ Coincide con IA
; bed_temperature = 60         ← ✅ Coincide con IA
```

## ✅ Criterios de Éxito

| Criterio | Verificación | Status |
|----------|--------------|--------|
| 1. OpenAI genera parámetros | Logs muestran `ai_enabled: true`, `ai_confidence: 0.9x` | ⏳ |
| 2. Backend recibe profile_data completo | Logs muestran `Settings keys: [...]` con todos los parámetros | ⏳ |
| 3. Backend extrae parámetros correctos | Logs muestran valores específicos (no defaults) | ⏳ |
| 4. rotation_worker envía a APISLICER | Logs muestran `📤 Enviando a APISLICER: layer=X...` | ⏳ |
| 5. APISLICER recibe parámetros | Logs de APISLICER muestran comando con valores correctos | ⏳ |
| 6. G-code contiene parámetros de IA | Comentarios en G-code coinciden con los valores de IA | ⏳ |

## 🔍 Diferencias Clave vs Prueba Anterior

### Antes (Fallaba):
```python
# ❌ Solo enviaba job_id (nombre del perfil)
data.add_field('custom_profile', profile_config.get('job_id', ''))

# APISLICER buscaba archivo .ini que no existía
# Usaba valores por defecto del endpoint /slice
```

### Ahora (Corregido):
```python
# ✅ Envía parámetros explícitos
data.add_field('layer_height', str(layer_height))    # De profile_config['layer_height']
data.add_field('fill_density', str(fill_density))    # De profile_config['fill_density']
data.add_field('nozzle_temp', str(nozzle_temp))      # De profile_config['nozzle_temperature']
data.add_field('bed_temp', str(bed_temp))            # De profile_config['bed_temperature']

# APISLICER recibe los valores directamente como parámetros del request
# Los usa explícitamente en el comando de prusa-slicer
```

## 🎯 Próximos Pasos

Si esta prueba pasa:
1. ✅ Verificar que `infill_pattern` también se pase (requiere modificación adicional)
2. ✅ Agregar soporte para `support_type` (requiere mapeo de nombres)
3. ✅ Implementar validación de que los valores estén en rangos válidos
4. ✅ Optimizar para no enviar parámetros redundantes

---

## 📊 Comando de Monitoreo Completo

```bash
# Terminal 1: Logs del backend
docker compose logs -f kybercore | grep -E "(📦|📋|📤|Profile|Enviando|layer_height|fill_density|ai_enabled)" --color=always

# Terminal 2: Logs de APISLICER
docker compose logs -f apislicer | grep -E "(prusa-slicer|Ejecutando|layer-height|fill-density|temperature)" --color=always

# Terminal 3: Verificar G-code después
watch -n 5 'docker exec kybercore find /tmp/kybercore_processing -name "gcode_*.gcode" -exec basename {} \;'
```
