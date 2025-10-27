#!/bin/bash
# 🧹 FASE 2: Consolidación de Documentación
# Este script reorganiza y consolida la documentación duplicada en docs/

set -e  # Exit on error

echo "🚀 INICIANDO FASE 2: CONSOLIDACIÓN DE DOCUMENTACIÓN"
echo "===================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/home/elisaul77/KyberCore"
cd "$BASE_DIR"

# =======================
# 1. SISTEMA DE PEDIDOS
# =======================
echo -e "${BLUE}📦 1. Consolidando Sistema de Pedidos...${NC}"

mkdir -p docs/features/orders

# Crear README consolidado
cat > docs/features/orders/README.md << 'EOF'
# 📦 Sistema de Pedidos

Sistema de gestión de pedidos para KyberCore.

## 🚀 Quick Start

[Ver documentación completa de inicio rápido]

## 📚 Documentación

- [Implementación Técnica](implementation.md)
- [Preguntas Frecuentes](faq.md)
- [Historial de Cambios](changelog.md)

## 🎯 Características

- Gestión de pedidos de clientes
- Tracking de estado en tiempo real
- Integración con sistema de impresión
- Dashboard de administración

EOF

# Mover archivos relacionados (sin consolidar aún, para revisión manual)
echo "  Archivos de pedidos encontrados para revisión:"
ls -1 docs/*pedidos* docs/*orders* 2>/dev/null || echo "  (ninguno en ubicación actual)"

echo -e "${GREEN}  ✅ Estructura creada en docs/features/orders/${NC}"
echo ""

# =======================
# 2. AUTO-PLATING
# =======================
echo -e "${BLUE}🎨 2. Consolidando Auto-Plating...${NC}"

mkdir -p docs/features/auto-plating

# Crear README consolidado
cat > docs/features/auto-plating/README.md << 'EOF'
# 🎨 Auto-Plating System

Sistema de organización automática de piezas en el plato de impresión.

## 🎯 Descripción

Auto-Plating analiza y organiza inteligentemente múltiples piezas STL en el plato de impresión, maximizando el uso del espacio disponible y minimizando el tiempo total de impresión.

## ✨ Características

- **Organización automática**: Coloca piezas optimizando espacio
- **Detección de colisiones**: Evita solapamiento de piezas
- **Nesting 3D experimental**: Coloca piezas pequeñas dentro de huecos
- **Validación de dimensiones**: Verifica que todo cabe en el plato

## 📚 Documentación

- [Implementación Técnica](implementation.md)
- [Historial de Bugs Fixed](changelog.md)

EOF

echo "  Archivos de auto-plating encontrados para revisión:"
ls -1 docs/*auto-plating* 2>/dev/null || echo "  (ninguno en ubicación actual)"

echo -e "${GREEN}  ✅ Estructura creada en docs/features/auto-plating/${NC}"
echo ""

# =======================
# 3. SISTEMA DE IA
# =======================
echo -e "${BLUE}🤖 3. Consolidando Sistema de IA...${NC}"

mkdir -p docs/features/ai

# Mover archivos de IA existentes
if [ -f "docs/AI_SYSTEM_IMPLEMENTATION.md" ]; then
    mv docs/AI_SYSTEM_IMPLEMENTATION.md docs/features/ai/implementation.md
    echo "  ✅ Movido AI_SYSTEM_IMPLEMENTATION.md"
fi

if [ -f "docs/AI_TESTING_GUIDE.md" ]; then
    mv docs/AI_TESTING_GUIDE.md docs/features/ai/testing-guide.md
    echo "  ✅ Movido AI_TESTING_GUIDE.md"
fi

if [ -f "docs/CONFIRMACION_IA_GCODE.md" ]; then
    mv docs/CONFIRMACION_IA_GCODE.md docs/features/ai/gcode-confirmation.md
    echo "  ✅ Movido CONFIRMACION_IA_GCODE.md"
fi

# Crear README si no existe
if [ ! -f "docs/features/ai/README.md" ]; then
    cat > docs/features/ai/README.md << 'EOF'
# 🤖 Sistema de Inteligencia Artificial

Sistema de generación de perfiles de impresión usando OpenAI GPT.

## 🎯 Descripción

El sistema de IA analiza características del STL, material, modo de producción e impresora para generar perfiles de impresión optimizados.

## 📚 Documentación

- [Implementación](implementation.md) - Detalles técnicos del sistema
- [Guía de Testing](testing-guide.md) - Cómo probar el sistema de IA
- [Confirmación G-code](gcode-confirmation.md) - Validación de parámetros
- [Prompts de OpenAI](../../../guides/openai-prompts.md) - Prompts utilizados

## 🔑 Parámetros Clave

- 41 parámetros de PrusaSlicer
- Análisis de geometría STL
- Optimización por material
- Ajustes por modo de producción

EOF
fi

echo -e "${GREEN}  ✅ Sistema de IA consolidado en docs/features/ai/${NC}"
echo ""

# =======================
# 4. VIEWERS (G-code y STL)
# =======================
echo -e "${BLUE}👁️  4. Consolidando Viewers...${NC}"

mkdir -p docs/features/viewers

# Mover archivos de viewers existentes
if [ -f "docs/gcode-viewer-guide.md" ]; then
    mv docs/gcode-viewer-guide.md docs/features/viewers/gcode-viewer.md
    echo "  ✅ Movido gcode-viewer-guide.md"
fi

if [ -f "docs/gcode-viewer-implementation-summary.md" ]; then
    # Agregar como sección en gcode-viewer.md o crear implementation.md
    echo "  ℹ️  gcode-viewer-implementation-summary.md - Revisar para consolidar"
fi

echo -e "${GREEN}  ✅ Viewers consolidados en docs/features/viewers/${NC}"
echo ""

# =======================
# 5. WIZARD
# =======================
echo -e "${BLUE}🧙 5. Consolidando Wizard...${NC}"

mkdir -p docs/features/wizard

# Mover archivos de wizard existentes
if [ -f "docs/wizard-test-guide.md" ]; then
    mv docs/wizard-test-guide.md docs/features/wizard/testing.md
    echo "  ✅ Movido wizard-test-guide.md"
fi

if [ -f "docs/wizard-verification-report.md" ]; then
    mv docs/wizard-verification-report.md docs/features/wizard/verification-report.md
    echo "  ✅ Movido wizard-verification-report.md"
fi

# Crear README para wizard
cat > docs/features/wizard/README.md << 'EOF'
# 🧙 Print Wizard

Asistente de impresión de 7 pasos para KyberCore.

## 🎯 Pasos del Wizard

1. **Selección de Piezas** - Elegir qué piezas imprimir
2. **Selección de Material** - Elegir material y verificar stock
3. **Modo de Producción** - Prototype vs Factory
4. **Asignación de Impresora** - Manual o automática
5. **Procesamiento STL** - Auto-rotación y slicing
6. **Validación** - Verificar configuración
7. **Confirmación** - Validar impresora y enviar job

## 📚 Documentación

- [Guía de Testing](testing.md)
- [Reporte de Verificación](verification-report.md)
- [Step 7 - Confirmación Inteligente](step7-confirmation.md)

EOF

echo -e "${GREEN}  ✅ Wizard consolidado en docs/features/wizard/${NC}"
echo ""

# =======================
# 6. ROUTING
# =======================
echo -e "${BLUE}🔀 6. Consolidando Routing...${NC}"

# Mover archivos de routing a architecture
if [ -f "docs/routing-fix.md" ]; then
    mv docs/routing-fix.md docs/architecture/routing-fix-history.md
    echo "  ✅ Movido routing-fix.md a architecture/"
fi

if [ -f "docs/routing-implementation-summary.md" ]; then
    mv docs/routing-implementation-summary.md docs/architecture/routing-implementation.md
    echo "  ✅ Movido routing-implementation-summary.md a architecture/"
fi

if [ -f "docs/url-routing-guide.md" ]; then
    mv docs/url-routing-guide.md docs/architecture/routing.md
    echo "  ✅ Movido url-routing-guide.md a architecture/"
fi

echo -e "${GREEN}  ✅ Routing consolidado en docs/architecture/${NC}"
echo ""

# =======================
# 7. CREAR ÍNDICE PRINCIPAL
# =======================
echo -e "${BLUE}📚 7. Creando índice principal de documentación...${NC}"

cat > docs/README.md << 'EOF'
# 📚 Documentación de KyberCore

Índice principal de documentación del proyecto.

## 🏗️ Arquitectura

- [Visión General](architecture/README.md)
- [Sistema de Routing](architecture/routing.md)
- [Plan de Refactorización](architecture/refactoring-plan.md)

## ✨ Características (Features)

### 🤖 Inteligencia Artificial
- [Sistema de IA](features/ai/README.md) - Generación de perfiles con OpenAI

### 📦 Sistema de Pedidos
- [Gestión de Pedidos](features/orders/README.md) - Sistema de órdenes de clientes

### 🎨 Auto-Plating
- [Organización Automática](features/auto-plating/README.md) - Plating inteligente

### 👁️ Visualizadores
- [G-code Viewer](features/viewers/gcode-viewer.md) - Visualización de G-code 3D
- [STL Viewer](../guides/stl-viewer.md) - Visualización de modelos STL

### 🧙 Print Wizard
- [Asistente de Impresión](features/wizard/README.md) - Flujo de 7 pasos

### 🔄 Sistema de Feedback (Propuesta)
- [Feedback + Reinforcement Learning](features/feedback-system/proposal.md)

## 📖 Guías

- [Getting Started](guides/getting-started.md) - Inicio rápido
- [Flujo de Impresión](guides/flujo-impresion.md) - Proceso completo
- [Migración OpenAI](guides/migracion-openai.md) - Cómo migrar a OpenAI
- [OpenAI Prompts](guides/openai-prompts.md) - Prompts utilizados
- [STL Viewer](guides/stl-viewer.md) - Uso del visor STL
- [Testing IA Parameters](guides/testing-ia-parameters.md) - Probar parámetros

## 🔧 API

- [Endpoints](api/README.md) - Lista de endpoints disponibles
- [Ejemplos](api/examples.md) - Ejemplos de uso

## 🔬 Investigación

- [Documento de Investigación](research/investigacion.md) - Investigación original

## 🧪 Testing

- [Guía de Testing](../tests/README.md) - Cómo ejecutar tests
- [Tests HTML](../tests/html/README.md) - Demos y verificaciones

---

## 📝 Convenciones

- **Un archivo por característica principal**
- **README.md en cada carpeta** para contexto
- **Links relativos** para navegación interna
- **Emojis consistentes** para identificación rápida

## 🚀 Contribuir

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) para guías de contribución.

EOF

echo -e "${GREEN}  ✅ Índice principal creado en docs/README.md${NC}"
echo ""

# =======================
# RESUMEN FINAL
# =======================
echo ""
echo "========================================"
echo -e "${GREEN}🎉 FASE 2 COMPLETADA${NC}"
echo "========================================"
echo ""
echo "📊 RESUMEN:"
echo "  ✅ Estructura de features/ creada"
echo "  ✅ Archivos de IA movidos y consolidados"
echo "  ✅ Routing movido a architecture/"
echo "  ✅ Wizard consolidado"
echo "  ✅ Índice principal creado"
echo ""
echo "⚠️  PENDIENTE (Requiere revisión manual):"
echo "  - Consolidar archivos de sistema de pedidos (14 archivos)"
echo "  - Consolidar archivos de auto-plating (5 archivos)"
echo "  - Consolidar archivos de gcode-viewer (2 archivos)"
echo "  - Revisar y eliminar duplicados"
echo ""
echo "📁 Nueva estructura:"
echo "  docs/"
echo "  ├── README.md (índice principal)"
echo "  ├── architecture/ (arquitectura del sistema)"
echo "  ├── features/ (documentación por característica)"
echo "  │   ├── ai/"
echo "  │   ├── orders/"
echo "  │   ├── auto-plating/"
echo "  │   ├── viewers/"
echo "  │   └── wizard/"
echo "  └── guides/ (guías de uso)"
echo ""
echo "🚀 Siguiente paso: Revisar docs/ y consolidar duplicados manualmente"

