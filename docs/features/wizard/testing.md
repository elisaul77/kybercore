# 🧪 Guía de Pruebas del Wizard de Impresión 3D

## 📋 Resumen del Wizard

El Wizard de Impresión 3D de KyberCore guía al usuario a través de un flujo completo de impresión, desde la selección de piezas hasta el monitoreo en tiempo real.

### Pasos del Wizard:

1. **📦 Selección de Piezas** (`piece_selection`)
   - Seleccionar todas las piezas o específicas de un proyecto
   - Ver resumen de tiempo y material estimado

2. **🎨 Selección de Material** (`material_selection`)
   - Elegir tipo de filamento (PLA, PETG, ABS, etc.)
   - Seleccionar color y marca
   - Ver disponibilidad de material

3. **⚙️ Modo de Producción** (`production_mode`)
   - Prototipo vs Producción
   - Prioridad: Velocidad, Calidad, Economía

4. **🖨️ Asignación de Impresora** (`printer_assignment`)
   - Manual: Seleccionar impresora específica
   - Automático: IA recomienda la mejor impresora

5. **🔄 Procesamiento STL** (`stl_processing`)
   - Orientación automática optimizada
   - Análisis de geometría
   - Reducción de soportes

6. **✅ Validación** (`validation`)
   - Revisión de configuración completa
   - Estimaciones finales
   - Confirmación de recursos disponibles

7. **🚀 Confirmación** (`confirmation`)
   - Iniciar laminado
   - Enviar a impresora
   - Ver cola de impresión

8. **📊 Monitoreo** (`monitoring`)
   - Estado en tiempo real
   - Cámara (si disponible)
   - Cancelar/Pausar impresión

---

## 🧪 Plan de Pruebas

### Prerequisitos

1. Aplicación corriendo en `http://localhost:8000`
2. Proyectos disponibles en la galería
3. Impresoras configuradas (aunque sea en modo mock)

### Test 1: Acceso al Wizard desde Galería

**Pasos:**
1. Ir a `http://localhost:8000/#gallery`
2. Hacer clic en cualquier proyecto
3. En el modal del proyecto, buscar el botón "🖨️ Imprimir Proyecto"
4. Hacer clic en el botón

**Resultado esperado:**
- ✅ Se abre el wizard en una ventana modal
- ✅ Se muestra el paso 1: Selección de Piezas
- ✅ Se ve el progreso del wizard en la parte superior

### Test 2: Selección de Piezas - Todas

**Pasos:**
1. En el paso de selección de piezas
2. Hacer clic en "📋 Todas las piezas"

**Resultado esperado:**
- ✅ Se seleccionan automáticamente todas las piezas
- ✅ Se muestra un resumen del proyecto (tiempo, filamento, volumen)
- ✅ Se habilita el botón "Siguiente"
- ✅ Al hacer clic en "Siguiente", avanza al paso 2

### Test 3: Selección de Piezas - Específicas

**Pasos:**
1. En el paso de selección de piezas
2. Marcar manualmente algunas casillas de verificación de piezas
3. Hacer clic en "🎯 Seleccionar específicas" o "Siguiente"

**Resultado esperado:**
- ✅ Solo las piezas seleccionadas se marcan
- ✅ El resumen se actualiza con las piezas seleccionadas
- ✅ Se puede avanzar al siguiente paso

### Test 4: Selección de Material

**Pasos:**
1. Llegar al paso 2: Selección de Material
2. Ver la lista de materiales disponibles
3. Seleccionar un tipo de filamento (ej: PLA)
4. Seleccionar color y marca

**Resultado esperado:**
- ✅ Se muestra lista de materiales con stock disponible
- ✅ Se pueden filtrar por tipo de material
- ✅ Se muestra información de cantidad necesaria vs disponible
- ✅ Se puede avanzar al siguiente paso

### Test 5: Modo de Producción

**Pasos:**
1. Llegar al paso 3: Modo de Producción
2. Seleccionar modo (Prototipo o Producción)
3. Seleccionar prioridad (Velocidad, Calidad, Economía)

**Resultado esperado:**
- ✅ Se muestran las opciones claramente
- ✅ Cada opción tiene descripción
- ✅ Se puede cambiar la selección antes de continuar
- ✅ Se puede avanzar al siguiente paso

### Test 6: Asignación de Impresora

**Pasos:**
1. Llegar al paso 4: Asignación de Impresora
2. Probar modo automático (IA recomienda)
3. Probar modo manual (seleccionar impresora)

**Resultado esperado:**
- ✅ En modo automático: La IA recomienda una impresora con justificación
- ✅ En modo manual: Se muestra lista de impresoras disponibles
- ✅ Se muestra estado de cada impresora (Disponible, En uso, etc.)
- ✅ Se puede avanzar al siguiente paso

### Test 7: Navegación Entre Pasos

**Pasos:**
1. Avanzar varios pasos en el wizard
2. Hacer clic en "← Anterior"
3. Verificar que se mantienen las selecciones previas
4. Avanzar nuevamente

**Resultado esperado:**
- ✅ El botón "Anterior" funciona correctamente
- ✅ Las selecciones previas se mantienen
- ✅ El progreso visual se actualiza correctamente
- ✅ No se pierde información al retroceder

### Test 8: Cerrar y Reabrir Wizard

**Pasos:**
1. Abrir el wizard y avanzar algunos pasos
2. Cerrar el wizard (botón X)
3. Reabrir el wizard desde el mismo proyecto

**Resultado esperado:**
- ✅ El wizard se cierra correctamente
- ✅ Al reabrir, puede iniciar una nueva sesión
- ✅ O puede recuperar la sesión anterior (si está implementado)

### Test 9: Validación de Campos Requeridos

**Pasos:**
1. En cada paso, intentar avanzar sin completar los campos requeridos

**Resultado esperado:**
- ✅ Se muestran mensajes de error claros
- ✅ No se puede avanzar sin completar campos obligatorios
- ✅ Los mensajes indican qué falta por completar

### Test 10: Responsive Design

**Pasos:**
1. Abrir el wizard en diferentes tamaños de pantalla
2. Probar en móvil (< 640px)
3. Probar en tablet (640px - 1024px)
4. Probar en desktop (> 1024px)

**Resultado esperado:**
- ✅ El wizard se adapta correctamente a cada tamaño
- ✅ Los botones son accesibles en móvil
- ✅ El texto es legible en todas las pantallas
- ✅ No hay overflow horizontal

---

## 🔧 Endpoints del Wizard

### Backend API Endpoints:

```
GET  /api/print/piece-selection/{project_id}
POST /api/print/select-pieces

GET  /api/print/material-selection
POST /api/print/select-material

GET  /api/print/production-modes
POST /api/print/select-production-mode

GET  /api/print/available-printers
POST /api/print/assign-printer

POST /api/print/process-stl
GET  /api/print/processing-status/{job_id}

GET  /api/print/validate-job/{job_id}

POST /api/print/confirm-job
GET  /api/print/job-status/{job_id}

GET  /api/print/session-state/{session_id}
POST /api/print/save-session-state
```

---

## 🐛 Problemas Conocidos y Soluciones

### Problema 1: El wizard no se abre
**Síntomas**: Al hacer clic en "Imprimir Proyecto" no pasa nada

**Verificaciones**:
```bash
# 1. Verificar que la app está corriendo
curl http://localhost:8000/health

# 2. Verificar consola del navegador (F12)
# Buscar errores JavaScript

# 3. Verificar que el archivo JavaScript está cargado
# En consola del navegador:
typeof openPrintFlowWizard
# Debería retornar "function"
```

### Problema 2: Los pasos no avanzan
**Síntomas**: El botón "Siguiente" no funciona

**Verificaciones**:
```javascript
// En consola del navegador
console.log(currentWizardSessionId);
// Debería mostrar un ID de sesión

// Verificar que los datos se están guardando
```

### Problema 3: Error al cargar datos del proyecto
**Síntomas**: Mensaje de error al abrir el wizard

**Verificaciones**:
```bash
# Verificar que el proyecto existe
cat base_datos/proyectos.json | jq '.proyectos[] | select(.id == 1)'

# Verificar logs del servidor
docker logs kybercore --tail 50
```

### Problema 4: Wizard no cierra correctamente
**Síntomas**: El wizard queda abierto o reaparece

**Solución**:
```javascript
// En consola del navegador, ejecutar:
closePrintFlowWizard();

// O forzar cierre:
document.getElementById('print-flow-wizard')?.remove();
```

---

## 📊 Checklist de Funcionalidad

### Funcionalidades Básicas
- [ ] ✅ Abrir wizard desde galería
- [ ] ✅ Mostrar progreso visual
- [ ] ✅ Navegación entre pasos (Siguiente/Anterior)
- [ ] ✅ Cerrar wizard
- [ ] ✅ Diseño responsive

### Paso 1: Selección de Piezas
- [ ] ✅ Listar todas las piezas del proyecto
- [ ] ✅ Seleccionar todas las piezas
- [ ] ✅ Seleccionar piezas específicas
- [ ] ✅ Mostrar resumen (tiempo, material, volumen)
- [ ] ✅ Validar selección antes de continuar

### Paso 2: Selección de Material
- [ ] ✅ Listar materiales disponibles
- [ ] ✅ Filtrar por tipo de material
- [ ] ✅ Mostrar stock disponible
- [ ] ✅ Calcular cantidad necesaria
- [ ] ✅ Alertar si no hay suficiente material

### Paso 3: Modo de Producción
- [ ] ✅ Opciones de modo (Prototipo/Producción)
- [ ] ✅ Opciones de prioridad (Velocidad/Calidad/Economía)
- [ ] ✅ Descripción clara de cada opción
- [ ] ✅ Guardar selección

### Paso 4: Asignación de Impresora
- [ ] ✅ Modo automático con IA
- [ ] ✅ Modo manual con lista de impresoras
- [ ] ✅ Mostrar estado de cada impresora
- [ ] ✅ Mostrar capacidades de cada impresora
- [ ] ✅ Justificación de recomendación IA

### Paso 5: Procesamiento STL
- [ ] ✅ Iniciar procesamiento automático
- [ ] ✅ Mostrar progreso
- [ ] ✅ Optimización de orientación
- [ ] ✅ Análisis de geometría
- [ ] ✅ Generación de soportes

### Paso 6: Validación
- [ ] ✅ Resumen completo de configuración
- [ ] ✅ Estimaciones finales (tiempo, costo, material)
- [ ] ✅ Validación de recursos disponibles
- [ ] ✅ Mostrar warnings si aplica

### Paso 7: Confirmación
- [ ] ✅ Botón de confirmar impresión
- [ ] ✅ Iniciar laminado
- [ ] ✅ Enviar G-code a impresora
- [ ] ✅ Añadir a cola de impresión

### Paso 8: Monitoreo
- [ ] ✅ Estado en tiempo real
- [ ] ✅ Progreso de impresión
- [ ] ✅ Cámara en vivo (si disponible)
- [ ] ✅ Opciones de control (Pausar/Cancelar)

---

## 🚀 Comandos Útiles para Debugging

```bash
# Ver logs en tiempo real
docker logs -f kybercore

# Reiniciar el contenedor
docker compose restart kybercore

# Verificar endpoints del wizard
curl http://localhost:8000/api/print/piece-selection/1 | jq

# Ver estado de sesiones activas
cat base_datos/wizard_sessions.json | jq

# Limpiar sesiones antiguas
echo '{}' > base_datos/wizard_sessions.json
```

---

## 📝 Notas de Desarrollo

### Archivos Clave:
- **Backend**: `/src/controllers/print_flow_controller.py`
- **Frontend**: `/src/web/static/js/modules/gallery/project_modal.js`
- **Template**: `/src/web/templates/modules/new-job.html`
- **Datos**: `/base_datos/wizard_sessions.json`

### Variables Globales JavaScript:
```javascript
currentWizardSessionId  // ID de la sesión actual del wizard
currentWizardFlowId     // ID del flujo de impresión
currentWizardProjectId  // ID del proyecto siendo procesado
```

### Eventos Importantes:
- `openPrintFlowWizard(flowId, projectId, initialStatus)` - Abre el wizard
- `closePrintFlowWizard()` - Cierra el wizard
- `loadPrintFlowStep(flowId, projectId, step, status)` - Carga un paso específico
- `nextPrintFlowStep()` - Avanza al siguiente paso
- `previousPrintFlowStep()` - Retrocede al paso anterior

---

**Última actualización**: 30 de septiembre de 2025  
**Versión de KyberCore**: 0.1.0  
**Estado del wizard**: ✅ Funcional con todos los pasos implementados
