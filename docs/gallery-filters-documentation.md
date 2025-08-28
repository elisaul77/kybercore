# 🎯 Funcionalidad de Filtros y Búsqueda - Galería KyberCore

## Descripción General

La funcionalidad de filtros y búsqueda permite a los usuarios encontrar rápidamente proyectos específicos en la galería mediante diferentes criterios de filtrado y búsqueda en tiempo real.

## Características Implementadas

### 🔍 Búsqueda en Tiempo Real
- **Campo de búsqueda**: Busca por nombre del proyecto o descripción
- **Búsqueda insensible a mayúsculas/minúsculas**
- **Actualización automática** mientras se escribe (con debounce de 300ms)

### 🎛️ Filtros Avanzados
- **Filtro por tipo**: Mecánico, Decorativo, Funcional, Herramientas, Prototipo
- **Filtro por estado**: Completado, En progreso, Listo, Problemas
- **Opción "Todos"** para mostrar todos los elementos en cada categoría

### 📊 Ordenamiento
- **Por fecha de creación** (más reciente primero)
- **Por nombre** (A-Z)
- **Por estado**
- **Por tipo**

### 📈 Estadísticas en Tiempo Real
- Contador de proyectos filtrados vs total
- Actualización automática al aplicar filtros

## Archivos Implementados

### 1. `gallery_filters.js`
**Ubicación**: `/src/web/static/js/modules/gallery/gallery_filters.js`

Módulo principal que maneja toda la lógica de filtrado y búsqueda:

```javascript
// Inicialización
window.GalleryFilters.init();

// Limpiar filtros
window.GalleryFilters.clearFilters();

// Recargar proyectos (útil cuando se agregan nuevos proyectos)
window.GalleryFilters.reloadProjects();
```

### 2. `gallery_dynamic.html` (Actualizado)
**Ubicación**: `/src/web/templates/modules/gallery_dynamic.html`

- Agregados IDs a todos los elementos de filtro
- Agregado contenedor de estadísticas
- Integración con el módulo JavaScript

### 3. `gallery_functions.js` (Actualizado)
**Ubicación**: `/src/web/static/js/modules/gallery/gallery_functions.js`

- Integración automática del módulo de filtros
- Carga dinámica del script de filtros
- Inicialización coordinada con el sistema de galería

## Estructura HTML Requerida

```html
<!-- Contenedor de filtros -->
<div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Búsqueda -->
        <input type="text" id="gallery-search-input" placeholder="Nombre o descripción...">
        
        <!-- Filtro por tipo -->
        <select id="gallery-type-filter">
            <option>Todos los tipos</option>
            <option>Mecánico</option>
            <!-- ... más opciones -->
        </select>
        
        <!-- Filtro por estado -->
        <select id="gallery-status-filter">
            <option>Todos los estados</option>
            <option>completado</option>
            <!-- ... más opciones -->
        </select>
        
        <!-- Ordenamiento -->
        <select id="gallery-sort-select">
            <option>Fecha de creación</option>
            <option>Nombre (A-Z)</option>
            <!-- ... más opciones -->
        </select>
    </div>
    
    <!-- Estadísticas -->
    <div class="mt-4 flex justify-between items-center text-sm text-gray-600">
        <span id="gallery-filter-stats">0 proyectos</span>
        <button onclick="GalleryFilters.clearFilters()">Limpiar filtros</button>
    </div>
</div>

<!-- Contenedor de proyectos -->
<div id="gallery-projects-container">
    <!-- Los proyectos se renderizan aquí -->
</div>
```

## Funcionamiento Técnico

### 1. Inicialización
```javascript
// Se ejecuta automáticamente al cargar la galería
initGalleryFilters() // Carga el módulo dinámicamente
window.GalleryFilters.init() // Inicializa el módulo
```

### 2. Flujo de Filtrado
1. **Usuario interactúa** con input/select
2. **Evento se dispara** (input/change)
3. **Filtros se aplican** con debounce (búsqueda) o inmediatamente
4. **Proyectos se filtran y ordenan**
5. **DOM se actualiza** mostrando/ocultando elementos
6. **Estadísticas se actualizan**

### 3. Optimizaciones Implementadas
- **Debounce** en búsqueda para evitar llamadas excesivas
- **Cache de elementos DOM** para mejor rendimiento
- **Prevención de duplicados** en listeners
- **Carga dinámica** del módulo para mejor organización

## Casos de Uso

### Búsqueda Básica
```javascript
// El usuario escribe en el campo de búsqueda
// Se filtra automáticamente por nombre y descripción
```

### Filtros Combinados
```javascript
// Usuario selecciona:
// - Tipo: "Mecánico"
// - Estado: "completado"
// - Orden: "Nombre (A-Z)"
// Resultado: Solo proyectos mecánicos completados, ordenados alfabéticamente
```

### Limpieza de Filtros
```javascript
// Un clic en "Limpiar filtros" resetea todos los criterios
window.GalleryFilters.clearFilters();
```

## Extensibilidad

### Agregar Nuevos Filtros
1. Agregar opción al HTML correspondiente
2. Actualizar `currentFilters` en el módulo
3. Implementar lógica de filtrado en `applyFilters()`
4. Agregar función helper para extraer el dato del DOM

### Personalizar Ordenamiento
1. Agregar opción al select de ordenamiento
2. Implementar lógica en `sortProjects()`
3. Considerar el tipo de dato (string, date, number)

## Depuración

### Consola de Desarrollo
```javascript
// Ver estado actual de filtros
console.log(window.GalleryFilters.getCurrentFilters());

// Ver estadísticas
console.log('Filtrados:', window.GalleryFilters.getFilteredCount());
console.log('Total:', window.GalleryFilters.getTotalCount());

// Recargar proyectos manualmente
window.GalleryFilters.reloadProjects();
```

### Mensajes de Debug
El módulo incluye logs detallados con emojis para fácil identificación:
- 🎯 Inicialización
- 🔍 Aplicación de filtros
- 📦 Carga de proyectos
- ✅ Operaciones exitosas
- ❌ Errores

## Compatibilidad

- ✅ Navegadores modernos con ES6+
- ✅ Funciona sin JavaScript (elementos ocultos)
- ✅ Responsive design
- ✅ Accesibilidad básica (labels, keyboard navigation)

## Próximas Mejoras Sugeridas

1. **Búsqueda Avanzada**: Operadores booleanos (AND, OR, NOT)
2. **Filtros por Fecha**: Rango de fechas de creación/modificación
3. **Etiquetas Personalizadas**: Sistema de tags para proyectos
4. **Búsqueda por Archivo**: Buscar dentro de nombres de archivos STL
5. **Favoritos**: Filtro rápido para proyectos marcados como favoritos
6. **Historial**: Recordar últimos filtros usados
7. **Exportar Filtros**: Guardar y compartir configuraciones de filtro
