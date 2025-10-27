# 🚀 Guía Rápida - Ejemplos de Uso del Sistema de Pedidos

## ✅ El sistema está FUNCIONANDO

Verifica que Docker esté corriendo:
```bash
docker compose ps
```

## 📍 URLs Importantes

- **Documentación Interactiva (Swagger):** http://localhost:8000/docs
- **Documentación Detallada (ReDoc):** http://localhost:8000/redoc  
- **Health Check:** http://localhost:8000/health

⚠️ **Nota importante:** Algunos endpoints pueden requerir o no barra final `/`. Usa la documentación en `/docs` para ver la sintaxis exacta.

## 🎯 Ejemplos Probados y Funcionando

### 1. Listar Clientes
```bash
curl -s 'http://localhost:8000/api/customers/' | jq
```

**Respuesta:**
```json
[
  {
    "id": "cust_spacex001",
    "name": "Elon Musk",
    "email": "elon@spacex.com",
    "company": "SpaceX Demo",
    "total_orders": 3,
    ...
  },
  ...
]
```

### 2. Obtener un Cliente Específico
```bash
curl -s 'http://localhost:8000/api/customers/cust_spacex001' | jq
```

### 3. Ver Estadísticas de un Cliente
```bash
curl -s 'http://localhost:8000/api/customers/cust_spacex001/statistics' | jq
```

### 4. Listar Todos los Pedidos
```bash
curl -s 'http://localhost:8000/api/orders/' | jq
```

**Respuesta resumida:**
```json
[
  {
    "id": "ord_1728234567_xyz123",
    "order_number": "ORD-2025-001",
    "customer_id": "cust_spacex001",
    "status": "in_progress",
    "total_items": 8,
    "completed_items": 5,
    "completion_percentage": 62.5
  },
  ...
]
```

### 5. Filtrar Pedidos por Cliente
```bash
curl -s 'http://localhost:8000/api/orders/?customer_id=cust_spacex001' | jq
```

### 6. Ver Solo los Pedidos Pendientes
```bash
curl -s 'http://localhost:8000/api/orders/pending' | jq
```

### 7. Obtener un Pedido Específico
```bash
curl -s 'http://localhost:8000/api/orders/ord_1728234567_xyz123' | jq
```

### 8. Ver Información de Producción
```bash
# Listar todos los lotes
curl -s 'http://localhost:8000/api/production/batches' | jq

# Ver solo los lotes activos
curl -s 'http://localhost:8000/api/production/batches/active' | jq

# Estadísticas de producción
curl -s 'http://localhost:8000/api/production/statistics' | jq
```

## 🌐 Usando el Navegador

### La forma MÁS FÁCIL: Documentación Interactiva

1. **Abre tu navegador en:** http://localhost:8000/docs

2. Verás una interfaz interactiva con todos los endpoints organizados:
   - **Customers** (Clientes)
   - **Orders** (Pedidos)
   - **Production** (Producción)
   - **Metrics** (Métricas)

3. Para probar cualquier endpoint:
   - Click en el endpoint
   - Click en "Try it out"
   - Rellena los parámetros si es necesario
   - Click en "Execute"
   - Verás la respuesta abajo

**Ejemplo visual:**
```
GET /api/customers/
  → Click "Try it out"
  → Click "Execute"
  → Ver resultados en JSON
```

## 🐍 Usando Python

Crea un archivo `test_api.py`:

```python
#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000"

# Listar clientes
response = requests.get(f"{BASE_URL}/api/customers/")
clientes = response.json()
print("=== CLIENTES ===")
for cliente in clientes:
    print(f"- {cliente['name']} ({cliente['email']})")
print()

# Listar pedidos
response = requests.get(f"{BASE_URL}/api/orders/")
pedidos = response.json()
print("=== PEDIDOS ===")
for pedido in pedidos:
    print(f"- {pedido['order_number']}: {pedido['status']} - {pedido['completion_percentage']:.1f}% completado")
print()

# Obtener un cliente específico
if clientes:
    cliente_id = clientes[0]['id']
    response = requests.get(f"{BASE_URL}/api/customers/{cliente_id}/statistics")
    stats = response.json()
    print(f"=== ESTADÍSTICAS DE {clientes[0]['name']} ===")
    print(json.dumps(stats, indent=2))
```

Ejecuta:
```bash
python test_api.py
```

## 📊 Ejemplos de Análisis

### Dashboard Completo
```bash
# Ver todas las métricas principales
curl -s 'http://localhost:8000/api/metrics/dashboard' | jq '.orders'
```

### Métricas de Pedidos
```bash
# Últimos 30 días (por defecto)
curl -s 'http://localhost:8000/api/metrics/orders' | jq

# Últimos 7 días
curl -s 'http://localhost:8000/api/metrics/orders?period_days=7' | jq
```

### Métricas de Producción
```bash
# Últimos 30 días
curl -s 'http://localhost:8000/api/metrics/production' | jq

# Ver solo estadísticas clave
curl -s 'http://localhost:8000/api/metrics/production' | jq '{
  total_batches,
  by_status,
  average_progress
}'
```

### KPIs del Sistema
```bash
curl -s 'http://localhost:8000/api/metrics/kpis' | jq
```

## 🔄 Operaciones CRUD

### Crear un Nuevo Pedido (Ejemplo simplificado)
```bash
curl -X POST 'http://localhost:8000/api/orders' \
  -H 'Content-Type: application/json' \
  -d '{
    "customer_id": "cust_spacex001",
    "order_number": "ORD-TEST-001",
    "order_lines": [],
    "priority": "normal",
    "notes": "Pedido de prueba"
  }' | jq
```

### Actualizar Estado de un Pedido
```bash
curl -X PATCH 'http://localhost:8000/api/orders/ord_1728234567_xyz123/status' \
  -H 'Content-Type: application/json' \
  -d '{"status": "completed"}' | jq
```

### Cancelar un Pedido
```bash
curl -X POST 'http://localhost:8000/api/orders/ord_1728234567_xyz123/cancel' \
  -H 'Content-Type: application/json' \
  -d '{"reason": "Cliente solicitó cancelación"}' | jq
```

## 🛠️ Comandos Docker Útiles

```bash
# Ver logs en tiempo real
docker compose logs -f kybercore

# Reiniciar el servicio
docker compose restart kybercore

# Ver estado
docker compose ps

# Detener todo
docker compose down

# Reconstruir y reiniciar
docker compose down && docker compose up --build -d
```

## 🎨 Integración con Frontend

### Ejemplo React Hook
```javascript
import { useState, useEffect } from 'react';

function CustomersList() {
  const [customers, setCustomers] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:8000/api/customers/')
      .then(res => res.json())
      .then(data => setCustomers(data));
  }, []);
  
  return (
    <ul>
      {customers.map(c => (
        <li key={c.id}>{c.name} - {c.email}</li>
      ))}
    </ul>
  );
}
```

### Ejemplo con Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Obtener clientes
const customers = await api.get('/customers/');

// Obtener pedidos de un cliente
const orders = await api.get('/orders/', {
  params: { customer_id: 'cust_spacex001' }
});

// Crear pedido
const newOrder = await api.post('/orders', orderData);
```

## ✅ Verificación Rápida

Ejecuta este comando para verificar que todo funciona:

```bash
echo "=== HEALTH CHECK ===" && \
curl -s http://localhost:8000/health | jq && \
echo "\n=== CLIENTES ===" && \
curl -s 'http://localhost:8000/api/customers/' | jq 'length' && \
echo "clientes encontrados" && \
echo "\n=== PEDIDOS ===" && \
curl -s 'http://localhost:8000/api/orders/' | jq 'length' && \
echo "pedidos encontrados"
```

## 🆘 Problemas Comunes

### El endpoint devuelve vacío
- Asegúrate de usar la barra final `/` donde sea necesario
- Consulta la documentación en `/docs` para ver la sintaxis exacta

### Error 404
- Verifica la URL y el método HTTP (GET, POST, etc.)
- Algunos endpoints usan nombres singulares, otros plurales

### Error 500
- Revisa los logs: `docker compose logs kybercore`
- Verifica que los archivos JSON en `base_datos/` existen

### "jq: command not found"
```bash
# Instalar jq para formatear JSON
sudo apt install jq
```

## 📚 Recursos Adicionales

- **Documentación Completa:** `/docs/orders-system-readme.md`
- **Resumen de Implementación:** `/docs/orders-implementation-summary.md`
- **Swagger UI:** http://localhost:8000/docs (¡LA MEJOR OPCIÓN!)
- **ReDoc:** http://localhost:8000/redoc

---

**¡El sistema está listo para usar!** 🚀

La forma más fácil de empezar es abrir http://localhost:8000/docs en tu navegador.
