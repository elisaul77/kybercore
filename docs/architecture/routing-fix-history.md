# Corrección del Sistema de Routing de KyberCore

## 🔍 Problema Identificado

La aplicación KyberCore no mantenía las rutas en la URL y siempre recargaba desde el inicio (dashboard) al refrescar el navegador, independientemente del módulo en el que estuvieras.

### Causas Raíz:

1. **Navegación sin actualización de URL**: Los enlaces del sidebar usaban hashes (`#dashboard`, `#fleet`, etc.) pero el código JavaScript prevenía el comportamiento por defecto sin actualizar la URL
2. **Sin listener de hashchange**: No existía un manejador para detectar cambios en `window.location.hash`
3. **Carga inicial estática**: Siempre se cargaba el módulo "dashboard" sin considerar el hash actual de la URL

### Impacto:

- ❌ Al recargar la página desde cualquier módulo, siempre volvía al dashboard
- ❌ No se podía compartir enlaces directos a módulos específicos
- ❌ La navegación del navegador (botones atrás/adelante) no funcionaba
- ❌ Mala experiencia de usuario al perder el contexto tras recargar

## ✅ Solución Implementada

Se implementó un **sistema de routing basado en hash** que:

1. **Actualiza la URL al navegar**: Cada clic en un enlace del sidebar actualiza `window.location.hash`
2. **Escucha cambios en el hash**: Se añadió un listener para `hashchange` que detecta cambios en la URL
3. **Carga el módulo correcto al iniciar**: Al cargar la página, lee el hash actual y navega al módulo correspondiente
4. **Validación de módulos**: Verifica que el módulo solicitado existe, redirigiendo a dashboard si no es válido

### Cambios en `/src/web/static/js/app.js`:

```javascript
// ANTES:
async function init() {
    // ...
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-module');
            navigateTo(targetId); // ❌ Solo navega, no actualiza URL
            // ...
        });
    });
    
    // ❌ Siempre carga dashboard
    const initialModule = 'dashboard';
    navigateTo(initialModule);
}

// DESPUÉS:
async function init() {
    // ...
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-module');
            // ✅ Actualiza el hash de la URL
            window.location.hash = targetId;
            // ...
        });
    });
    
    // ✅ Escucha cambios en el hash
    window.addEventListener('hashchange', handleHashChange);
    
    // ✅ Carga el módulo desde el hash actual
    handleHashChange();
}

// ✅ Nuevo manejador de cambios de hash
function handleHashChange() {
    let moduleId = window.location.hash.substring(1);
    
    // Si no hay hash, usar dashboard por defecto
    if (!moduleId) {
        moduleId = 'dashboard';
        window.location.hash = moduleId;
        return;
    }
    
    // Validar que el módulo existe
    const validModules = ['dashboard', 'new-job', 'recommender', 
                          'analysis', 'fleet', 'consumables', 
                          'gallery', 'settings'];
    if (!validModules.includes(moduleId)) {
        console.warn(`Módulo desconocido: ${moduleId}, cargando dashboard`);
        moduleId = 'dashboard';
        window.location.hash = moduleId;
        return;
    }
    
    // Navegar al módulo
    navigateTo(moduleId);
}
```

## 🧪 Cómo Probar la Solución

### 1. Abrir la aplicación:
```bash
http://localhost:8000/
```

### 2. Probar navegación básica:
- Clic en "Gestión de Flota" → URL debería cambiar a `http://localhost:8000/#fleet`
- Clic en "Consumibles" → URL debería cambiar a `http://localhost:8000/#consumables`
- Clic en "Galería de Proyectos" → URL debería cambiar a `http://localhost:8000/#gallery`

### 3. Probar recarga de página:
- Navega a cualquier módulo (ej: "Análisis de Fallos")
- Presiona F5 o Ctrl+R para recargar
- ✅ **La página debería cargar directamente en "Análisis de Fallos"**, no en dashboard

### 4. Probar enlaces directos:
- Copia la URL completa (ej: `http://localhost:8000/#recommender`)
- Cierra la pestaña
- Pega la URL en una nueva pestaña
- ✅ **Debería abrir directamente el módulo "Perfiles IA"**

### 5. Probar navegación del navegador:
- Navega por varios módulos
- Usa el botón "Atrás" del navegador
- ✅ **Debería volver al módulo anterior**
- Usa el botón "Adelante"
- ✅ **Debería avanzar al módulo siguiente**

### 6. Probar módulo inválido:
- Escribe manualmente en la URL: `http://localhost:8000/#modulo-inexistente`
- ✅ **Debería redirigir automáticamente a dashboard** y mostrar warning en consola

## 🎯 Beneficios de la Solución

1. ✅ **Experiencia de usuario mejorada**: Los usuarios no pierden su contexto al recargar
2. ✅ **Enlaces compartibles**: Se pueden compartir enlaces directos a módulos específicos
3. ✅ **Navegación del navegador**: Los botones atrás/adelante funcionan correctamente
4. ✅ **SEO-friendly**: Las URLs descriptivas mejoran la indexación (si aplica)
5. ✅ **Validación robusta**: Maneja módulos inválidos redirigiendo a dashboard
6. ✅ **Compatibilidad**: Funciona en todos los navegadores modernos

## 📝 Notas Técnicas

- **Hash-based routing**: Se usa `#` en lugar de rutas reales para evitar recargas del servidor
- **SPA (Single Page Application)**: La app sigue siendo una SPA, solo se actualiza el contenido dinámicamente
- **Backward compatible**: Los enlaces antiguos siguen funcionando
- **Sin dependencias**: No se requieren librerías adicionales de routing (React Router, Vue Router, etc.)

## 🔄 Alternativa Futura: History API

Para una solución más avanzada, se podría implementar el **HTML5 History API** con `pushState` y `popstate`:

```javascript
// Ejemplo de implementación futura con History API:
function navigateToWithHistory(moduleId) {
    history.pushState({ moduleId }, '', `/${moduleId}`);
    navigateTo(moduleId);
}

window.addEventListener('popstate', (event) => {
    if (event.state && event.state.moduleId) {
        navigateTo(event.state.moduleId);
    }
});
```

**Ventajas**:
- URLs más limpias sin `#` (ej: `/fleet` en lugar de `/#fleet`)
- Mejor integración con el servidor

**Desventajas**:
- Requiere configuración del servidor para manejar rutas (catch-all route)
- Más complejo de implementar

## 📚 Referencias

- [MDN: Window.location.hash](https://developer.mozilla.org/en-US/docs/Web/API/Window/location)
- [MDN: hashchange event](https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event)
- [MDN: History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)

---

**Fecha de implementación**: 30 de septiembre de 2025  
**Archivo modificado**: `/src/web/static/js/app.js`  
**Líneas afectadas**: 22-58 (función `init()` y nuevo `handleHashChange()`)
