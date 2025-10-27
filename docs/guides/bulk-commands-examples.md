# 🚀 Ejemplos de Comandos Masivos - KyberCore Fleet Management

## Introducción

Los comandos masivos permiten controlar múltiples impresoras 3D simultáneamente, optimizando la gestión de granjas de impresión y operaciones a gran escala.

## 📋 Casos de Uso Prácticos

### 1. Pausa de Emergencia en Toda la Granja

```bash
# Pausar TODAS las impresoras inmediatamente
curl -X POST http://localhost:8000/api/fleet/bulk/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "pause",
    "filters": {
      "exclude_printing": false
    }
  }'
```

**Resultado esperado:**
- ✅ Pausa inmediata de todas las impresiones activas
- 📊 Reporte detallado de éxito/fallo por impresora
- 🛡️ Sin afectar impresoras ya pausadas o inactivas

### 2. Mantenimiento Nocturno - Solo Impresoras Inactivas

```bash
# Reiniciar Klipper solo en impresoras que no están imprimiendo
curl -X POST http://localhost:8000/api/fleet/bulk/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "restart_klipper",
    "filters": {
      "status": "idle",
      "exclude_printing": true
    }
  }'
```

**Ventajas:**
- 🔄 Mantenimiento automático sin interrumpir producción
- ⏰ Ideal para ejecución programada (cron jobs)
- 📈 Mejora la estabilidad general de la granja

### 3. Preparación de Lote de Producción

```bash
# Home XYZ en impresoras específicas antes de iniciar lote
curl -X POST http://localhost:8000/api/fleet/bulk/command \
  -H "Content-Type: application/json" \
  -d '{
    "printer_ids": ["printer-001", "printer-002", "printer-003"],
    "command": "home",
    "axis": "XYZ"
  }'
```

**Beneficios:**
- 🎯 Preparación sincronizada de equipos
- ✅ Verificación de estado antes de producción
- 🚀 Inicio coordinado de múltiples trabajos

### 4. Gestión de Fallos por Zona

```bash
# Cancelar trabajos en impresoras con problemas de una zona específica
curl -X POST http://localhost:8000/api/fleet/bulk/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "cancel",
    "filters": {
      "tags": ["zona-A", "mantenimiento"],
      "status": "error"
    }
  }'
```

## 🔍 Validación Previa de Comandos

### Verificar Impacto Antes de Ejecutar

```bash
# Validar qué impresoras serán afectadas por un comando
curl -X POST http://localhost:8000/api/fleet/bulk/validate \
  -H "Content-Type: application/json" \
  -d '{
    "command": "restart_firmware",
    "filters": {
      "status": "printing"
    }
  }'
```

**Respuesta ejemplo:**
```json
{
  "valid": true,
  "command": "restart_firmware",
  "impact_analysis": {
    "total_affected": 5,
    "printers_by_status": {
      "printing": 3,
      "idle": 2
    },
    "warnings": [
      "⚠️ El comando restart_firmware interrumpirá 3 impresión(es) activa(s)"
    ],
    "safe_to_execute": false
  },
  "target_printers": [
    {"id": "p1", "name": "Printer A", "status": "printing"},
    {"id": "p2", "name": "Printer B", "status": "idle"}
  ],
  "estimated_duration": "10 segundos"
}
```

## 📊 Información de Selección

### Obtener Estado General de la Flota

```bash
# Obtener información para selección inteligente
curl http://localhost:8000/api/fleet/bulk/selection-info
```

**Respuesta:**
```json
{
  "total_printers": 12,
  "status_groups": {
    "idle": [
      {"id": "p1", "name": "Prusa MK4 #1", "ip": "192.168.1.101"},
      {"id": "p2", "name": "Ender 3 #1", "ip": "192.168.1.102"}
    ],
    "printing": [
      {"id": "p3", "name": "Bambu X1C #1", "ip": "192.168.1.103"}
    ],
    "error": [
      {"id": "p4", "name": "Printer Problema", "ip": "192.168.1.104"}
    ]
  },
  "available_tags": ["produccion", "testing", "mantenimiento"],
  "suggested_filters": {
    "all_printers": {"description": "Todas las impresoras", "count": 12},
    "idle_only": {"description": "Solo impresoras inactivas", "count": 8},
    "printing_only": {"description": "Solo impresoras imprimiendo", "count": 3},
    "error_only": {"description": "Solo impresoras con error", "count": 1}
  }
}
```

## 🛡️ Mejores Prácticas de Seguridad

### 1. Validar Antes de Ejecutar
```bash
# SIEMPRE validar comandos destructivos primero
curl -X POST http://localhost:8000/api/fleet/bulk/validate -d '{"command": "cancel"}'
# Solo ejecutar si safe_to_execute: true
```

### 2. Usar Filtros Conservadores
```bash
# Excluir impresoras imprimiendo en comandos peligrosos
{
  "command": "restart_firmware",
  "filters": {
    "exclude_printing": true,
    "status": "idle"
  }
}
```

### 3. Comandos por Lotes Pequeños
```bash
# Para granjas grandes (>20 impresoras), procesar en lotes
{
  "printer_ids": ["batch-1-printers..."],  # Máximo 10-15 por lote
  "command": "restart_klipper"
}
```

### 4. Monitoreo Post-Comando
```bash
# Verificar estado después de comandos masivos
curl http://localhost:8000/api/fleet/printers
```

## 🚀 Integración con Automatización

### Script Bash para Mantenimiento Nocturno

```bash
#!/bin/bash
# maintenance-night.sh

echo "🌙 Iniciando mantenimiento nocturno KyberCore..."

# 1. Verificar impresoras idle
IDLE_INFO=$(curl -s http://localhost:8000/api/fleet/bulk/selection-info | jq '.status_groups.idle | length')
echo "📊 Impresoras inactivas encontradas: $IDLE_INFO"

if [ "$IDLE_INFO" -gt 0 ]; then
    # 2. Validar comando de reinicio
    VALIDATION=$(curl -s -X POST http://localhost:8000/api/fleet/bulk/validate \
        -H "Content-Type: application/json" \
        -d '{"command": "restart_klipper", "filters": {"status": "idle"}}')
    
    SAFE=$(echo $VALIDATION | jq -r '.impact_analysis.safe_to_execute')
    
    if [ "$SAFE" = "true" ]; then
        # 3. Ejecutar reinicio en impresoras idle
        echo "✅ Ejecutando reinicio de Klipper en impresoras inactivas..."
        RESULT=$(curl -s -X POST http://localhost:8000/api/fleet/bulk/command \
            -H "Content-Type: application/json" \
            -d '{"command": "restart_klipper", "filters": {"status": "idle"}}')
        
        SUCCESS=$(echo $RESULT | jq -r '.successful')
        TOTAL=$(echo $RESULT | jq -r '.total_printers')
        
        echo "🎉 Mantenimiento completado: $SUCCESS/$TOTAL impresoras reiniciadas"
    else
        echo "⚠️ Mantenimiento cancelado por seguridad"
    fi
else
    echo "ℹ️ No hay impresoras inactivas para mantenimiento"
fi

echo "🌅 Mantenimiento nocturno finalizado"
```

### Python para Monitoreo Continuo

```python
import requests
import time
import json

class KyberFleetMonitor:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        
    def emergency_pause_all(self):
        """Pausa de emergencia en toda la granja"""
        response = requests.post(
            f"{self.base_url}/api/fleet/bulk/command",
            json={
                "command": "pause",
                "filters": {"exclude_printing": False}
            }
        )
        return response.json()
    
    def safe_restart_idle(self):
        """Reinicia solo impresoras seguras (idle)"""
        # Validar primero
        validation = requests.post(
            f"{self.base_url}/api/fleet/bulk/validate",
            json={
                "command": "restart_klipper",
                "filters": {"status": "idle"}
            }
        ).json()
        
        if validation.get("impact_analysis", {}).get("safe_to_execute"):
            return requests.post(
                f"{self.base_url}/api/fleet/bulk/command",
                json={
                    "command": "restart_klipper",
                    "filters": {"status": "idle"}
                }
            ).json()
        else:
            return {"error": "Operación no segura", "validation": validation}

# Uso
monitor = KyberFleetMonitor()

# Pausa de emergencia
result = monitor.emergency_pause_all()
print(f"Emergencia: {result['successful']}/{result['total_printers']} pausadas")

# Mantenimiento seguro
result = monitor.safe_restart_idle()
print(f"Mantenimiento: {result}")
```

## 📈 Métricas y Monitoreo

Los comandos masivos generan métricas importantes:

- **Tasa de éxito**: `successful/total_printers`
- **Tiempo de ejecución**: Paralelo vs. secuencial
- **Impacto en producción**: Trabajos interrumpidos
- **Distribución de errores**: Por tipo de impresora/ubicación

### Dashboard de Monitoreo

El frontend de KyberCore incluye:
- 📊 Vista en tiempo real del estado de comandos masivos
- 🎯 Selección visual de impresoras por filtros
- ⚠️ Alertas de seguridad antes de ejecutar
- 📈 Historial de comandos masivos ejecutados

---

**💡 Tip profesional**: Los comandos masivos son especialmente útiles en granjas de impresión con 10+ dispositivos. Para instalaciones pequeñas (2-5 impresoras), el control individual puede ser más apropiado.
