# 🧠 Decisiones Técnicas: Sistema de Pedidos

Documentación de las decisiones de diseño y arquitectura del Sistema de Gestión de Pedidos.

---

## 📋 Índice

1. [Decisiones de Arquitectura](#decisiones-de-arquitectura)
2. [Decisiones de Modelo de Datos](#decisiones-de-modelo-de-datos)
3. [Decisiones de API](#decisiones-de-api)
4. [Decisiones de Base de Datos](#decisiones-de-base-de-datos)
5. [Decisiones de Integración](#decisiones-de-integración)
6. [Alternativas Consideradas](#alternativas-consideradas)
7. [Trade-offs](#trade-offs)

---

## 1. Decisiones de Arquitectura

### 1.1. Arquitectura de 4 Capas

**Decisión:** Separar en Frontend, Backend, Services, Database

**Razones:**
- ✅ **Separación de responsabilidades:** Cada capa tiene un propósito claro
- ✅ **Testeable:** Capas independientes facilitan unit testing
- ✅ **Escalable:** Capas pueden escalar independientemente
- ✅ **Mantenible:** Cambios en una capa no afectan las demás

**Alternativas consideradas:**
- ❌ **Monolito todo en controllers:** Difícil de mantener
- ❌ **Microservicios desde inicio:** Over-engineering para el caso de uso

**Implementación:**
```
Frontend (HTML/JS) 
    ↓
Backend Controllers (FastAPI)
    ↓
Services (Business Logic)
    ↓
Database (JSON Files)
```

### 1.2. Integración No-Invasiva

**Decisión:** Nuevos módulos que no modifican código existente

**Razones:**
- ✅ **Riesgo bajo:** No rompe funcionalidad actual
- ✅ **Reversible:** Se puede desactivar sin problemas
- ✅ **Incremental:** Se puede desarrollar en paralelo
- ✅ **Testing aislado:** No afecta tests existentes

**Estrategia:**
- Nuevos endpoints en `/api/orders/*`
- Nuevos controladores en `*_controller.py`
- Nuevos modelos en `order_models.py`
- Integración con Print Wizard vía contexto adicional

### 1.3. RESTful API

**Decisión:** Usar REST en lugar de GraphQL u otros

**Razones:**
- ✅ **Simplicidad:** Fácil de entender e implementar
- ✅ **Consistencia:** Sistema actual usa REST
- ✅ **Tooling:** FastAPI tiene excelente soporte REST
- ✅ **Cache:** HTTP caching funciona bien con REST

**Convenciones:**
```
GET    /api/orders          → Lista
GET    /api/orders/{id}     → Detalle
POST   /api/orders          → Crear
PUT    /api/orders/{id}     → Actualizar
DELETE /api/orders/{id}     → Eliminar
```

---

## 2. Decisiones de Modelo de Datos

### 2.1. Entidades Principales

**Decisión:** 8 entidades (Customer, Order, OrderLine, ProductionBatch, PrintItem, etc)

**Razones:**
- ✅ **Normalización:** Cada entidad representa un concepto único
- ✅ **Relaciones claras:** 1-to-many, many-to-1 bien definidas
- ✅ **Escalable:** Fácil agregar atributos sin afectar otras entidades
- ✅ **Query eficiente:** Se puede consultar cada entidad independientemente

**Estructura:**
```
Customer (1) ──< Orders (N)
Order (1) ──< OrderLines (N)
OrderLine (N) >── Project (1)
OrderLine (1) ──< ProductionBatches (N)
ProductionBatch (1) ──< PrintItems (N)
```

### 2.2. Pydantic Models

**Decisión:** Usar Pydantic v2 para validación

**Razones:**
- ✅ **Type safety:** Validación automática de tipos
- ✅ **JSON Schema:** Generación automática para OpenAPI
- ✅ **Performance:** Pydantic v2 es muy rápido
- ✅ **DX:** Developer experience excelente con IDE hints

**Características usadas:**
```python
from pydantic import BaseModel, Field, field_validator

class Order(BaseModel):
    id: str = Field(default_factory=lambda: f"ord_{uuid4().hex[:8]}")
    status: OrderStatus = Field(default=OrderStatus.PENDING)
    
    @field_validator('order_lines')
    def validate_lines(cls, v):
        if not v:
            raise ValueError("Order must have at least one line")
        return v
    
    @property
    def completion_percentage(self) -> float:
        if self.total_items == 0:
            return 0.0
        return (self.completed_items / self.total_items) * 100
```

### 2.3. Calculated Properties

**Decisión:** Properties calculadas en modelos en lugar de almacenar

**Razones:**
- ✅ **Consistencia:** Siempre actualizadas automáticamente
- ✅ **No redundancia:** No duplicar datos en DB
- ✅ **Performance:** Cálculos simples son rápidos
- ✅ **Mantenibilidad:** Cambiar lógica en un solo lugar

**Ejemplos:**
```python
@property
def completion_percentage(self) -> float:
    return (self.completed_items / self.total_items) * 100

@property
def is_overdue(self) -> bool:
    if not self.due_date:
        return False
    return datetime.now() > self.due_date

@property
def days_until_due(self) -> Optional[int]:
    if not self.due_date:
        return None
    return (self.due_date - datetime.now()).days
```

### 2.4. Enums para Estados

**Decisión:** Usar Enums de Python para estados

**Razones:**
- ✅ **Type safety:** Imposible usar valores inválidos
- ✅ **Autocompletado:** IDE sugiere valores válidos
- ✅ **Documentado:** Los valores posibles están en código
- ✅ **Validación automática:** Pydantic valida contra Enum

**Implementación:**
```python
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"
```

---

## 3. Decisiones de API

### 3.1. Endpoints Organizados por Recurso

**Decisión:** Agrupar endpoints por entidad

**Razones:**
- ✅ **Organizado:** Fácil encontrar endpoints relacionados
- ✅ **RESTful:** Sigue convenciones estándar
- ✅ **Versionable:** Se puede versionar por recurso
- ✅ **Documentación:** Swagger agrupa automáticamente

**Estructura:**
```
/api/customers/*      → Customer endpoints
/api/orders/*         → Order endpoints
/api/production/*     → Production endpoints
/api/metrics/*        → Metrics endpoints
```

### 3.2. DTOs (Data Transfer Objects)

**Decisión:** Models separados para Create/Update

**Razones:**
- ✅ **Validación específica:** Campos requeridos difieren
- ✅ **Seguridad:** No exponer todos los campos
- ✅ **Documentación:** OpenAPI muestra schemas correctos
- ✅ **Flexibilidad:** Diferentes reglas por operación

**Ejemplo:**
```python
class OrderCreate(BaseModel):
    """Para crear pedido nuevo"""
    customer_id: str
    order_lines: List[OrderLineCreate]
    priority: OrderPriority = OrderPriority.NORMAL
    # NO incluye: id, created_at, status, etc

class OrderUpdate(BaseModel):
    """Para actualizar pedido existente"""
    priority: Optional[OrderPriority] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    # Todos opcionales, solo se actualiza lo provisto

class Order(BaseModel):
    """Modelo completo"""
    id: str
    order_number: str
    customer_id: str
    # ... todos los campos
```

### 3.3. Response Models Consistentes

**Decisión:** Siempre retornar JSON con estructura consistente

**Razones:**
- ✅ **Predecible:** Frontend sabe qué esperar
- ✅ **Error handling:** Errores tienen misma estructura
- ✅ **Tipado:** TypeScript puede tipar responses
- ✅ **Testing:** Tests más simples

**Estructura:**
```python
# Success response
{
    "success": true,
    "data": {...},
    "message": "Order created successfully"
}

# Error response
{
    "success": false,
    "error": "Validation failed",
    "details": {...}
}

# List response
{
    "success": true,
    "data": [...],
    "total": 42,
    "page": 1,
    "per_page": 20
}
```

### 3.4. Query Parameters para Filtros

**Decisión:** Filtros y ordenamiento vía query params

**Razones:**
- ✅ **RESTful:** Convención estándar
- ✅ **Cacheable:** URLs únicas para cada query
- ✅ **Bookmarkable:** Se puede guardar URL con filtros
- ✅ **Logging:** Fácil ver qué se consultó

**Ejemplo:**
```
GET /api/orders?status=in_progress&priority=high&customer_id=cust_123&sort=created_at&order=desc&page=1&limit=20
```

---

## 4. Decisiones de Base de Datos

### 4.1. JSON Files en lugar de SQL

**Decisión:** Almacenar en archivos JSON estructurados

**Razones:**
- ✅ **Simplicidad:** No requiere DB server
- ✅ **Portabilidad:** Archivos se pueden mover fácilmente
- ✅ **Versionable:** Git puede trackear cambios
- ✅ **Backup:** Copiar archivos es backup
- ✅ **Consistencia:** Sistema actual usa JSON
- ✅ **Dev experience:** Fácil inspeccionar datos

**Limitaciones aceptadas:**
- ⚠️ **Concurrencia:** No hay transacciones ACID
- ⚠️ **Performance:** Cargar todo en memoria
- ⚠️ **Query:** No hay SQL queries complejas

**Mitigación:**
```python
# Uso de locks para writes
from threading import Lock

_orders_lock = Lock()

def save_order(order: Order):
    with _orders_lock:
        # Cargar, modificar, guardar
        data = load_orders_json()
        data['orders'].append(order.model_dump())
        save_orders_json(data)
```

### 4.2. Estructura de Archivos

**Decisión:** 3 archivos JSON principales

**Razones:**
- ✅ **Separación:** Cada archivo un propósito
- ✅ **Performance:** Solo cargar lo necesario
- ✅ **Mantenible:** Más fácil que un solo archivo grande
- ✅ **Backup:** Se puede hacer backup selectivo

**Archivos:**
```
base_datos/
├── customers.json           # Clientes
├── orders.json             # Pedidos y líneas
└── production_tracking.json # Batches y print items
```

### 4.3. Metadata en JSON

**Decisión:** Incluir metadata en cada archivo

**Razones:**
- ✅ **Versioning:** Saber qué versión del schema
- ✅ **Timestamps:** Última modificación
- ✅ **Statistics:** Agregados precalculados
- ✅ **Auditing:** Quién/cuándo modificó

**Estructura:**
```json
{
  "metadata": {
    "version": "1.0",
    "last_updated": "2025-01-06T10:30:00Z",
    "total_records": 42
  },
  "customers": [...],
  "statistics": {
    "total_orders": 156,
    "active_customers": 42
  }
}
```

### 4.4. IDs con Prefijos

**Decisión:** IDs tienen prefijo según tipo

**Razones:**
- ✅ **Legible:** Se ve de qué tipo es
- ✅ **Debug:** Fácil identificar en logs
- ✅ **Único:** Evita colisiones entre tipos
- ✅ **Searchable:** Buscar por prefijo

**Formato:**
```python
cust_abc123def    # Customer ID
ord_xyz789abc     # Order ID
batch_qwe456rty   # Batch ID
item_asd852zxc    # Print Item ID
```

---

## 5. Decisiones de Integración

### 5.1. Integración con Print Wizard

**Decisión:** Pasar contexto de pedido al wizard existente

**Razones:**
- ✅ **No invasivo:** Print Wizard sigue funcionando igual
- ✅ **Backward compatible:** Sin pedido funciona como antes
- ✅ **Opcional:** Tracking es opt-in
- ✅ **Flexible:** Se puede extender fácilmente

**Implementación:**
```javascript
// Al abrir Print Wizard desde pedido
openPrintWizard({
    // Datos normales del wizard
    projectId: "proj_123",
    material: "PLA",
    printer: "ender3_01",
    
    // Contexto adicional de pedido
    orderContext: {
        orderId: "ord_abc123",
        orderLineId: "line_xyz789",
        batchNumber: "batch_001"
    }
});
```

### 5.2. Actualización de Progreso

**Decisión:** Rotation Worker actualiza tracking automáticamente

**Razones:**
- ✅ **Real-time:** Progreso se actualiza durante impresión
- ✅ **Automático:** No requiere intervención manual
- ✅ **Granular:** Se trackea cada archivo individual
- ✅ **Preciso:** Métricas reales (tiempo, filamento)

**Flow:**
```
Rotation Worker procesa archivo
    ↓
Actualiza PrintItem status → "processing"
    ↓
Genera G-code
    ↓
Actualiza PrintItem → "completed" + metrics
    ↓
Actualiza OrderLine.completed_count
    ↓
Verifica si OrderLine completada → update status
    ↓
Verifica si Order completo → update status
```

### 5.3. Notificaciones (Futuro)

**Decisión:** Diseñar para notificaciones pero no implementar aún

**Razones:**
- ✅ **YAGNI:** No se necesita en MVP
- ✅ **Arquitectura lista:** Fácil agregar después
- ✅ **No bloquea:** Sistema funciona sin esto
- ✅ **Extensible:** Service de notificaciones encapsulado

**Diseño:**
```python
# Futuro: src/services/notification_service.py
class NotificationService:
    async def notify_order_completed(order: Order):
        # Email, webhook, etc
        pass
    
    async def notify_batch_failed(batch: ProductionBatch):
        pass
```

---

## 6. Alternativas Consideradas

### 6.1. Base de Datos SQL

**Considerado:** PostgreSQL o SQLite

**Pros:**
- ✅ Transacciones ACID
- ✅ Queries complejas
- ✅ Índices para performance
- ✅ Relaciones enforced

**Cons:**
- ❌ Requiere DB server (PostgreSQL)
- ❌ Más complejo setup
- ❌ No git-friendly
- ❌ Inconsistente con sistema actual

**Decisión:** NO usar SQL por ahora. JSON es suficiente para el volumen esperado. Se puede migrar después si es necesario.

### 6.2. GraphQL API

**Considerado:** GraphQL en lugar de REST

**Pros:**
- ✅ Query solo lo necesario
- ✅ Múltiples recursos en una query
- ✅ Introspección automática

**Cons:**
- ❌ Más complejo implementar
- ❌ Inconsistente con sistema actual
- ❌ Over-engineering para uso simple
- ❌ Caching más difícil

**Decisión:** NO usar GraphQL. REST es suficiente y consistente.

### 6.3. Microservicios

**Considerado:** Separar en servicios independientes

**Pros:**
- ✅ Escala independiente
- ✅ Deploy independiente
- ✅ Tecnologías diferentes por servicio

**Cons:**
- ❌ Complejidad de networking
- ❌ Consistencia eventual
- ❌ Overhead de comunicación
- ❌ Over-engineering para tamaño actual

**Decisión:** NO usar microservicios. Monolito modular es suficiente.

### 6.4. WebSockets para Todo

**Considerado:** Real-time updates vía WebSockets

**Pros:**
- ✅ Updates instantáneos
- ✅ No polling
- ✅ Bidireccional

**Cons:**
- ❌ Más complejo implementar
- ❌ Conexión persistente (recursos)
- ❌ Reconexión compleja
- ❌ No cacheable

**Decisión:** REST + polling para la mayoría. WebSockets solo donde es crítico (dashboard de producción).

---

## 7. Trade-offs

### 7.1. Simplicidad vs Escalabilidad

**Trade-off:** JSON files vs SQL database

**Elección:** Simplicidad (JSON)

**Razón:** 
- Volumen esperado es bajo (<1000 pedidos/día)
- Setup más simple
- Más fácil de mantener
- Se puede migrar después si es necesario

**Cuándo reconsiderar:**
- >10,000 pedidos en sistema
- >100 usuarios concurrentes
- Queries complejas necesarias
- Necesidad de transacciones

### 7.2. Flexibilidad vs Type Safety

**Trade-off:** Dynamic fields vs Strict schemas

**Elección:** Type safety (Pydantic models estrictos)

**Razón:**
- Menos bugs en producción
- Mejor developer experience
- Auto-documentación con OpenAPI
- Validación automática

**Cuándo reconsiderar:**
- Si necesitamos campos dinámicos por cliente
- Si el modelo cambia frecuentemente

### 7.3. Real-time vs Performance

**Trade-off:** Updates instantáneos vs carga del servidor

**Elección:** Polling cada 2-5 segundos

**Razón:**
- Suficientemente rápido para UX
- Menos recursos que WebSockets
- Más simple de implementar
- Más resiliente (reconexión automática)

**Cuándo reconsiderar:**
- Si necesitamos updates <1 segundo
- Si el número de usuarios crece mucho

### 7.4. Features vs Time-to-Market

**Trade-off:** Sistema completo vs MVP rápido

**Elección:** MVP con features esenciales

**Razón:**
- Validar concepto rápido
- Feedback temprano
- Iterar basado en uso real
- No over-engineer

**Features en MVP:**
- ✅ CRUD de pedidos
- ✅ Tracking básico
- ✅ Dashboard simple
- ❌ Facturación (futuro)
- ❌ Notificaciones (futuro)
- ❌ API externa (futuro)

### 7.5. Normalización vs Performance

**Trade-off:** Modelo normalizado vs datos duplicados

**Elección:** Normalización con calculated properties

**Razón:**
- Evita inconsistencias
- Más fácil de mantener
- Cálculos son rápidos
- Se puede cachear si es necesario

**Excepción:**
- Estadísticas agregadas se cachean en metadata
- Se recalculan periódicamente

---

## 📊 Resumen de Decisiones

| Aspecto | Decisión | Razón Principal |
|---------|----------|-----------------|
| **Arquitectura** | 4 capas | Separación de responsabilidades |
| **API** | RESTful | Simplicidad y consistencia |
| **Validación** | Pydantic v2 | Type safety automática |
| **Base de Datos** | JSON files | Simplicidad y portabilidad |
| **IDs** | Prefijos + UUID | Legibilidad y uniqueness |
| **Integración** | No-invasiva | Bajo riesgo |
| **Real-time** | Polling | Balance performance/UX |
| **Estados** | Enums | Type safety |
| **Properties** | Calculadas | Consistencia |
| **DTOs** | Separados | Validación específica |

---

## 🔮 Decisiones Futuras

### Cuando el sistema crezca, reconsiderar:

1. **Migración a SQL**
   - Si >10K pedidos o queries complejas necesarias

2. **WebSockets**
   - Si necesitamos updates <1 segundo

3. **Microservicios**
   - Si necesitamos escalar partes independientemente

4. **Caching Layer**
   - Si performance se degrada

5. **Message Queue**
   - Si necesitamos procesamiento asíncrono complejo

---

**Última actualización:** 2025-01-07  
**Versión:** 1.0  
**Estado:** Decisiones iniciales tomadas
