# Módulos de Fleet - KyberCore

Esta carpeta contiene los módulos separados para la gestión de flota, organizados por funcionalidad específica.

## Estructura de Módulos

### 1. `state.js` - Estado Global y Configuración
- Maneja el estado global de la flota
- Controla variables de WebSocket y polling
- Centraliza la configuración del sistema

### 2. `communication.js` - Comunicación WebSocket
- Gestiona la conexión WebSocket optimizada
- Maneja reconexión automática con backoff exponencial
- Controla el polling de emergencia cuando WebSocket falla

### 3. `message-handler.js` - Manejo de Mensajes WebSocket
- Procesa todos los mensajes entrantes del WebSocket
- Distribuye las acciones según el tipo de mensaje
- Mantiene la lógica de respuesta a eventos del servidor

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
