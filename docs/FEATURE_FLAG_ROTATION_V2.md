# Feature Flag: Backend-Centric Rotation (V2)

## Activar/Desactivar

Para activar la nueva arquitectura backend-centric (V2 - RECOMENDADO):
```javascript
localStorage.setItem('use_backend_rotation', 'true');  // V2
```

Para volver a la arquitectura frontend-heavy (V1 - LEGACY):
```javascript
localStorage.setItem('use_backend_rotation', 'false');  // V1
```

Para verificar qué versión está activa:
```javascript
console.log(localStorage.getItem('use_backend_rotation'));
```

## Cambios Necesarios en project_modal.js

En la línea ~1236, cambiar:
```javascript
// ANTES (llamar solo V1):
actionsContainer.innerHTML = `
    <button onclick="startSTLProcessing()" ...>
        Iniciar Procesamiento
    </button>
`;

// DESPUÉS (detectar versión con feature flag):
actionsContainer.innerHTML = `
    <button onclick="${useBackendRotation ? 'startSTLProcessingV2' : 'startSTLProcessing'}()" ...>
        Iniciar Procesamiento (${useBackendRotation ? 'V2' : 'V1'})
    </button>
`;
```

## Diferencias entre V1 y V2

### V1 (Frontend-Heavy - LEGACY)
- Frontend maneja toda la lógica
- ~30 HTTP requests para 10 archivos
- Sin paralelización
- Sin retry automático

### V2 (Backend-Centric - RECOMENDADO) ✨
- Backend maneja toda la lógica
- 1 HTTP request inicial + polling
- Paralelización automática (3 archivos simultáneos)
- Retry automático (3 intentos)
- Mejor performance y escalabilidad

## Testing

Para probar V2:
1. Abrir consola del navegador (F12)
2. Ejecutar: `localStorage.setItem('use_backend_rotation', 'true')`
3. Recargar la página
4. Verificar en consola: "🔧 Modo de procesamiento: V2"
5. Procesar archivos normalmente

Para probar V1 (fallback):
1. Ejecutar: `localStorage.setItem('use_backend_rotation', 'false')`
2. Recargar y procesar

## Rollback

Si V2 presenta problemas en producción:
```javascript
// Deshabilitar V2 globalmente
localStorage.setItem('use_backend_rotation', 'false');
```

Esto hará que todos los usuarios vuelvan a V1 sin necesidad de desplegar código.
