# 🔗 URLs Directas de KyberCore

## Enlaces Directos a Módulos

Ahora puedes acceder directamente a cualquier módulo de KyberCore usando estas URLs:

### Dashboard (Panel de Control)
```
http://localhost:8000/#dashboard
```
Panel principal con resumen de la flota y estadísticas.

### Nuevo Trabajo IA
```
http://localhost:8000/#new-job
```
Crea nuevos trabajos de impresión con asistencia de IA.

### Perfiles IA (Recomendador)
```
http://localhost:8000/#recommender
```
Optimización de perfiles de impresión usando inteligencia artificial.

### Análisis de Fallos
```
http://localhost:8000/#analysis
```
Diagnóstico inteligente de fallos en impresiones mediante análisis de logs y imágenes.

### Gestión de Flota
```
http://localhost:8000/#fleet
```
Control y monitoreo en tiempo real de todas las impresoras.

### Consumibles
```
http://localhost:8000/#consumables
```
Gestión de filamentos, resinas y otros consumibles.

### Galería de Proyectos
```
http://localhost:8000/#gallery
```
Exploración y gestión de proyectos de impresión (STL, G-code).

### Ajustes
```
http://localhost:8000/#settings
```
Configuración general de la aplicación.

---

## 🎯 Casos de Uso

### 1. Enlaces en Documentación
Puedes usar estos enlaces en tu documentación para referenciar módulos específicos:

```markdown
Para gestionar los consumibles, visita [Consumibles](http://localhost:8000/#consumables)
```

### 2. Favoritos del Navegador
Guarda tus módulos más usados como favoritos:
- **Producción**: `http://localhost:8000/#fleet`
- **Mantenimiento**: `http://localhost:8000/#consumables`
- **Análisis**: `http://localhost:8000/#analysis`

### 3. Scripts y Automatización
```bash
# Abrir directamente el módulo de flota
xdg-open "http://localhost:8000/#fleet"

# O con un navegador específico
google-chrome "http://localhost:8000/#fleet"
firefox "http://localhost:8000/#fleet"
```

### 4. Integración con Otras Herramientas
```javascript
// Desde otra aplicación web
window.open('http://localhost:8000/#analysis', '_blank');

// Redirección condicional
if (errorDetected) {
    window.location.href = 'http://localhost:8000/#analysis';
}
```

---

## 🧪 Pruebas de Funcionamiento

### Test 1: Navegación Básica
1. Abre `http://localhost:8000/`
2. Haz clic en diferentes módulos
3. Verifica que la URL cambia con el formato `/#modulo-nombre`

### Test 2: Recarga con Contexto
1. Navega a `http://localhost:8000/#fleet`
2. Presiona F5
3. ✅ La página debe recargar en el módulo de Flota

### Test 3: Enlaces Directos
1. Copia `http://localhost:8000/#recommender`
2. Pégalo en una nueva pestaña
3. ✅ Debe abrir directamente el módulo de Perfiles IA

### Test 4: Botones del Navegador
1. Navega: Dashboard → Fleet → Consumables
2. Presiona el botón "Atrás" 2 veces
3. ✅ Debe volver a Dashboard
4. Presiona "Adelante"
5. ✅ Debe ir a Fleet

---

## 📊 Tabla de Referencia Rápida

| Módulo | Hash URL | Descripción |
|--------|----------|-------------|
| Dashboard | `#dashboard` | Panel de control principal |
| Nuevo Trabajo | `#new-job` | Crear trabajos con IA |
| Perfiles IA | `#recommender` | Optimización de perfiles |
| Análisis | `#analysis` | Diagnóstico de fallos |
| Flota | `#fleet` | Gestión de impresoras |
| Consumibles | `#consumables` | Gestión de materiales |
| Galería | `#gallery` | Proyectos STL/G-code |
| Ajustes | `#settings` | Configuración |

---

## 🔒 Seguridad y Validación

La aplicación valida automáticamente los módulos:

- ✅ **Módulos válidos**: Se cargan normalmente
- ❌ **Módulos inválidos**: Redirigen a dashboard con warning en consola

Ejemplo:
```
http://localhost:8000/#modulo-inexistente
→ Redirige a: http://localhost:8000/#dashboard
→ Console: "Módulo desconocido: modulo-inexistente, cargando dashboard"
```

---

## 🚀 Ventajas del Sistema de Routing

1. **Recarga sin pérdida de contexto**: Los usuarios no pierden su ubicación al refrescar
2. **URLs compartibles**: Envía enlaces directos a colegas
3. **Favoritos organizados**: Guarda accesos rápidos a módulos frecuentes
4. **Navegación nativa**: Funciona con botones atrás/adelante del navegador
5. **Integración sencilla**: Fácil de integrar con scripts y otras apps

---

**Última actualización**: 30 de septiembre de 2025  
**Versión de KyberCore**: 0.1.0
