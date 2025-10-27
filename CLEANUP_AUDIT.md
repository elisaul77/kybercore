# 🧹 Auditoría de Limpieza - KyberCore

**Fecha**: 27 de octubre de 2025  
**Objetivo**: Identificar archivos innecesarios, código sin usar y reorganizar la documentación

---

## 📊 Resumen Ejecutivo

### Estado Actual
- **Total de archivos MD en raíz**: 13 archivos
- **Total de archivos MD en docs/**: ~60 archivos
- **Archivos HTML de prueba**: 5 archivos
- **Scripts duplicados**: 3 archivos

### Problemas Identificados
1. 🔴 **Documentación fragmentada** en raíz y docs/
2. 🟡 **Archivos de prueba** en raíz del proyecto
3. 🟡 **Múltiples archivos README** para el mismo módulo
4. 🟢 **Código sin usar** en algunos módulos

---

## 📂 Archivos en Raíz (Requieren Acción)

### 🗑️ ELIMINAR (Archivos de prueba/temporales)

```bash
# Archivos HTML de prueba (mover a tests/ o eliminar)
gcode_viewer_demo.html          # ❌ Demo, mover a tests/html/
test_routing.html               # ❌ Test, mover a tests/html/
wizard_verification.html        # ❌ Test, mover a tests/html/

# Script de refactorización obsoleto
refactor_project.sh             # ❌ Ya no se usa, eliminar

# Archivos de prueba Python
test_stl_renderer.py            # ❌ Mover a tests/

# Archivos especiales que no deberían estar en la raíz
=2.1.0                          # ❌ ¿? Archivo extraño, eliminar

# Backup de gitignore
.gitignore.bak                  # ❌ Eliminar backup
```

### 📝 CONSOLIDAR (Documentación en raíz)

```bash
# Documentación que debería estar en docs/
FLUJO_IMPRESION_COMPLETO.md             → docs/guides/flujo-impresion.md
MIGRACION_OPENAI_COMPLETA.md            → docs/guides/migracion-openai.md
OPENAI_PROMPT_Y_RESPUESTA.md            → docs/guides/openai-prompts.md
REFACTORING_PLAN.md                     → docs/architecture/refactoring-plan.md
STL_VIEWER_README.md                    → docs/guides/stl-viewer.md
TESTING_IA_PARAMETERS.md                → docs/guides/testing-ia-parameters.md

# Documentación de meta-proyecto (mantener en raíz)
README.md                               ✅ MANTENER
CONTRIBUTING.md                         ✅ MANTENER
LICENSE                                 ✅ MANTENER
INSTRUCCIONES.md                        ✅ MANTENER
FUNDING.md                              ✅ MANTENER
SPONSORS.md                             ✅ MANTENER

# Documentación de agentes IA (mantener en raíz)
CLAUDE.md                               ✅ MANTENER
GEMINI.md                               ✅ MANTENER
```

---

## 📚 Documentación en docs/ (Reorganizar)

### 🔥 DUPLICADOS (Mismo tema, múltiples archivos)

#### Sistema de Pedidos (8 archivos sobre lo mismo)
```bash
docs/CHANGELOG-sistema-pedidos.md
docs/COMO-USAR-SISTEMA-PEDIDOS.md
docs/ENTREGA-sistema-pedidos.md
docs/FAQ-sistema-pedidos.md
docs/INDEX-sistema-pedidos.md
docs/INTEGRACION-MODULO-PEDIDOS.md
docs/MODULO-PEDIDOS-INTEGRADO.md
docs/QUICK-START-PEDIDOS.md
docs/QUICKSTART-sistema-pedidos.md        # DUPLICADO (QUICK-START)
docs/README-sistema-pedidos.md
docs/resumen-sistema-pedidos.md
docs/sistema-pedidos-produccion.md
docs/orders-implementation-summary.md
docs/orders-system-readme.md

RECOMENDACIÓN: Consolidar en docs/features/orders/
  - README.md (overview + quickstart)
  - IMPLEMENTATION.md (detalles técnicos)
  - FAQ.md (preguntas frecuentes)
  - CHANGELOG.md (historial de cambios)
```

#### Auto-Plating (5 archivos sobre lo mismo)
```bash
docs/auto-plating-bug-fix.md
docs/auto-plating-bugs-all-fixed.md
docs/auto-plating-feature.md
docs/auto-plating-implementation-status.md
docs/CHANGELOG-auto-rotation.md

RECOMENDACIÓN: Consolidar en docs/features/auto-plating/
  - README.md (feature overview)
  - IMPLEMENTATION.md (detalles técnicos)
  - CHANGELOG.md (bugs fixed + history)
```

#### Step 7 / Confirmación (3 archivos)
```bash
docs/step7-improvements-summary.md
docs/step7-intelligent-validation.md
docs/step7-user-guide.md

RECOMENDACIÓN: Consolidar en docs/features/wizard/
  - step7-confirmation.md (todo en uno)
```

#### G-Code Viewer (3 archivos)
```bash
docs/gcode-viewer-guide.md
docs/gcode-viewer-implementation-summary.md
STL_VIEWER_README.md (en raíz)

RECOMENDACIÓN: Consolidar en docs/features/viewers/
  - gcode-viewer.md
  - stl-viewer.md
```

#### Routing (3 archivos)
```bash
docs/routing-fix.md
docs/routing-implementation-summary.md
docs/url-routing-guide.md

RECOMENDACIÓN: Consolidar en docs/architecture/
  - routing.md (todo en uno)
```

#### IA System (múltiples archivos)
```bash
docs/AI_SYSTEM_IMPLEMENTATION.md
docs/AI_TESTING_GUIDE.md
docs/CONFIRMACION_IA_GCODE.md
docs/TODO_AI_FRONTEND.md
TESTING_IA_PARAMETERS.md (en raíz)
OPENAI_PROMPT_Y_RESPUESTA.md (en raíz)

RECOMENDACIÓN: Consolidar en docs/features/ai/
  - implementation.md
  - testing-guide.md
  - prompts.md
```

### 📁 ESTRUCTURA PROPUESTA PARA docs/

```
docs/
├── README.md                           # Índice general de documentación
│
├── architecture/                       # Arquitectura del sistema
│   ├── overview.md                     # Visión general
│   ├── routing.md                      # Sistema de rutas (consolidado)
│   ├── refactoring-plan.md             # Plan de refactorización
│   └── database-schema.md              # Esquema de BD
│
├── features/                           # Documentación por característica
│   ├── ai/
│   │   ├── README.md                   # Overview del sistema IA
│   │   ├── implementation.md           # Detalles técnicos
│   │   ├── testing-guide.md            # Cómo probar IA
│   │   └── prompts.md                  # Prompts de OpenAI
│   │
│   ├── orders/
│   │   ├── README.md                   # Overview + quickstart
│   │   ├── implementation.md           # Implementación técnica
│   │   ├── faq.md                      # Preguntas frecuentes
│   │   └── changelog.md                # Historial de cambios
│   │
│   ├── auto-plating/
│   │   ├── README.md                   # Feature overview
│   │   ├── implementation.md           # Detalles técnicos
│   │   └── changelog.md                # Bugs fixed + history
│   │
│   ├── viewers/
│   │   ├── gcode-viewer.md             # Visor de G-code
│   │   └── stl-viewer.md               # Visor de STL
│   │
│   ├── wizard/
│   │   ├── overview.md                 # Flujo completo del wizard
│   │   ├── step7-confirmation.md       # Paso 7 consolidado
│   │   └── testing.md                  # Guía de pruebas
│   │
│   └── feedback-system/
│       └── proposal.md                 # Propuesta de feedback + RL
│
├── guides/                             # Guías de uso
│   ├── getting-started.md              # Inicio rápido
│   ├── development.md                  # Guía de desarrollo
│   ├── deployment.md                   # Despliegue
│   ├── migracion-openai.md             # Migración OpenAI
│   └── bulk-commands.md                # Comandos bulk
│
├── api/                                # Documentación de API
│   ├── README.md                       # Overview de endpoints
│   ├── endpoints.md                    # Lista completa
│   └── examples.md                     # Ejemplos de uso
│
└── research/                           # Investigación y estudios
    └── investigacion.md                # Documento de investigación original
```

---

## 🧪 Archivos de Prueba (tests/)

### Estado Actual
```bash
tests/
├── conftest.py
├── monraker_Object_example.json
├── README.md
├── test_controllers.py
├── test_docker.py
├── test_endpoints.py
└── test_websocket_integration.py
```

### ✅ ESTÁ BIEN ORGANIZADO

### ➕ Agregar carpeta para tests HTML
```bash
tests/
├── html/                               # NUEVO
│   ├── gcode_viewer_demo.html          # Mover desde raíz
│   ├── test_routing.html               # Mover desde raíz
│   └── wizard_verification.html        # Mover desde raíz
└── ...
```

---

## 🔍 Código Sin Usar (Requiere Investigación)

### Carpetas Potencialmente Obsoletas

```bash
test_output/                            # ❓ Verificar si se usa
test_project/                           # ❓ Verificar si se usa
src/proyect/                            # ❓ Typo? Debería ser 'project'?
```

### Scripts Potencialmente Obsoletos

```bash
run_tests.sh                            # ❓ Verificar si es la forma oficial de correr tests
view_logs.sh                            # ✅ Se usa (log viewer)
run.sh                                  # ✅ Se usa (desarrollo local)
start.sh                                # ✅ Se usa (Docker)
```

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Limpieza Rápida (30 minutos)

```bash
# 1. Eliminar archivos temporales y de prueba
rm -f gcode_viewer_demo.html test_routing.html wizard_verification.html
rm -f test_stl_renderer.py refactor_project.sh =2.1.0 .gitignore.bak

# 2. Crear estructura de tests/html/
mkdir -p tests/html

# 3. Mover documentación de raíz a docs/guides/
mv FLUJO_IMPRESION_COMPLETO.md docs/guides/flujo-impresion.md
mv MIGRACION_OPENAI_COMPLETA.md docs/guides/migracion-openai.md
mv OPENAI_PROMPT_Y_RESPUESTA.md docs/guides/openai-prompts.md
mv REFACTORING_PLAN.md docs/architecture/refactoring-plan.md
mv STL_VIEWER_README.md docs/guides/stl-viewer.md
mv TESTING_IA_PARAMETERS.md docs/guides/testing-ia-parameters.md
```

### Fase 2: Consolidación de Documentación (2-3 horas)

```bash
# 1. Crear estructura de features/
mkdir -p docs/features/{ai,orders,auto-plating,viewers,wizard,feedback-system}
mkdir -p docs/architecture docs/guides docs/api

# 2. Consolidar sistema de pedidos
# - Leer todos los archivos de pedidos
# - Crear README.md unificado en docs/features/orders/
# - Eliminar duplicados

# 3. Consolidar auto-plating
# - Combinar auto-plating-*.md en docs/features/auto-plating/README.md
# - Mantener changelog separado

# 4. Consolidar sistema IA
# - Mover AI_*.md a docs/features/ai/
# - Renombrar a minúsculas

# 5. Crear índice principal
# - docs/README.md con links a todas las secciones
```

### Fase 3: Limpieza de Código (investigación necesaria)

```bash
# Revisar manualmente:
# - src/proyect/ (¿typo?)
# - test_output/ (¿se genera automáticamente?)
# - test_project/ (¿ejemplo o código activo?)

# Verificar imports en código:
grep -r "from src.proyect" src/
grep -r "test_output" src/
grep -r "test_project" src/
```

---

## 📋 Checklist de Ejecución

### ✅ Inmediato (COMPLETADO - 27 Oct 2025)
- [x] Eliminar archivos temporales y de prueba de la raíz
- [x] Eliminar `=2.1.0` (archivo extraño)
- [x] Crear `tests/html/` y mover demos ahí (o eliminarlos)
- [x] Eliminar `.gitignore.bak`
- [x] Mover documentación de raíz a `docs/guides/`
- [x] Crear estructura `docs/features/`
- [x] Actualizar `.gitignore` para prevenir futuros desórdenes

### 🔄 Corto Plazo (En Progreso)
- [x] Crear estructura `docs/features/`
- [x] Mover archivos de IA a `docs/features/ai/`
- [x] Crear script de Fase 2 para consolidación
- [ ] Consolidar documentación de sistema de pedidos (14 archivos → 4)
- [ ] Consolidar documentación de auto-plating (5 archivos → 2)
- [ ] Consolidar documentación de viewers (3 archivos → 2)
- [x] Crear `docs/README.md` como índice principal

### Mediano Plazo (Próxima semana)
- [ ] Investigar `src/proyect/` (¿typo o intencional?)
- [ ] Verificar uso de `test_output/` y `test_project/`
- [ ] Revisar código para eliminar imports sin usar
- [ ] Actualizar `.gitignore` con nuevas exclusiones

### Largo Plazo (Mantenimiento)
- [ ] Establecer política: "Un solo archivo por feature"
- [ ] Automatizar detección de documentación duplicada
- [ ] Script de validación de estructura de docs/

---

## 🚨 Advertencias

### ⚠️ NO ELIMINAR SIN VERIFICAR
```bash
# Estos archivos pueden tener referencias en código:
- base_datos/*.json
- APISLICER/config/*
- logs/ (se generan automáticamente)
```

### ⚠️ HACER BACKUP ANTES DE CONSOLIDAR
```bash
# Antes de consolidar documentación:
tar -czf docs-backup-$(date +%Y%m%d).tar.gz docs/
```

---

## 📊 Métricas de Limpieza

### Antes
- **Archivos MD en raíz**: 13
- **Archivos MD en docs/**: ~60
- **Archivos HTML de prueba en raíz**: 3
- **Documentos duplicados estimados**: 25+

### Después (Objetivo)
- **Archivos MD en raíz**: 7 (solo meta-documentación)
- **Archivos MD en docs/**: ~30 (consolidados)
- **Archivos HTML de prueba en raíz**: 0 (movidos a tests/)
- **Documentos duplicados**: 0

### Reducción Esperada
- **-46% archivos MD en raíz** (13 → 7)
- **-50% archivos MD en docs/** (60 → 30)
- **-100% archivos de prueba en raíz** (3 → 0)

---

## 🎯 Beneficios Esperados

1. ✅ **Navegación más clara** - Estructura jerárquica lógica
2. ✅ **Menos confusión** - Un solo documento por tema
3. ✅ **Onboarding más rápido** - Documentación fácil de encontrar
4. ✅ **Mantenimiento más fácil** - Saber dónde documentar nuevas features
5. ✅ **Raíz limpia** - Solo archivos esenciales del proyecto

---

## 🚀 ¿Empezamos?

**Próximo paso recomendado**: Ejecutar Fase 1 (Limpieza Rápida)

¿Quieres que:
1. 🟢 **Ejecute automáticamente la Fase 1** (eliminar temporales)
2. 🟡 **Cree un script para ejecutar todas las fases**
3. 🔵 **Te guíe paso a paso** con confirmación en cada cambio
4. 🟣 **Solo cree la nueva estructura** sin mover archivos aún

---

**Generado**: 27 de octubre de 2025  
**Versión**: 1.0
