# ❓ FAQ: Sistema de Pedidos

Preguntas frecuentes sobre el Sistema de Gestión de Pedidos y Producción.

---

## 📋 Índice

- [General](#general)
- [Modelo de Datos](#modelo-de-datos)
- [Implementación](#implementación)
- [Integración](#integración)
- [Performance](#performance)
- [Casos de Uso](#casos-de-uso)

---

## General

### ¿Qué problema resuelve este sistema?

Actualmente, KyberCore permite gestionar proyectos y imprimirlos, pero no hay forma de:
- Trackear quién pidió qué (cliente)
- Gestionar pedidos con múltiples cantidades
- Seguir el progreso de producción
- Ver cuántas piezas faltan por imprimir
- Analizar historial de pedidos por cliente

El sistema de pedidos resuelve todo esto creando una capa de gestión de pedidos sobre el sistema de proyectos existente.

### ¿Está completo el sistema?

**Estado actual:**
- ✅ 70% completado: Diseño, arquitectura, modelos, especificación
- ⏸️ 30% pendiente: Implementación de controllers, services, frontend

**Lo que está listo:**
- Modelos Pydantic completos (600 líneas)
- Especificación técnica (1,800 líneas)
- 5 diagramas Mermaid
- Base de datos JSON con ejemplos
- Documentación completa

**Lo que falta:**
- Implementar controladores (`*_controller.py`)
- Implementar servicios (`*_service.py`)
- Crear templates HTML
- Crear módulos JavaScript
- Tests end-to-end

### ¿Cuánto tiempo tomará implementar lo que falta?

**Estimación:**
- Backend (controllers + services): 5-7 días
- Frontend (templates + JS): 4-5 días
- Testing e integración: 2-3 días
- **Total: 11-15 días** de desarrollo

### ¿Es obligatorio usar el sistema de pedidos?

**No.** El sistema está diseñado para ser opcional:
- Print Wizard sigue funcionando igual sin contexto de pedido
- Proyectos existentes no se afectan
- Sistema actual de impresión no cambia
- Se puede usar solo para algunos clientes/proyectos

### ¿Qué pasa con los proyectos existentes?

**Nada cambia.** Los proyectos existentes:
- ✅ Siguen en `proyectos.json`
- ✅ Se pueden imprimir como siempre
- ✅ Opcionalidad: pueden vincularse a pedidos si se desea
- ✅ No se requiere migración

---

## Modelo de Datos

### ¿Por qué separar Order y OrderLine?

**Razón:** Flexibilidad y normalización.

**Escenario:**
```
Cliente necesita:
- 5 copias de "Starship Parts"
- 3 copias de "Drone Frame"
- 10 copias de "Support Brackets"
```

**Sin OrderLine:** Tendrías que crear 3 pedidos separados.

**Con OrderLine:** 
```
1 Order
  ├── OrderLine 1: Starship Parts x5
  ├── OrderLine 2: Drone Frame x3
  └── OrderLine 3: Support Brackets x10
```

**Beneficios:**
- Factura única para el cliente
- Tracking agregado del pedido completo
- Priorización por línea individual
- Estadísticas por proyecto dentro del pedido

### ¿Cuál es la diferencia entre OrderLine y ProductionBatch?

**OrderLine:** "QUÉ y CUÁNTO"
- Define qué proyecto y cuántas copias
- Es la "orden de trabajo"
- No cambia durante producción

**ProductionBatch:** "CÓMO y CUÁNDO"
- Una sesión de impresión específica
- Incluye settings (material, impresora, modo)
- Contiene los print items reales
- Se crea cuando se imprime

**Ejemplo:**
```
OrderLine: "Starship Parts x5"
  └── ProductionBatch 1: 
      - Printer: Ender 3
      - Material: PLA Red
      - PrintItems: [flap.3mf, tiles.stl, body.stl, ...]
```

**Una OrderLine puede tener múltiples batches:**
```
OrderLine: "Drone Frame x10"
  ├── Batch 1: 5 copias en Prusa MK3 (completado)
  ├── Batch 2: 3 copias en Ender 3 (in_progress)
  └── Batch 3: 2 copias en Anycubic (pending)
```

### ¿Qué es un PrintItem?

**PrintItem:** Un archivo individual dentro de un batch.

**Ejemplo:**
```
ProductionBatch: "batch_starship_001"
  ├── PrintItem 1: complete-s25.3mf
  ├── PrintItem 2: flap-inserts.stl
  ├── PrintItem 3: heat-tiles.stl
  ├── PrintItem 4: main-body.stl (duplicado 1)
  └── PrintItem 5: main-body.stl (duplicado 2)
```

**Cada PrintItem tiene:**
- Archivo fuente (STL/3MF)
- G-code generado (path)
- Estado (processing, completed, failed)
- Métricas (tiempo, filamento, layer height)
- Retry count si falló

### ¿Por qué usar Properties calculadas en lugar de guardar valores?

**Ejemplo:**
```python
@property
def completion_percentage(self) -> float:
    return (self.completed_items / self.total_items) * 100
```

**Razones:**
1. **Consistencia:** Siempre correcto, no puede desincronizarse
2. **Simplicidad:** No hay que acordarse de actualizar
3. **Menos bugs:** No hay riesgo de valores obsoletos
4. **Performance:** Cálculos simples son instantáneos

**Cuándo guardar valores:**
- Si el cálculo es costoso
- Si el valor es histórico (no debe cambiar)
- Si necesitas buscar por ese valor

**Ejemplo de valor guardado:**
```python
# Este valor NO debe cambiar después de completar
completed_at: Optional[datetime] = None
```

### ¿Qué son los DTOs?

**DTO = Data Transfer Object**

Son modelos específicos para transferir datos (API).

**Problema sin DTOs:**
```python
# Cliente envía esto para crear pedido
{
    "id": "hacked_id",              # ❌ No debería poder elegir ID
    "created_at": "2020-01-01",     # ❌ Fecha falsa
    "status": "completed",          # ❌ No puede crear ya completado
    "customer_id": "cust_123",      # ✅ OK
    "order_lines": [...]            # ✅ OK
}
```

**Con DTOs:**
```python
class OrderCreate(BaseModel):
    """Solo campos que el cliente DEBE proveer"""
    customer_id: str
    order_lines: List[OrderLineCreate]
    priority: OrderPriority = OrderPriority.NORMAL
    # NO incluye: id, created_at, status

# Sistema genera automáticamente
order = Order(
    id=generate_id(),
    created_at=datetime.now(),
    status=OrderStatus.PENDING,
    **order_create.model_dump()
)
```

---

## Implementación

### ¿Por qué JSON files en lugar de SQL?

**Razones:**

1. **Simplicidad**
   - No requiere DB server
   - No requiere migrations
   - Setup es instantáneo

2. **Portabilidad**
   - Copiar archivos = backup
   - Git puede versionar
   - Fácil mover entre entornos

3. **Consistencia**
   - Sistema actual usa JSON (`proyectos.json`, etc)
   - Misma arquitectura

4. **Developer Experience**
   - Ver datos: `cat orders.json | jq '.'`
   - Editar: Cualquier editor de texto
   - Debug: Logs legibles

**Cuándo migrar a SQL:**
- >10,000 pedidos
- Queries complejas necesarias
- Múltiples usuarios concurrentes
- Necesidad de transacciones ACID

### ¿Cómo maneja concurrencia con JSON files?

**Problema:** 2 requests actualizan el mismo archivo simultáneamente

**Solución:** Locks de Python

```python
from threading import Lock

_orders_lock = Lock()

def update_order(order_id: str, updates: dict):
    with _orders_lock:
        # Solo un thread a la vez puede ejecutar esto
        data = load_orders_json()
        
        # Buscar y actualizar
        for order in data['orders']:
            if order['id'] == order_id:
                order.update(updates)
                break
        
        # Guardar
        save_orders_json(data)
```

**Limitaciones:**
- Solo funciona en un solo proceso
- No funciona con múltiples servidores
- Para alta concurrencia, usar SQL

### ¿Puedo usar el sistema sin implementar todo?

**Sí.** Implementa de forma incremental:

**Mínimo Viable (MVP):**
1. ✅ `orders_controller.py` con GET/POST
2. ✅ `order_service.py` con lógica básica
3. ✅ Template simple para lista de pedidos
4. ✅ Integrar con API principal

**Después agregar:**
- Customers endpoint
- Production tracking
- Dashboard con métricas
- Reports avanzados

**Luego optimizar:**
- Caching
- WebSockets para real-time
- Notificaciones
- API externa

### ¿Cómo integrar con el Print Wizard existente?

**No modificar Print Wizard.** Pasar contexto opcional:

```javascript
// Caso 1: Imprimir desde pedido
function printOrderLine(orderLineId) {
    const orderLine = getOrderLine(orderLineId);
    
    // Abrir Print Wizard con contexto
    openPrintWizard({
        projectId: orderLine.project_id,
        orderContext: {
            orderId: orderLine.order_id,
            orderLineId: orderLineId
        }
    });
}

// Caso 2: Imprimir normal (sin pedido)
function printProject(projectId) {
    // Sin orderContext funciona igual que siempre
    openPrintWizard({
        projectId: projectId
    });
}
```

**En Print Wizard:**
```javascript
function onWizardComplete(settings) {
    // Si hay contexto de pedido
    if (settings.orderContext) {
        // Crear ProductionBatch
        createBatch({
            orderId: settings.orderContext.orderId,
            orderLineId: settings.orderContext.orderLineId,
            ...settings
        });
    }
    
    // Procesar impresión normal
    startPrint(settings);
}
```

### ¿Debo crear tests para todo?

**Tests por fase:**

**Fase 2 (Backend):**
- ✅ Tests unitarios de servicios
- ✅ Tests de endpoints (básicos)
- ⏸️ Tests de integración (opcional)

**Fase 3 (Services):**
- ✅ Tests unitarios completos
- ✅ Tests de edge cases
- ✅ Tests de validaciones

**Fase 5 (Integración):**
- ✅ Tests end-to-end
- ✅ Tests de flujos completos

**Ejemplo:**
```python
# test_order_service.py
def test_create_order():
    service = OrderService()
    
    order_data = OrderCreate(
        customer_id="cust_test",
        order_lines=[
            OrderLineCreate(
                project_id="proj_123",
                quantity=5
            )
        ]
    )
    
    order = service.create_order(order_data)
    
    assert order.id.startswith("ord_")
    assert order.status == OrderStatus.PENDING
    assert len(order.order_lines) == 1
    assert order.total_items == 5
```

---

## Integración

### ¿Rompe algo del sistema actual?

**No.** Diseño no-invasivo:

- ✅ Nuevos endpoints (`/api/orders/*`)
- ✅ Nuevos controladores
- ✅ Nuevos modelos
- ✅ Nuevos archivos JSON
- ❌ NO modifica proyectos
- ❌ NO modifica print flow
- ❌ NO modifica impresoras

### ¿Cómo se actualiza el progreso durante impresión?

**Flow automático:**

1. Rotation Worker procesa archivo
2. Actualiza `PrintItem.status = "processing"`
3. Genera G-code
4. Actualiza `PrintItem.status = "completed"`
5. Llama `update_order_line_progress()`
6. Service actualiza contadores de OrderLine
7. Service verifica si OrderLine completada
8. Si todas las líneas completas → Order completado

**Código:**
```python
# En rotation_worker.py
def on_file_processed(filename, gcode_path, metrics):
    if has_order_context():
        production_service.update_print_item(
            item_id=current_item_id,
            status="completed",
            gcode_path=gcode_path,
            metrics=metrics
        )
```

```python
# En production_service.py
def update_print_item(item_id, status, ...):
    # Actualizar item
    item.status = status
    
    # Si completado, actualizar OrderLine
    if status == "completed":
        order_line = get_order_line(item.order_line_id)
        order_line.completed += 1
        
        # Si OrderLine completa, actualizar Order
        if order_line.is_complete:
            order = get_order(order_line.order_id)
            order.update_status()
```

### ¿Puedo usar el sistema con impresoras que no son Klipper?

**Sí.** El sistema de pedidos es agnóstico:

- Tracking funciona con cualquier tipo de impresora
- Solo necesitas actualizar el progreso al completar archivos
- ProductionBatch puede tener `printer_id` de cualquier tipo

**Modificación necesaria:**
```python
# Si tu sistema usa otro tipo de worker
def on_print_complete(printer, job):
    if job.order_context:
        production_service.update_print_item(
            item_id=job.order_context.item_id,
            status="completed",
            metrics={
                "print_time_minutes": job.duration,
                "filament_used_grams": job.filament
            }
        )
```

---

## Performance

### ¿Qué tan rápido es cargar pedidos?

**Con JSON files:**

- <100 pedidos: **Instantáneo** (<50ms)
- 100-1,000 pedidos: **Muy rápido** (50-200ms)
- 1,000-10,000 pedidos: **Aceptable** (200-1000ms)
- >10,000 pedidos: **Considerar SQL**

**Optimizaciones posibles:**
1. Cachear en memoria
2. Lazy loading (cargar solo IDs primero)
3. Pagination (cargar 20 a la vez)
4. Índices en memoria

### ¿Cómo escala el sistema?

**Horizontal scaling (más servidores):**
- ❌ JSON files: No escala horizontalmente
- ✅ Solución: Migrar a SQL cuando sea necesario

**Vertical scaling (servidor más potente):**
- ✅ JSON files: OK hasta ~10K pedidos
- ✅ RAM: Cargar todo en memoria es viable

**Optimizaciones antes de migrar:**
1. **Caching:** Redis/Memcached
2. **Lazy loading:** Cargar on-demand
3. **Pagination:** No cargar todo
4. **Compression:** Gzip responses
5. **CDN:** Static assets

### ¿Debo preocuparme por performance ahora?

**No.** Regla: Optimizar cuando sea un problema.

**Razones:**
- Volumen esperado es bajo (<1000 pedidos/mes)
- JSON files son suficientes
- Optimización prematura = complejidad innecesaria
- Medir antes de optimizar

**Cuándo preocuparse:**
- Requests toman >1 segundo
- UI se siente lenta
- Múltiples usuarios reportan problemas
- Métricas muestran degradación

**Entonces:**
1. Profiling (encontrar bottleneck)
2. Optimizar esa parte específica
3. Medir mejora
4. Repetir

---

## Casos de Uso

### ¿Cómo creo un pedido simple?

**Escenario:** Cliente quiere 5 copias de "Starship Parts"

**Paso a paso:**

1. **Frontend:** Usuario va a "Nuevo Pedido"
2. **Selecciona cliente:** "SpaceX Demo"
3. **Agrega proyecto:** "Starship Parts" x 5
4. **Revisa resumen:**
   - 5 copias
   - Tiempo estimado: 15 horas
   - Filamento: 750g
5. **Confirma:** POST `/api/orders/create`
6. **Sistema:**
   - Genera `order_number`: "ORD-2025-003"
   - Crea Order con status PENDING
   - Crea OrderLine con quantity=5
   - Calcula totales
   - Guarda en `orders.json`
7. **Respuesta:** Redirige a detalle del pedido

**Código:**
```javascript
const orderData = {
    customer_id: "cust_spacex001",
    order_lines: [
        {
            project_id: "proj_starship",
            quantity: 5
        }
    ],
    priority: "normal",
    due_date: "2025-01-15"
};

const response = await fetch('/api/orders/create', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(orderData)
});

const order = await response.json();
// order.id = "ord_abc123"
// order.order_number = "ORD-2025-003"
```

### ¿Cómo trackeo producción de un pedido?

**Escenario:** Producir las 5 copias de Starship

**Paso a paso:**

1. **Usuario abre pedido:** `ORD-2025-003`
2. **Ve línea:** "Starship Parts x 5" [PENDING]
3. **Clic "Imprimir":** Abre Print Wizard
4. **Configura:**
   - Material: PLA Red
   - Impresora: Prusa MK3
   - Modo: auto-rotation ON
5. **Confirma:** Sistema crea ProductionBatch
6. **Rotation Worker:**
   - Procesa archivos (flap, tiles, body...)
   - Por cada archivo completado:
     - Actualiza PrintItem → "completed"
     - Actualiza OrderLine.completed_count
7. **Usuario ve progreso:**
   - Dashboard actualiza en tiempo real
   - "3/5 completadas (60%)"
8. **Al completar:**
   - OrderLine → COMPLETED
   - Order verifica todas las líneas
   - Order → COMPLETED si todas completas

### ¿Qué hago si algunas piezas fallan?

**Escenario:** De 5 copias, 2 fallan por warping

**Paso a paso:**

1. **Worker detecta fallo:**
   ```python
   PrintItem.status = "failed"
   PrintItem.failure_reason = "Warping detected"
   ```

2. **OrderLine actualiza:**
   ```python
   completed: 3
   failed: 2
   status: "in_progress"  # No está completada aún
   ```

3. **Usuario ve en dashboard:**
   ```
   Starship Parts x 5
   ✅ 3 completadas
   ❌ 2 fallidas
   ⏸️ 0 pendientes
   ```

4. **Usuario decide:**
   - Opción A: Reimprimir fallidas
   - Opción B: Marcar como aceptables (si no son críticas)
   - Opción C: Cancelar esas piezas

5. **Reimprimir fallidas:**
   - Clic "Reimprimir Fallidas"
   - Sistema crea nuevo batch con solo las 2 fallidas
   - Worker procesa de nuevo
   - PrintItems tienen `retry_count = 1`

6. **Al completar retry:**
   ```python
   completed: 5
   failed: 0
   status: "completed"
   ```

### ¿Cómo manejo pedidos multi-proyecto?

**Escenario:** Cliente quiere kit completo de drone

**Componentes:**
- Frame (1 unidad, 6 archivos)
- Arms (4 unidades, 1 archivo c/u)
- Landing gear (4 unidades, 2 archivos c/u)

**Creación:**
```javascript
const orderData = {
    customer_id: "cust_drone_tech",
    order_lines: [
        { project_id: "proj_frame", quantity: 1 },
        { project_id: "proj_arms", quantity: 4 },
        { project_id: "proj_landing", quantity: 4 }
    ],
    notes: "Complete drone kit - all parts needed"
};
```

**Producción:**
```
Order: ORD-2025-004
├── Line 1: Frame x1 [COMPLETED]
│   └── Batch 1: 6 items (frame parts)
├── Line 2: Arms x4 [IN_PROGRESS]
│   ├── Batch 1: 2 arms [COMPLETED]
│   └── Batch 2: 2 arms [IN_PROGRESS]
└── Line 3: Landing x4 [PENDING]
```

**Dashboard muestra:**
```
Cliente: DroneTech Solutions
Pedido: ORD-2025-004
Estado: IN_PROGRESS (55% completado)

[ ✅ ] Frame x1 (completed)
[ 🔄 ] Arms x4 (2/4 completadas)
[ ⏸️ ] Landing Gear x4 (pending)

Total: 9 piezas
Completadas: 5
En progreso: 2
Pendientes: 2
```

### ¿Cómo priorizo un pedido urgente?

**Escenario:** Cliente VIP llama, necesita pedido YA

**Paso a paso:**

1. **Buscar pedido:** `ORD-2025-005`
2. **Cambiar prioridad:**
   ```javascript
   PUT /api/orders/ord_abc123
   {
       "priority": "urgent"
   }
   ```

3. **Sistema actualiza:**
   ```python
   order.priority = OrderPriority.URGENT
   order.updated_at = datetime.now()
   ```

4. **Dashboard re-ordena:**
   ```
   Pedidos Activos:
   [🔴 URGENT] ORD-2025-005 - Cliente VIP
   [🟠 HIGH  ] ORD-2025-003 - SpaceX Demo
   [🟡 NORMAL] ORD-2025-001 - DroneTech
   [🟢 LOW   ] ORD-2025-002 - MakerLab
   ```

5. **Usuario ve en dashboard:**
   - Badge rojo "URGENT"
   - Aparece primero en lista
   - Notificación de prioridad alta

6. **Producción:**
   - Al crear batch, sistema prefiere pedidos urgentes
   - Si hay cola, pedidos urgentes primero

### ¿Cómo analizo rendimiento de clientes?

**Escenario:** Gerente quiere ver métricas de cliente VIP

**Dashboard:**
```
Cliente: SpaceX Demo
Tipo: VIP
Descuento: 10%

Estadísticas:
- Pedidos totales: 12
- Pedidos completados: 10
- Pedidos activos: 2
- Tasa de éxito: 95%
- Revenue total: $45,600

Pedidos recientes:
1. ORD-2025-005 [IN_PROGRESS] - Starship x10
2. ORD-2025-003 [COMPLETED] - Drone x5
3. ORD-2024-089 [COMPLETED] - Support x20

Proyectos más solicitados:
1. Starship Parts (45%)
2. Drone Frame (30%)
3. Support Brackets (25%)

Tiempo promedio de completitud: 3.2 días
```

**API:**
```javascript
GET /api/customers/cust_spacex001/statistics

Response:
{
    "customer": {...},
    "statistics": {
        "total_orders": 12,
        "completed_orders": 10,
        "active_orders": 2,
        "total_revenue": 45600,
        "success_rate": 0.95,
        "avg_completion_days": 3.2
    },
    "recent_orders": [...],
    "top_projects": [...]
}
```

---

## 🔗 Referencias

- [Especificación Técnica](./sistema-pedidos-produccion.md)
- [Quick Start](./QUICKSTART-sistema-pedidos.md)
- [Decisiones Técnicas](./DECISIONES-TECNICAS.md)
- [README Principal](./README-sistema-pedidos.md)

---

**¿Tu pregunta no está aquí?**

Agrega un issue en GitHub o consulta la documentación completa.

**Última actualización:** 2025-01-07  
**Versión:** 1.0
