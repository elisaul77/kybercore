# Paso 7: Sistema de Validación Inteligente de Impresora

## 📋 Visión General

El Paso 7 del wizard de impresión ha sido mejorado con un sistema de validación inteligente que verifica el estado real de la impresora antes de confirmar un trabajo de impresión. Este sistema reemplaza la validación pasiva (solo checkboxes) por una validación activa que consulta directamente la API de Moonraker.

## 🎯 Objetivos

1. **Validación en Tiempo Real**: Consultar el estado actual de la impresora antes de enviar el trabajo
2. **Recuperación Automática**: Intentar recuperar impresoras en estado de error
3. **Gestión de Conflictos**: Manejar casos donde la impresora está ocupada o no disponible
4. **Experiencia de Usuario Mejorada**: Proveer feedback claro y opciones alternativas

## 📊 Implementación por Fases

### ✅ Fase 1: Validación Básica de Estado (COMPLETADA)

#### Backend
**Archivo**: `src/services/fleet_service.py`
- ✅ Método `get_detailed_printer_status(printer_id)` implementado
- Consulta Moonraker para obtener estado completo de la impresora
- Devuelve información detallada sobre disponibilidad, errores y capacidades

**Archivo**: `src/controllers/fleet_controller.py`
- ✅ Endpoint `GET /api/printers/{printer_id}/status` implementado
- También disponible en `/api/fleet/printers/{printer_id}/status`
- Maneja errores y timeouts apropiadamente

#### Frontend
**Archivo**: `src/web/static/js/modules/gallery/project_modal.js`
- ✅ Función `validatePrinterStatus(printerId)` implementada
- ✅ Función `confirmPrintJob()` actualizada con validación inteligente
- Previene confirmación si la impresora no está lista

#### Respuesta del Endpoint
```json
{
  "printer_id": "printer-test-1",
  "printer_name": "Impresora Prueba",
  "reachable": true/false,
  "status": "ready|error|printing|paused|offline|timeout",
  "state_message": "Mensaje descriptivo del estado",
  "can_print": true/false,
  "is_printing": true/false,
  "is_error": true/false,
  "errors": ["Lista de errores detectados"],
  "recommendation": "Recomendación para el usuario",
  "temperatures": {
    "extruder": {"current": 0, "target": 0},
    "bed": {"current": 0, "target": 0}
  },
  "print_stats": {
    "state": "standby|printing|paused|complete",
    "filename": "nombre_archivo.gcode",
    "progress": 0.0-100.0
  },
  "capabilities": ["print", "pause", "resume", "cancel"],
  "location": "Ubicación física"
}
```

#### Casos Manejados
1. ✅ **Impresora Lista (`can_print: true`)**: Procede con la confirmación
2. ✅ **Impresora No Alcanzable (`reachable: false`)**: Muestra error y recomienda verificación
3. ✅ **Impresora en Error (`is_error: true`)**: Detecta el error y prepara para recuperación (Fase 2)
4. ✅ **Impresora Imprimiendo (`is_printing: true`)**: Informa y prepara para cambio de impresora (Fase 4)
5. ✅ **Impresora en Pausa**: Informa del estado y sugiere acciones

### ⏳ Fase 2: Sistema de Recuperación Automática (PENDIENTE)

#### Backend - Endpoints Planificados
- `POST /api/printers/{printer_id}/recover`
  - Parámetros: `recovery_method: "restart_firmware" | "home_all" | "full_reset"`
  - Ejecuta secuencia de recuperación:
    1. Reiniciar firmware de Klipper
    2. Esperar a que la impresora responda (max 30s)
    3. Ejecutar G28 (home all axes)
    4. Verificar estado final

#### Frontend - Funciones Planificadas
- `attemptRecoveryFlow(printerId)`
  - Muestra diálogo de progreso con pasos de recuperación
  - Maneja timeouts y errores
  - Permite al usuario reintentar o cancelar

#### Flujo de Recuperación
```
Error Detectado
    ↓
Mostrar Diálogo "Intentando Recuperación..."
    ↓
POST /api/printers/{id}/recover
    ↓
Polling del estado cada 2s (max 30s)
    ↓
Estado "ready" → ✅ Recuperación Exitosa
    ↓
Proceder con confirmación de trabajo
```

### ⏳ Fase 3: Guardado y Monitoreo de Trabajos (PENDIENTE)

#### Backend - Endpoints Planificados
- `POST /api/print/save-job`
  - Parámetros: `session_id, reason, printer_id, user_notes`
  - Guarda el trabajo en base de datos con estado "pending"
  - Retorna `job_id` para seguimiento

#### Base de Datos - Modelo SavedJob
```python
class SavedJob(BaseModel):
    id: str
    session_id: str
    printer_id: str
    status: str  # "pending", "ready", "expired"
    reason: str  # "printer_offline", "printer_error", "user_choice"
    saved_at: datetime
    expires_at: datetime
    user_notes: str
    metadata: dict
```

#### Frontend - Funciones Planificadas
- `saveJobAndNotify(sessionId, statusResult)`
  - Guarda el trabajo automáticamente
  - Muestra notificación con opción de monitorear
  - Permite configurar alertas cuando la impresora esté disponible

### ⏳ Fase 4: Cambio de Impresora con Re-slicing (PENDIENTE)

#### Backend - Endpoints Planificados
- `GET /api/printers/alternatives`
  - Parámetros: `required_capabilities, exclude_printer_id`
  - Filtra impresoras disponibles y compatibles
  - Devuelve lista ordenada por disponibilidad

#### Frontend - Funciones Planificadas
- `switchToAnotherPrinter(sessionId)`
  - Muestra diálogo con impresoras alternativas
  - Permite al usuario seleccionar nueva impresora
  - Confirma re-slicing automático si es necesario
  - Actualiza la sesión con nueva impresora

#### Flujo de Cambio
```
Impresora Ocupada Detectada
    ↓
Mostrar Diálogo "Seleccionar Otra Impresora"
    ↓
GET /api/printers/alternatives
    ↓
Usuario Selecciona Impresora Alternativa
    ↓
¿Re-slicing Necesario? (diferentes capacidades)
    ↓ Sí
POST /api/print/re-slice con nueva impresora
    ↓ No
Actualizar sesión y confirmar
```

### ⏳ Fase 5: Sistema de Notificaciones Avanzado (PENDIENTE)

#### Backend - Servicios Planificados
- Sistema de notificaciones push
- Integración con correo electrónico
- Dashboard de trabajos guardados

#### Frontend - Componentes Planificados
- Panel de notificaciones en tiempo real
- Vista de trabajos pendientes
- Configuración de preferencias de notificación

## 🧪 Pruebas

### Pruebas Fase 1 (Completadas)
```bash
# Probar endpoint de validación
curl -s http://localhost:8000/api/printers/printer-test-1/status | jq

# Respuesta esperada con impresora no disponible:
{
  "printer_id": "printer-test-1",
  "printer_name": "Impresora Prueba",
  "reachable": false,
  "status": "offline",
  "can_print": false,
  "errors": ["Impresora no alcanzable o Moonraker no responde"],
  "recommendation": "Verifica que la impresora esté encendida y conectada a la red"
}
```

### Pruebas Manuales Frontend
1. ✅ Navegar hasta el Paso 7 del wizard
2. ✅ Hacer clic en "Confirmar e Imprimir"
3. ✅ Verificar que se muestra "Verificando estado de la impresora..."
4. ✅ Verificar que se muestra el mensaje apropiado según el estado

## 📈 Métricas de Éxito

### Fase 1 - Validación Básica
- ✅ Endpoint responde en <5s
- ✅ Frontend muestra estado de validación
- ✅ Errores manejados apropiadamente
- ✅ Logs claros y descriptivos

### Fases Futuras
- Recuperación automática exitosa >80% de los casos
- Trabajos guardados recuperables en <30s
- Cambio de impresora sin pérdida de configuración
- Notificaciones entregadas en <5s

## 🔧 Configuración

### Variables de Entorno
```bash
# Timeout para conexión con Moonraker (segundos)
PRINTER_CONNECTION_TIMEOUT=5

# Timeout para operaciones de recuperación (segundos)
PRINTER_RECOVERY_TIMEOUT=30

# Intervalo de polling para verificar estado (segundos)
PRINTER_STATUS_POLL_INTERVAL=2
```

## 📝 Notas Técnicas

### Manejo de Timeouts
- Conexión inicial: 5s
- Operaciones de lectura: 3s
- Recuperación completa: 30s

### Reintentos
- Máximo 3 intentos para conexión inicial
- Máximo 2 intentos para recuperación automática
- Exponential backoff: 2s, 4s, 8s

### Estados de Impresora Soportados
- `ready`: Lista para imprimir
- `error`: Error de Klipper
- `shutdown`: Firmware detenido
- `printing`: Imprimiendo activamente
- `paused`: Trabajo pausado
- `standby`: En espera
- `offline`: No alcanzable
- `timeout`: Timeout de conexión

## 🚀 Próximos Pasos

1. **Implementar Fase 2**: Sistema de recuperación automática
2. **Implementar Fase 3**: Guardado de trabajos
3. **Implementar Fase 4**: Cambio de impresora
4. **Implementar Fase 5**: Notificaciones avanzadas
5. **Crear pruebas automatizadas** para cada fase
6. **Actualizar documentación de usuario**
7. **Crear tutoriales en video**

## 📚 Referencias

- [Moonraker API Documentation](https://moonraker.readthedocs.io/en/latest/web_api/)
- [Klipper State Documentation](https://www.klipper3d.org/Status_Reference.html)
- Archivo de arquitectura: `docs/architecture/auto-rotation-backend-system.md`
- Controlador de flota: `src/controllers/fleet_controller.py`
- Servicio de flota: `src/services/fleet_service.py`

---

**Última actualización**: 2025-10-05
**Estado**: Fase 1 Completada, Fases 2-5 Pendientes
**Autor**: Sistema de Desarrollo KyberCore
