# Sistema de Pedidos - KyberCore

## Descripción General

El sistema de pedidos de KyberCore proporciona una gestión completa del ciclo de vida de pedidos de impresión 3D, desde la creación hasta la producción y entrega. Está diseñado con arquitectura modular y preparado para integración con capacidades de IA.

## Arquitectura

```
src/
├── api/routers/          # Endpoints REST
│   ├── customers.py      # Gestión de clientes
│   ├── orders.py         # Gestión de pedidos
│   ├── production.py     # Seguimiento de producción
│   └── metrics.py        # Métricas y análisis
├── database/             # Capa de persistencia
│   ├── json_repository.py         # Repositorio base
│   ├── customers_repository.py    # Repositorio de clientes
│   ├── orders_repository.py       # Repositorio de pedidos
│   └── production_repository.py   # Repositorio de producción
├── services/             # Lógica de negocio
│   ├── customer_service.py        # Servicios de clientes
│   ├── order_service.py           # Servicios de pedidos
│   ├── production_service.py      # Servicios de producción
│   └── metrics_service.py         # Servicios de métricas
└── models/
    └── order_models.py   # Modelos de datos Pydantic
```

## Componentes Principales

### 1. Modelos de Datos

**Ubicación:** `src/models/order_models.py`

Modelos Pydantic que definen la estructura de datos:
- `Customer`: Información de clientes
- `Order`: Pedidos con líneas, totales y estado
- `OrderLine`: Líneas individuales de pedido
- `ProductionBatch`: Lotes de producción
- `ProductionItem`: Items dentro de lotes
- Enums: `OrderStatus`, `OrderPriority`, `BatchStatus`

### 2. Repositorios

**Ubicación:** `src/database/`

Capa de persistencia basada en archivos JSON con:
- Control de concurrencia mediante locks
- Manejo automático de metadata
- Operaciones CRUD genéricas
- Actualización atómica de datos

**Archivos de datos:**
- `base_datos/customers.json`: Clientes
- `base_datos/orders.json`: Pedidos
- `base_datos/production_tracking.json`: Seguimiento de producción

### 3. Servicios

**Ubicación:** `src/services/`

Lógica de negocio con:
- Validaciones y reglas de negocio
- Cálculos automáticos (totales, progreso, etc.)
- Métodos preparados para integración con IA (marcados con TODO)
- Gestión de transiciones de estado

#### CustomerService
- Gestión de clientes
- Búsqueda y filtrado
- Estadísticas de clientes
- [Preparado IA] Recomendaciones personalizadas
- [Preparado IA] Predicción de churn

#### OrderService
- Creación y actualización de pedidos
- Gestión de líneas de pedido
- Cálculo automático de totales
- Gestión de estados y prioridades
- [Preparado IA] Optimización de programación
- [Preparado IA] Predicción de tiempo de finalización
- [Preparado IA] Sugerencias de mejora

#### ProductionService
- Gestión de lotes de producción
- Actualización de progreso
- Asignación de impresoras
- [Preparado IA] Optimización de lotes
- [Preparado IA] Predicción de finalización
- [Preparado IA] Detección de anomalías

#### MetricsService
- Métricas de dashboard
- Análisis de pedidos y producción
- KPIs del sistema
- Estadísticas de clientes
- [Preparado IA] Predicción de demanda
- [Preparado IA] Identificación de cuellos de botella
- [Preparado IA] Generación de insights

### 4. API REST

**Ubicación:** `src/api/routers/`

Endpoints RESTful documentados automáticamente con FastAPI:

#### `/api/customers`
- `GET /` - Listar clientes (con filtros)
- `GET /{customer_id}` - Obtener cliente
- `GET /{customer_id}/statistics` - Estadísticas del cliente
- `GET /{customer_id}/recommendations` - Recomendaciones IA
- `GET /{customer_id}/churn-prediction` - Predicción de churn
- `POST /{customer_id}/validate` - Validar cliente

#### `/api/orders`
- `GET /` - Listar pedidos (con filtros)
- `GET /pending` - Pedidos pendientes
- `GET /overdue` - Pedidos vencidos
- `GET /{order_id}` - Obtener pedido
- `POST /` - Crear pedido
- `PUT /{order_id}` - Actualizar pedido
- `PATCH /{order_id}/status` - Actualizar estado
- `POST /{order_id}/cancel` - Cancelar pedido
- `DELETE /{order_id}` - Eliminar pedido
- `POST /{order_id}/lines` - Añadir línea
- `DELETE /{order_id}/lines/{line_id}` - Eliminar línea
- `POST /optimize-scheduling` - Optimización IA
- `GET /{order_id}/predict-completion` - Predicción IA
- `GET /{order_id}/suggestions` - Sugerencias IA

#### `/api/production`
- `GET /batches` - Listar lotes
- `GET /batches/active` - Lotes activos
- `GET /batches/{batch_id}` - Obtener lote
- `GET /orders/{order_id}/batches` - Lotes por pedido
- `POST /batches` - Crear lote
- `PATCH /batches/{batch_id}/status` - Actualizar estado
- `PATCH /batches/{batch_id}/items/{item_id}/progress` - Actualizar progreso
- `GET /statistics` - Estadísticas de producción
- `POST /optimize-scheduling` - Optimización IA
- `GET /batches/{batch_id}/predict-completion` - Predicción IA
- `GET /batches/{batch_id}/anomalies` - Detección de anomalías IA

#### `/api/metrics`
- `GET /dashboard` - Métricas de dashboard
- `GET /orders` - Métricas de pedidos
- `GET /production` - Métricas de producción
- `GET /customers` - Métricas de clientes
- `GET /kpis` - KPIs principales
- `GET /predict-demand` - Predicción de demanda IA
- `GET /bottlenecks` - Identificación de cuellos de botella IA
- `GET /insights` - Generación de insights IA

## Uso

### Iniciar el servidor

```bash
python -m uvicorn src.api.main:app --reload
```

### Acceder a la documentación

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Ejemplos de uso

#### Crear un pedido

```bash
curl -X POST "http://localhost:8000/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST001",
    "lines": [
      {
        "part_name": "Pieza A",
        "quantity": 10,
        "unit_price": 5.50
      }
    ],
    "priority": "high"
  }'
```

#### Obtener métricas del dashboard

```bash
curl "http://localhost:8000/api/metrics/dashboard"
```

#### Actualizar progreso de producción

```bash
curl -X PATCH "http://localhost:8000/api/production/batches/BATCH001/items/ITEM001/progress" \
  -H "Content-Type: application/json" \
  -d '{"progress": 75.5}'
```

## Integración con IA

El sistema está preparado para integración con módulos de IA:

### Métodos marcados para IA

Todos los métodos que retornan `"ai_ready": false` están preparados para recibir implementaciones de:
- Modelos de ML para predicciones
- Algoritmos de optimización
- Análisis de patrones
- Recomendaciones personalizadas

### Próximos pasos de integración

1. **Análisis de logs de impresión**: Integrar con módulo de análisis de fallos
2. **Optimización de recursos**: Conectar con sistema de gestión de flota
3. **Recomendador de configuraciones**: Usar históricos para sugerir parámetros óptimos
4. **Predicción de demanda**: Implementar modelos de series temporales
5. **Detección de anomalías**: Integrar visión por computadora y análisis de sensores

## Estados y Transiciones

### Estados de Pedido (OrderStatus)
- `PENDING`: Pedido creado, pendiente de procesamiento
- `IN_PRODUCTION`: En proceso de fabricación
- `COMPLETED`: Finalizado exitosamente
- `CANCELLED`: Cancelado
- `ON_HOLD`: En pausa

### Estados de Lote (BatchStatus)
- `QUEUED`: En cola de producción
- `IN_PROGRESS`: En proceso de impresión
- `COMPLETED`: Finalizado
- `FAILED`: Fallido
- `CANCELLED`: Cancelado

### Prioridades (OrderPriority)
- `LOW`: Baja prioridad
- `NORMAL`: Prioridad normal
- `HIGH`: Alta prioridad
- `URGENT`: Urgente

## Pruebas

```bash
# Ejecutar tests unitarios
pytest tests/unit/test_services.py

# Ejecutar tests de integración
pytest tests/integration/test_orders_api.py

# Cobertura de código
pytest --cov=src/services --cov-report=html
```

## Configuración

Las rutas de archivos JSON se resuelven automáticamente desde la raíz del proyecto:
- Base path: `{proyecto_raiz}/base_datos/`

Para cambiar la ubicación, modificar `BaseJSONRepository._resolve_path()`.

## Mantenimiento

### Backup de datos

```bash
# Backup manual
cp base_datos/*.json base_datos/backup/

# Backup automático (cron)
0 */6 * * * cp /ruta/KyberCore/base_datos/*.json /ruta/backup/
```

### Migración de datos

Los repositorios incluyen versionado de metadata. Para migrar datos:

1. Crear script de migración en `scripts/migrations/`
2. Actualizar `metadata.version` tras migración
3. Documentar cambios en CHANGELOG.md

## Contribuir

Ver [CONTRIBUTING.md](../../CONTRIBUTING.md) para directrices de contribución.

## Licencia

Ver [LICENSE](../../LICENSE) para detalles.
