# Gallery Module - Estructura Modular

Este directorio contiene los componentes modulares del sistema de galería de proyectos de KyberCore.

## Estructura de Archivos

```
src/web/templates/modules/gallery/
├── README.md                    # Este archivo de documentación
├── project_modal.html          # Componente HTML del modal
├── project_modal.js            # Lógica del modal y funcionalidad
└── gallery_functions.js        # Funciones principales de la galería
```

## Componentes

### 1. `project_modal.html`
**Propósito**: Componente HTML del modal para vista detallada de proyectos.

**Características**:
- Modal responsive con diseño centrado
- Header con gradiente personalizado
- Área de contenido dinámico
- Botón de cierre integrado

**Uso**: Se incluye en `gallery_dynamic.html` usando `{% include %}` de Jinja2.

### 2. `project_modal.js`
**Propósito**: Clase JavaScript que maneja toda la funcionalidad del modal.

**Características**:

**Métodos principales**:

### 3. `gallery_functions.js`
Contiene las funciones principales de la galería en su variante modular. En este repositorio la decisión actual es usar el integrador único `gallery.js` (ubicado en `/static/js/gallery.js`) como punto de entrada por defecto para inicializar la galería y sus componentes. La variante modular (`/static/js/modules/gallery/gallery_functions.js` y `/static/js/modules/gallery/project_modal.js`) puede cargarse de forma opcional en páginas específicas si se desea una carga más granular.

**Características**:
- Sistema de notificaciones toast
- Funciones de simulación para botones del header

**Funciones principales**:
- `showProjectDetails()`: Muestra detalles en el modal
- `showToast()`: Sistema de notificaciones
- `createNewProject()`: Simulación de nuevo proyecto
- `analyzeAllProjects()`: Simulación de análisis IA
- `exportProject()`: Simulación de exportación
- `duplicateProject()`: Simulación de duplicación
- `deleteProject()`: Simulación de eliminación

## Integración

### En `gallery_dynamic.html`:

```html
<!-- Incluir el modal -->
{% include 'modules/gallery/project_modal.html' %}

<!-- Incluir JavaScript -->
<script src="/static/js/modules/gallery/project_modal.js"></script>
<script src="/static/js/modules/gallery/gallery_functions.js"></script>
```

### En el controlador Flask/FastAPI:

```python
# El modal se renderiza automáticamente como parte del template
# Las funciones JavaScript se cargan y están disponibles globalmente
```

## Datos del Proyecto

El modal espera un objeto `projectData` con la siguiente estructura:

```javascript
{
    id: 'proyecto-id',
    title: 'Nombre del Proyecto',
    icon: '📁',
    files: [
        { name: 'archivo.stl', size: '2.1 MB', validated: true }
    ],
    stats: {
        pieces: '5 piezas',
        totalTime: '8h 45m',
        filament: '120.5g',
        cost: '€3.25',
        volume: '45.3 cm³',
        created: '15 Jul 2025'
    },
    aiAnalysis: {
        sequence: 'Secuencia optimizada...',
        parallelization: 'Paralelización...',
        materials: 'Materiales...',
        postProcessing: 'Post-procesado...',
        estimatedTime: 'Tiempo estimado...'
    },
    status: {
        items: ['Estado 1', 'Estado 2', ...]
    }
}
```

## Ventajas de la Modularización

1. **Separación de responsabilidades**: Cada archivo tiene un propósito específico
2. **Mantenibilidad**: Código más fácil de leer y mantener
3. **Reutilización**: Componentes pueden ser reutilizados en otros módulos
4. **Testing**: Cada componente puede ser probado independientemente
5. **Escalabilidad**: Fácil agregar nuevas funcionalidades sin afectar otros componentes

## Notas de Desarrollo

- El modal usa clases de Tailwind CSS para el styling
- Las funciones están diseñadas para ser extensibles
- Se incluyen simulaciones para demostrar funcionalidad
- Los event listeners usan delegación para mejor rendimiento
- Compatible con el sistema de templates Jinja2 de KyberCore

## Próximas Mejoras

- [ ] Añadir animaciones de transición más suaves
- [ ] Implementar lazy loading para imágenes del proyecto
- [ ] Añadir soporte para vista 3D real de archivos STL
- [ ] Integrar con API real del backend
- [ ] Añadir funcionalidad de arrastrar y soltar archivos
- [ ] Implementar sistema de caché para datos del proyecto
