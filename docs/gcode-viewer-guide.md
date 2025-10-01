# Guía del Visor de G-code Interactivo

## Descripción General

El **Visor de G-code Interactivo** es una herramienta visual integrada en el Paso 6 (Validación) del wizard de impresión 3D de KyberCore. Permite previsualizar el resultado de la laminación capa por capa antes de enviar el trabajo a la impresora.

## Características Principales

### 1. **Visualización Capa por Capa**
- Renderiza cada capa del G-code en un canvas HTML5
- Diferencia visual entre:
  - **Movimientos de extrusión** (líneas azules sólidas) - Material depositado
  - **Movimientos de desplazamiento** (líneas grises punteadas) - Sin extrusión

### 2. **Control Interactivo**
- **Slider de capas**: Permite navegar entre capas arrastrando el control deslizante
- **Botones de navegación**:
  - ⏮️ Anterior: Retrocede una capa
  - Siguiente ⏭️: Avanza una capa
  - ▶️ Reproducir / ⏸️ Pausar: Animación automática (500ms por capa)

### 3. **Información en Tiempo Real**
Cada capa muestra:
- **Número de capa actual** / Total de capas
- **Altura de la capa** (en mm)
- **Tiempo estimado** de impresión de la capa
- **Filamento usado** en la capa (en gramos)
- **Cantidad de movimientos** (extrusión + desplazamiento)

### 4. **Opciones de Visualización**
- ☑️ **Mostrar desplazamientos**: Muestra/oculta movimientos sin extrusión
- ☑️ **Mostrar retracciones**: Muestra puntos donde se retrae el filamento
- ☑️ **Colorear por velocidad**: Gradiente de color según velocidad (rojo=lento, verde=rápido)
- ☑️ **Mostrar grid**: Grid de referencia con ejes X/Y

## Uso Paso a Paso

### Paso 1: Acceder al Visor
1. Completa los pasos 1-5 del wizard de impresión
2. Llega al **Paso 6: Validación Final**
3. Busca la sección "🔍 Vista Previa de Laminación"
4. Haz clic en **"👁️ Mostrar Visor"**

### Paso 2: Seleccionar Archivo
1. En el dropdown "Archivo G-code", selecciona el archivo que deseas visualizar
2. El sistema carga automáticamente el G-code y lo parsea
3. El canvas muestra la primera capa

### Paso 3: Navegar por las Capas
**Opción A - Slider:**
- Arrastra el control deslizante para navegar rápidamente entre capas
- La visualización se actualiza en tiempo real

**Opción B - Botones:**
- Usa "⏮️ Anterior" y "Siguiente ⏭️" para moverte capa por capa
- Ideal para inspección detallada

**Opción C - Animación:**
1. Haz clic en "▶️ Reproducir"
2. El visor avanza automáticamente (0.5 segundos por capa)
3. Haz clic en "⏸️ Pausar" para detener
4. La animación se reinicia automáticamente al llegar al final

### Paso 4: Ajustar Visualización
Usa los checkboxes para:
- Simplificar la vista (desactivar desplazamientos)
- Analizar velocidades (activar colorear por velocidad)
- Ver solo el contenido (desactivar grid)

## Interpretación de Colores

### Modo Normal (sin "Colorear por velocidad")
- **Azul (#3b82f6)**: Extrusión (deposita material)
- **Gris claro**: Desplazamiento (movimiento sin extruir)
- **Rojo**: Indicador de posición actual del cabezal

### Modo "Colorear por Velocidad"
- **Rojo → Amarillo**: Velocidades bajas (detalle, perímetros)
- **Amarillo → Verde claro**: Velocidades medias (relleno estándar)
- **Verde claro → Verde**: Velocidades altas (desplazamientos, relleno rápido)

## Casos de Uso

### 1. **Verificar Perímetros**
- Revisa las primeras capas
- Asegúrate de que los contornos estén bien definidos
- Verifica la adhesión a la cama

### 2. **Inspeccionar Relleno**
- Navega a capas intermedias
- Verifica el patrón de relleno
- Confirma la densidad configurada

### 3. **Analizar Capas Superiores**
- Revisa las últimas capas
- Verifica el cierre de superficies
- Asegura acabado superior correcto

### 4. **Detectar Problemas**
- **Capas incompletas**: Falta de extrusión en áreas
- **Movimientos extraños**: Desplazamientos innecesarios
- **Cambios bruscos**: Saltos o huecos en el path

## Limitaciones Conocidas

1. **Tamaño de archivo**: Archivos G-code muy grandes (>50MB) pueden tardar en cargar
2. **Renderizado 2D**: Solo muestra vista superior, no isométrica
3. **Sin zoom**: El escalado es automático para ajustar al canvas
4. **No editable**: Solo visualización, no se puede modificar el G-code

## Troubleshooting

### El visor no carga
- **Problema**: Click en "Mostrar Visor" no hace nada
- **Solución**: Espera a que el procesamiento STL termine completamente (Paso 5)

### No aparecen archivos en el dropdown
- **Problema**: El selector está vacío
- **Solución**: 
  1. Verifica que el paso de procesamiento STL se completó exitosamente
  2. Usa la opción "📄 Archivo Demo (simulado)" para probar

### El canvas está en blanco
- **Problema**: Se seleccionó un archivo pero no se ve nada
- **Solución**: 
  1. Verifica que el archivo G-code es válido
  2. Activa "Mostrar grid" para confirmar que el canvas funciona
  3. Prueba con el archivo demo

### La animación es muy rápida/lenta
- **Problema**: La velocidad de reproducción no es adecuada
- **Solución**: Actualmente la velocidad es fija (500ms). En futuras versiones se podrá ajustar.

## Arquitectura Técnica

### Frontend (JavaScript)
- **Archivo**: `src/web/static/js/modules/gallery/project_modal.js`
- **Funciones principales**:
  - `toggleGcodeViewer()`: Muestra/oculta el visor
  - `loadGcodeFile(filePath)`: Carga y parsea un archivo G-code
  - `parseGcode(content)`: Convierte G-code en estructura de capas
  - `renderCurrentLayer()`: Dibuja la capa actual en el canvas
  - `updateGcodeLayer(index)`: Cambia a una capa específica

### Backend (Python)
- **Archivo**: `src/controllers/print_flow_controller.py`
- **Endpoints**:
  - `GET /api/print/gcode-files/{session_id}`: Lista archivos disponibles
  - `GET /api/print/gcode-content?file={path}`: Obtiene contenido del archivo

### Estilos CSS
- **Archivo**: `src/web/static/css/gcode-viewer.css`
- **Componentes**:
  - Slider personalizado con thumbs interactivos
  - Canvas con gradiente de fondo
  - Animaciones de carga

## Próximas Mejoras

### Planeadas para v0.2
- [ ] Vista 3D isométrica
- [ ] Control de zoom y pan
- [ ] Velocidad de animación ajustable
- [ ] Exportar vista como imagen
- [ ] Comparar dos G-codes lado a lado

### Planeadas para v0.3
- [ ] Análisis de tiempo por capa con gráfico
- [ ] Detección automática de problemas
- [ ] Simulación de temperatura
- [ ] Vista de retracciones en 3D

## Referencias

- [Formato G-code](https://reprap.org/wiki/G-code)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Parsing G-code](https://github.com/martindurant/gcode-viewer)

---

**Última actualización**: Octubre 2025  
**Versión de KyberCore**: 0.1.0  
**Autor**: KyberCore Development Team
