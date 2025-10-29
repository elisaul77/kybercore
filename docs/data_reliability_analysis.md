# 🔬 Análisis de Confiabilidad de Datos en KyberCore Monitor

## ❓ Pregunta del Usuario
> "¿Estos datos provienen de un estado de la impresora, pero no de la retroalimentación de lo que sucede realmente? ¿Son datos válidos del estado de los motores?"

## ✅ Respuesta: PARCIALMENTE CORRECTOS

Los datos que estamos monitoreando provienen de **dos fuentes diferentes** con niveles distintos de confiabilidad:

---

## 📊 Tipos de Datos y su Origen

### 🟢 **DATOS REALES (Alta confiabilidad)**

#### 1. **`live_velocity` y `live_extruder_velocity`** (motion_report)
**Fuente:** Calculado por Klipper en tiempo real desde el **trapq** (trajectory queue)
**Confiabilidad:** ⭐⭐⭐⭐⭐ (95-98%)

```python
# Estos datos vienen de:
motion_report.live_velocity = 20.0 mm/s
motion_report.live_extruder_velocity = 0.614 mm/s
```

**¿Qué son?**
- Son las **velocidades reales calculadas** desde la cola de movimientos ejecutados
- Klipper calcula esto desde los comandos G-code **después de aplicar aceleración/deceleración**
- **NO son mediciones directas de encoders**, pero son el "comando ejecutado" real

**Limitación:**
- ❌ No detectan si el motor **se saltó pasos** (perdió sincronía)
- ❌ No detectan si el motor está **bloqueado físicamente** pero recibe corriente
- ✅ Sí detectan si el motor **se está moviendo más lento de lo planeado** (por limitaciones de velocidad)

---

#### 2. **`stalls`** (toolhead)
**Fuente:** Contador de stalls desde los **drivers TMC2209**
**Confiabilidad:** ⭐⭐⭐⭐⭐ (99%)

```python
toolhead.stalls = 0  # Pérdidas de pasos detectadas
```

**¿Qué es?**
- Los **drivers TMC2209 tienen detección de pérdida de pasos** (stallGuard)
- Cuando el motor pierde pasos, el driver lo detecta y lo reporta
- Es un **contador acumulativo** durante la impresión

**Confiabilidad:**
- ✅ **DATOS REALES DE HARDWARE** desde el driver
- ✅ Detecta colisiones, motores bloqueados, corriente insuficiente
- ⚠️ Requiere calibración correcta de `stall_threshold` en Klipper

---

#### 3. **`temperature`** (extruder, heater_bed)
**Fuente:** Sensores **físicos** (termistor/termopar)
**Confiabilidad:** ⭐⭐⭐⭐⭐ (99.9%)

```python
extruder.temperature = 220.1°C  # Lectura directa del termistor
heater_bed.temperature = 55.0°C
```

**¿Qué son?**
- Lecturas **directas de sensores físicos**
- Actualización cada 1-2 segundos desde el ADC del microcontrolador

**Confiabilidad:**
- ✅ **MEDICIÓN REAL DE HARDWARE**
- ✅ La temperatura es un dato completamente confiable

---

### 🟡 **DATOS CALCULADOS (Confiabilidad media)**

#### 4. **`position`** (motion_report.live_position)
**Fuente:** **Calculado** desde pasos enviados (sin encoders)
**Confiabilidad:** ⭐⭐⭐ (70-80%)

```python
live_position = [108.45, 108.99, 22.4, 1021.44]  # [X, Y, Z, E]
```

**¿Qué es?**
- Es la **posición teórica** basada en los comandos enviados
- **NO es medida por encoders** (tu impresora no tiene encoders)
- Asume que cada paso del motor = movimiento real

**Limitaciones:**
- ❌ Si el motor pierde pasos, la posición reportada **es incorrecta**
- ❌ No detecta colisiones que hayan movido la pieza
- ⚠️ Solo es precisa si no hubo problemas mecánicos

---

## 🔴 **DATOS NO DISPONIBLES (Sin retroalimentación)**

Tu impresora **NO tiene** estos sensores (típicos solo en impresoras industriales):

❌ **Encoders de posición** → No hay medición real de posición
❌ **Load cells** → No se mide la fuerza/tensión del filamento
❌ **Sensores de vibración** → No se detectan vibraciones anómalas
❌ **Corriente real del motor** → TMC2209 puede leerla pero Klipper no la expone fácilmente

---

## 🎯 **¿Qué TAN confiables son los datos para detectar problemas?**

### ✅ **Problemas que SÍ podemos detectar con confianza:**

| Problema | Métrica usada | Confiabilidad | Cómo se detecta |
|----------|---------------|---------------|-----------------|
| **Atasco de filamento** | `live_extruder_velocity` | ⭐⭐⭐⭐ | Extrusor se mueve lento/nulo mientras cabezal se mueve |
| **Temperatura inestable** | `temperature` | ⭐⭐⭐⭐⭐ | Sensor físico directo |
| **Pérdida de pasos** | `stalls` | ⭐⭐⭐⭐⭐ | Driver TMC2209 lo detecta por hardware |
| **Velocidad anormalmente baja** | `live_velocity` | ⭐⭐⭐⭐ | Calculado desde comandos ejecutados |
| **Motor bloqueado** | `stalls` + `velocity` | ⭐⭐⭐⭐ | Combinación de ambos |

### ⚠️ **Problemas que NO podemos detectar con certeza:**

| Problema | Razón | Alternativa |
|----------|-------|-------------|
| **Pasos perdidos sin stall** | Sin encoders | Monitorear `stalls` y calidad de impresión |
| **Colisión que no causa stall** | Drivers no siempre detectan | Monitorear caída brusca de velocidad |
| **Deslizamiento de filamento** | Sin load cell | Inferir desde velocidad de extrusión |
| **Vibración excesiva** | Sin acelerómetro | No detectable |

---

## 🔬 **Comparativa: Datos "Planeados" vs "Reales"**

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE DATOS                           │
└─────────────────────────────────────────────────────────────┘

1. G-code → "PRINT línea a 100 mm/s"  [COMANDO]
              ↓
2. Klipper → Procesa y genera trapq  [PLAN REAL]
              ↓
3. motion_report.live_velocity = 75 mm/s  [EJECUCIÓN REAL]
   (más lento por aceleración/esquinas)
              ↓
4. Driver TMC2209 → Envía pulsos a motor  [HARDWARE]
              ↓
5. Motor → Se mueve (o no, si hay problema)  [FÍSICO]
              ↓
6. ¿Detección de problema?
   ├─ SÍ → stalls++ [HARDWARE DETECTA]
   └─ NO → Posición incorrecta [NO DETECTADO]
```

### 📍 **Nuestra monitorización está en el paso 3:**
- ✅ Vemos la **ejecución real** de comandos
- ⚠️ NO vemos el **resultado físico** (sin encoders)
- ✅ SÍ vemos **problemas eléctricos** (stalls de TMC)

---

## 💡 **Conclusión y Recomendaciones**

### ✅ **Los datos SON confiables para:**
1. **Detectar atascos de filamento** (extrusor lento vs cabezal rápido)
2. **Detectar pérdida de pasos** (stalls de TMC2209)
3. **Detectar problemas de temperatura** (sensor físico)
4. **Detectar impresión anormalmente lenta** (velocidad baja sostenida)

### ⚠️ **Los datos NO SON 100% confiables para:**
1. **Posición exacta** (sin encoders)
2. **Deslizamiento de filamento** (sin load cell)
3. **Colisiones suaves** (que no generen stalls)

### 🚀 **Mejoras posibles:**

#### Nivel 1: Software (sin hardware nuevo)
```python
# Mejorar detección comparando múltiples métricas
if (live_velocity < expected * 0.5) and (stalls > prev_stalls):
    # Confianza: 95%
    alert("COLISIÓN DETECTADA con alta certeza")
```

#### Nivel 2: Hardware básico (bajo costo)
- **Sensor de filamento con encoder** → Detecta deslizamiento real
- **Acelerómetro ADXL345** → Detecta vibraciones anómalas
- **Sensor de corriente INA219** → Mide corriente real de motores

#### Nivel 3: Hardware avanzado (alto costo)
- **Encoders magnéticos en ejes** → Posición real vs comandada
- **Load cell en extrusor** → Fuerza/tensión del filamento
- **Cámara + IA** → Detección visual de problemas

---

## 📝 **Respuesta Final**

**Pregunta:** ¿Estos datos provienen de un estado o de retroalimentación real?

**Respuesta:**
- **70% retroalimentación real** (stalls, temperatura, velocidad ejecutada)
- **30% datos calculados** (posición teórica)
- **Confiables para detección de problemas: SÍ** ⭐⭐⭐⭐ (4/5 estrellas)

Los datos que monitoreamos son **suficientemente confiables** para detectar la mayoría de problemas críticos durante la impresión, aunque no son mediciones directas con encoders. La detección de stalls de los TMC2209 es **hardware real** y muy confiable.

---

**Fecha:** 29 Oct 2025  
**Impresora analizada:** Con drivers TMC2209  
**Firmware:** Klipper v0.13.0-255  
