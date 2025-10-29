# Implementación de Propiedades Específicas de Impresora

**Fecha:** 2025-01-28  
**Estado:** ✅ Implementado  
**Prioridad:** Alta (Crítica para evitar fallos de impresión)

## 🎯 Objetivo

Incorporar las propiedades específicas de cada impresora (tipo de extrusor, velocidades máximas, retracción) en el sistema de generación de perfiles de impresión, permitiendo que la IA genere recomendaciones conscientes del hardware.

## 🔍 Problema Identificado

Durante la investigación de un fallo de impresión (stringing excesivo), se descubrió que:

1. **G-code generado tenía `retract_length = 2mm`** (insuficiente para PETG con extrusor bowden)
2. **El sistema no consideraba el tipo de extrusor:**
   - Bowden: necesita 6-6.5mm de retracción
   - Direct Drive: necesita 1-2mm de retracción
3. **Las velocidades eran hardcodeadas** sin considerar las capacidades de cada impresora

### Evidencia del Problema

```gcode
; retract_length = 2     ❌ TOO LOW
; retract_speed = 40
; material = PETG
```

**Resultado:** Hilos y stringing visible en la pieza impresa.

## 📋 Propiedades de Impresora Agregadas

### Schema en `printers.json`

```json
{
  "printer_id": {
    "extruder_type": "direct_drive" | "bowden",
    "max_print_speed": 250,        // mm/s
    "max_travel_speed": 500,       // mm/s
    "max_acceleration": 1000,      // mm/s²
    "retraction": {
      "length": 1.0,               // mm (direct) o 6.5 (bowden)
      "speed": 45,                 // mm/s
      "z_hop": 0.2                 // mm
    },
    "build_volume": {
      "x": 220,
      "y": 220,
      "z": 250
    },
    "nozzle_diameter": 0.4,
    "supported_materials": ["PLA", "PETG", "ABS", "TPU"]
  }
}
```

### Impresoras Configuradas

#### 1. Ender 3 V3 SE (printer-test-1)
- **Extrusor:** Direct Drive
- **Max Speed:** 250 mm/s
- **Retracción:** 1.0mm @ 45mm/s, z_hop=0.2mm

#### 2. Ender 3 V4.2.7 (bb82edde-63fa-4148-8172-e1a2bcfbe4c3)
- **Extrusor:** Bowden
- **Max Speed:** 150 mm/s
- **Retracción:** 6.5mm @ 45mm/s, z_hop=0.4mm

#### 3. Ender 3 V1 (b9cee789-efd9-433f-beeb-5d0da8af874c)
- **Extrusor:** Bowden
- **Max Speed:** 120 mm/s
- **Retracción:** 6.0mm @ 40mm/s, z_hop=0.3mm

## 🔧 Cambios Implementados

### 1. Modelo de Datos (`src/models/task_models.py`)

**Cambio:** Agregado campo `printer_id` al request

```python
class ProcessWithRotationRequest(BaseModel):
    session_id: str
    rotation_config: Dict[str, Any]
    plating_config: Optional[PlatingConfig] = PlatingConfig()
    profile_config: Dict[str, Any]
    printer_id: Optional[str] = None  # 🆕 NUEVO
    enable_gcode_generation: bool = True
```

### 2. Controlador (`src/controllers/print_flow_controller.py`)

**Cambio:** Extraer `printer_id` de la sesión y pasarlo al worker

```python
# Obtener printer_id de la sesión si no viene en el request
printer_id = req.printer_id
if not printer_id:
    printer_assignment = session_data.get("printer_assignment", {})
    printer_id = printer_assignment.get("printer_id")
    logger.info(f"   printer_id obtenido de sesión: {printer_id}")

# Pasar al rotation_worker
background_tasks.add_task(
    rotation_worker.process_batch,
    task_id=task_id,
    session_id=req.session_id,
    files=selected_pieces,
    rotation_config=req.rotation_config,
    profile_config=req.profile_config,
    printer_id=printer_id,  # 🆕 NUEVO
    plating_config=plating_config_dict,
    enable_gcode_generation=req.enable_gcode_generation
)
```

### 3. Rotation Worker (`src/services/rotation_worker.py`)

#### A. Nueva Función: `load_printer_properties()`

```python
def load_printer_properties(self, printer_id: Optional[str]) -> Dict[str, Any]:
    """
    Carga las propiedades específicas de una impresora desde printers.json
    
    Returns:
        Dict con propiedades de la impresora o valores por defecto
    """
    # Lee base_datos/printers.json
    # Extrae: extruder_type, max_print_speed, retraction, etc.
    # Retorna propiedades o defaults si no se encuentra
```

**Defaults si no hay printer_id:**
- extruder_type: "bowden"
- max_print_speed: 150 mm/s
- retraction: {length: 6.0, speed: 40, z_hop: 0.3}

#### B. Modificación: `process_batch()`

```python
async def process_batch(
    self,
    task_id: str,
    session_id: str,
    files: List[str],
    rotation_config: Dict[str, Any],
    profile_config: Dict[str, Any],
    printer_id: Optional[str] = None,  # 🆕 NUEVO
    plating_config: Optional[Dict[str, Any]] = None,
    enable_gcode_generation: bool = True
) -> None:
    # Cargar propiedades de impresora
    printer_properties = self.load_printer_properties(printer_id)
    
    # Enriquecer profile_config
    profile_config['printer_properties'] = printer_properties
    
    # El resto del flujo usa profile_config con las propiedades
```

**Logs agregados:**
```
🖨️  Impresora: Ender 3 V4.2.7 (4.2.7) - Extrusor: bowden, Max Speed: 150mm/s
```

#### C. Modificación: `_slice_file_with_retry()`

Ahora extrae y usa las propiedades de la impresora:

```python
# Obtener propiedades de impresora
printer_properties = profile_config.get('printer_properties', {})

# Retracción: usar valores de impresora o defaults del perfil IA
retract_length = profile_config.get('retract_length')
if retract_length is None and printer_properties:
    retract_length = printer_properties.get('retraction', {}).get('length', 6.0)
    logger.info(f"      🔧 Usando retract_length de impresora: {retract_length}mm")

# Similar para retract_speed y retract_lift

# Obtener tipo de extrusor y max_speed
extruder_type = printer_properties.get('extruder_type', 'bowden')
max_print_speed = printer_properties.get('max_print_speed', 150)

logger.info(
    f"      🖨️  Impresora: {extruder_type} extruder, "
    f"max_speed={max_print_speed}mm/s, "
    f"retraction={retract_length}mm @ {retract_speed}mm/s"
)
```

**Envío a APISLICER:**

```python
# 🖨️ === ENVIAR PARÁMETROS DE RETRACCIÓN (ESPECÍFICOS DE IMPRESORA) ===
data.add_field('retract_length', str(retract_length))
data.add_field('retract_speed', str(int(retract_speed)))
data.add_field('retract_lift', str(retract_lift))
```

### 4. APISLICER (`APISLICER/app/main.py`)

#### A. Parámetros Agregados al Endpoint `/slice`

```python
@app.post("/slice")
async def slice_stl(
    file: UploadFile = File(...),
    # ... otros parámetros ...
    
    # 🖨️ PARÁMETROS ESPECÍFICOS DE IMPRESORA (RETRACCIÓN)
    retract_length: float = Form(6.0),
    retract_speed: int = Form(40),
    retract_lift: float = Form(0.3),
    
    # ... resto de parámetros ...
):
```

#### B. Comandos PrusaSlicer Actualizados

```python
cmd = [
    "prusa-slicer",
    "--load", profile_path,
    "--output", gcode_path,
    
    # ... temperaturas ...
    
    # ===== RETRACCIÓN (ESPECÍFICO DE IMPRESORA) =====
    "--retract-length", str(retract_length),
    "--retract-speed", str(retract_speed),
    "--retract-lift", str(retract_lift),
    
    # ... resto de parámetros ...
]
```

#### C. Logging Agregado

```python
logger.info(f"   🔧 Retracción:")
logger.info(f"      • Length: {retract_length}mm")
logger.info(f"      • Speed: {retract_speed}mm/s")
logger.info(f"      • Z-hop: {retract_lift}mm")
```

## 📊 Flujo Completo

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. Frontend: Wizard de Impresión                                │
│    - Usuario selecciona impresora                               │
│    - printer_assignment guardado en sesión                      │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Controller: print_flow_controller.py                         │
│    - Extrae printer_id de printer_assignment                    │
│    - Pasa printer_id a rotation_worker.process_batch()          │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Worker: rotation_worker.py                                   │
│    - load_printer_properties(printer_id)                        │
│    - Lee base_datos/printers.json                               │
│    - Extrae: extruder_type, max_speed, retraction              │
│    - Enriquece profile_config['printer_properties']             │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Worker: _slice_file_with_retry()                             │
│    - Extrae printer_properties de profile_config                │
│    - Usa retraction de impresora (prioritario) o default IA     │
│    - Envía retract_length/speed/lift a APISLICER                │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. APISLICER: main.py                                            │
│    - Recibe retract_length, retract_speed, retract_lift         │
│    - Construye comando PrusaSlicer con estos parámetros         │
│    - Genera G-code con retracción correcta                      │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. G-code Resultante                                             │
│    ; retract_length = 6.5     ✅ CORRECTO (bowden PETG)         │
│    ; retract_speed = 45                                          │
│    ; retract_lift = 0.4                                          │
└──────────────────────────────────────────────────────────────────┘
```

## 🧪 Pruebas Necesarias

### Test 1: Impresora Bowden con PETG

**Setup:**
- Impresora: Ender 3 V4.2.7 (bowden)
- Material: PETG
- Modo: Prototype Speed

**Expectativa:**
```gcode
; retract_length = 6.5
; retract_speed = 45
; retract_lift = 0.4
```

**Verificar:**
```bash
# Iniciar impresión desde wizard
# Revisar logs
grep "Retracción" logs/kybercore.log | tail -5

# Revisar G-code generado
ls -lht APISLICER/output/*.gcode | head -1
# Tomar el archivo más reciente
grep "retract_length" APISLICER/output/[UUID].gcode
```

### Test 2: Impresora Direct Drive con PLA

**Setup:**
- Impresora: Ender 3 V3 SE (direct_drive)
- Material: PLA
- Modo: Factory Quality

**Expectativa:**
```gcode
; retract_length = 1.0
; retract_speed = 45
; retract_lift = 0.2
```

### Test 3: Sin printer_id (Fallback a Defaults)

**Setup:**
- No proporcionar printer_id
- Material: cualquiera

**Expectativa:**
- Sistema usa defaults: bowden, 6.0mm, 40mm/s
- Warning en logs: "No se proporcionó printer_id, usando propiedades por defecto"

## 📝 Logs Esperados

### En rotation_worker.py

```
📦 Iniciando procesamiento batch: task_id=task_..., archivos=1
✅ Propiedades cargadas para bb82edde-63fa-4148-8172-e1a2bcfbe4c3: 
   extrusor=bowden, max_speed=150mm/s, retraction=6.5mm
🖨️  Impresora: Impresora Ender 3 V4.2.7 (4.2.7) - Extrusor: bowden, Max Speed: 150mm/s
```

### En _slice_file_with_retry()

```
🌡️  Temperaturas PETG: 235°C / 85°C
🔧 Usando retract_length de impresora: 6.5mm
🔧 Usando retract_speed de impresora: 45mm/s
🔧 Usando retract_lift de impresora: 0.4mm
🖨️  Impresora: bowden extruder, max_speed=150mm/s, retraction=6.5mm @ 45mm/s
```

### En APISLICER

```
🔧 Retracción:
   • Length: 6.5mm
   • Speed: 45mm/s
   • Z-hop: 0.4mm
```

## 🎯 Próximos Pasos

### Fase 2: Integración con IA

**Objetivo:** Pasar `extruder_type` y `max_print_speed` al prompt de OpenAI para recomendaciones conscientes del hardware.

**Modificaciones:**

1. **En recommender_controller.py** (donde se genera el prompt IA):

```python
# Agregar contexto de impresora al prompt
prompt = f"""
Genera un perfil de impresión optimizado para:

**Hardware:**
- Impresora: {printer_properties['name']} ({printer_properties['model']})
- Tipo de Extrusor: {printer_properties['extruder_type']}
- Velocidad Máxima: {printer_properties['max_print_speed']} mm/s
- Retracción Recomendada: {printer_properties['retraction']['length']} mm

**Material:**
- Tipo: {material_type}
- Temperatura: {nozzle_temp}°C / {bed_temp}°C

**Modo de Producción:**
- Modo: {production_mode}
- Prioridad: {priority}

Considera que un extrusor {printer_properties['extruder_type']} requiere 
ajustes específicos en retracción y velocidades de viaje.
"""
```

2. **Calcular velocidades como porcentajes:**

```python
# En lugar de hardcodear velocidades
print_speed = 60  # ❌ Hardcoded

# Usar porcentajes del max_speed
max_speed = printer_properties['max_print_speed']
if mode == "prototype" and priority == "speed":
    print_speed = int(max_speed * 0.80)  # 80% del máximo
elif mode == "prototype" and priority == "economy":
    print_speed = int(max_speed * 0.50)  # 50% del máximo
elif mode == "factory" and priority == "quality":
    print_speed = int(max_speed * 0.30)  # 30% del máximo
```

### Fase 3: Validaciones

**Agregar validaciones de capacidades:**

```python
# Verificar si impresora soporta el material
if material_type not in printer_properties['supported_materials']:
    logger.warning(
        f"⚠️  {material_type} no está en la lista de materiales soportados "
        f"para {printer_properties['name']}"
    )

# Verificar dimensiones del modelo vs build_volume
if model_dimensions['x'] > printer_properties['build_volume']['x']:
    raise HTTPException(
        status_code=400,
        detail=f"Modelo excede dimensiones de impresora en X"
    )
```

## 📚 Referencias

- **Issue Original:** Fallo de impresión con stringing excesivo
- **Root Cause:** `retract_length = 2mm` en G-code (debía ser 6mm)
- **Archivos Modificados:**
  - `src/models/task_models.py`
  - `src/controllers/print_flow_controller.py`
  - `src/services/rotation_worker.py`
  - `APISLICER/app/main.py`
  - `base_datos/printers.json` (3 impresoras actualizadas)

## ✅ Estado de Implementación

- [x] Agregar schema de propiedades a `printers.json`
- [x] Actualizar las 3 impresoras con propiedades
- [x] Modificar modelo `ProcessWithRotationRequest`
- [x] Extraer `printer_id` en controlador
- [x] Agregar `load_printer_properties()` en rotation_worker
- [x] Usar propiedades en `_slice_file_with_retry()`
- [x] Enviar parámetros de retracción a APISLICER
- [x] Actualizar endpoint `/slice` en APISLICER
- [x] Agregar comandos PrusaSlicer para retracción
- [x] Agregar logging en todos los puntos
- [ ] **PENDING:** Probar con impresión real
- [ ] **PENDING:** Integrar con prompt de OpenAI
- [ ] **PENDING:** Calcular velocidades como % de max_speed
- [ ] **PENDING:** Agregar validaciones de capacidades

---

**Actualizado:** 2025-01-28  
**Autor:** Sistema de IA (Copilot)  
**Review Pendiente:** elisaul77
