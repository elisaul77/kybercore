# 📋 Plan de Refactorización KyberCore

## 🎯 Objetivo
Optimizar la estructura del proyecto eliminando archivos redundantes, consolidando tests y mejorando la organización general.

## 📊 Análisis Actual

### Problemas Identificados:
1. **45+ archivos HTML** (muchos duplicados de tests)
2. **Archivos test_*.html dispersos** en múltiples ubicaciones
3. **Carpetas redundantes**: `.archive_js_duplicates`, archivos de backup
4. **Duplicación de documentación** entre raíz y carpetas específicas
5. **Scripts de test duplicados** (test_stl_viewer.sh, test_auto_rotate.sh, open_stl_viewer.sh)
6. **Archivos de configuración duplicados** (.copilot, .copilot2)

### Estructura Actual:
```
KyberCore/
├── 🔴 45 archivos HTML (muchos duplicados)
├── 🔴 .archive_js_duplicates/ (40KB - archivo histórico)
├── 🔴 Múltiples scripts de test similares
├── 🔴 Tests HTML dispersos en varias carpetas
├── ✅ src/ (bien estructurado)
├── ✅ APISLICER/ (servicio independiente, bien definido)
└── 🟡 docs/ (1.1MB - necesita consolidación)
```

## 🗑️ Fase 1: Eliminación de Archivos Obsoletos

### A. Archivos HTML de Test Redundantes
**ELIMINAR** (consolidar en una sola ubicación):
- `/test_simple.html` → Mover a `tests/html/`
- `/test_final.html` → Mover a `tests/html/`
- `/test_commands.html` → Mover a `tests/html/`
- `/test_wizard_fixed.html` → Mover a `tests/html/`
- `/test_print_flow_complete.html` → Mover a `tests/html/`
- `/test_integrated_flow.html` → Mover a `tests/html/`
- `/debug_cards.html` → Mover a `tests/html/`
- `/diagrama_secuencia_wizard.html` → Mover a `docs/diagrams/`

**ELIMINAR DUPLICADOS** en `src/web/static/`:
- `src/web/static/test_wizard_fixed.html` (duplicado)
- `src/web/static/test_auto_rotate.html` (duplicado, mantener solo en APISLICER)
- `src/web/static/diagrama_secuencia_wizard.html` (duplicado)
- `src/web/static/test/` (toda la carpeta si está duplicada)

### B. Archivos de Configuración
**CONSOLIDAR**:
- `.copilot` + `.copilot2` → Mantener solo `.copilot`
- Revisar y actualizar `.copilotignore`

### C. Carpetas de Archivo
**ELIMINAR**:
- `.archive_js_duplicates/` (40KB de código antiguo)
- Crear un tag git antes de eliminar si es necesario

### D. Scripts Redundantes
**CONSOLIDAR** en `scripts/`:
- `test_stl_viewer.sh` + `open_stl_viewer.sh` → `scripts/open_stl_viewer.sh`
- `test_auto_rotate.sh` → `scripts/test_auto_rotate.sh`
- Eliminar versiones en raíz

## 📁 Fase 2: Nueva Estructura Propuesta

```
KyberCore/
├── 📄 README.md
├── 📄 docker-compose.yml
├── 📄 Dockerfile
├── 📄 requirements.txt
├── 📄 .gitignore
├── 📄 .copilot (unificado)
├── 📄 .copilotignore
│
├── 📂 src/                          # ✅ Código fuente principal
│   ├── api/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   ├── printers/
│   ├── jobs/
│   └── web/
│       ├── static/
│       │   ├── css/
│       │   ├── js/
│       │   └── img/
│       └── templates/
│
├── 📂 APISLICER/                    # ✅ Servicio de slicing
│   ├── app/
│   │   ├── main.py
│   │   └── test_auto_rotate.html  # Único visor STL
│   ├── config/
│   ├── uploads/
│   └── output/
│
├── 📂 tests/                        # 🔄 Tests consolidados
│   ├── unit/                       # Tests unitarios Python
│   │   ├── test_controllers.py
│   │   ├── test_endpoints.py
│   │   └── test_websocket_integration.py
│   ├── integration/                # Tests de integración
│   │   └── test_docker.py
│   └── html/                       # 🆕 Tests interactivos HTML
│       ├── test_simple.html
│       ├── test_wizard.html
│       ├── test_print_flow.html
│       └── test_integrated.html
│
├── 📂 scripts/                      # 🔄 Scripts consolidados
│   ├── run_tests.sh
│   ├── test_apislicer.sh
│   ├── open_stl_viewer.sh         # Unificado
│   ├── cleanup_gallery.sh
│   └── README.md
│
├── 📂 docs/                         # 🔄 Documentación consolidada
│   ├── README.md
│   ├── architecture/               # Diagramas y arquitectura
│   │   ├── diagrams.mmd
│   │   └── sequence_wizard.html
│   ├── api/                        # Documentación de API
│   │   ├── apislicer-docs.md
│   │   └── endpoints.md
│   ├── guides/                     # Guías de usuario
│   │   ├── installation.md
│   │   └── configuration.md
│   └── research/                   # Investigación y propuestas
│       └── investigacion.md
│
├── 📂 community/                    # ✅ Contribuciones comunidad
│   ├── ideas-board.md
│   └── technical-proposals/
│
└── 📂 base_datos/                   # ✅ Datos de prueba
    ├── printers.json
    └── proyectos.json
```

## 🔧 Fase 3: Acciones Específicas

### 1. Crear estructura de tests consolidada
```bash
mkdir -p tests/{unit,integration,html}
```

### 2. Mover archivos HTML de test
```bash
# Mover a tests/html/
mv test_simple.html tests/html/
mv test_final.html tests/html/test_wizard.html
mv test_print_flow_complete.html tests/html/test_print_flow.html
mv test_integrated_flow.html tests/html/
mv debug_cards.html tests/html/

# Mover diagramas
mv diagrama_secuencia_wizard.html docs/architecture/
```

### 3. Eliminar duplicados
```bash
# Eliminar versiones duplicadas en src/web/static/
rm src/web/static/test_wizard_fixed.html
rm src/web/static/test_auto_rotate.html
rm -rf src/web/static/test/

# Eliminar archivos de configuración duplicados
rm .copilot2

# Eliminar archivos de archivo
rm -rf .archive_js_duplicates/
```

### 4. Consolidar scripts
```bash
# Mover scripts a carpeta scripts/
mv test_auto_rotate.sh scripts/
mv open_stl_viewer.sh scripts/
rm test_stl_viewer.sh  # Duplicado de open_stl_viewer.sh
```

### 5. Reorganizar documentación
```bash
mkdir -p docs/{architecture,api,guides,research}

# Mover documentación específica
mv docs/apislicer-*.md docs/api/
mv infografia/*.mmd docs/architecture/
```

### 6. Actualizar .gitignore
```gitignore
# Archivos de test locales
tests/html/local_*.html

# Archivos temporales
*.tmp
*.bak
*~

# Uploads y outputs (excepto ejemplos)
APISLICER/uploads/*.stl
APISLICER/output/*.gcode
!APISLICER/uploads/example.stl

# Logs
*.log

# Python
__pycache__/
*.pyc
*.pyo
*.egg-info/
.venv/
venv/

# Docker
.docker/

# IDE
.vscode/
.idea/
*.swp
*.swo
```

## 📝 Fase 4: Actualizar Documentación

### Actualizar README.md
- Reflejar nueva estructura
- Actualizar paths de tests
- Documentar ubicación de archivos de test

### Crear tests/README.md
```markdown
# Tests de KyberCore

## Estructura
- `unit/` - Tests unitarios Python (pytest)
- `integration/` - Tests de integración Docker
- `html/` - Interfaces de test interactivas

## Ejecutar Tests
```bash
# Todos los tests
./scripts/run_tests.sh

# Tests específicos
pytest tests/unit/
pytest tests/integration/

# Tests HTML interactivos
# Abrir tests/html/*.html en navegador
```
```

### Crear docs/README.md
```markdown
# Documentación KyberCore

## Contenido
- `architecture/` - Diagramas y arquitectura del sistema
- `api/` - Documentación de APIs (KyberCore, APISLICER)
- `guides/` - Guías de instalación y configuración
- `research/` - Investigación y propuestas técnicas
```

## ✅ Checklist de Refactorización

### Fase 1: Limpieza
- [ ] Crear backup/tag antes de eliminar
- [ ] Eliminar `.archive_js_duplicates/`
- [ ] Consolidar archivos `.copilot*`
- [ ] Eliminar HTML duplicados en `src/web/static/`
- [ ] Consolidar scripts en `scripts/`

### Fase 2: Reorganización
- [ ] Crear nueva estructura de carpetas
- [ ] Mover tests HTML a `tests/html/`
- [ ] Reorganizar documentación en `docs/`
- [ ] Mover diagramas a `docs/architecture/`

### Fase 3: Actualización
- [ ] Actualizar rutas en `docker-compose.yml`
- [ ] Actualizar imports en código Python
- [ ] Actualizar `.gitignore`
- [ ] Actualizar README.md principal
- [ ] Crear README.md en subcarpetas

### Fase 4: Validación
- [ ] Ejecutar tests unitarios
- [ ] Ejecutar tests de integración
- [ ] Verificar contenedores Docker
- [ ] Probar interfaces HTML de test
- [ ] Validar enlaces en documentación

## 🎯 Resultados Esperados

### Antes:
- 45+ archivos HTML dispersos
- Archivos test duplicados en 3+ ubicaciones
- Scripts redundantes en raíz
- Documentación fragmentada

### Después:
- ✅ Tests consolidados en `tests/{unit,integration,html}`
- ✅ Scripts centralizados en `scripts/`
- ✅ Documentación organizada en `docs/`
- ✅ Eliminados ~100KB de archivos obsoletos
- ✅ Estructura clara y mantenible

## 📊 Métricas de Mejora

- **Archivos eliminados**: ~15-20
- **Archivos reorganizados**: ~30
- **Espacio liberado**: ~100KB
- **Reducción de duplicación**: ~60%
- **Mejora en navegabilidad**: +++

---

**Autor**: Análisis realizado el 30 de septiembre de 2025
**Estado**: Plan listo para implementación
