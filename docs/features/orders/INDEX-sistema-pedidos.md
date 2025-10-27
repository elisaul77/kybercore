# 📚 Sistema de Gestión de Pedidos - Índice General

> **Centro de documentación del Sistema de Gestión de Pedidos y Producción**

---

## 🚀 Inicio Rápido

¿Primera vez aquí? Comienza por estos documentos en orden:

1. **[Resumen Ejecutivo](./resumen-sistema-pedidos.md)** ⏱️ 5 min
   - Qué se completó
   - Qué falta
   - Estado del proyecto

2. **[Quick Start Guide](./QUICKSTART-sistema-pedidos.md)** ⏱️ 10 min
   - Conceptos clave
   - Guía por rol (developer, PM, designer)
   - Ejemplos prácticos

3. **[FAQ](./FAQ-sistema-pedidos.md)** ⏱️ 15 min
   - Preguntas frecuentes
   - Casos de uso explicados
   - Troubleshooting

---

## 📖 Documentación Completa

### 📄 Especificación Técnica
**[sistema-pedidos-produccion.md](./sistema-pedidos-produccion.md)** | 1,800+ líneas | ⏱️ 60 min

Documento maestro con TODO el sistema:
- ✅ Visión general
- ✅ Arquitectura de 4 capas
- ✅ Modelo de datos (8 entidades)
- ✅ Flujos de trabajo completos
- ✅ 20+ endpoints API
- ✅ Diseño de UI (wireframes)
- ✅ 5 casos de uso detallados
- ✅ Plan de implementación en 6 fases
- ✅ KPIs y métricas
- ✅ Roadmap futuro

**Cuándo leerlo:** Antes de implementar cualquier parte del sistema.

---

## 📊 Diagramas Visuales

Todos los diagramas están en: `../infografia/`

### Mapa de Navegación
**[sistema_pedidos_navegacion.mmd](../infografia/sistema_pedidos_navegacion.mmd)**
- Diagrama interactivo de toda la documentación
- Ver cómo se relacionan los documentos
- Identificar qué está completo vs pendiente

### Arquitectura del Sistema
**[sistema_pedidos_arquitectura.mmd](../infografia/sistema_pedidos_arquitectura.mmd)**
- 4 capas: Frontend, Backend, Services, Database
- 20+ componentes
- Integración con sistema existente

### Modelo de Datos
**[sistema_pedidos_entidades.mmd](../infografia/sistema_pedidos_entidades.mmd)**
- Entity-Relationship Diagram
- 8 entidades con atributos completos
- Relaciones con cardinalidad

### Estados del Pedido
**[sistema_pedidos_estados.mmd](../infografia/sistema_pedidos_estados.mmd)**
- State machine con 6 estados
- Transiciones y condiciones
- Notas explicativas

### Flujos de Trabajo

**Flujo de Creación:**
**[sistema_pedidos_flujo_creacion.mmd](../infografia/sistema_pedidos_flujo_creacion.mmd)**
- 44 pasos desde UI hasta DB
- Sequence diagram completo

**Flujo de Producción:**
**[sistema_pedidos_flujo_produccion.mmd](../infografia/sistema_pedidos_flujo_produccion.mmd)**
- 59 pasos desde pedido hasta G-code
- Integración con Print Wizard

**Cómo verlos:**
```bash
# Opción 1: VS Code con extensión Mermaid
code infografia/sistema_pedidos_arquitectura.mmd

# Opción 2: Mermaid Live Editor
# https://mermaid.live/
```

---

## 💻 Código

### Modelos Pydantic
**[../src/models/order_models.py](../src/models/order_models.py)** | 600+ líneas

**Contenido:**
- ✅ 5 Enums (estados, prioridades)
- ✅ 5 entidades principales
- ✅ 6 DTOs (Create/Update)
- ✅ 2 Statistics models
- ✅ Validators automáticos
- ✅ Calculated properties
- ✅ JSON schema examples

**Entidades:**
```python
Customer        # Cliente con historial
Order           # Pedido contenedor
OrderLine       # Línea de pedido (proyecto + cantidad)
ProductionBatch # Lote de impresión
PrintItem       # Archivo individual
```

### Base de Datos JSON
**[../base_datos/](../base_datos/)**

**Archivos:**
- `customers.json` - 3 clientes ejemplo
- `orders.json` - 2 pedidos ejemplo
- `production_tracking.json` - 2 batches, 11 items

**Explorar:**
```bash
# Ver clientes
cat base_datos/customers.json | jq '.customers[] | {name, company, total_orders}'

# Ver pedidos activos
cat base_datos/orders.json | jq '.orders[] | select(.status=="in_progress")'

# Ver estadísticas
cat base_datos/orders.json | jq '.statistics'
```

---

## 📚 Guías y Referencia

### Para Desarrolladores

1. **[Quick Start Guide](./QUICKSTART-sistema-pedidos.md)**
   - Setup inicial
   - Cómo implementar controllers
   - Testing tips

2. **[Decisiones Técnicas](./DECISIONES-TECNICAS.md)**
   - Por qué cada decisión de diseño
   - Alternativas consideradas
   - Trade-offs explicados

3. **[FAQ Técnico](./FAQ-sistema-pedidos.md)**
   - Cómo integrar con Print Wizard
   - Cómo maneja concurrencia
   - Cómo actualizar progreso

### Para Product Managers

1. **[Resumen Ejecutivo](./resumen-sistema-pedidos.md)**
   - Estado del proyecto
   - Progreso 70% vs 30%
   - Timeline estimado

2. **[Especificación Técnica](./sistema-pedidos-produccion.md)**
   - Casos de uso detallados
   - Plan de implementación
   - KPIs y métricas

3. **[FAQ](./FAQ-sistema-pedidos.md)**
   - Qué problemas resuelve
   - Cómo escala el sistema
   - Roadmap futuro

### Para Diseñadores UX

1. **[Especificación - Sección UI](./sistema-pedidos-produccion.md#6-interfaz-de-usuario)**
   - Wireframes ASCII
   - Componentes principales
   - Flujos de usuario

2. **[Diagramas de Flujo](../infografia/)**
   - Flujo de creación
   - Flujo de producción
   - Estados del pedido

3. **[Casos de Uso](./sistema-pedidos-produccion.md#7-casos-de-uso)**
   - 5 escenarios detallados
   - User stories completas

---

## 🗂️ Organización de Archivos

```
docs/
├── README-sistema-pedidos.md          ← Índice principal (este archivo)
├── resumen-sistema-pedidos.md         ← Resumen ejecutivo
├── sistema-pedidos-produccion.md      ← Especificación técnica completa
├── QUICKSTART-sistema-pedidos.md      ← Guía rápida de inicio
├── DECISIONES-TECNICAS.md             ← Decisiones de diseño explicadas
└── FAQ-sistema-pedidos.md             ← Preguntas frecuentes

infografia/
├── sistema_pedidos_navegacion.mmd     ← Mapa de navegación
├── sistema_pedidos_arquitectura.mmd   ← Arquitectura de componentes
├── sistema_pedidos_entidades.mmd      ← Entity-Relationship Diagram
├── sistema_pedidos_estados.mmd        ← State machine
├── sistema_pedidos_flujo_creacion.mmd ← Sequence: Creación
└── sistema_pedidos_flujo_produccion.mmd ← Sequence: Producción

src/models/
└── order_models.py                    ← Modelos Pydantic (600 líneas)

base_datos/
├── customers.json                     ← Clientes ejemplo
├── orders.json                        ← Pedidos ejemplo
└── production_tracking.json           ← Tracking ejemplo
```

---

## 🎯 Roadmap del Proyecto

### ✅ Fase 1: Fundamentos (COMPLETA)
- [x] Análisis de requerimientos
- [x] Diseño de arquitectura
- [x] Modelos de datos
- [x] Especificación técnica
- [x] Diagramas Mermaid
- [x] Base de datos ejemplo
- [x] Documentación completa

### ⏸️ Fase 2: Backend API (SIGUIENTE)
**Tiempo estimado:** 3-4 días

- [ ] Implementar `orders_controller.py`
- [ ] Implementar `customers_controller.py`
- [ ] Implementar `production_controller.py`
- [ ] Integrar routers en API principal
- [ ] Tests básicos de endpoints

### ⏸️ Fase 3: Servicios
**Tiempo estimado:** 2-3 días

- [ ] Implementar `order_service.py`
- [ ] Implementar `production_service.py`
- [ ] Implementar `metrics_service.py`
- [ ] Tests unitarios completos

### ⏸️ Fase 4: Frontend
**Tiempo estimado:** 4-5 días

- [ ] Dashboard de pedidos
- [ ] Lista de pedidos con filtros
- [ ] Detalle de pedido con progreso
- [ ] Formulario de creación

### ⏸️ Fase 5: Integración
**Tiempo estimado:** 2-3 días

- [ ] Integrar con Print Wizard
- [ ] Actualización de progreso en tiempo real
- [ ] Gestión de batches

### ⏸️ Fase 6: Testing & Refinamiento
**Tiempo estimado:** 2-3 días

- [ ] Tests end-to-end
- [ ] Optimización de UX
- [ ] Documentación de usuario
- [ ] Deploy a producción

**Total estimado:** 15-21 días de desarrollo

---

## 📊 Métricas del Proyecto

### Completado (70%)
- **Documentación:** 8,000+ líneas
- **Código:** 600+ líneas
- **Diagramas:** 6
- **Archivos JSON:** 3
- **Entidades:** 8
- **Endpoints especificados:** 20+
- **Casos de uso:** 5
- **Documentos:** 15

### Pendiente (30%)
- **Controllers:** 3 archivos
- **Services:** 3 archivos
- **Templates HTML:** 4 archivos
- **Módulos JS:** 3 archivos
- **Tests:** 10+ archivos

---

## 🔍 Búsqueda Rápida

### "¿Cómo creo un pedido?"
→ [FAQ - Casos de Uso](./FAQ-sistema-pedidos.md#casos-de-uso)

### "¿Qué endpoints están disponibles?"
→ [Especificación - API Endpoints](./sistema-pedidos-produccion.md#5-api-endpoints)

### "¿Cómo se integra con Print Wizard?"
→ [FAQ - Integración](./FAQ-sistema-pedidos.md#integración)

### "¿Por qué JSON en lugar de SQL?"
→ [Decisiones Técnicas - Base de Datos](./DECISIONES-TECNICAS.md#41-json-files-en-lugar-de-sql)

### "¿Cómo empiezo a desarrollar?"
→ [Quick Start - Fase 2](./QUICKSTART-sistema-pedidos.md#️-fase-2-backend-api-siguiente)

### "¿Qué entidades hay?"
→ [Especificación - Modelo de Datos](./sistema-pedidos-produccion.md#3-modelo-de-datos)

### "¿Cómo escala el sistema?"
→ [FAQ - Performance](./FAQ-sistema-pedidos.md#performance)

---

## 💡 Consejos de Uso

### Para Leer la Documentación

1. **Primera vez:**
   - Resumen ejecutivo (5 min)
   - Quick Start (10 min)
   - Ver 2-3 diagramas (10 min)
   - Total: 25 minutos

2. **Antes de implementar:**
   - Especificación técnica completa (60 min)
   - Revisar todos los diagramas (20 min)
   - Explorar modelos y datos (10 min)
   - Total: 90 minutos

3. **Durante desarrollo:**
   - FAQ como referencia
   - Especificación técnica para detalles
   - Diagramas para claridad

### Para Navegar

**Estructura mental:**
```
Resumen Ejecutivo
    ↓
Quick Start
    ↓
Especificación Técnica ←→ Diagramas
    ↓
Código (Models) ←→ Datos (JSON)
    ↓
FAQ / Decisiones Técnicas (referencia)
```

### Para Implementar

1. Lee especificación de la fase actual
2. Revisa el diagrama correspondiente
3. Mira los modelos Pydantic
4. Implementa siguiendo el patrón
5. Prueba con datos de ejemplo
6. Consulta FAQ si tienes dudas

---

## 🤝 Contribuir

### Agregar Documentación

```bash
# Crear nuevo documento
touch docs/MI-NUEVO-DOC.md

# Agregar referencia aquí
# Actualizar índice en este README
```

### Reportar Issues

Si encuentras:
- ❌ Errores en la documentación
- ❌ Diagramas incorrectos
- ❌ Código que no funciona
- ❌ Explicaciones confusas

Crea un issue en GitHub o actualiza la documentación.

---

## 📞 Soporte

### Recursos Adicionales

- **Especificación Completa:** [sistema-pedidos-produccion.md](./sistema-pedidos-produccion.md)
- **Preguntas Frecuentes:** [FAQ-sistema-pedidos.md](./FAQ-sistema-pedidos.md)
- **Decisiones de Diseño:** [DECISIONES-TECNICAS.md](./DECISIONES-TECNICAS.md)
- **Guía Rápida:** [QUICKSTART-sistema-pedidos.md](./QUICKSTART-sistema-pedidos.md)

### Contacto

- **Issues:** GitHub Issues
- **Documentación:** Este directorio `docs/`
- **Código:** `src/models/order_models.py`

---

## ✅ Checklist para Nuevos Desarrolladores

Antes de empezar a codear:

- [ ] He leído el resumen ejecutivo
- [ ] He revisado el Quick Start Guide
- [ ] He visto al menos 3 diagramas
- [ ] Entiendo los modelos Pydantic
- [ ] He explorado los datos de ejemplo
- [ ] Sé qué fase voy a implementar
- [ ] He leído la especificación de esa fase
- [ ] Tengo claro cómo validar mis cambios

---

**¡Todo listo para comenzar! 🚀**

---

**Última actualización:** 2025-01-07  
**Versión:** 2.0  
**Estado:** Documentación completa, implementación pendiente
