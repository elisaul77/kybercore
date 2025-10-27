# 🚀 Guía de Uso del Sistema de Pedidos - KyberCore

## 📋 Acceso al Sistema

### 1. URLs Disponibles

Con Docker Compose corriendo, tienes acceso a:

- **Aplicación principal:** http://localhost:8000
- **Documentación API (Swagger):** http://localhost:8000/docs
- **Documentación API (ReDoc):** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

### 2. Ver los Logs

```bash
# Ver logs en tiempo real
docker compose logs -f kybercore

# Ver solo logs del sistema de pedidos
docker compose logs -f kybercore | grep -i order
```

## 🔍 Explorando la API

### Opción 1: Usando la Interfaz Web (Swagger UI)

1. Abre tu navegador en: **http://localhost:8000/docs**
2. Verás todos los endpoints organizados por categorías:
   - **Customers** - Gestión de clientes
   - **Orders** - Gestión de pedidos
   - **Production** - Seguimiento de producción
   - **Metrics** - Métricas y análisis

3. Para probar un endpoint:
   - Click en el endpoint que quieras probar
   - Click en "Try it out"
   - Rellena los parámetros necesarios
   - Click en "Execute"
   - Verás la respuesta abajo

### Opción 2: Usando curl (desde la terminal)

#### Listar todos los clientes
```bash
curl http://localhost:8000/api/customers
```

#### Obtener un cliente específico
```bash
# Reemplaza cust_spacex001 con un ID real de tu base de datos
curl http://localhost:8000/api/customers/cust_spacex001
```

#### Listar todos los pedidos
```bash
curl http://localhost:8000/api/orders
```

#### Obtener pedidos pendientes
```bash
curl http://localhost:8000/api/orders/pending
```

#### Ver métricas del dashboard
```bash
curl http://localhost:8000/api/metrics/dashboard | jq
```
*Nota: `jq` formatea el JSON de forma legible. Si no lo tienes: `sudo apt install jq`*

#### Crear un nuevo pedido
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "cust_spacex001",
    "order_number": "ORD-2025-TEST-001",
    "order_lines": [
      {
        "order_id": "temp_id",
        "project_id": "proj_test_001",
        "project_name": "Pieza de Prueba",
        "quantity": 5,
        "completed": 0
      }
    ],
    "priority": "normal"
  }'
```

#### Ver estadísticas de un cliente
```bash
curl http://localhost:8000/api/customers/cust_spacex001/statistics
```

#### Ver métricas de pedidos de los últimos 30 días
```bash
curl "http://localhost:8000/api/metrics/orders?period_days=30"
```

### Opción 3: Usando Python (script interactivo)

Guarda este script como `test_api.py`:

```python
import requests
import json

BASE_URL = "http://localhost:8000"

def listar_clientes():
    """Lista todos los clientes"""
    response = requests.get(f"{BASE_URL}/api/customers")
    return response.json()

def obtener_pedidos():
    """Obtiene todos los pedidos"""
    response = requests.get(f"{BASE_URL}/api/orders")
    return response.json()

def ver_dashboard():
    """Muestra métricas del dashboard"""
    response = requests.get(f"{BASE_URL}/api/metrics/dashboard")
    return response.json()

if __name__ == "__main__":
    print("=== CLIENTES ===")
    clientes = listar_clientes()
    print(json.dumps(clientes, indent=2))
    
    print("\n=== PEDIDOS ===")
    pedidos = obtener_pedidos()
    print(json.dumps(pedidos, indent=2))
    
    print("\n=== DASHBOARD ===")
    dashboard = ver_dashboard()
    print(json.dumps(dashboard, indent=2))
```

Ejecuta:
```bash
python test_api.py
```

## 📊 Casos de Uso Comunes

### Caso 1: Consultar estado de pedidos de un cliente

```bash
# 1. Obtener ID del cliente
curl http://localhost:8000/api/customers | jq '.[0].id'

# 2. Filtrar pedidos por ese cliente
CLIENT_ID="cust_spacex001"
curl "http://localhost:8000/api/orders?customer_id=$CLIENT_ID"
```

### Caso 2: Ver progreso de producción

```bash
# Ver todos los lotes activos
curl http://localhost:8000/api/production/batches/active

# Ver lotes de un pedido específico
ORDER_ID="ord_1728234567_xyz123"
curl "http://localhost:8000/api/production/orders/$ORDER_ID/batches"

# Ver estadísticas de producción
curl http://localhost:8000/api/production/statistics
```

### Caso 3: Análisis de métricas

```bash
# Dashboard general
curl http://localhost:8000/api/metrics/dashboard | jq

# KPIs principales
curl http://localhost:8000/api/metrics/kpis | jq

# Métricas de clientes
curl http://localhost:8000/api/metrics/customers | jq

# Métricas de producción (últimos 7 días)
curl "http://localhost:8000/api/metrics/production?period_days=7" | jq
```

## 🛠️ Comandos Docker Útiles

### Ver estado de contenedores
```bash
docker compose ps
```

### Ver logs en tiempo real
```bash
docker compose logs -f
```

### Reiniciar el servicio
```bash
docker compose restart kybercore
```

### Parar todo
```bash
docker compose down
```

### Reconstruir después de cambios
```bash
docker compose down && docker compose up --build -d
```

### Acceder al shell del contenedor
```bash
docker compose exec kybercore bash
```

### Ver consumo de recursos
```bash
docker stats
```

## 🔧 Solución de Problemas

### El servidor no responde

```bash
# Ver logs
docker compose logs kybercore

# Verificar que el contenedor está corriendo
docker compose ps

# Reiniciar
docker compose restart kybercore
```

### Error de conexión

```bash
# Verificar que el puerto 8000 está disponible
netstat -tuln | grep 8000

# Ver configuración de puertos
docker compose ps
```

### Datos no aparecen

```bash
# Verificar archivos JSON
docker compose exec kybercore ls -la /app/base_datos/

# Ver contenido
docker compose exec kybercore cat /app/base_datos/customers.json
```

## 📱 Integración con Frontend

Si quieres integrar con una aplicación frontend:

### JavaScript/TypeScript (ejemplo con fetch)

```javascript
// Obtener clientes
async function getCustomers() {
  const response = await fetch('http://localhost:8000/api/customers');
  return await response.json();
}

// Crear pedido
async function createOrder(orderData) {
  const response = await fetch('http://localhost:8000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  return await response.json();
}

// Ver métricas
async function getDashboard() {
  const response = await fetch('http://localhost:8000/api/metrics/dashboard');
  return await response.json();
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h2>Pedidos</h2>
      <ul>
        {orders.map(order => (
          <li key={order.id}>
            {order.order_number} - {order.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 🎯 Endpoints Más Útiles

| Categoría | Endpoint | Método | Descripción |
|-----------|----------|--------|-------------|
| **Clientes** | `/api/customers` | GET | Lista todos los clientes |
| | `/api/customers/{id}` | GET | Obtiene un cliente |
| | `/api/customers/{id}/statistics` | GET | Estadísticas del cliente |
| **Pedidos** | `/api/orders` | GET | Lista todos los pedidos |
| | `/api/orders` | POST | Crea un pedido |
| | `/api/orders/pending` | GET | Pedidos pendientes |
| | `/api/orders/{id}` | GET | Obtiene un pedido |
| | `/api/orders/{id}/status` | PATCH | Actualiza estado |
| **Producción** | `/api/production/batches` | GET | Lista lotes |
| | `/api/production/batches/active` | GET | Lotes activos |
| | `/api/production/statistics` | GET | Estadísticas |
| **Métricas** | `/api/metrics/dashboard` | GET | Métricas principales |
| | `/api/metrics/kpis` | GET | KPIs del sistema |
| | `/api/metrics/orders` | GET | Análisis de pedidos |

## 📚 Documentación Adicional

- **README completo:** `/docs/orders-system-readme.md`
- **Resumen de implementación:** `/docs/orders-implementation-summary.md`
- **Swagger UI:** http://localhost:8000/docs (interactivo)
- **ReDoc:** http://localhost:8000/redoc (más detallado)

## 🆘 Soporte

Si encuentras algún problema:

1. Revisa los logs: `docker compose logs -f kybercore`
2. Consulta la documentación en `/docs`
3. Verifica que los archivos JSON en `base_datos/` existen y son válidos
4. Prueba el script de validación: `docker compose exec kybercore python scripts/validate_orders_system.py`

---

**¡Listo para usar!** 🎉

La API está completamente funcional y lista para integrarse con cualquier frontend o sistema externo.
