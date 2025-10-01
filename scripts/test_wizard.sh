#!/bin/bash

# 🧪 Script de Pruebas Automatizadas para el Wizard de Impresión 3D
# KyberCore - Pruebas de funcionalidad del wizard

# No salir si hay errores, queremos ver todos los resultados
# set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs base
BASE_URL="http://localhost:8000"
API_URL="${BASE_URL}/api"

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0

# Función para imprimir con color
print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Función para verificar que el servidor está corriendo
check_server() {
    print_header "Verificando Servidor"
    
    if curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
        print_success "Servidor está corriendo en ${BASE_URL}"
        
        # Verificar estado de salud
        HEALTH=$(curl -s "${BASE_URL}/health" | jq -r '.status')
        if [ "$HEALTH" = "healthy" ]; then
            print_success "Estado de salud: healthy"
        else
            print_warning "Estado de salud: $HEALTH"
        fi
    else
        print_error "Servidor no está corriendo en ${BASE_URL}"
        echo "Ejecuta: docker compose up -d"
        exit 1
    fi
}

# Test 1: Verificar endpoint de selección de piezas
test_piece_selection() {
    print_header "Test 1: Endpoint de Selección de Piezas"
    
    # Obtener el primer proyecto de la base de datos
    PROJECT_ID=$(cat base_datos/proyectos.json | jq -r '.proyectos[0].id')
    
    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
        print_error "No se encontraron proyectos en la base de datos"
        return
    fi
    
    print_test "Probando con proyecto ID: $PROJECT_ID"
    
    RESPONSE=$(curl -s "${API_URL}/print/piece-selection/${PROJECT_ID}")
    
    # Verificar que la respuesta sea JSON válido
    if echo "$RESPONSE" | jq -e . > /dev/null 2>&1; then
        print_success "Respuesta JSON válida"
        
        # Verificar campos requeridos
        SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            print_success "Endpoint retorna success: true"
            
            # Verificar datos del proyecto
            TOTAL_PIECES=$(echo "$RESPONSE" | jq -r '.project_info.total_pieces')
            print_success "Total de piezas: $TOTAL_PIECES"
            
            # Verificar que hay piezas
            PIECES_COUNT=$(echo "$RESPONSE" | jq '.pieces | length')
            if [ "$PIECES_COUNT" -gt 0 ]; then
                print_success "Se encontraron $PIECES_COUNT piezas"
            else
                print_warning "No se encontraron piezas en el proyecto"
            fi
        else
            print_error "Endpoint retorna success: false"
        fi
    else
        print_error "Respuesta no es JSON válido"
        echo "Respuesta: $RESPONSE"
    fi
}

# Test 2: Verificar endpoint de selección de material
test_material_selection() {
    print_header "Test 2: Endpoint de Selección de Material"
    
    RESPONSE=$(curl -s "${API_URL}/print/material-selection")
    
    if echo "$RESPONSE" | jq -e . > /dev/null 2>&1; then
        print_success "Respuesta JSON válida"
        
        SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            print_success "Endpoint retorna success: true"
            
            # Verificar que hay materiales disponibles
            MATERIALS_COUNT=$(echo "$RESPONSE" | jq '.available_materials | length')
            if [ "$MATERIALS_COUNT" -gt 0 ]; then
                print_success "Se encontraron $MATERIALS_COUNT materiales disponibles"
                
                # Listar tipos de materiales
                MATERIAL_TYPES=$(echo "$RESPONSE" | jq -r '.available_materials[].type' | sort | uniq | tr '\n' ', ')
                print_success "Tipos disponibles: $MATERIAL_TYPES"
            else
                print_warning "No se encontraron materiales disponibles"
            fi
        else
            print_error "Endpoint retorna success: false"
        fi
    else
        print_error "Respuesta no es JSON válido"
    fi
}

# Test 3: Verificar endpoint de modos de producción
test_production_modes() {
    print_header "Test 3: Endpoint de Modos de Producción"
    
    RESPONSE=$(curl -s "${API_URL}/print/production-modes")
    
    if echo "$RESPONSE" | jq -e . > /dev/null 2>&1; then
        print_success "Respuesta JSON válida"
        
        SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            print_success "Endpoint retorna success: true"
            
            # Verificar modos disponibles
            MODES_COUNT=$(echo "$RESPONSE" | jq '.modes | length')
            print_success "Se encontraron $MODES_COUNT modos de producción"
            
            # Verificar prioridades disponibles
            PRIORITIES_COUNT=$(echo "$RESPONSE" | jq '.priorities | length')
            print_success "Se encontraron $PRIORITIES_COUNT prioridades"
        else
            print_error "Endpoint retorna success: false"
        fi
    else
        print_error "Respuesta no es JSON válido"
    fi
}

# Test 4: Verificar endpoint de impresoras disponibles
test_available_printers() {
    print_header "Test 4: Endpoint de Impresoras Disponibles"
    
    RESPONSE=$(curl -s "${API_URL}/print/available-printers")
    
    if echo "$RESPONSE" | jq -e . > /dev/null 2>&1; then
        print_success "Respuesta JSON válida"
        
        SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            print_success "Endpoint retorna success: true"
            
            # Verificar impresoras disponibles
            PRINTERS_COUNT=$(echo "$RESPONSE" | jq '.printers | length')
            if [ "$PRINTERS_COUNT" -gt 0 ]; then
                print_success "Se encontraron $PRINTERS_COUNT impresoras"
                
                # Contar impresoras disponibles
                AVAILABLE_COUNT=$(echo "$RESPONSE" | jq '[.printers[] | select(.is_available == true)] | length')
                print_success "Impresoras disponibles: $AVAILABLE_COUNT"
            else
                print_warning "No se encontraron impresoras configuradas"
            fi
        else
            print_error "Endpoint retorna success: false"
        fi
    else
        print_error "Respuesta no es JSON válido"
    fi
}

# Test 5: Verificar estructura de archivos JavaScript
test_javascript_files() {
    print_header "Test 5: Verificar Archivos JavaScript"
    
    # Archivo principal del wizard
    WIZARD_JS="src/web/static/js/modules/gallery/project_modal.js"
    if [ -f "$WIZARD_JS" ]; then
        print_success "Archivo del wizard encontrado: $WIZARD_JS"
        
        # Verificar funciones clave
        if grep -q "function openPrintFlowWizard" "$WIZARD_JS"; then
            print_success "Función openPrintFlowWizard encontrada"
        else
            print_error "Función openPrintFlowWizard NO encontrada"
        fi
        
        if grep -q "function loadPrintFlowStep" "$WIZARD_JS"; then
            print_success "Función loadPrintFlowStep encontrada"
        else
            print_error "Función loadPrintFlowStep NO encontrada"
        fi
        
        if grep -q "function loadPieceSelectionStep" "$WIZARD_JS"; then
            print_success "Función loadPieceSelectionStep encontrada"
        else
            print_error "Función loadPieceSelectionStep NO encontrada"
        fi
    else
        print_error "Archivo del wizard NO encontrado: $WIZARD_JS"
    fi
}

# Test 6: Verificar base de datos
test_database() {
    print_header "Test 6: Verificar Base de Datos"
    
    # Verificar proyectos.json
    PROJECTS_DB="base_datos/proyectos.json"
    if [ -f "$PROJECTS_DB" ]; then
        print_success "Base de datos de proyectos encontrada"
        
        # Contar proyectos
        PROJECTS_COUNT=$(cat "$PROJECTS_DB" | jq '.proyectos | length')
        print_success "Proyectos en base de datos: $PROJECTS_COUNT"
        
        # Verificar estructura
        if cat "$PROJECTS_DB" | jq -e '.proyectos[0].id' > /dev/null 2>&1; then
            print_success "Estructura de proyectos válida"
        else
            print_error "Estructura de proyectos inválida"
        fi
    else
        print_error "Base de datos de proyectos NO encontrada"
    fi
    
    # Verificar wizard_sessions.json
    SESSIONS_DB="base_datos/wizard_sessions.json"
    if [ -f "$SESSIONS_DB" ]; then
        print_success "Base de datos de sesiones de wizard encontrada"
    else
        print_warning "Base de datos de sesiones de wizard NO encontrada (se creará al usar el wizard)"
    fi
}

# Test 7: Verificar controlador backend
test_backend_controller() {
    print_header "Test 7: Verificar Controlador Backend"
    
    CONTROLLER="src/controllers/print_flow_controller.py"
    if [ -f "$CONTROLLER" ]; then
        print_success "Controlador encontrado: $CONTROLLER"
        
        # Verificar endpoints clave
        if grep -q "@router.get.*piece-selection" "$CONTROLLER"; then
            print_success "Endpoint piece-selection encontrado"
        else
            print_error "Endpoint piece-selection NO encontrado"
        fi
        
        if grep -q "@router.post.*select-pieces" "$CONTROLLER"; then
            print_success "Endpoint select-pieces encontrado"
        else
            print_error "Endpoint select-pieces NO encontrado"
        fi
        
        if grep -q "def load_project_data" "$CONTROLLER"; then
            print_success "Función load_project_data encontrada"
        else
            print_error "Función load_project_data NO encontrada"
        fi
    else
        print_error "Controlador NO encontrado: $CONTROLLER"
    fi
}

# Test 8: Verificar integración con routing
test_routing_integration() {
    print_header "Test 8: Verificar Integración con Routing"
    
    # Verificar que el módulo new-job está en la lista de módulos válidos
    APP_JS="src/web/static/js/app.js"
    if [ -f "$APP_JS" ]; then
        if grep -q "new-job" "$APP_JS"; then
            print_success "Módulo 'new-job' registrado en routing"
        else
            print_error "Módulo 'new-job' NO registrado en routing"
        fi
        
        # Verificar hash-based navigation
        if grep -q "window.location.hash" "$APP_JS"; then
            print_success "Hash-based navigation implementado"
        else
            print_error "Hash-based navigation NO implementado"
        fi
    else
        print_error "Archivo app.js NO encontrado"
    fi
}

# Test 9: Verificar template HTML
test_html_template() {
    print_header "Test 9: Verificar Template HTML"
    
    TEMPLATE="src/web/templates/modules/new-job.html"
    if [ -f "$TEMPLATE" ]; then
        print_success "Template encontrado: $TEMPLATE"
        
        # Verificar pasos del wizard
        for i in {1..5}; do
            if grep -q "id=\"step$i\"" "$TEMPLATE"; then
                print_success "Paso $i encontrado en template"
            else
                print_warning "Paso $i NO encontrado en template"
            fi
        done
    else
        print_error "Template NO encontrado: $TEMPLATE"
    fi
}

# Test 10: Verificar acceso desde navegador
test_browser_access() {
    print_header "Test 10: Verificar Acceso desde Navegador"
    
    # Probar acceso a la página principal
    if curl -s "${BASE_URL}/" | grep -q "KyberCore"; then
        print_success "Página principal accesible"
    else
        print_error "Página principal NO accesible"
    fi
    
    # Probar acceso al módulo new-job
    if curl -s "${BASE_URL}/" | grep -q "new-job"; then
        print_success "Módulo new-job visible en navegación"
    else
        print_warning "Módulo new-job NO visible en navegación"
    fi
}

# ========================================
# EJECUTAR TODOS LOS TESTS
# ========================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🧪 TESTS DEL WIZARD DE IMPRESIÓN 3D - KYBERCORE    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

check_server

test_piece_selection
test_material_selection
test_production_modes
test_available_printers
test_javascript_files
test_database
test_backend_controller
test_routing_integration
test_html_template
test_browser_access

# Resumen final
print_header "Resumen de Pruebas"
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo -e "${GREEN}Tests exitosos: $TESTS_PASSED${NC}"
echo -e "${RED}Tests fallidos: $TESTS_FAILED${NC}"
echo -e "${BLUE}Total de tests: $TOTAL_TESTS${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ TODOS LOS TESTS PASARON CORRECTAMENTE ✅          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "🎉 El wizard está listo para usarse!"
    echo "📝 Abre http://localhost:8000/#gallery y prueba el botón 'Imprimir Proyecto'"
    exit 0
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ❌ ALGUNOS TESTS FALLARON ❌                         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "⚠️  Revisa los errores arriba y corrige los problemas"
    echo "📚 Consulta docs/wizard-test-guide.md para más información"
    exit 1
fi
