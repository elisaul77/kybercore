# 🚀 Sistema Modular de Gestión de Flota - KyberCore

Esta carpeta contiene los módulos especializados para la gestión de flota, organizados siguiendo la arquitectura modular de KyberCore con separación estricta de responsabilidades.

## 📁 Arquitectura Modular

El archivo principal `fleet.js` actúa como **integrador** que carga dinámicamente todos los módulos especializados de esta carpeta.

### 🎯 Flujo de Carga de Módulos

```javascript
// El integrador principal carga automáticamente:
FleetModuleLoader.requiredModules = [
    'fleet/data.js',         // 💾 Gestión de datos
    'fleet/ui.js',           // 🎨 Interfaz de usuario  
    'fleet/communication.js', // 📡 WebSocket y HTTP
    'fleet/commands.js',     // ⚡ Comandos de impresoras
    'fleet/forms.js',        // 📝 Gestión de formularios
    'fleet/table.js'         // 📊 Gestión de tabla
];
```

## 📂 Estructura de Módulos Actual

### 1. `data.js` - 💾 Gestión de Datos de Flota
- Almacén centralizado de datos de impresoras
- CRUD operations (Create, Read, Update, Delete)
- Validación y transformación de datos del backend
- Notificación automática a otros módulos

### 2. `ui.js` - 🎨 Interfaz de Usuario y Renderizado
- Renderizado optimizado de la tabla de impresoras
- Actualización de filas individuales sin re-renderizar todo
- Generación de HTML dinámico con estados visuales
- Gestión de elementos DOM de estado

### 3. `communication.js` - 📡 Comunicación WebSocket y HTTP
- Gestión de conexiones WebSocket con reconexión automática
- Llamadas HTTP a la API REST del backend
- Manejo de ping/pong para mantener conexión viva
- Fallback automático a datos de prueba
- Backoff exponencial para reconexiones

### 4. `commands.js` - ⚡ Comandos de Impresoras
- Comandos individuales (home, pause, resume, cancel, delete)
- Comandos masivos (bulk operations) para múltiples impresoras
- Manejo de errores y respuestas de comandos
- Actualización automática de estado post-comando

### 5. `forms.js` - 📝 Gestión de Formularios
- Validación de formularios de agregar impresora
- Configuración de parámetros de impresora
- Manejo de eventos de formulario
- Integración con sistema de datos

### 6. `table.js` - 📊 Gestión Específica de Tabla
- Ordenamiento de columnas de impresoras
- Filtrado y búsqueda de datos
- Selección múltiple para comandos masivos
- Gestión de checkboxes y selección

### 4. `ui.js` - Interfaz de Usuario
- Actualiza elementos visuales de estado
- Sincroniza indicadores de conexión
- Maneja feedback visual al usuario

### 5. `data.js` - Gestión de Datos
- Carga datos de prueba y datos reales
- Maneja peticiones HTTP a la API
- Controla el flujo de datos desde el servidor

### 6. `table.js` - Gestión de Tabla
- Renderiza la tabla de impresoras
- Actualiza filas individuales
- Maneja efectos visuales y barras de progreso

### 7. `commands.js` - Comandos de Impresora
- Ejecuta comandos de control (homing, pause, resume, cancel)
- Maneja feedback visual de botones
- Gestiona eliminación de impresoras

### 8. `forms.js` - Formularios
- Inicializa y maneja el formulario de agregar impresora
- Valida datos de entrada
- Procesa envío de formularios

## Ventajas de esta Modularización

1. **Reducción de Tokens**: Cada módulo es independiente y puede editarse sin cargar todo el código
2. **Mantenibilidad**: Facilita encontrar y modificar funcionalidades específicas
3. **Reutilización**: Los módulos pueden ser reutilizados en otras partes del proyecto
4. **Pruebas**: Cada módulo puede ser probado de forma independiente
5. **Colaboración**: Diferentes desarrolladores pueden trabajar en módulos distintos

## Orden de Carga

Los módulos deben cargarse en este orden en el HTML:

```html
<script src="/static/js/fleet/state.js"></script>
<script src="/static/js/fleet/ui.js"></script>
<script src="/static/js/fleet/data.js"></script>
<script src="/static/js/fleet/table.js"></script>
<script src="/static/js/fleet/commands.js"></script>
<script src="/static/js/fleet/forms.js"></script>
<script src="/static/js/fleet/message-handler.js"></script>
<script src="/static/js/fleet/communication.js"></script>
<script src="/static/js/fleet.js"></script>
```

## Comunicación entre Módulos

Los módulos se comunican a través de:
- `window.FleetState` - Estado global compartido
- `window.FleetUI` - Funciones de interfaz
- `window.FleetData` - Gestión de datos
- `window.FleetTable` - Renderizado de tabla
- `window.FleetCommands` - Comandos de impresora
- `window.FleetForms` - Manejo de formularios
- `window.FleetMessageHandler` - Procesamiento de mensajes
- `window.FleetCommunication` - Comunicación WebSocket

## Próximos Pasos

Esta estructura permite agregar fácilmente nuevos módulos para:
- Análisis de IA
- Gestión de trabajos
- Configuración avanzada
- Métricas y estadísticas
- Notificaciones
