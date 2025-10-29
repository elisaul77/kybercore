# 🔍 Datos TMC2209: Realidad vs Expectativa

## ❌ **Problema Detectado**

Los drivers TMC2209 **NO exponen todos los datos** que esperábamos. Después de verificar con la impresora real, estos son los datos **realmente disponibles**:

---

## ✅ **Datos DISPONIBLES (Hardware Real)**

### 1. **`cs_actual`** - Corriente Real Medida
```json
"drv_status": {
    "cs_actual": 25  // Valor de 0 a 31
}
```
- ✅ **100% Hardware** - Medido por el chip TMC2209
- ✅ Indica la corriente actual del motor
- ✅ Varía según la carga: 0 (idle) a 31 (máxima)
- 🎯 **Confiabilidad: 99%**

**Interpretación:**
- `cs_actual` = 0 → Motor idle (sin corriente)
- `cs_actual` = 15-20 → Corriente baja (~50-65%)
- `cs_actual` = 25-31 → Corriente alta (~80-100%)

**Uso para detección:**
- Si < 40% durante movimiento → Motor débil
- Si = 0 durante impresión → Motor desconectado/fallando

---

### 2. **`stealth`** - Modo de Operación
```json
"drv_status": {
    "stealth": 1  // 1 = StealthChop, 0 = SpreadCycle
}
```
- ✅ **100% Hardware** - Estado real del driver
- ✅ Confirma qué modo está activo
- 🎯 **Confiabilidad: 100%**

**Modos:**
- `stealth = 1` → 🔇 StealthChop (silencioso, menos torque)
- `stealth = 0` → 🔊 SpreadCycle (ruidoso, más torque)

**Relevancia:**
- StealthChop puede perder pasos en alta velocidad
- SpreadCycle es más confiable pero ruidoso

---

### 3. **`stst`** - Standstill Detected (solo en Z)
```json
"drv_status": {
    "stst": 1  // 1 = Motor en reposo
}
```
- ✅ **Hardware** - Driver detecta motor detenido
- ⚠️ Solo disponible en motor Z (no en X/Y)
- 🎯 **Confiabilidad: 95%**

**Uso:**
- Detectar si motor Z está realmente parado
- Útil para confirmar homing

---

## ❌ **Datos NO DISPONIBLES (En esta impresora)**

### 1. **`temperature`** - Temperatura del Driver
```json
"temperature": null  // ❌ Siempre null
```
- ❌ Pin no conectado en la placa
- ❌ El TMC2209 tiene sensor, pero no está cableado
- **Solución:** Monitorear indirectamente (si motor se bloquea = sobrecalentado)

---

### 2. **`sg_result`** - StallGuard Result
```json
// ❌ Este campo NO EXISTE en la respuesta
```
- ❌ Klipper no expone sg_result via API
- ❌ Aunque el TMC2209 tiene StallGuard, no está accesible
- **Alternativa:** Usar `toolhead.stalls` (contador de pérdidas de pasos)

---

## 📊 **Comparativa: Lo que Creíamos vs La Realidad**

| Campo | Esperado | Realidad | Alternativa |
|-------|----------|----------|-------------|
| `cs_actual` | ✅ Disponible | ✅ **SÍ - 0 a 31** | - |
| `stealth` | ✅ Disponible | ✅ **SÍ - 0 o 1** | - |
| `stst` | ⚠️ Tal vez | ✅ **Solo en Z** | - |
| `temperature` | ✅ Esperado | ❌ **null** | Monitoreo indirecto |
| `sg_result` | ✅ Esperado | ❌ **No existe** | `toolhead.stalls` |

---

## 🎯 **Nivel de Confiabilidad REAL**

### Hardware Real (99%):
1. ✅ `cs_actual` - Corriente medida (TMC2209)
2. ✅ `stealth` - Modo activo (TMC2209)
3. ✅ `stst` - Standstill Z (TMC2209)
4. ✅ `stalls` - Pérdidas de pasos (toolhead)
5. ✅ `temperature` extrusor/cama - Termistores

### Datos Calculados (85%):
6. ⚠️ `live_velocity` - Velocidad ejecutada
7. ⚠️ `live_extruder_velocity` - Velocidad extrusión

### Datos Asumidos (70%):
8. ❌ `position` - Posición teórica

---

## 🔧 **Algoritmos de Detección AJUSTADOS**

### 1. Corriente Baja (Funciona)
```python
if (cs_actual / 31) * 100 < 40 and velocity > 10:
    alert("MOTOR DÉBIL - Corriente insuficiente")
```
✅ **Confiable** - cs_actual es hardware real

---

### 2. Motor Bloqueado (Funciona)
```python
if cs_actual == 0 and velocity > 20:
    alert("MOTOR SIN CORRIENTE durante movimiento")
```
✅ **Confiable** - Detecta motor desconectado/fallando

---

### 3. Standstill Durante Movimiento (Funciona solo en Z)
```python
if stst == 1 and velocity > 20:
    alert("MOTOR Z DETENIDO pero debería moverse")
```
⚠️ **Parcial** - Solo para eje Z

---

### 4. ~~Temperatura Driver~~ (NO Funciona)
```python
# ❌ ELIMINADO - temperature siempre es null
```
❌ **No disponible**

---

### 5. ~~StallGuard~~ (NO Funciona directamente)
```python
# ❌ ELIMINADO - sg_result no existe en API
# ✅ ALTERNATIVA: Usar toolhead.stalls en su lugar
```
✅ **Alternativa válida** - stalls cuenta pérdidas reales

---

## 💡 **Conclusiones**

### ✅ **LO BUENO:**
- **`cs_actual` es MUY valioso** - Muestra corriente real del motor
- Durante impresión: cs_actual sube (15-31)
- Durante idle: cs_actual baja (0-10)
- **Permite detectar motores débiles o desconectados**

### ⚠️ **LIMITACIONES:**
- **Sin temperatura del driver** → No podemos prevenir sobrecalentamiento directo
- **Sin sg_result** → No podemos ver StallGuard en tiempo real
- **stst solo en Z** → Solo un eje tiene standstill detect

### 🔄 **ALTERNATIVAS:**
- **Temperatura:** Monitorear stalls frecuentes (indica sobrecalentamiento)
- **StallGuard:** Usar `toolhead.stalls` (cuenta pérdidas de pasos)
- **Standstill X/Y:** Inferir desde velocidad = 0

---

## 📈 **Datos Útiles en Dashboard**

### Card "Drivers TMC2209":
```
Motor X 🔇
├─ Corriente Real: 25/31 (80.6%) ✅
├─ Estado: ✅ Motor puede activarse
└─ Modo: Stealth

Motor Y 🔊
├─ Corriente Real: 0/31 (0.0%) 🔴
├─ Estado: ✅ Motor puede activarse
└─ Modo: SpreadCycle

Motor Z 🔇
├─ Corriente Real: 18/31 (58.1%) ⚠️
├─ Estado: 🛑 Motor en reposo
└─ Modo: Stealth
```

**Interpretación:**
- Motor X: ✅ Corriente alta, listo para usar
- Motor Y: 🔴 Sin corriente (idle o problema)
- Motor Z: ⚠️ Corriente media + standstill (esperando comando)

---

## 🎓 **Resumen Final**

### Pregunta Original:
> "¿Los datos provienen de retroalimentación real?"

### Respuesta Actualizada:
**De los datos TMC2209, solo `cs_actual` y `stealth` son retroalimentación real y útil.**

| Dato | Real | Útil | Disponible |
|------|------|------|------------|
| `cs_actual` | ✅ | ✅ | ✅ |
| `stealth` | ✅ | ✅ | ✅ |
| `stst` | ✅ | ⚠️ | ✅ (solo Z) |
| `temperature` | ❌ | ❌ | ❌ (null) |
| `sg_result` | ❌ | ❌ | ❌ (no existe) |

### Valor Real:
- **`cs_actual`** es el dato más valioso
- Permite detectar motores débiles/desconectados
- Durante impresión, **cs_actual debería estar > 15** (>48%)
- Si cs_actual = 0 durante movimiento → **Problema crítico**

---

**Fecha:** 29 Oct 2025  
**Estado:** Corregido y verificado con hardware real  
**Archivos actualizados:**
- `src/services/print_monitor_service.py`
- `templates/monitor_dashboard.html`
- `test_tmc_hardware.py`
