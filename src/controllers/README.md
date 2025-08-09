# controllers

Controladores que gestionan la lógica de negocio y orquestan las operaciones entre servicios y modelos.

## 🚀 fleet_controller.py - ACTUALIZADO

### Funcionalidades Principales:
- **Gestión individual de impresoras**: Control de comandos por impresora específica
- **🆕 Comandos masivos**: Control simultáneo de múltiples impresoras en granjas de impresión
- **Validación de seguridad**: Análisis de impacto antes de ejecutar comandos masivos
- **Selección inteligente**: Filtros por estado, tags y criterios personalizados

### Nuevos Endpoints de Comandos Masivos:

#### `POST /api/fleet/bulk/command`
Ejecuta un comando en múltiples impresoras simultáneamente.

**Parámetros:**
```json
{
  "printer_ids": ["printer1", "printer2"],  // Opcional: IDs específicos
  "filters": {                              // Opcional: Filtros automáticos
    "status": "idle",                       // Solo impresoras inactivas
    "exclude_printing": true,               // Excluir las que están imprimiendo
    "tags": ["tag1", "tag2"]               // Solo con ciertos tags
  },
  "command": "pause",                       // Comando a ejecutar
  "axis": "XYZ",                           // Opcional: para comando home
  "parameters": {}                          // Opcional: parámetros adicionales
}
```

**Comandos soportados:**
- `pause` - Pausar impresión
- `resume` - Reanudar impresión
- `cancel` - Cancelar trabajo actual
- `home` - Home de ejes (especificar axis)
- `restart_klipper` - Reiniciar servicio Klipper
- `restart_firmware` - Reiniciar firmware de impresora
- `restart_klipper_service` - Reiniciar servicio completo

#### `GET /api/fleet/bulk/selection-info`
Obtiene información para ayudar en la selección masiva.

**Respuesta:**
```json
{
  "total_printers": 10,
  "status_groups": {
    "idle": [{"id": "p1", "name": "Printer 1", "ip": "192.168.1.100"}],
    "printing": [{"id": "p2", "name": "Printer 2", "ip": "192.168.1.101"}]
  },
  "available_tags": ["production", "testing", "maintenance"],
  "suggested_filters": {
    "all_printers": {"description": "Todas las impresoras", "count": 10},
    "idle_only": {"description": "Solo impresoras inactivas", "count": 7}
  }
}
```

#### `POST /api/fleet/bulk/validate`
Valida un comando masivo sin ejecutarlo (vista previa de impacto).

**Ventajas de los Comandos Masivos:**

1. **🏭 Gestión de granjas de impresión**: Control eficiente de 10+ impresoras
2. **⚡ Operaciones paralelas**: Ejecución simultánea con manejo de errores
3. **🛡️ Seguridad integrada**: Warnings para comandos destructivos
4. **📊 Reportes detallados**: Resultados individuales por impresora
5. **🎯 Selección inteligente**: Filtros automáticos por estado y características

### Casos de Uso Prácticos:

- **Pausa de emergencia**: `POST /bulk/command` con `command: "pause"` en todas las impresoras
- **Mantenimiento programado**: Reiniciar Klipper en impresoras idle durante la noche
- **Preparación de lote**: Home XYZ en todas las impresoras antes de iniciar producción
- **Gestión de fallos**: Cancelar trabajos en impresoras con errores específicos

### Arquitectura de Seguridad:
- Validación previa de comandos destructivos
- Análisis de impacto en trabajos activos
- Timeouts y manejo de errores por impresora
- Logs detallados para auditoría
