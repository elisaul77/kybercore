#!/bin/bash

# 🔍 Script de Verificación - Integración IA Google Gemini
# Verifica que todos los archivos y configuraciones estén en su lugar

echo "======================================"
echo "🔍 VERIFICACIÓN DE INTEGRACIÓN IA"
echo "======================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de checks
PASSED=0
FAILED=0

# Función de verificación
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} $2 - NO ENCONTRADO: $1"
        ((FAILED++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $3"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} $3 - NO ENCONTRADO: $2 en $1"
        ((FAILED++))
    fi
}

echo "📁 VERIFICANDO ARCHIVOS BACKEND..."
echo "-----------------------------------"
check_file "/home/elisaul77/KyberCore/src/config/settings.py" "settings.py (Configuración Gemini)"
check_file "/home/elisaul77/KyberCore/src/services/ai_assistant/stl_analyzer.py" "stl_analyzer.py (Análisis STL)"
check_file "/home/elisaul77/KyberCore/src/services/ai_assistant/gemini_client.py" "gemini_client.py (Cliente Gemini)"
check_file "/home/elisaul77/KyberCore/src/services/ai_assistant/__init__.py" "__init__.py (Módulo AI)"
check_file "/home/elisaul77/KyberCore/scripts/test_ai_system.py" "test_ai_system.py (Tests IA)"
echo ""

echo "📄 VERIFICANDO CONTENIDO CLAVE..."
echo "-----------------------------------"
check_content "/home/elisaul77/KyberCore/src/config/settings.py" "GOOGLE_GENAI_API_KEY" "API Key en settings.py"
check_content "/home/elisaul77/KyberCore/src/config/settings.py" "gemini-2.5-flash" "Modelo Gemini correcto"
check_content "/home/elisaul77/KyberCore/src/services/ai_assistant/stl_analyzer.py" "class STLGeometryAnalyzer" "Clase STLGeometryAnalyzer"
check_content "/home/elisaul77/KyberCore/src/services/ai_assistant/gemini_client.py" "class GeminiProfileOptimizer" "Clase GeminiProfileOptimizer"
check_content "/home/elisaul77/KyberCore/requirements.txt" "google-generativeai" "Dependencia google-generativeai"
check_content "/home/elisaul77/KyberCore/requirements.txt" "pydantic-settings" "Dependencia pydantic-settings"
echo ""

echo "🎨 VERIFICANDO FRONTEND..."
echo "-----------------------------------"
check_file "/home/elisaul77/KyberCore/src/web/static/js/modules/gallery/project_modal.js" "project_modal.js"
check_content "/home/elisaul77/KyberCore/src/web/static/js/modules/gallery/project_modal.js" "ai-optimization-section" "Sección IA en HTML"
check_content "/home/elisaul77/KyberCore/src/web/static/js/modules/gallery/project_modal.js" "function analyzeWithAI" "Función analyzeWithAI()"
check_content "/home/elisaul77/KyberCore/src/web/static/js/modules/gallery/project_modal.js" "function displayAIResults" "Función displayAIResults()"
check_content "/home/elisaul77/KyberCore/src/web/static/js/modules/gallery/project_modal.js" "function continueWithAIProfile" "Función continueWithAIProfile()"
echo ""

echo "⚙️ VERIFICANDO CONFIGURACIÓN..."
echo "-----------------------------------"
if [ -f "/home/elisaul77/KyberCore/.env" ]; then
    if grep -q "GOOGLE_GENAI_API_KEY" "/home/elisaul77/KyberCore/.env"; then
        echo -e "${GREEN}✅${NC} GOOGLE_GENAI_API_KEY en .env"
        ((PASSED++))
        
        # Verificar que no esté vacía (sin mostrar el valor)
        if grep "GOOGLE_GENAI_API_KEY=" "/home/elisaul77/KyberCore/.env" | grep -v "GOOGLE_GENAI_API_KEY=$" > /dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} API Key tiene valor (no vacía)"
            ((PASSED++))
        else
            echo -e "${RED}❌${NC} API Key está vacía"
            ((FAILED++))
        fi
    else
        echo -e "${RED}❌${NC} GOOGLE_GENAI_API_KEY NO encontrada en .env"
        ((FAILED++))
    fi
else
    echo -e "${RED}❌${NC} Archivo .env no encontrado"
    ((FAILED++))
fi
echo ""

echo "📚 VERIFICANDO DOCUMENTACIÓN..."
echo "-----------------------------------"
check_file "/home/elisaul77/KyberCore/docs/AI_SYSTEM_IMPLEMENTATION.md" "Documentación de implementación"
check_file "/home/elisaul77/KyberCore/docs/TODO_AI_FRONTEND.md" "Guía de frontend"
check_file "/home/elisaul77/KyberCore/docs/AI_TESTING_GUIDE.md" "Guía de testing"
echo ""

echo "🐳 VERIFICANDO DOCKER..."
echo "-----------------------------------"
if docker ps | grep -q "kybercore"; then
    echo -e "${GREEN}✅${NC} Contenedor kybercore está corriendo"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️${NC} Contenedor kybercore no está corriendo"
    echo "   Ejecutar: docker compose up -d"
fi
echo ""

echo "======================================"
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "======================================"
echo -e "${GREEN}✅ Checks Pasados: $PASSED${NC}"
echo -e "${RED}❌ Checks Fallidos: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡TODO ESTÁ LISTO!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Verificar backend: docker compose exec kybercore python scripts/test_ai_system.py"
    echo "2. Abrir navegador: http://localhost:8501"
    echo "3. Seguir guía: docs/AI_TESTING_GUIDE.md"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️ HAY PROBLEMAS - Revisar archivos faltantes o configuración${NC}"
    echo ""
    exit 1
fi
