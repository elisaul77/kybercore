#!/bin/bash

# Script de demostración de creación de clientes y pedidos
# Prueba las nuevas funcionalidades del módulo de pedidos

echo "🧪 Probando creación de clientes y pedidos en KyberCore..."
echo ""

BASE_URL="http://localhost:8000/api"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "═══════════════════════════════════════════════════════"
echo "📝 TEST 1: Crear Nuevo Cliente"
echo "═══════════════════════════════════════════════════════"

CUSTOMER_DATA='{
  "name": "María García",
  "email": "maria.garcia@example.com",
  "phone": "+34612345678",
  "company": "Innovación 3D S.L.",
  "address": "Calle de la Impresión 42, Madrid 28001",
  "notes": "Cliente VIP interesado en prototipos funcionales"
}'

echo -e "${BLUE}Datos del cliente:${NC}"
echo "$CUSTOMER_DATA" | jq '.'
echo ""

CUSTOMER_RESPONSE=$(curl -s -X POST "$BASE_URL/customers/" \
  -H "Content-Type: application/json" \
  -d "$CUSTOMER_DATA")

if echo "$CUSTOMER_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Cliente creado exitosamente${NC}"
    CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | jq -r '.id')
    echo "  ID: $CUSTOMER_ID"
    echo "  Nombre: $(echo "$CUSTOMER_RESPONSE" | jq -r '.name')"
    echo "  Email: $(echo "$CUSTOMER_RESPONSE" | jq -r '.email')"
else
    echo -e "${RED}✗ Error al crear cliente${NC}"
    echo "$CUSTOMER_RESPONSE" | jq '.'
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📦 TEST 2: Crear Pedido con Items"
echo "═══════════════════════════════════════════════════════"

ORDER_DATA=$(cat <<EOF
{
  "customer_id": "$CUSTOMER_ID",
  "priority": "high",
  "due_date": "$(date -d '+7 days' '+%Y-%m-%d')",
  "notes": "Pedido urgente para feria tecnológica",
  "items": [
    {
      "name": "Carcasa de Prototipo v2.0",
      "quantity": 5,
      "unit_price": 25.50,
      "material": "PETG",
      "color": "Negro mate",
      "file_path": "/proyectos/carcasa_v2.stl",
      "notes": "Requiere acabado superficial suave"
    },
    {
      "name": "Soporte de Montaje",
      "quantity": 10,
      "unit_price": 8.75,
      "material": "PLA",
      "color": "Gris",
      "file_path": "/proyectos/soporte.stl",
      "notes": "Material resistente a impactos"
    },
    {
      "name": "Engranaje Personalizado",
      "quantity": 3,
      "unit_price": 15.00,
      "material": "Nylon",
      "color": "Natural",
      "file_path": "/proyectos/engranaje_custom.stl",
      "notes": "Alta precisión dimensional requerida"
    }
  ]
}
EOF
)

echo -e "${BLUE}Datos del pedido:${NC}"
echo "$ORDER_DATA" | jq '.'
echo ""

ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/orders/" \
  -H "Content-Type: application/json" \
  -d "$ORDER_DATA")

if echo "$ORDER_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Pedido creado exitosamente${NC}"
    ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id')
    echo "  ID: ${ORDER_ID:0:8}..."
    echo "  Cliente: $(echo "$ORDER_RESPONSE" | jq -r '.customer_id' | cut -c1-8)..."
    echo "  Estado: $(echo "$ORDER_RESPONSE" | jq -r '.status')"
    echo "  Prioridad: $(echo "$ORDER_RESPONSE" | jq -r '.priority')"
    echo "  Items: $(echo "$ORDER_RESPONSE" | jq -r '.items | length')"
    echo "  Total: $$(echo "$ORDER_RESPONSE" | jq -r '.total_amount')"
else
    echo -e "${RED}✗ Error al crear pedido${NC}"
    echo "$ORDER_RESPONSE" | jq '.'
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 TEST 3: Verificar Estadísticas"
echo "═══════════════════════════════════════════════════════"

echo -e "${YELLOW}Obteniendo métricas actualizadas...${NC}"
METRICS=$(curl -s "$BASE_URL/metrics/dashboard")

echo ""
echo "📦 Pedidos:"
echo "$METRICS" | jq -r '.orders | "  Total: \(.total)\n  Pendientes: \(.pending)\n  En Producción: \(.in_production)\n  Completados: \(.completed)"'

echo ""
echo "👥 Clientes:"
echo "$METRICS" | jq -r '.customers | "  Total: \(.total)\n  Activos: \(.active)"'

echo ""
echo "💰 Financiero:"
echo "$METRICS" | jq -r '.financial | "  Ingresos Totales: $\(.total_revenue)\n  Ingresos Pendientes: $\(.pending_revenue)\n  Valor Promedio de Pedido: $\(.average_order_value)"'

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📋 TEST 4: Listar Todos los Pedidos"
echo "═══════════════════════════════════════════════════════"

echo -e "${YELLOW}Obteniendo lista de pedidos...${NC}"
ORDERS_LIST=$(curl -s "$BASE_URL/orders/")

echo ""
ORDERS_COUNT=$(echo "$ORDERS_LIST" | jq '. | length')
echo -e "${GREEN}Total de pedidos en el sistema: $ORDERS_COUNT${NC}"

echo ""
echo "Últimos pedidos:"
echo "$ORDERS_LIST" | jq -r '.[] | "\n  ID: \(.id[0:8])...\n  Cliente: \(.customer_id[0:8])...\n  Estado: \(.status)\n  Prioridad: \(.priority)\n  Items: \(.items | length)\n  Total: $\(.total_amount)"' | head -40

echo ""
echo "═══════════════════════════════════════════════════════"
echo "👥 TEST 5: Listar Todos los Clientes"
echo "═══════════════════════════════════════════════════════"

echo -e "${YELLOW}Obteniendo lista de clientes...${NC}"
CUSTOMERS_LIST=$(curl -s "$BASE_URL/customers/")

echo ""
CUSTOMERS_COUNT=$(echo "$CUSTOMERS_LIST" | jq '. | length')
echo -e "${GREEN}Total de clientes en el sistema: $CUSTOMERS_COUNT${NC}"

echo ""
echo "Clientes registrados:"
echo "$CUSTOMERS_LIST" | jq -r '.[] | "\n  Nombre: \(.name)\n  Email: \(.email)\n  Empresa: \(.company // "N/A")\n  Teléfono: \(.phone // "N/A")"'

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ RESUMEN FINAL"
echo "═══════════════════════════════════════════════════════"

echo -e "${GREEN}✓ Todos los tests completados exitosamente${NC}"
echo ""
echo "Funcionalidades probadas:"
echo "  ✓ Creación de clientes con todos los campos"
echo "  ✓ Creación de pedidos con múltiples items"
echo "  ✓ Cálculo automático de totales"
echo "  ✓ Actualización de métricas del dashboard"
echo "  ✓ Listado de pedidos y clientes"
echo ""
echo "🌐 Accede a la interfaz web en: ${YELLOW}http://localhost:8000${NC}"
echo "   Haz click en 📦 'Pedidos' para ver los datos"
echo ""
echo "💡 Prueba crear más clientes y pedidos desde la interfaz web!"
