# 🎯 Parámetros de PrusaSlicer para Máxima Calidad

> **Documentación completa de parámetros de línea de comandos de PrusaSlicer 2.8.1**
> Extraído de: `prusa-slicer --help-fff`

## 📋 Índice

1. [Parámetros de Capas (Layer Settings)](#1-parámetros-de-capas)
2. [Parámetros de Perímetros](#2-parámetros-de-perímetros)
3. [Parámetros de Relleno (Infill)](#3-parámetros-de-relleno)
4. [Parámetros de Soportes](#4-parámetros-de-soportes)
5. [Parámetros de Velocidad](#5-parámetros-de-velocidad)
6. [Parámetros de Puentes y Voladizos](#6-parámetros-de-puentes-y-voladizos)
7. [Parámetros de Ventilador](#7-parámetros-de-ventilador)
8. [Parámetros de Precisión y Resolución](#8-parámetros-de-precisión-y-resolución)
9. [Parámetros de Ancho de Extrusión](#9-parámetros-de-ancho-de-extrusión)
10. [Parámetros de Costura y Acabado](#10-parámetros-de-costura-y-acabado)

---

## 1. Parámetros de Capas

### ✅ `--layer-height N`
**Descripción:** Altura de cada capa. Capas más delgadas = mejor calidad pero más tiempo.
- **Tipo:** float (mm)
- **Rango típico:** 0.05mm - 0.3mm
- **Recomendación CALIDAD:** 0.1mm - 0.15mm
- **Default:** 0.3mm
- **Impacto:** 🔥🔥🔥🔥🔥 CRÍTICO para calidad visual

### ✅ `--first-layer-height N`
**Descripción:** Altura de la primera capa para mejor adhesión.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0.2mm - 0.25mm (layer_height * 1.2 - 1.5)
- **Default:** 0.35mm
- **Impacto:** 🔥🔥🔥 Crítico para adhesión

### ✅ `--min-layer-height N`
**Descripción:** Altura mínima de capa para altura variable.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0.05mm - 0.1mm
- **Default:** Basado en nozzle
- **Impacto:** 🔥🔥 Importante para detalle fino

### ✅ `--max-layer-height N`
**Descripción:** Altura máxima de capa (máx 75% del ancho de extrusión).
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0.2mm - 0.25mm
- **Default:** 0 (auto: 75% nozzle diameter)
- **Impacto:** 🔥 Limita capas gruesas

---

## 2. Parámetros de Perímetros

### ✅ `--perimeters N`
**Descripción:** Número de perímetros (paredes externas).
- **Tipo:** int
- **Recomendación CALIDAD:** 4-6 perímetros
- **Recomendación ESTÁNDAR:** 3 perímetros
- **Default:** 3
- **Impacto:** 🔥🔥🔥🔥 Crucial para resistencia y acabado

### ✅ `--top-solid-layers N`
**Descripción:** Capas sólidas superiores.
- **Tipo:** int
- **Recomendación CALIDAD:** 5-8 capas
- **Default:** 3
- **Impacto:** 🔥🔥🔥 Elimina huecos superiores

### ✅ `--bottom-solid-layers N`
**Descripción:** Capas sólidas inferiores.
- **Tipo:** int
- **Recomendación CALIDAD:** 5-8 capas
- **Default:** 3
- **Impacto:** 🔥🔥🔥 Elimina huecos inferiores

### ✅ `--top-solid-min-thickness N`
**Descripción:** Grosor mínimo de capas superiores sólidas.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0.8mm - 1.2mm
- **Default:** 0
- **Impacto:** 🔥🔥 Garantiza solidez superior

### ✅ `--bottom-solid-min-thickness N`
**Descripción:** Grosor mínimo de capas inferiores sólidas.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0.8mm - 1.2mm
- **Default:** 0
- **Impacto:** 🔥🔥 Garantiza solidez inferior

### ✅ `--extra-perimeters`
**Descripción:** Añade perímetros extra en paredes inclinadas para evitar huecos.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** ACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥🔥🔥 Elimina gaps en paredes

### ✅ `--external-perimeters-first`
**Descripción:** Imprimir perímetros externos primero (mejor acabado pero menos precisión).
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** DESACTIVAR (dejar internos primero)
- **Default:** desactivado
- **Impacto:** 🔥 Trade-off acabado vs precisión

### ✅ `--only-one-perimeter-first-layer`
**Descripción:** Solo un perímetro en primera capa.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** DESACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥 Mejor adhesión con múltiples perímetros

---

## 3. Parámetros de Relleno

### ✅ `--fill-density N`
**Descripción:** Densidad de relleno interno.
- **Tipo:** int (%)
- **Recomendación CALIDAD:** 25-40%
- **Recomendación RESISTENCIA:** 40-60%
- **Default:** 20%
- **Impacto:** 🔥🔥🔥 Resistencia y tiempo

### ✅ `--fill-pattern PATTERN`
**Descripción:** Patrón de relleno.
- **Tipo:** string
- **Opciones:** rectilinear, alignedrectilinear, grid, triangles, stars, cubic, line, concentric, **honeycomb**, 3dhoneycomb, **gyroid**, hilbertcurve, archimedeanchords, octagramspiral, adaptivecubic, supportcubic, lightning, zigzag
- **Recomendación CALIDAD + RESISTENCIA:** gyroid, honeycomb, 3dhoneycomb
- **Recomendación VELOCIDAD:** rectilinear, grid
- **Default:** stars
- **Impacto:** 🔥🔥🔥 Resistencia y apariencia

### ✅ `--fill-angle N`
**Descripción:** Ángulo base del patrón de relleno.
- **Tipo:** int (grados)
- **Recomendación CALIDAD:** 45° (default)
- **Default:** 45
- **Impacto:** 🔥 Distribución de fuerzas

### ✅ `--infill-overlap N`
**Descripción:** Solapamiento entre relleno y perímetros para mejor unión.
- **Tipo:** float (mm o %)
- **Recomendación CALIDAD:** 25-35%
- **Default:** 25%
- **Impacto:** 🔥🔥 Unión relleno-perímetros

### ✅ `--infill-first`
**Descripción:** Imprimir relleno antes que perímetros.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** DESACTIVAR (perímetros primero)
- **Default:** desactivado
- **Impacto:** 🔥 Mejor acabado con perímetros primero

---

## 4. Parámetros de Soportes

### ✅ `--support-material`
**Descripción:** Habilitar generación de soportes.
- **Tipo:** bool (1/0)
- **Valores:** 1 (activado), 0 (desactivado)
- **Recomendación CALIDAD:** Activar solo si necesario
- **Default:** 0
- **Impacto:** 🔥🔥🔥 Crítico para voladizos

### ✅ `--support-material-pattern PATTERN`
**Descripción:** Patrón de soportes.
- **Tipo:** string
- **Opciones:** rectilinear, rectilinear-grid, honeycomb, lightning
- **Recomendación CALIDAD:** honeycomb (más resistente)
- **Recomendación FÁCIL REMOVER:** rectilinear
- **Default:** rectilinear
- **Impacto:** 🔥🔥 Facilidad de remoción

### ✅ `--support-material-threshold N`
**Descripción:** Ángulo mínimo para generar soportes.
- **Tipo:** int (grados)
- **Recomendación CALIDAD:** 45-50° (menos soportes)
- **Recomendación SEGURO:** 40-45°
- **Default:** 0 (45°)
- **Impacto:** 🔥🔥 Balance calidad/tiempo

### ✅ `--support-material-spacing N`
**Descripción:** Espaciado entre líneas de soporte.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 2.0-2.5mm
- **Default:** 2.5mm
- **Impacto:** 🔥 Facilidad de remoción

### ✅ `--support-material-contact-distance N`
**Descripción:** Distancia vertical entre soporte y pieza.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0.2mm (fácil remover)
- **Recomendación RESISTENTE:** 0.1mm
- **Default:** 0.2mm
- **Impacto:** 🔥🔥 Trade-off remoción vs calidad

### ✅ `--support-material-interface-layers N`
**Descripción:** Capas de interfaz entre soporte y pieza.
- **Tipo:** int
- **Recomendación CALIDAD:** 3-5 capas
- **Default:** 3
- **Impacto:** 🔥🔥 Facilita remoción

---

## 5. Parámetros de Velocidad

### ✅ `--perimeter-speed N`
**Descripción:** Velocidad de perímetros externos.
- **Tipo:** float (mm/s)
- **Recomendación CALIDAD:** 30-40 mm/s
- **Recomendación VELOCIDAD:** 50-60 mm/s
- **Default:** 60 mm/s
- **Impacto:** 🔥🔥🔥🔥 CRÍTICO para acabado

### ✅ `--external-perimeter-speed N`
**Descripción:** Velocidad de perímetros externos visibles.
- **Tipo:** float (mm/s o %)
- **Recomendación CALIDAD:** 25-30 mm/s (50-60% de perimeter-speed)
- **Default:** 50%
- **Impacto:** 🔥🔥🔥🔥🔥 MÁXIMO IMPACTO en calidad visual

### ✅ `--infill-speed N`
**Descripción:** Velocidad de relleno interno.
- **Tipo:** float (mm/s)
- **Recomendación CALIDAD:** 60-80 mm/s
- **Default:** 80 mm/s
- **Impacto:** 🔥 Relleno no visible, puede ser rápido

### ✅ `--travel-speed N`
**Descripción:** Velocidad de movimientos sin extrusión.
- **Tipo:** float (mm/s)
- **Recomendación CALIDAD:** 120-150 mm/s
- **Default:** 130 mm/s
- **Impacto:** 🔥 Reduce tiempo sin afectar calidad

### ✅ `--first-layer-speed N`
**Descripción:** Velocidad de la primera capa.
- **Tipo:** float (mm/s o %)
- **Recomendación CALIDAD:** 15-20 mm/s (30-40% de velocidad normal)
- **Default:** 30 mm/s
- **Impacto:** 🔥🔥🔥 Adhesión crítica

### ✅ `--gap-fill-speed N`
**Descripción:** Velocidad para rellenar gaps pequeños.
- **Tipo:** float (mm/s)
- **Recomendación CALIDAD:** 15-20 mm/s (lento para precisión)
- **Default:** 20 mm/s
- **Impacto:** 🔥🔥 Elimina gaps finos

---

## 6. Parámetros de Puentes y Voladizos

### ✅ `--bridge-speed N`
**Descripción:** Velocidad para imprimir puentes.
- **Tipo:** float (mm/s)
- **Recomendación CALIDAD:** 40-60 mm/s
- **Default:** 60 mm/s
- **Impacto:** 🔥🔥🔥 Calidad de puentes

### ✅ `--bridge-flow-ratio N`
**Descripción:** Factor de flujo de material en puentes.
- **Tipo:** float
- **Recomendación CALIDAD:** 0.8-0.95 (menos material para tensar)
- **Default:** 1.0
- **Impacto:** 🔥🔥 Evita caída de puentes

### ✅ `--bridge-angle N`
**Descripción:** Ángulo de puentes (0 = automático).
- **Tipo:** float (grados)
- **Recomendación CALIDAD:** 0 (automático)
- **Default:** 0
- **Impacto:** 🔥 Auto es mejor

### ✅ `--thick-bridges`
**Descripción:** Puentes más gruesos y confiables pero menos estéticos.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** DESACTIVAR
- **Recomendación FUNCIONAL:** ACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥🔥 Trade-off resistencia vs apariencia

### ✅ `--overhangs`
**Descripción:** Ajustar flujo y ventilador para voladizos.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** ACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥🔥🔥 Mejora voladizos

### ✅ `--enable-dynamic-overhang-speeds`
**Descripción:** Control dinámico de velocidad en voladizos.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** ACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥🔥🔥 Ajusta velocidad según ángulo

### ✅ `--overhang-speed-0 N` ... `--overhang-speed-3 N`
**Descripción:** Velocidades para diferentes grados de voladizo (0-25%, 25-50%, 50-75%, 75-100%).
- **Tipo:** float (mm/s)
- **Recomendación CALIDAD:** 
  - overhang-speed-0: 15 mm/s (0-25% overlap)
  - overhang-speed-1: 20 mm/s (25-50%)
  - overhang-speed-2: 25 mm/s (50-75%)
  - overhang-speed-3: 30 mm/s (75-100%)
- **Default:** 0 (desactivado)
- **Impacto:** 🔥🔥🔥 Calidad de voladizos

---

## 7. Parámetros de Ventilador

### ✅ `--fan-always-on`
**Descripción:** Mantener ventilador siempre encendido.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD (PLA):** ACTIVAR
- **Recomendación CALIDAD (ABS):** DESACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥🔥🔥 Depende del material

### ✅ `--min-fan-speed N`
**Descripción:** Velocidad mínima del ventilador.
- **Tipo:** int (%)
- **Recomendación CALIDAD (PLA):** 60-80%
- **Recomendación CALIDAD (ABS):** 0-20%
- **Default:** 35%
- **Impacto:** 🔥🔥 Enfriamiento base

### ✅ `--max-fan-speed N`
**Descripción:** Velocidad máxima del ventilador.
- **Tipo:** int (%)
- **Recomendación CALIDAD (PLA):** 100%
- **Recomendación CALIDAD (ABS):** 30%
- **Default:** 100%
- **Impacto:** 🔥🔥 Enfriamiento máximo

### ✅ `--bridge-fan-speed N`
**Descripción:** Velocidad del ventilador en puentes.
- **Tipo:** int (%)
- **Recomendación CALIDAD:** 100% (máximo enfriamiento)
- **Default:** 100%
- **Impacto:** 🔥🔥🔥 Crítico para puentes

### ✅ `--disable-fan-first-layers N`
**Descripción:** Desactivar ventilador en las primeras N capas.
- **Tipo:** int (capas)
- **Recomendación CALIDAD:** 1-2 capas
- **Default:** 3
- **Impacto:** 🔥🔥 Mejor adhesión

### ✅ `--full-fan-speed-layer N`
**Descripción:** Capa donde ventilador alcanza velocidad máxima.
- **Tipo:** int
- **Recomendación CALIDAD:** 4-5 capas
- **Default:** 0 (inmediato después de disable-fan)
- **Impacto:** 🔥 Transición suave

### ✅ `--fan-below-layer-time N`
**Descripción:** Activar ventilador si tiempo de capa es menor a N segundos.
- **Tipo:** int (segundos)
- **Recomendación CALIDAD:** 60 segundos
- **Default:** 60
- **Impacto:** 🔥🔥 Evita warping en capas rápidas

### ✅ `--slowdown-below-layer-time N`
**Descripción:** Reducir velocidad si tiempo de capa es menor a N segundos.
- **Tipo:** int (segundos)
- **Recomendación CALIDAD:** 5 segundos
- **Default:** 5
- **Impacto:** 🔥🔥 Permite enfriamiento adecuado

---

## 8. Parámetros de Precisión y Resolución

### ✅ `--resolution N`
**Descripción:** Resolución mínima de detalle (simplifica STL).
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0 (sin simplificación)
- **Recomendación RENDIMIENTO:** 0.01mm
- **Default:** 0
- **Impacto:** 🔥🔥🔥 Preserva detalles finos

### ✅ `--gcode-resolution N`
**Descripción:** Desviación máxima del G-code respecto a la ruta completa.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0.0025mm - 0.005mm
- **Recomendación ESTÁNDAR:** 0.0125mm
- **Default:** 0.0125mm
- **Impacto:** 🔥🔥🔥🔥 CRÍTICO para curvas suaves

### ✅ `--xy-size-compensation N`
**Descripción:** Compensación de tamaño en plano XY.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0 (sin compensación)
- **Recomendación AJUSTE AGUJEROS:** -0.05mm a -0.1mm
- **Default:** 0
- **Impacto:** 🔥🔥 Precisión dimensional

### ✅ `--elephant-foot-compensation N`
**Descripción:** Compensación de "pata de elefante" en primera capa.
- **Tipo:** float (mm)
- **Recomendación CALIDAD:** 0.1mm - 0.2mm
- **Default:** 0
- **Impacto:** 🔥🔥🔥 Elimina abultamiento inferior

---

## 9. Parámetros de Ancho de Extrusión

### ✅ `--extrusion-width N`
**Descripción:** Ancho de extrusión por defecto.
- **Tipo:** float (mm o %)
- **Recomendación CALIDAD:** 0 (automático: 1.125 x nozzle)
- **Recomendación MANUAL:** 110-125% del nozzle diameter
- **Default:** 0 (auto)
- **Impacto:** 🔥🔥 Afecta flujo de material

### ✅ `--external-perimeter-extrusion-width N`
**Descripción:** Ancho de extrusión para perímetros externos.
- **Tipo:** float (mm o %)
- **Recomendación CALIDAD:** 100-110% del nozzle (más fino)
- **Default:** 0 (usa extrusion-width)
- **Impacto:** 🔥🔥🔥 Acabado superficial

### ✅ `--perimeter-extrusion-width N`
**Descripción:** Ancho de extrusión para perímetros internos.
- **Tipo:** float (mm o %)
- **Recomendación CALIDAD:** 110-120% del nozzle
- **Default:** 0 (usa extrusion-width)
- **Impacto:** 🔥🔥 Resistencia de paredes

### ✅ `--infill-extrusion-width N`
**Descripción:** Ancho de extrusión para relleno.
- **Tipo:** float (mm o %)
- **Recomendación CALIDAD:** 120-130% del nozzle (más grueso, más rápido)
- **Default:** 0 (usa extrusion-width)
- **Impacto:** 🔥 Relleno interno

### ✅ `--solid-infill-extrusion-width N`
**Descripción:** Ancho de extrusión para relleno sólido (top/bottom).
- **Tipo:** float (mm o %)
- **Recomendación CALIDAD:** 105-115% del nozzle
- **Default:** 0 (usa extrusion-width)
- **Impacto:** 🔥🔥 Superficies sólidas

### ✅ `--top-infill-extrusion-width N`
**Descripción:** Ancho de extrusión para capas superiores.
- **Tipo:** float (mm o %)
- **Recomendación CALIDAD:** 100-110% del nozzle (más fino para mejor acabado)
- **Default:** 0 (usa solid-infill-extrusion-width)
- **Impacto:** 🔥🔥🔥 Acabado superior

---

## 10. Parámetros de Costura y Acabado

### ✅ `--seam-position POSITION`
**Descripción:** Posición de inicio de perímetros (costura).
- **Tipo:** string
- **Opciones:** random, nearest, aligned, rear
- **Recomendación CALIDAD:** aligned (alineado en esquina trasera)
- **Recomendación ESTÉTICA:** rear (parte trasera)
- **Default:** aligned
- **Impacto:** 🔥🔥🔥 Visibilidad de costura

### ✅ `--gap-fill-enabled`
**Descripción:** Habilitar relleno de gaps entre perímetros.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** ACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥🔥🔥 Elimina huecos visibles

### ✅ `--thin-walls`
**Descripción:** Detectar paredes delgadas e imprimir una sola pasada.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** ACTIVAR
- **Default:** activado
- **Impacto:** 🔥🔥 Preserva detalles finos

### ✅ `--perimeter-generator GENERATOR`
**Descripción:** Generador de perímetros.
- **Tipo:** string
- **Opciones:** classic, arachne
- **Recomendación CALIDAD:** arachne (nuevo, mejor para detalles)
- **Default:** classic
- **Impacto:** 🔥🔥🔥 Calidad de paredes

### ✅ `--avoid-crossing-perimeters`
**Descripción:** Evitar cruzar perímetros en movimientos de viaje.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** ACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥🔥 Reduce marcas en superficie

### ✅ `--avoid-crossing-curled-overhangs`
**Descripción:** Evitar cruzar voladizos curvados.
- **Tipo:** bool (flag)
- **Recomendación CALIDAD:** ACTIVAR
- **Default:** desactivado
- **Impacto:** 🔥🔥 Evita colisiones con voladizos

---

## 📊 Resumen: Configuración de Máxima Calidad

### 🔥 Parámetros CRÍTICOS (máximo impacto):

```bash
# CAPAS (Calidad visual máxima)
--layer-height 0.12                    # ⭐⭐⭐⭐⭐
--first-layer-height 0.2               # ⭐⭐⭐⭐⭐
--gcode-resolution 0.005               # ⭐⭐⭐⭐⭐

# PERÍMETROS (Acabado superficial)
--perimeters 5                         # ⭐⭐⭐⭐⭐
--external-perimeter-speed 25          # ⭐⭐⭐⭐⭐
--top-solid-layers 6                   # ⭐⭐⭐⭐
--bottom-solid-layers 6                # ⭐⭐⭐⭐
--extra-perimeters                     # ⭐⭐⭐⭐

# RELLENO (Resistencia y acabado)
--fill-density 30                      # ⭐⭐⭐⭐
--fill-pattern gyroid                  # ⭐⭐⭐⭐
--infill-overlap 30%                   # ⭐⭐⭐

# VELOCIDAD (Calidad antes que velocidad)
--perimeter-speed 35                   # ⭐⭐⭐⭐
--external-perimeter-speed 25          # ⭐⭐⭐⭐⭐
--first-layer-speed 15                 # ⭐⭐⭐⭐
--gap-fill-speed 15                    # ⭐⭐⭐

# PUENTES Y VOLADIZOS
--bridge-speed 50                      # ⭐⭐⭐
--bridge-flow-ratio 0.9                # ⭐⭐⭐
--overhangs                            # ⭐⭐⭐⭐
--enable-dynamic-overhang-speeds       # ⭐⭐⭐⭐

# VENTILADOR (PLA)
--min-fan-speed 70                     # ⭐⭐⭐
--max-fan-speed 100                    # ⭐⭐⭐
--bridge-fan-speed 100                 # ⭐⭐⭐
--disable-fan-first-layers 1           # ⭐⭐⭐

# ACABADO
--seam-position aligned                # ⭐⭐⭐
--gap-fill-enabled                     # ⭐⭐⭐⭐
--avoid-crossing-perimeters            # ⭐⭐⭐
--perimeter-generator arachne          # ⭐⭐⭐⭐
--elephant-foot-compensation 0.15      # ⭐⭐⭐
```

---

## 🎯 Configuración por Objetivo

### Máxima Calidad Visual (showcase, venta)
```bash
--layer-height 0.08
--perimeters 6
--top-solid-layers 8
--bottom-solid-layers 8
--external-perimeter-speed 20
--perimeter-speed 30
--gcode-resolution 0.0025
--elephant-foot-compensation 0.2
```

### Balance Calidad/Tiempo (producción)
```bash
--layer-height 0.12
--perimeters 4
--top-solid-layers 5
--bottom-solid-layers 5
--external-perimeter-speed 25
--perimeter-speed 35
--gcode-resolution 0.005
```

### Resistencia Mecánica (funcional)
```bash
--layer-height 0.2
--perimeters 5
--fill-density 40
--fill-pattern gyroid
--top-solid-layers 6
--bottom-solid-layers 6
--extra-perimeters
```

---

## 🚀 Implementación Sugerida

### Fase 1: Parámetros Básicos (YA IMPLEMENTADOS) ✅
- layer-height
- first-layer-height
- perimeters
- fill-density
- fill-pattern
- brim-width
- temperatures

### Fase 2: Parámetros de Calidad (PROPUESTA)
- gcode-resolution (🔥🔥🔥🔥🔥)
- external-perimeter-speed (🔥🔥🔥🔥🔥)
- top-solid-layers / bottom-solid-layers (🔥🔥🔥🔥)
- extra-perimeters (🔥🔥🔥)
- gap-fill-enabled (🔥🔥🔥)
- seam-position (🔥🔥🔥)

### Fase 3: Parámetros Avanzados
- bridge-speed / bridge-flow-ratio
- overhangs / enable-dynamic-overhang-speeds
- avoid-crossing-perimeters
- perimeter-generator arachne
- elephant-foot-compensation

### Fase 4: Parámetros de Ventilador
- min-fan-speed / max-fan-speed
- bridge-fan-speed
- disable-fan-first-layers

---

## 📝 Notas Importantes

1. **Trade-offs:**
   - Más calidad = Más tiempo de impresión
   - Layer height 0.08mm puede ser 3-4x más lento que 0.2mm

2. **Dependencias de Material:**
   - PLA: ventilador alto (80-100%)
   - ABS: ventilador bajo (0-30%)
   - PETG: ventilador medio (30-50%)

3. **Limitaciones de Hardware:**
   - Algunos parámetros requieren firmware compatible (ej: arc-fitting)
   - Velocidades muy bajas pueden causar "heat creep"

4. **Compatibilidad:**
   - Todos los parámetros listados son compatibles con PrusaSlicer 2.8.1
   - Algunos pueden no estar disponibles en versiones anteriores

---

**Generado:** Octubre 26, 2025
**Fuente:** PrusaSlicer 2.8.1 `--help-fff`
**Estado:** Documentación completa para implementación
