#!/bin/bash

# Script de Refactorización Automática de KyberCore
# Autor: Sistema de Análisis KyberCore
# Fecha: 30 de Septiembre de 2025

set -e  # Salir si hay errores

echo "🚀 Iniciando refactorización de KyberCore..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_step() {
    echo -e "${BLUE}➜${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    print_error "Error: No se encuentra docker-compose.yml. Ejecuta este script desde la raíz de KyberCore."
    exit 1
fi

# ============================================
# FASE 0: BACKUP Y PREPARACIÓN
# ============================================
print_step "Fase 0: Creando backup..."

# Crear tag de git para backup
git add -A 2>/dev/null || true
git commit -m "Pre-refactoring backup - $(date +%Y%m%d_%H%M%S)" 2>/dev/null || print_warning "No hay cambios para commitear"
git tag -a "pre-refactor-$(date +%Y%m%d_%H%M%S)" -m "Backup antes de refactorización" 2>/dev/null || print_warning "No se pudo crear tag git"

print_success "Backup creado"
echo ""

# ============================================
# FASE 1: CREAR NUEVA ESTRUCTURA
# ============================================
print_step "Fase 1: Creando nueva estructura de carpetas..."

# Crear estructura de tests
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/html

# Crear estructura de docs
mkdir -p docs/architecture
mkdir -p docs/api
mkdir -p docs/guides
mkdir -p docs/research

print_success "Estructura de carpetas creada"
echo ""

# ============================================
# FASE 2: MOVER ARCHIVOS HTML DE TEST
# ============================================
print_step "Fase 2: Reorganizando archivos HTML de test..."

# Mover tests HTML a tests/html/
if [ -f "test_simple.html" ]; then
    mv test_simple.html tests/html/
    print_success "Movido test_simple.html"
fi

if [ -f "test_final.html" ]; then
    mv test_final.html tests/html/test_wizard.html
    print_success "Movido test_final.html → test_wizard.html"
fi

if [ -f "test_print_flow_complete.html" ]; then
    mv test_print_flow_complete.html tests/html/test_print_flow.html
    print_success "Movido test_print_flow_complete.html → test_print_flow.html"
fi

if [ -f "test_integrated_flow.html" ]; then
    mv test_integrated_flow.html tests/html/
    print_success "Movido test_integrated_flow.html"
fi

if [ -f "test_commands.html" ]; then
    mv test_commands.html tests/html/
    print_success "Movido test_commands.html"
fi

if [ -f "test_wizard_fixed.html" ]; then
    mv test_wizard_fixed.html tests/html/
    print_success "Movido test_wizard_fixed.html"
fi

if [ -f "debug_cards.html" ]; then
    mv debug_cards.html tests/html/
    print_success "Movido debug_cards.html"
fi

# Mover diagramas a docs/architecture
if [ -f "diagrama_secuencia_wizard.html" ]; then
    mv diagrama_secuencia_wizard.html docs/architecture/
    print_success "Movido diagrama_secuencia_wizard.html"
fi

echo ""

# ============================================
# FASE 3: MOVER TESTS PYTHON
# ============================================
print_step "Fase 3: Reorganizando tests Python..."

# Mover tests a subcarpetas correctas
if [ -f "tests/test_docker.py" ]; then
    mv tests/test_docker.py tests/integration/
    print_success "Movido test_docker.py → integration/"
fi

# Los demás tests ya están en tests/, solo asegurarnos que estén en unit/
for test_file in tests/test_*.py; do
    if [ -f "$test_file" ]; then
        filename=$(basename "$test_file")
        if [ ! -f "tests/unit/$filename" ] && [ ! -f "tests/integration/$filename" ]; then
            mv "$test_file" tests/unit/
            print_success "Movido $filename → unit/"
        fi
    fi
done

# Mantener conftest.py en la raíz de tests
if [ -f "tests/unit/conftest.py" ]; then
    mv tests/unit/conftest.py tests/
fi

echo ""

# ============================================
# FASE 4: ELIMINAR DUPLICADOS
# ============================================
print_step "Fase 4: Eliminando archivos duplicados..."

# Eliminar duplicados en src/web/static/
if [ -f "src/web/static/test_wizard_fixed.html" ]; then
    rm src/web/static/test_wizard_fixed.html
    print_success "Eliminado src/web/static/test_wizard_fixed.html (duplicado)"
fi

if [ -f "src/web/static/test_auto_rotate.html" ]; then
    rm src/web/static/test_auto_rotate.html
    print_success "Eliminado src/web/static/test_auto_rotate.html (duplicado)"
fi

if [ -f "src/web/static/diagrama_secuencia_wizard.html" ]; then
    rm src/web/static/diagrama_secuencia_wizard.html
    print_success "Eliminado src/web/static/diagrama_secuencia_wizard.html (duplicado)"
fi

if [ -d "src/web/static/test" ]; then
    rm -rf src/web/static/test
    print_success "Eliminado src/web/static/test/ (carpeta duplicada)"
fi

# Eliminar archivos de configuración duplicados
if [ -f ".copilot2" ]; then
    rm .copilot2
    print_success "Eliminado .copilot2 (duplicado)"
fi

# Eliminar archivos de archivo
if [ -d ".archive_js_duplicates" ]; then
    rm -rf .archive_js_duplicates
    print_success "Eliminado .archive_js_duplicates/ (~40KB liberados)"
fi

echo ""

# ============================================
# FASE 5: CONSOLIDAR SCRIPTS
# ============================================
print_step "Fase 5: Consolidando scripts..."

# Mover scripts a carpeta scripts/ si están en raíz
if [ -f "test_auto_rotate.sh" ]; then
    mv test_auto_rotate.sh scripts/
    print_success "Movido test_auto_rotate.sh → scripts/"
fi

if [ -f "open_stl_viewer.sh" ]; then
    # Si test_stl_viewer.sh existe y es similar, eliminar duplicado
    if [ -f "test_stl_viewer.sh" ]; then
        rm test_stl_viewer.sh
        print_success "Eliminado test_stl_viewer.sh (duplicado de open_stl_viewer.sh)"
    fi
    mv open_stl_viewer.sh scripts/
    print_success "Movido open_stl_viewer.sh → scripts/"
fi

echo ""

# ============================================
# FASE 6: REORGANIZAR DOCUMENTACIÓN
# ============================================
print_step "Fase 6: Reorganizando documentación..."

# Mover documentación específica de APISLICER
if [ -f "docs/apislicer-technical-docs.md" ]; then
    mv docs/apislicer-technical-docs.md docs/api/
    print_success "Movido apislicer-technical-docs.md → api/"
fi

if [ -f "docs/apislicer-diagrams.md" ]; then
    mv docs/apislicer-diagrams.md docs/architecture/
    print_success "Movido apislicer-diagrams.md → architecture/"
fi

if [ -f "docs/apislicer-test-interface.html" ]; then
    mv docs/apislicer-test-interface.html docs/api/
    print_success "Movido apislicer-test-interface.html → api/"
fi

# Mover investigación
if [ -f "docs/investigacion.md" ]; then
    mv docs/investigacion.md docs/research/
    print_success "Movido investigacion.md → research/"
fi

# Mover diagramas de infografía
if [ -d "infografia" ]; then
    for mmd_file in infografia/*.mmd; do
        if [ -f "$mmd_file" ]; then
            cp "$mmd_file" docs/architecture/
            filename=$(basename "$mmd_file")
            print_success "Copiado $filename → architecture/"
        fi
    done
fi

echo ""

# ============================================
# FASE 7: CREAR ARCHIVOS README
# ============================================
print_step "Fase 7: Creando archivos README..."

# README para tests/
cat > tests/README.md << 'TESTS_README'
# Tests de KyberCore

## 📂 Estructura

- **`unit/`** - Tests unitarios Python (pytest)
- **`integration/`** - Tests de integración Docker  
- **`html/`** - Interfaces de test interactivas (navegador)

## 🧪 Ejecutar Tests

### Tests Python
```bash
# Todos los tests
./scripts/run_tests.sh

# Solo tests unitarios
pytest tests/unit/

# Solo tests de integración
pytest tests/integration/

# Test específico
pytest tests/unit/test_controllers.py -v
```

### Tests HTML Interactivos
Los tests HTML son interfaces web para probar funcionalidades manualmente:

1. Inicia los servicios:
   ```bash
   docker compose up -d
   ```

2. Abre en tu navegador:
   - `tests/html/test_simple.html` - Test básico de funcionalidad
   - `tests/html/test_wizard.html` - Test del wizard de configuración
   - `tests/html/test_print_flow.html` - Test del flujo completo de impresión
   - `tests/html/test_integrated_flow.html` - Test de integración E2E

## 📝 Añadir Nuevos Tests

### Test Unitario
```python
# tests/unit/test_mi_modulo.py
import pytest
from src.mi_modulo import mi_funcion

def test_mi_funcion():
    resultado = mi_funcion(parametro="test")
    assert resultado == "esperado"
```

### Test de Integración
```python
# tests/integration/test_mi_integracion.py
import pytest
from docker import DockerClient

def test_contenedor_funcionando():
    client = DockerClient.from_env()
    container = client.containers.get("kybercore")
    assert container.status == "running"
```

## 🐛 Troubleshooting

- Si los tests fallan, verifica que los contenedores estén corriendo: `docker compose ps`
- Para ver logs: `docker compose logs -f`
- Para reiniciar: `docker compose restart`
TESTS_README

print_success "Creado tests/README.md"

# README para docs/
cat > docs/README.md << 'DOCS_README'
# Documentación KyberCore

## 📚 Contenido

### `architecture/` - Arquitectura del Sistema
- Diagramas de flujo (Mermaid)
- Diagramas de secuencia
- Arquitectura de componentes

### `api/` - Documentación de APIs
- **KyberCore API** - API principal del orquestador
- **APISLICER API** - API de slicing STL → G-code
- Endpoints y ejemplos

### `guides/` - Guías de Usuario
- Instalación y configuración
- Guía de inicio rápido
- Troubleshooting común

### `research/` - Investigación y Propuestas
- Investigación académica
- Propuestas técnicas
- Análisis de viabilidad

## 🔗 Enlaces Útiles

- [README Principal](../README.md)
- [Contribuir](../CONTRIBUTING.md)
- [Roadmap](../README.md#roadmap)

## 📝 Convenciones

- Los diagramas usan Mermaid (formato `.mmd`)
- La documentación está en Markdown
- Los ejemplos de código incluyen comentarios
DOCS_README

print_success "Creado docs/README.md"

# README para scripts/
if [ ! -f "scripts/README.md" ]; then
    cat > scripts/README.md << 'SCRIPTS_README'
# Scripts de KyberCore

## 📜 Scripts Disponibles

### `run_tests.sh`
Ejecuta todos los tests (unitarios e integración)
```bash
./scripts/run_tests.sh
```

### `test_apislicer.sh`
Prueba el servicio APISLICER con un cubo de ejemplo
```bash
./scripts/test_apislicer.sh
```

### `open_stl_viewer.sh`
Abre el visor STL en el navegador
```bash
./scripts/open_stl_viewer.sh
```

### `cleanup_gallery.sh`
Limpia archivos antiguos de la galería
```bash
./scripts/cleanup_gallery.sh
```

## 🔧 Uso

Todos los scripts deben ejecutarse desde la raíz del proyecto:
```bash
cd /path/to/KyberCore
./scripts/nombre_del_script.sh
```
SCRIPTS_README

    print_success "Creado scripts/README.md"
fi

echo ""

# ============================================
# FASE 8: ACTUALIZAR .gitignore
# ============================================
print_step "Fase 8: Actualizando .gitignore..."

# Backup del gitignore actual
if [ -f ".gitignore" ]; then
    cp .gitignore .gitignore.bak
fi

cat >> .gitignore << 'GITIGNORE_APPEND'

# ============================================
# Refactorización 2025-09-30
# ============================================

# Tests locales
tests/html/local_*.html
tests/html/debug_*.html

# Archivos temporales
*.tmp
*.bak
*~
.DS_Store

# Uploads y outputs (excepto ejemplos)
APISLICER/uploads/*.stl
APISLICER/output/*.gcode
!APISLICER/uploads/example.stl

# Logs detallados
*.log
logs/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg
*.egg-info/
dist/
build/
.venv/
venv/
ENV/

# Docker
.docker/
docker-compose.override.yml

# IDE
.vscode/
.idea/
*.swp
*.swo
*.swn

# Backups
*.bak
*.backup
.archive*/

# OS
Thumbs.db
.DS_Store
GITIGNORE_APPEND

print_success "Actualizado .gitignore"
echo ""

# ============================================
# FASE 9: VERIFICACIÓN
# ============================================
print_step "Fase 9: Verificando estructura..."

# Contar archivos movidos/eliminados
html_tests=$(ls tests/html/*.html 2>/dev/null | wc -l)
unit_tests=$(ls tests/unit/*.py 2>/dev/null | wc -l)
integration_tests=$(ls tests/integration/*.py 2>/dev/null | wc -l)

print_success "Tests HTML: $html_tests archivos en tests/html/"
print_success "Tests unitarios: $unit_tests archivos en tests/unit/"
print_success "Tests integración: $integration_tests archivos en tests/integration/"

# Verificar que directorios obsoletos fueron eliminados
if [ ! -d ".archive_js_duplicates" ]; then
    print_success "✓ .archive_js_duplicates eliminado"
else
    print_warning "⚠ .archive_js_duplicates aún existe"
fi

if [ ! -f ".copilot2" ]; then
    print_success "✓ .copilot2 eliminado"
else
    print_warning "⚠ .copilot2 aún existe"
fi

echo ""

# ============================================
# RESUMEN FINAL
# ============================================
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Refactorización completada exitosamente${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "📊 Resumen de cambios:"
echo "  • Archivos HTML de test: Consolidados en tests/html/"
echo "  • Tests Python: Organizados en unit/ e integration/"
echo "  • Documentación: Estructurada en docs/{architecture,api,guides,research}"
echo "  • Scripts: Consolidados en scripts/"
echo "  • Archivos obsoletos: Eliminados (~40KB)"
echo ""
echo "📝 Próximos pasos:"
echo "  1. Revisar los cambios: git status"
echo "  2. Ejecutar tests: ./scripts/run_tests.sh"
echo "  3. Verificar servicios: docker compose up -d"
echo "  4. Commitear cambios: git add -A && git commit -m 'Refactorización estructura proyecto'"
echo ""
echo "📚 Documentación actualizada:"
echo "  • tests/README.md - Guía de tests"
echo "  • docs/README.md - Índice de documentación"
echo "  • scripts/README.md - Scripts disponibles"
echo ""
echo -e "${YELLOW}⚠ Recuerda revisar los cambios antes de commitear${NC}"
echo ""
