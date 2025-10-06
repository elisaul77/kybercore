# 🎨 Auto-Plating: Organización Automática de Piezas en el Plato

## 📋 Descripción General

El **Auto-Plating** es una funcionalidad que permite combinar múltiples piezas STL en un solo archivo G-code, organizándolas automáticamente en el plato de impresión para maximizar el aprovechamiento del espacio.

## 🎯 Objetivos

1. **Reducir tiempo total de impresión** al eliminar tiempos muertos entre impresiones secuenciales
2. **Optimizar uso del plato** mediante algoritmos de bin-packing
3. **Simplificar el flujo** generando un solo archivo G-code en lugar de múltiples
4. **Mejorar experiencia del usuario** con una opción clara y visual

## 🔄 Flujo de Usuario

### Ubicación de la Opción

El usuario puede habilitar Auto-Plating en **DOS lugares**:

#### **Paso 1: Selección de Piezas** ⭐ (Recomendado)
- Checkbox prominente antes de la lista de piezas
- Decisión temprana que afecta todo el flujo
- UI clara con ventajas y consideraciones

#### **Paso 5: Procesamiento STL** (Alternativa)
- Checkbox adicional junto a auto-rotación
- Permite activar/desactivar incluso si no se eligió en Paso 1
- Muestra estado si ya fue habilitado anteriormente

### Experiencia Visual

```
╔══════════════════════════════════════════════════════════╗
║  🎨 Organizar todas las piezas en el mismo plato        ║
║     automáticamente                                [✓]   ║
║  ────────────────────────────────────────────────────    ║
║  Las piezas seleccionadas se combinarán y organizarán   ║
║  inteligentemente en el plato de impresión, generando   ║
║  un solo archivo G-code optimizado.                     ║
║                                                           ║
║  ✅ Ventajas:                                            ║
║    • Una sola impresión en lugar de varias              ║
║    • Optimización automática del espacio                ║
║    • Ahorro de tiempo (sin cambios de pieza)            ║
║                                                           ║
║  ⚠️ Consideraciones:                                     ║
║    • Todas las piezas deben caber en el plato           ║
║    • Si una pieza falla, afecta toda la impresión       ║
╚══════════════════════════════════════════════════════════╝
```

## 🛠️ Implementación Técnica

### Frontend

**Variables globales:**
```javascript
window.autoPlatingEnabled = false  // Se establece en Paso 1
```

**Configuración enviada al backend:**
```javascript
plating_config: {
    enabled: true,              // Activar auto-plating
    algorithm: 'bin-packing',   // Algoritmo de organización
    spacing: 3,                 // mm de separación entre piezas
    optimize_rotation: true     // Rotar piezas para mejor encaje
}
```

### Backend (Pendiente de Implementación)

**Ubicación sugerida:** `src/services/plating_service.py`

**Funciones necesarias:**

```python
class PlatingService:
    """
    Servicio para organizar múltiples archivos STL en un solo plato.
    """
    
    def combine_stl_files(
        self, 
        stl_files: List[str], 
        bed_size: Tuple[float, float],
        spacing: float = 3.0,
        algorithm: str = 'bin-packing'
    ) -> str:
        """
        Combina múltiples archivos STL en uno solo organizándolos en el plato.
        
        Args:
            stl_files: Lista de rutas a archivos STL
            bed_size: Dimensiones del plato (ancho, profundidad) en mm
            spacing: Separación mínima entre piezas en mm
            algorithm: 'bin-packing', 'grid', o 'spiral'
            
        Returns:
            Ruta al archivo STL combinado
        """
        pass
    
    def calculate_positions(
        self,
        pieces_dims: List[Dict],
        bed_size: Tuple[float, float],
        spacing: float
    ) -> List[Dict]:
        """
        Calcula posiciones óptimas para cada pieza usando bin-packing.
        
        Returns:
            Lista de posiciones [{'x': float, 'y': float, 'rotation': float}]
        """
        pass
    
    def verify_fit(
        self,
        pieces_dims: List[Dict],
        bed_size: Tuple[float, float]
    ) -> Tuple[bool, str]:
        """
        Verifica si todas las piezas caben en el plato.
        
        Returns:
            (success: bool, message: str)
        """
        pass
```

### Algoritmos de Organización

#### 1. **Bin-Packing** (Recomendado)
- Algoritmo: First-Fit Decreasing (FFD)
- Ordena piezas por tamaño (mayor a menor)
- Coloca cada pieza en la primera posición válida
- **Ventaja:** Balance entre velocidad y optimización

#### 2. **Grid**
- Organiza piezas en una cuadrícula regular
- **Ventaja:** Simple y predecible
- **Desventaja:** Puede desperdiciar espacio

#### 3. **Spiral**
- Coloca piezas en espiral desde el centro
- **Ventaja:** Estético y simétrico
- **Desventaja:** No siempre óptimo

## 📊 Configuración del Backend

**Archivo:** `src/models/task_models.py`

```python
class PlatingConfig(BaseModel):
    """Configuración para auto-plating"""
    enabled: bool = False
    algorithm: str = 'bin-packing'
    spacing: float = 3.0  # mm
    optimize_rotation: bool = True
```

**Actualizar:** `src/models/task_models.py` - `ProcessWithRotationRequest`

```python
class ProcessWithRotationRequest(BaseModel):
    session_id: str
    rotation_config: Dict[str, Any]
    plating_config: PlatingConfig = PlatingConfig()  # 🆕 AÑADIR
    profile_config: Dict[str, Any]
```

## 🔧 Integración con Rotation Worker

**Archivo:** `src/services/rotation_worker.py`

Modificar `process_batch()` para detectar auto-plating:

```python
async def process_batch(
    self,
    task_id: str,
    session_id: str,
    files: List[str],
    rotation_config: Dict[str, Any],
    plating_config: Dict[str, Any],  # 🆕 NUEVO PARÁMETRO
    profile_config: Dict[str, Any]
):
    # Si auto-plating está habilitado
    if plating_config.get('enabled', False):
        # Combinar archivos STL antes de procesar
        combined_stl = await self.plating_service.combine_stl_files(
            stl_files=files,
            bed_size=self._get_bed_size(session_id),
            spacing=plating_config.get('spacing', 3.0),
            algorithm=plating_config.get('algorithm', 'bin-packing')
        )
        
        # Procesar el archivo combinado como un solo job
        result = await self._process_single_file(
            filename='combined_plate.stl',
            session_id=session_id,
            # ... resto de parámetros
        )
    else:
        # Flujo normal: procesar archivos individualmente
        # ... código existente
```

## 📦 Librerías Recomendadas

### Python (Backend)

1. **trimesh** - Manipulación de archivos STL
```bash
pip install trimesh
```

2. **numpy-stl** - Lectura/escritura de STL
```bash
pip install numpy-stl
```

3. **rectpack** - Algoritmos de bin-packing 2D
```bash
pip install rectpack
```

### Ejemplo de Código

```python
import trimesh
from rectpack import newPacker

def combine_stls(stl_files, bed_size=(220, 220), spacing=3):
    """Combina múltiples STL organizándolos en el plato"""
    
    # 1. Cargar todos los meshes
    meshes = [trimesh.load(f) for f in stl_files]
    
    # 2. Obtener dimensiones de cada pieza
    bounds = [m.bounds for m in meshes]
    rectangles = [(b[1][0] - b[0][0] + spacing, 
                   b[1][1] - b[0][1] + spacing) 
                  for b in bounds]
    
    # 3. Calcular posiciones con bin-packing
    packer = newPacker()
    for i, rect in enumerate(rectangles):
        packer.add_rect(*rect, rid=i)
    packer.add_bin(*bed_size)
    packer.pack()
    
    # 4. Aplicar transformaciones y combinar
    combined = trimesh.Trimesh()
    for rect in packer[0]:
        x, y, w, h, rid = rect
        mesh = meshes[rid]
        mesh.apply_translation([x, y, 0])
        combined += mesh
    
    return combined
```

## ✅ Checklist de Implementación

### Fase 1: UI y Configuración ✅
- [x] Añadir checkbox en Paso 1 (Selección de Piezas)
- [x] Añadir checkbox en Paso 5 (Procesamiento STL)
- [x] Capturar configuración y enviar al backend
- [x] Añadir UI explicativa con ventajas/consideraciones

### Fase 2: Backend Core
- [ ] Crear `PlatingService` en `src/services/plating_service.py`
- [ ] Implementar `combine_stl_files()` usando trimesh
- [ ] Implementar algoritmo bin-packing con rectpack
- [ ] Añadir validación de dimensiones del plato

### Fase 3: Integración
- [ ] Modificar `rotation_worker.py` para detectar plating
- [ ] Actualizar modelos Pydantic (`PlatingConfig`)
- [ ] Añadir manejo de errores (piezas no caben)

### Fase 4: Testing
- [ ] Tests unitarios para `PlatingService`
- [ ] Tests de integración con archivos reales
- [ ] Validar con diferentes tamaños de plato

### Fase 5: Documentación
- [x] Documentación técnica (este archivo)
- [ ] Guía de usuario
- [ ] Ejemplos visuales

## 🎯 Casos de Uso

### Caso 1: Proyecto con múltiples piezas pequeñas
**Escenario:** 8 piezas de 20x20mm cada una
**Plato:** 220x220mm
**Resultado:** Todas las piezas se organizan en el plato, ahorrando ~7 horas de tiempo entre impresiones

### Caso 2: Piezas que no caben
**Escenario:** 3 piezas de 150x150mm cada una
**Plato:** 220x220mm
**Resultado:** Error claro indicando que las piezas no caben, sugerencia de imprimir por separado

### Caso 3: Combinación con auto-rotación
**Escenario:** 4 piezas con orientación no óptima
**Resultado:** Primero se rotan para mejor adhesión, luego se organizan en el plato

## 📚 Referencias

- [Bin Packing Problem](https://en.wikipedia.org/wiki/Bin_packing_problem)
- [Trimesh Documentation](https://trimsh.org/)
- [PrusaSlicer Auto-Arrange](https://help.prusa3d.com/article/arrange_177166)
- [Cura Auto-Arrange Feature](https://github.com/Ultimaker/Cura/blob/master/plugins/3MFReader/ThreeMFReader.py)

## 🚀 Próximos Pasos

1. **Implementar backend** siguiendo esta especificación
2. **Instalar dependencias:** `pip install trimesh numpy-stl rectpack`
3. **Crear servicio de plating**
4. **Integrar con rotation_worker**
5. **Probar con casos reales**

---

**Autor:** KyberCore Team  
**Fecha:** Octubre 2025  
**Versión:** 1.0  
