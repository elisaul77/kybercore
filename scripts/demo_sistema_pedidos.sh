#!/bin/bash
# Script de demostración del Sistema de Pedidos de KyberCore

set -e

BASE_URL="http://localhost:8000"
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     Sistema de Pedidos KyberCore - Demostración          ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que el servidor está corriendo
echo -e "${BLUE}[1/7]${NC} Verificando que el servidor está funcionando..."
if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Servidor funcionando correctamente${NC}"
else
    echo -e "${YELLOW}✗ El servidor no responde. ¿Está Docker Compose corriendo?${NC}"
    echo "Ejecuta: docker compose up -d"
    exit 1
fi
echo ""

# Listar clientes
echo -e "${BLUE}[2/7]${NC} ${BOLD}Listando clientes registrados:${NC}"
CUSTOMERS=$(curl -s "$BASE_URL/api/customers/")
echo "$CUSTOMERS" | jq -r '.[] | "  • \(.name) (\(.company)) - \(.email)"'
TOTAL_CUSTOMERS=$(echo "$CUSTOMERS" | jq 'length')
echo -e "${GREEN}Total: $TOTAL_CUSTOMERS clientes${NC}"
echo ""

# Listar pedidos
echo -e "${BLUE}[3/7]${NC} ${BOLD}Listando pedidos:${NC}"
ORDERS=$(curl -s "$BASE_URL/api/orders/")
echo "$ORDERS" | jq -r '.[] | "  • \(.order_number): \(.status) - \(.completion_percentage)% completado - \(.total_items) items"'
TOTAL_ORDERS=$(echo "$ORDERS" | jq 'length')
echo -e "${GREEN}Total: $TOTAL_ORDERS pedidos${NC}"
echo ""

# Obtener un cliente específico
FIRST_CUSTOMER_ID=$(echo "$CUSTOMERS" | jq -r '.[0].id')
echo -e "${BLUE}[4/7]${NC} ${BOLD}Obteniendo detalles del cliente: $FIRST_CUSTOMER_ID${NC}"
curl -s "$BASE_URL/api/customers/$FIRST_CUSTOMER_ID" | jq '{
  nombre: .name,
  empresa: .company,
  email: .email,
  total_pedidos: .total_orders,
  miembro_desde: .created_at
}'
echo ""

# Estadísticas del cliente
echo -e "${BLUE}[5/7]${NC} ${BOLD}Estadísticas del cliente:${NC}"
curl -s "$BASE_URL/api/customers/$FIRST_CUSTOMER_ID/statistics" | jq
echo ""

# Obtener pedidos pendientes
echo -e "${BLUE}[6/7]${NC} ${BOLD}Pedidos pendientes:${NC}"
PENDING=$(curl -s "$BASE_URL/api/orders/pending")
PENDING_COUNT=$(echo "$PENDING" | jq 'length')
if [ "$PENDING_COUNT" -gt 0 ]; then
    echo "$PENDING" | jq -r '.[] | "  • \(.order_number) - Cliente: \(.customer_id)"'
    echo -e "${GREEN}$PENDING_COUNT pedidos pendientes${NC}"
else
    echo -e "${GREEN}✓ No hay pedidos pendientes${NC}"
fi
echo ""

# Métricas del dashboard
echo -e "${BLUE}[7/7]${NC} ${BOLD}Métricas del Dashboard:${NC}"
DASHBOARD=$(curl -s "$BASE_URL/api/metrics/dashboard")

echo -e "\n${YELLOW}Pedidos:${NC}"
echo "$DASHBOARD" | jq '.orders'

echo -e "\n${YELLOW}Producción:${NC}"
echo "$DASHBOARD" | jq '.production'

echo -e "\n${YELLOW}Financiero:${NC}"
echo "$DASHBOARD" | jq '.financial'

echo -e "\n${YELLOW}Clientes:${NC}"
echo "$DASHBOARD" | jq '.customers'

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                 Demostración Completada                   ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓${NC} Para explorar más, abre: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "${GREEN}✓${NC} Documentación completa: ${BLUE}/docs/QUICK-START-PEDIDOS.md${NC}"
echo ""
