#!/bin/bash

# Script de verificación del módulo de pedidos integrado en KyberCore
# Verifica que todos los endpoints estén respondiendo correctamente

echo "🔍 Verificando integración del módulo de pedidos en KyberCore..."
echo ""

BASE_URL="http://localhost:8000"
SUCCESS=0
FAILED=0

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar endpoint
check_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Verificando $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        ((SUCCESS++))
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
        ((FAILED++))
    fi
}

echo "═══════════════════════════════════════════════════════"
echo "🌐 FRONTEND WEB"
echo "═══════════════════════════════════════════════════════"

check_endpoint "/" "Página principal"
check_endpoint "/static/js/orders.js" "JavaScript del módulo"
check_endpoint "/api/orders/orders" "HTML del módulo de pedidos"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📦 API DE PEDIDOS"
echo "═══════════════════════════════════════════════════════"

check_endpoint "/api/orders/" "Lista de pedidos"
check_endpoint "/api/customers/" "Lista de clientes"
check_endpoint "/api/metrics/dashboard" "Métricas dashboard"
check_endpoint "/api/production/batches" "Lotes de producción"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 DATOS DEL SISTEMA"
echo "═══════════════════════════════════════════════════════"

# Obtener estadísticas
echo ""
echo -e "${YELLOW}Pedidos en el sistema:${NC}"
ORDERS_COUNT=$(curl -s "$BASE_URL/api/orders/" | jq '. | length' 2>/dev/null || echo "N/A")
echo "  Total: $ORDERS_COUNT pedidos"

echo ""
echo -e "${YELLOW}Clientes registrados:${NC}"
CUSTOMERS_COUNT=$(curl -s "$BASE_URL/api/customers/" | jq '. | length' 2>/dev/null || echo "N/A")
echo "  Total: $CUSTOMERS_COUNT clientes"

echo ""
echo -e "${YELLOW}Métricas del dashboard:${NC}"
curl -s "$BASE_URL/api/metrics/dashboard" | jq -r 'to_entries | .[] | "  \(.key): \(.value)"' 2>/dev/null || echo "  Error obteniendo métricas"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📋 RESUMEN"
echo "═══════════════════════════════════════════════════════"
echo -e "Tests exitosos: ${GREEN}$SUCCESS${NC}"
echo -e "Tests fallidos: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Todos los tests pasaron correctamente!${NC}"
    echo ""
    echo "🎉 El módulo de pedidos está completamente integrado y funcional!"
    echo ""
    echo "Accede a la interfaz web en: ${YELLOW}http://localhost:8000${NC}"
    echo "Haz click en el ícono 📦 'Pedidos' en el sidebar"
    exit 0
else
    echo -e "${RED}✗ Algunos tests fallaron. Revisa los logs del contenedor:${NC}"
    echo "  docker logs kybercore"
    exit 1
fi
