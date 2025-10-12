# 🚀 Quick Start: Sistema de Pedidos

Guía rápida para comenzar a trabajar con el Sistema de Gestión de Pedidos.

---

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Entender el Contexto

**Problema que resuelve:**
- Gestión manual de pedidos con múltiples proyectos
- Sin tracking de producción por cliente
- Difícil saber cuántas piezas faltan por imprimir
- No hay historial de pedidos por cliente

**Solución propuesta:**
- Sistema de pedidos con clientes y líneas de pedido
- Tracking automático de producción
- Dashboard con métricas en tiempo real
- Historial completo por cliente

### 2️⃣ Conceptos Clave

```
Cliente → hace → Pedido
Pedido → contiene → Líneas de Pedido (proyecto + cantidad)
Línea → se produce en → Batches de Producción
Batch → contiene → Print Items (archivos individuales)
```

**Ejemplo:**
```
Cliente: SpaceX
  └── Pedido #ORD-2025-001
      ├── Línea 1: Proyecto "Starship" x 5 copias
      │   └── Batch 1: 5 print items (flap, tiles, body...)
      └── Línea 2: Proyecto "Drone Parts" x 3 copias
          └── Batch 2: 3 print items
```

### 3️⃣ Visualizar la Arquitectura

Abre este diagrama para ver cómo se conecta todo:
```bash
# En VS Code con extensión Mermaid
code infografia/sistema_pedidos_arquitectura.mmd
```

**Estructura:**
- **Frontend:** Dashboard, Formularios, Listas
- **Backend:** API Controllers
- **Services:** Lógica de negocio
- **Database:** JSON files

---

## 📚 Documentos por Rol

### Si eres **Desarrollador Backend**

1. **Primero:** Lee los modelos de datos
   ```bash
   cat src/models/order_models.py
   ```
   
2. **Segundo:** Revisa la especificación de endpoints
   ```bash
   cat docs/sistema-pedidos-produccion.md | grep "### 5."
   ```
   
3. **Tercero:** Explora los datos de ejemplo
   ```bash
   cat base_datos/orders.json | jq '.'
   ```

**Tu tarea:** Implementar controllers y services siguiendo las especificaciones.

### Si eres **Desarrollador Frontend**

1. **Primero:** Revisa los wireframes
   ```bash
   cat docs/sistema-pedidos-produccion.md | grep "Wireframe"
   ```
   
2. **Segundo:** Ve el diagrama de flujos
   ```bash
   code infografia/sistema_pedidos_flujo_creacion.mmd
   ```
   
3. **Tercero:** Identifica componentes UI necesarios
   - Dashboard con métricas
   - Lista de pedidos con filtros
   - Detalle de pedido con progreso
   - Formulario de creación

**Tu tarea:** Crear templates HTML y módulos JS siguiendo los wireframes.

### Si eres **Product Manager**

1. **Primero:** Lee el resumen ejecutivo
   ```bash
   cat docs/resumen-sistema-pedidos.md
   ```
   
2. **Segundo:** Revisa los casos de uso
   ```bash
   cat docs/sistema-pedidos-produccion.md | grep "### 7."
   ```
   
3. **Tercero:** Ve el plan de implementación
   ```bash
   cat docs/sistema-pedidos-produccion.md | grep "### 8."
   ```

**Tu tarea:** Priorizar fases y validar requerimientos con stakeholders.

### Si eres **Diseñador UX**

1. **Primero:** Revisa los casos de uso
   ```bash
   cat docs/sistema-pedidos-produccion.md | grep "7.1"
   ```
   
2. **Segundo:** Ve los flujos de trabajo
   ```bash
   code infografia/sistema_pedidos_flujo_creacion.mmd
   code infografia/sistema_pedidos_flujo_produccion.mmd
   ```
   
3. **Tercero:** Analiza los wireframes ASCII
   ```bash
   cat docs/sistema-pedidos-produccion.md | grep -A 50 "Wireframe"
   ```

**Tu tarea:** Crear diseños de alta fidelidad mejorando los wireframes.

---

## 🎯 Próximos Pasos por Fase

### ✅ Fase 1: Fundamentos (COMPLETA)
- [x] Modelos de datos creados
- [x] Estructura de base de datos definida
- [x] Documentación completa
- [x] Diagramas creados

### ⏸️ Fase 2: Backend API (SIGUIENTE)

**Tareas:**
1. Implementar `src/controllers/orders_controller.py`
2. Implementar `src/controllers/customers_controller.py`
3. Implementar `src/controllers/production_controller.py`
4. Integrar routers en `src/api/main.py`

**Tiempo estimado:** 3-4 días

**Checklist:**
```bash
[ ] orders_controller.py con CRUD completo
[ ] customers_controller.py con endpoints básicos
[ ] production_controller.py con tracking
[ ] Routers integrados en API principal
[ ] Swagger UI actualizado
[ ] Tests básicos de endpoints
```

**Comando para iniciar:**
```bash
# Crear controller de pedidos
touch src/controllers/orders_controller.py

# Template básico
cat > src/controllers/orders_controller.py << 'EOF'
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from src.models.order_models import Order, OrderCreate, OrderUpdate
from src.services.order_service import OrderService

router = APIRouter()
service = OrderService()

@router.get("/", response_model=List[Order])
async def list_orders():
    """Lista todos los pedidos"""
    return service.get_all_orders()

# ... más endpoints según especificación
EOF
```

### ⏸️ Fase 3: Servicios (Después de Fase 2)

**Tareas:**
1. Implementar `src/services/order_service.py`
2. Implementar `src/services/production_service.py`
3. Implementar `src/services/metrics_service.py`

**Tiempo estimado:** 2-3 días

### ⏸️ Fase 4: Frontend (Puede ser paralelo)

**Tareas:**
1. Dashboard de pedidos
2. Lista de pedidos con filtros
3. Detalle de pedido con progreso
4. Formulario de creación

**Tiempo estimado:** 4-5 días

---

## 🔧 Herramientas Recomendadas

### Para Visualizar Diagramas

**Opción 1: VS Code (Recomendado)**
```bash
# Instalar extensión
code --install-extension bierner.markdown-mermaid

# Abrir diagrama
code infografia/sistema_pedidos_arquitectura.mmd

# Preview: Ctrl+Shift+V
```

**Opción 2: Mermaid Live Editor**
1. Ir a https://mermaid.live/
2. Copiar contenido del `.mmd` file
3. Ver renderizado en tiempo real

### Para Explorar JSON

**Con jq (recomendado):**
```bash
# Instalar jq
sudo apt install jq

# Ver clientes con formato bonito
cat base_datos/customers.json | jq '.'

# Ver solo nombres de clientes
cat base_datos/customers.json | jq '.customers[].name'

# Ver pedidos activos
cat base_datos/orders.json | jq '.orders[] | select(.status=="in_progress")'
```

**Con Python:**
```python
import json

# Cargar pedidos
with open('base_datos/orders.json', 'r') as f:
    data = json.load(f)

# Ver primer pedido
print(json.dumps(data['orders'][0], indent=2))
```

### Para Validar Modelos

```python
from src.models.order_models import Order, OrderCreate

# Validar creación de pedido
order_data = {
    "customer_id": "cust_test",
    "order_lines": [
        {
            "project_id": "proj_123",
            "quantity": 5
        }
    ],
    "priority": "normal"
}

order = OrderCreate(**order_data)
print(order.model_dump_json(indent=2))
```

---

## 📊 Datos de Ejemplo Disponibles

### Clientes
```bash
cat base_datos/customers.json
```

**3 clientes:**
1. **SpaceX Demo** (VIP, 3 pedidos, descuento 10%)
2. **DroneTech Solutions** (Recurrente, 8 pedidos)
3. **MakerLab Studio** (Educativo, 12 pedidos, descuento 15%)

### Pedidos
```bash
cat base_datos/orders.json
```

**2 pedidos:**
1. **ORD-2025-001** (SpaceX, in_progress, 62.5%)
   - Línea 1: Starship x5 → COMPLETED
   - Línea 2: Drone x3 → PENDING
   
2. **ORD-2025-002** (DroneTech, completed, 100%)
   - Línea 1: Drone x6 → COMPLETED

### Producción
```bash
cat base_datos/production_tracking.json
```

**2 batches:**
1. **batch_starship_001** (5 items, 0.318kg filamento)
2. **batch_drone_001** (6 items, 0.2kg filamento)

---

## 🎓 Learning Path

### Nivel 1: Entender (30 min)
1. ✅ Leer resumen ejecutivo
2. ✅ Ver diagrama de arquitectura
3. ✅ Explorar modelos Pydantic

### Nivel 2: Profundizar (1-2 horas)
1. ✅ Leer especificación completa
2. ✅ Revisar todos los diagramas
3. ✅ Analizar casos de uso
4. ✅ Explorar datos de ejemplo

### Nivel 3: Implementar (varios días)
1. ⏸️ Configurar entorno de desarrollo
2. ⏸️ Implementar primer controller
3. ⏸️ Crear tests básicos
4. ⏸️ Iterar y expandir

---

## 💡 Tips de Desarrollo

### 1. Empezar Simple
No implementes todo de golpe. Comienza con:
- Un endpoint (ej: `GET /api/orders`)
- Prueba con datos de ejemplo
- Valida que funciona
- Expande gradualmente

### 2. Usar los Datos de Ejemplo
Los JSON files tienen datos realistas. Úsalos para:
- Desarrollo local
- Tests manuales
- Demos
- Validación de lógica

### 3. Seguir la Especificación
Todo está documentado en `sistema-pedidos-produccion.md`:
- Estructura de endpoints
- Formato de request/response
- Reglas de negocio
- Validaciones

### 4. Testing Continuo
Después de cada cambio:
```bash
# Test manual con curl
curl http://localhost:8000/api/orders

# Test con Swagger UI
# http://localhost:8000/docs

# Test automatizado
pytest tests/test_orders_controller.py
```

### 5. Integración Gradual
El sistema debe integrarse sin romper lo existente:
- Nuevos endpoints en `/api/orders/*`
- Nuevos modelos en `order_models.py`
- Nuevos controllers independientes
- Integración con Print Wizard al final

---

## 🐛 Troubleshooting

### Problema: "No puedo ver los diagramas"
**Solución:**
```bash
# Instalar extensión Mermaid en VS Code
code --install-extension bierner.markdown-mermaid

# O usar Mermaid Live Editor
# https://mermaid.live/
```

### Problema: "Los modelos no validan correctamente"
**Solución:**
```bash
# Verificar instalación de Pydantic v2
pip show pydantic

# Reinstalar si es necesario
pip install 'pydantic>=2.0.0'
```

### Problema: "JSON files no se cargan"
**Solución:**
```python
import json
from pathlib import Path

# Usar Path para rutas relativas
base_path = Path(__file__).parent.parent / "base_datos"
orders_path = base_path / "orders.json"

with open(orders_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
```

### Problema: "No entiendo cómo integrar con Print Wizard"
**Solución:**
Ver el diagrama de flujo de producción:
```bash
code infografia/sistema_pedidos_flujo_produccion.mmd
```

El flujo es:
1. Usuario abre pedido
2. Clic en "Imprimir" línea de pedido
3. Sistema carga Print Wizard con contexto
4. Usuario completa wizard normalmente
5. Al enviar, sistema crea ProductionBatch
6. Tracking automático durante impresión

---

## 📞 Recursos Adicionales

### Documentación Completa
- [Especificación Técnica](./sistema-pedidos-produccion.md)
- [Resumen Ejecutivo](./resumen-sistema-pedidos.md)
- [README Principal](./README-sistema-pedidos.md)

### Código
- [Modelos](../src/models/order_models.py)
- [Base de Datos](../base_datos/)

### Diagramas
- [Arquitectura](../infografia/sistema_pedidos_arquitectura.mmd)
- [Entidades](../infografia/sistema_pedidos_entidades.mmd)
- [Estados](../infografia/sistema_pedidos_estados.mmd)
- [Flujo Creación](../infografia/sistema_pedidos_flujo_creacion.mmd)
- [Flujo Producción](../infografia/sistema_pedidos_flujo_produccion.mmd)
- [Navegación](../infografia/sistema_pedidos_navegacion.mmd)

---

## ✅ Checklist de Inicio

Antes de empezar a codear, asegúrate de:

- [ ] He leído el resumen ejecutivo
- [ ] He revisado al menos 2 diagramas
- [ ] Entiendo los modelos Pydantic
- [ ] He explorado los datos de ejemplo
- [ ] Tengo claro qué fase voy a implementar
- [ ] He configurado mi entorno de desarrollo
- [ ] Sé cómo validar mis cambios
- [ ] Tengo acceso a toda la documentación

---

**¡Listo para empezar! 🚀**

Siguiente paso: Decide qué fase vas a implementar y revisa la sección correspondiente de la especificación técnica.
