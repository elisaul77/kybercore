# 🧠 Sistema Inteligente de Análisis de Soportes

## Visión General

KyberCore incorpora un sistema avanzado de análisis geométrico que detecta automáticamente cuándo un modelo 3D necesita soportes y recomienda la configuración óptima.

## 🎯 Características Principales

### 1. **Análisis Geométrico Avanzado**
- ✅ **Detección de voladizos (overhangs)**: Calcula ángulos de cada superficie
- ✅ **Identificación de islas flotantes**: Detecta partes sin contacto con la base
- ✅ **Cálculo de áreas críticas**: Mide mm² de superficie que requiere soporte
- ✅ **Análisis de ángulos**: Clasifica superficies según criticidad (0-45°, 45-90°, 90-180°)

### 2. **Recomendaciones Inteligentes**
El sistema recomienda automáticamente:
- **Tipo de soporte**: `tree`, `linear`, `grid` o `none`
- **Densidad óptima**: 10-30% según área crítica
- **Configuración de interfaz**: Z-distance, ángulo de branches
- **Sugerencias de orientación**: Si rotar el modelo reduciría soportes

### 3. **Tres Modos de Operación**

#### 🤖 Modo Automático (Recomendado)
```javascript
// Usuario NO especifica soportes → IA decide
profile_config: {
    enable_auto_support_analysis: true,  // ✅ Habilitado por defecto
    support_type: "none"  // Sin especificar
}
```
**Resultado**: La IA analiza el STL y aplica automáticamente la configuración óptima.

#### 👤 Modo Manual
```javascript
// Usuario especifica soportes → IA respeta
profile_config: {
    enable_auto_support_analysis: true,  // Puede estar habilitado
    support_type: "tree",  // Usuario configuró
    support_density: 20
}
```
**Resultado**: Se usa la configuración del usuario. La IA solo informa recomendaciones en logs.

#### ⏸️ Modo Deshabilitado
```javascript
// Usuario desactiva el análisis
profile_config: {
    enable_auto_support_analysis: false,  // ❌ Deshabilitado
    support_type: "none"
}
```
**Resultado**: No se ejecuta análisis. Se usa configuración por defecto del perfil.

## 📐 Algoritmo de Análisis

### Paso 1: Análisis de Normales
```python
# Calcular ángulo entre normal de superficie y vector vertical
angles = arccos(dot(face_normals, [0, 0, 1]))

# Clasificar superficies
safe_faces = angles <= 45°        # No necesita soporte
moderate_overhang = 45° < angles <= 90°  # Soporte moderado
critical_overhang = angles > 90°         # Soporte crítico
```

### Paso 2: Detección de Islas
```python
# Encontrar componentes conectados
components = mesh.split()

# Identificar componentes sin contacto con la base
for component in components:
    if component.bounds[0][2] > base_threshold:
        # Esta es una isla flotante → REQUIERE soporte
        islands.append(component)
```

### Paso 3: Determinación de Tipo
```python
if len(islands) > 0:
    support_type = "tree"  # Eficiente para islas
    density = 15
elif critical_area > 100:
    support_type = "linear"  # Estable para áreas grandes
    density = 25
elif overhang_percentage > 20:
    support_type = "tree"  # Fácil de remover
    density = 20
else:
    support_type = "none"
    density = 0
```

## 🔌 Integración en el Flujo

### Frontend (Wizard Paso 5)
```html
<!-- Checkbox en la UI -->
<input type="checkbox" 
       id="enable-auto-support-analysis-step5" 
       checked>  <!-- ✅ Habilitado por defecto -->
```

### Backend (rotation_worker.py)
```python
# Solo analizar si está habilitado Y usuario no especificó soportes
enable_auto_support_analysis = profile_config.get('enable_auto_support_analysis', True)
current_support = profile_config.get('support_type', 'none')
should_analyze = enable_auto_support_analysis and current_support == 'none'

if should_analyze:
    # Ejecutar análisis
    support_analysis = support_analyzer.analyze_stl(stl_path)
    
    # Aplicar recomendaciones automáticamente
    if support_analysis['needs_support']:
        profile_config['support_type'] = support_analysis['support_type']
        profile_config['support_density'] = support_analysis['support_density']
```

## 📊 Ejemplo de Resultado de Análisis

```json
{
  "needs_support": true,
  "support_type": "tree",
  "support_density": 15,
  "overhang_analysis": {
    "overhang_percentage": 12.5,
    "max_angle": 85.3,
    "critical_area_mm2": 450.2,
    "overhang_face_count": 328
  },
  "critical_regions": [
    {
      "id": 0,
      "center": [12.5, 8.3, 45.2],
      "approximate_size": 125.6
    }
  ],
  "recommendations": [
    "🌳 Usar soportes tipo ÁRBOL (tree) con densidad 15%",
    "   Ventaja: Más fáciles de remover, menos marcas en la pieza",
    "⚠️  12.5% del modelo son voladizos - Considerar rotar el modelo",
    "🔧 Interface Z: 0.2mm (facilita remoción de soportes)",
    "🔧 Branch angle: 45° (óptimo para estabilidad)"
  ],
  "statistics": {
    "total_faces": 2640,
    "total_area_mm2": 3600.5,
    "volume_mm3": 8500.2,
    "overhang_faces": 328,
    "floating_islands": 0
  }
}
```

## 🔍 Endpoint de Análisis Manual

Para probar el análisis sin aplicarlo:

```bash
# Analizar un STL manualmente
curl -X POST http://localhost:8001/api/analyze-support \
  -F "file=@modelo.stl"
```

**Interfaz web de prueba**: `test_support_analysis.html`

## 📝 Logs del Sistema

### Cuando el análisis está habilitado:
```
🧠 Analizando necesidad de soportes (auto-detección habilitada)...
   📐 Analizando geometría de: temp_analysis_pieza.stl
   ✅ Aplicando soportes recomendados: tree @ 15%
   📋 Recomendaciones:
      🌳 Usar soportes tipo ÁRBOL (tree) con densidad 15%
      ⚠️  12.5% del modelo son voladizos
      💡 Sugerencia: Probar auto-rotación para reducir área de voladizos
```

### Cuando el usuario configuró manualmente:
```
👤 Usuario configuró soportes manualmente: linear
   ℹ️  Análisis automático omitido (respetando configuración manual)
```

### Cuando está deshabilitado:
```
⏸️  Análisis automático de soportes deshabilitado
```

## 🎛️ Configuración Avanzada

### Ajustar Ángulo Crítico
```python
# Por defecto: 45°
support_analyzer = SupportAnalyzer(
    critical_angle=50.0,  # Más tolerante
    min_area=5.0
)
```

### Personalizar Decisiones
```python
def _determine_support_type(self, overhang_info, islands):
    # Lógica personalizada
    if my_custom_condition:
        return "custom", 25
    # ...
```

## 🚀 Ventajas del Sistema

1. **Ahorro de Material**: Si no se necesitan soportes, se desactivan automáticamente
2. **Optimización de Tiempo**: Menos soportes = impresión más rápida
3. **Mejor Calidad**: Tipo de soporte óptimo según geometría
4. **Flexibilidad**: Modo manual para usuarios avanzados
5. **Educativo**: Recomendaciones explican el por qué

## 📈 Roadmap Futuro

- [ ] Análisis de calidad de soporte (predicción de marcas)
- [ ] Recomendación de brim/raft según adhesión
- [ ] Integración con sistema de rotación automática
- [ ] Machine learning para aprender de prints anteriores
- [ ] Visualización 3D de regiones que necesitan soporte
- [ ] Estimación de tiempo/material de soportes

## 🔗 Archivos Relacionados

- **Analizador**: `src/services/support_analyzer.py`
- **Integración**: `src/services/rotation_worker.py` (líneas ~630-690)
- **API Endpoint**: `src/controllers/analysis_controller.py`
- **Frontend**: `src/web/static/js/modules/gallery/project_modal.js`
- **Test UI**: `test_support_analysis.html`

---

**Última actualización**: 29 de octubre de 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Implementado y funcional
