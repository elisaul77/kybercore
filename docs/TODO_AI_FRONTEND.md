# 📋 TODO: Integración Frontend para Sistema de IA

## ✅ Completado (Backend)

- [x] Google Gemini AI configurado y funcionando
- [x] Analizador geométrico STL completo
- [x] Cliente Gemini con validación y fallback
- [x] Endpoint `/generate-profile` mejorado con IA
- [x] Pruebas exitosas con perfil real (95% confianza)
- [x] Documentación completa del sistema

---

## 🎯 Pendiente (Frontend)

### 1. Botón de Análisis IA en Wizard (PASO 6)
**Archivo**: `/src/web/static/js/modules/gallery/project_modal.js`

```javascript
// Agregar función de análisis IA
async function analyzeWithAI() {
    const sessionId = window.wizardSessionId;
    
    showLoader('Analizando geometría con IA...');
    
    const response = await fetch('/api/print/slicer/generate-profile', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            job_id: sessionId,
            session_id: sessionId,
            printer_model: selectedPrinter.model,
            material_config: selectedMaterial,
            production_config: productionSettings,
            printer_config: selectedPrinter,
            enable_ai: true
        })
    });
    
    const data = await response.json();
    displayAIResults(data);
}

// Agregar UI para resultados
function displayAIResults(data) {
    const html = `
        <div class="ai-results-card">
            <h3>🤖 Análisis IA Completado</h3>
            <div class="ai-confidence">
                Confianza: ${(data.ai_confidence * 100).toFixed(0)}%
            </div>
            <div class="ai-summary">
                ${data.ai_analysis.summary}
            </div>
            <div class="ai-improvements">
                <h4>💡 Mejoras Aplicadas:</h4>
                <ul>
                    ${data.ai_analysis.improvements.map(i => `<li>${i}</li>`).join('')}
                </ul>
            </div>
            <div class="ai-warnings">
                <h4>⚠️ Advertencias:</h4>
                <ul>
                    ${data.ai_analysis.warnings.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('ai-results-container').innerHTML = html;
}
```

**HTML** (agregar en el paso 6 del wizard):
```html
<div class="ai-section">
    <button id="btn-analyze-ai" class="btn btn-primary">
        🤖 Analizar con IA y Optimizar Perfil
    </button>
    <div id="ai-results-container"></div>
</div>
```

**CSS**:
```css
.ai-results-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    margin-top: 20px;
}

.ai-confidence {
    font-size: 24px;
    font-weight: bold;
    margin: 10px 0;
}

.ai-improvements, .ai-warnings {
    margin-top: 15px;
}

.ai-improvements ul, .ai-warnings ul {
    list-style: none;
    padding-left: 0;
}

.ai-improvements li::before {
    content: "✓ ";
    color: #4ade80;
}

.ai-warnings li::before {
    content: "⚠ ";
    color: #fbbf24;
}
```

---

### 2. Indicador de IA en Confirmación (PASO 8)
**Archivo**: `/src/web/static/js/modules/gallery/project_modal.js`

En `loadConfirmationStep()`, agregar indicador de IA:

```javascript
if (validationData.ai_enabled) {
    html += `
        <div class="ai-badge">
            <span class="badge badge-success">
                🤖 Perfil Optimizado con IA (${(validationData.ai_confidence * 100).toFixed(0)}%)
            </span>
        </div>
    `;
}
```

---

### 3. Tooltip de Análisis Detallado
**Archivo**: `/src/web/static/js/modules/gallery/project_modal.js`

```javascript
// Agregar tooltip con detalles STL
function showSTLAnalysisTooltip(analysis) {
    return `
        <div class="tooltip-content">
            <h4>Análisis Geométrico STL</h4>
            <ul>
                <li>Volumen: ${analysis.volume.toFixed(2)} cm³</li>
                <li>Complejidad: ${analysis.complexity_score.toFixed(1)}/10</li>
                <li>Overhangs: ${analysis.has_severe_overhangs ? 'Sí ⚠️' : 'No ✓'}</li>
                <li>Detalles finos: ${analysis.has_fine_details ? 'Sí 🔍' : 'No'}</li>
                <li>Estabilidad: ${analysis.is_stable ? 'Estable ✓' : 'Inestable ⚠️'}</li>
            </ul>
        </div>
    `;
}
```

---

### 4. Comparación Perfil IA vs Heurístico
**Archivo**: Nuevo componente `ai-comparison-modal.js`

```javascript
function showProfileComparison(aiProfile, heuristicProfile) {
    const comparison = [
        {name: 'Layer Height', ai: aiProfile.layer_height, heuristic: heuristicProfile.layer_height, unit: 'mm'},
        {name: 'Infill', ai: aiProfile.infill_density, heuristic: heuristicProfile.infill_density, unit: '%'},
        {name: 'Speed', ai: aiProfile.print_speed, heuristic: heuristicProfile.print_speed, unit: 'mm/s'},
        {name: 'Supports', ai: aiProfile.support_type, heuristic: heuristicProfile.support_type, unit: ''},
    ];
    
    const html = `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Parámetro</th>
                    <th>🤖 IA</th>
                    <th>📐 Heurístico</th>
                    <th>Diferencia</th>
                </tr>
            </thead>
            <tbody>
                ${comparison.map(item => {
                    const diff = typeof item.ai === 'number' 
                        ? ((item.ai - item.heuristic) / item.heuristic * 100).toFixed(1) + '%'
                        : item.ai === item.heuristic ? 'Igual' : 'Diferente';
                    
                    return `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.ai}${item.unit}</td>
                            <td>${item.heuristic}${item.unit}</td>
                            <td>${diff}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    return html;
}
```

---

### 5. Configuración de Preferencias de IA
**Archivo**: `/src/web/templates/modules/settings.html`

Agregar sección de configuración:

```html
<div class="settings-section">
    <h3>🤖 Inteligencia Artificial</h3>
    
    <div class="setting-item">
        <label>
            <input type="checkbox" id="enable-ai-by-default" checked>
            Activar análisis IA por defecto
        </label>
    </div>
    
    <div class="setting-item">
        <label>
            Confianza mínima para aceptar perfil IA:
            <input type="range" id="ai-confidence-threshold" min="50" max="100" value="80">
            <span id="confidence-value">80%</span>
        </label>
    </div>
    
    <div class="setting-item">
        <label>
            <input type="checkbox" id="show-ai-comparison">
            Mostrar comparación IA vs Heurístico
        </label>
    </div>
</div>
```

---

## 📝 Archivos a Modificar

1. **`/src/web/static/js/modules/gallery/project_modal.js`**
   - Agregar función `analyzeWithAI()`
   - Agregar función `displayAIResults()`
   - Modificar `loadConfirmationStep()` para mostrar badge de IA
   - Agregar tooltips de análisis STL

2. **`/src/web/templates/modules/gallery.html`**
   - Agregar HTML para sección de IA en paso 6
   - Agregar contenedor `#ai-results-container`

3. **`/src/web/static/css/modules/gallery.css`**
   - Agregar estilos para `.ai-results-card`
   - Agregar estilos para `.ai-badge`
   - Agregar estilos para tooltips

4. **`/src/web/templates/modules/settings.html`** (opcional)
   - Agregar sección de configuración de IA

---

## 🎯 Prioridad de Implementación

### Alta Prioridad (Esencial)
1. ✅ Botón "Analizar con IA" en paso 6
2. ✅ Mostrar resultados de análisis (summary + improvements + warnings)
3. ✅ Badge de "Optimizado con IA" en paso 8

### Media Prioridad (Mejora UX)
4. ⏳ Tooltip con detalles de análisis STL
5. ⏳ Indicador de confianza visual (barra de progreso)

### Baja Prioridad (Nice to Have)
6. ⏳ Comparación IA vs Heurístico
7. ⏳ Configuración de preferencias de IA
8. ⏳ Historial de análisis IA por proyecto

---

## 🧪 Testing del Frontend

### Flujo Completo a Probar
1. Subir proyecto con STL
2. Avanzar hasta paso 6 (Modo de Producción)
3. Click en "🤖 Analizar con IA"
4. Verificar spinner de carga
5. Verificar visualización de resultados:
   - Confianza del modelo
   - Resumen del análisis
   - Mejoras aplicadas
   - Advertencias
6. Continuar al paso 8
7. Verificar badge "Optimizado con IA"
8. Confirmar e imprimir

### Casos Edge
- ❌ Error de Gemini → Mostrar mensaje de fallback
- ❌ STL muy grande → Timeout → Fallback
- ❌ API key inválida → Error amigable
- ✅ Alta confianza (>90%) → Badge verde
- ⚠️ Baja confianza (<70%) → Badge amarillo + advertencia

---

## 📚 Referencias

- Documentación completa: `/docs/AI_SYSTEM_IMPLEMENTATION.md`
- Script de pruebas: `/scripts/test_ai_system.py`
- Endpoint backend: `/api/print/slicer/generate-profile`

---

**Última actualización**: 25 de Octubre de 2025  
**Estado**: Backend ✅ COMPLETO | Frontend ⏳ PENDIENTE
