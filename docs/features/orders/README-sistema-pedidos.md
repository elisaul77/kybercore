# 📚 Documentación del Sistema de Pedidos

> **Sistema completo de tracking de pedidos, clientes y producción para KyberCore**

[![Estado](https://img.shields.io/badge/Estado-Diseño_Completo-green)]()
[![Versión](https://img.shields.io/badge/Versión-1.0.0-blue)]()
[![Progreso](https://img.shields.io/badge/Progreso-70%25-yellow)]()
[![Fase](https://img.shields.io/badge/Fase-1_de_6-orange)]()

---

## 🚀 Inicio Rápido (Resumen)

1. **[Lee el documento de ENTREGA](./ENTREGA-sistema-pedidos.md)** (15 min)
2. **[Explora el Índice General](./INDEX-sistema-pedidos.md)** (10 min)
3. **[Revisa el Quick Start](./QUICKSTART-sistema-pedidos.md)** (15 min)
4. **[Consulta la FAQ](./FAQ-sistema-pedidos.md)** cuando necesites resolver dudas

---

Bienvenido a la documentación completa del Sistema de Gestión de Pedidos y Producción de KyberCore.

---

## 🗂️ Índice de Documentos

### 📋 Documentos Principales

| Documento | Descripción | Ubicación |
|-----------|-------------|-----------|
| **Resumen Ejecutivo** | Qué se entregó y estado actual | [resumen-sistema-pedidos.md](./resumen-sistema-pedidos.md) |
| **Especificación Técnica** | Documento completo (1,800+ líneas) | [sistema-pedidos-produccion.md](./sistema-pedidos-produccion.md) |

### 📊 Diagramas (Mermaid)

Todos los diagramas están en: `../infografia/`

| Diagrama | Descripción | Archivo |
|----------|-------------|---------|
| **Arquitectura** | Componentes, capas, integraciones | [sistema_pedidos_arquitectura.mmd](../infografia/sistema_pedidos_arquitectura.mmd) |
| **Entidades (ERD)** | Modelo de datos completo | [sistema_pedidos_entidades.mmd](../infografia/sistema_pedidos_entidades.mmd) |
| **Estados** | Máquina de estados del pedido | [sistema_pedidos_estados.mmd](../infografia/sistema_pedidos_estados.mmd) |
| **Flujo Creación** | Secuencia de creación de pedido | [sistema_pedidos_flujo_creacion.mmd](../infografia/sistema_pedidos_flujo_creacion.mmd) |
| **Flujo Producción** | Secuencia de producción | [sistema_pedidos_flujo_produccion.mmd](../infografia/sistema_pedidos_flujo_produccion.mmd) |

---

## 🚀 Guía Rápida de Inicio

### 1. Entender el Sistema
```bash
# Leer resumen ejecutivo (10 min)
cat docs/resumen-sistema-pedidos.md

# Leer especificación completa (30 min)
cat docs/sistema-pedidos-produccion.md
```

### 2. Explorar los Modelos
```bash
# Ver modelos Pydantic implementados
cat src/models/order_models.py
```

### 3. Inspeccionar Datos de Ejemplo
```bash
# Ver clientes de ejemplo
cat base_datos/customers.json

# Ver pedidos de ejemplo
cat base_datos/orders.json

# Ver tracking de producción
cat base_datos/production_tracking.json
```

### 4. Visualizar Diagramas

**Opción A: VS Code**
1. Instalar extensión "Markdown Preview Mermaid Support"
2. Abrir cualquier `.md` o `.mmd` file
3. `Ctrl+Shift+V` para preview

**Opción B: Mermaid Live Editor**
1. Ir a https://mermaid.live/
2. Copiar contenido de `.mmd` file
3. Ver diagrama renderizado

---

## 📖 Estructura de la Documentación

### Documento Principal: `sistema-pedidos-produccion.md`

**Capítulos:**
1. Visión General
2. Arquitectura del Sistema
3. Modelo de Datos
4. Flujos de Trabajo
5. API Endpoints
6. Interfaz de Usuario
7. Casos de Uso
8. Implementación
9. Métricas y Reportes
10. Consideraciones Futuras

**Lo incluye:**
- ✅ 8 entidades principales modeladas
- ✅ 20+ endpoints API especificados
- ✅ 5 casos de uso detallados
- ✅ 6 fases de implementación
- ✅ Wireframes ASCII de UI
- ✅ Diagramas Mermaid integrados

### Documento Resumen: `resumen-sistema-pedidos.md`

**Contenido:**
- ✅ Qué se completó (70%)
- ✅ Qué falta (30%)
- ✅ Lista de entregables
- ✅ Características principales
- ✅ Decisiones de diseño
- ✅ Guía de uso
- ✅ Próximos pasos

---

## 🎯 Casos de Uso Principales

### 1. Pedido Simple
Cliente necesita 5 copias de un proyecto → crear pedido → imprimir → trackear progreso

### 2. Pedido Multi-Proyecto
Cliente necesita kit completo (varios proyectos) → un pedido con múltiples líneas → producción por fases

### 3. Gestión de Fallos
Durante producción, algunas piezas fallan → sistema trackea → reintentar fallidos

### 4. Priorización Urgente
Cliente llama urgentemente → cambiar prioridad → re-ordenar cola → completar rápido

### 5. Análisis de Cliente
Gerente analiza cliente VIP → ver historial → identificar patrones → crear plantilla

---

## 💾 Base de Datos

### Archivos JSON

```
base_datos/
├── customers.json          # Clientes (3 ejemplos)
├── orders.json            # Pedidos (2 ejemplos)
└── production_tracking.json # Batches y items (2 batches, 11 items)
```

### Estructura de Datos

**customers.json:**
```json
{
  "metadata": {...},
  "customers": [...]
}
```

**orders.json:**
```json
{
  "metadata": {...},
  "orders": [
    {
      "id": "ord_xxx",
      "order_lines": [...],
      ...
    }
  ],
  "statistics": {...}
}
```

**production_tracking.json:**
```json
{
  "metadata": {...},
  "production_batches": [
    {
      "id": "batch_xxx",
      "print_items": [...],
      ...
    }
  ],
  "statistics": {...}
}
```

---

## 🔧 Modelos de Datos

### Ubicación
`src/models/order_models.py`

### Entidades Principales

1. **Customer** - Cliente con información de contacto
2. **Order** - Pedido contenedor principal
3. **OrderLine** - Línea de pedido (proyecto + cantidad)
4. **ProductionBatch** - Lote de producción
5. **PrintItem** - Item individual de impresión

### Enums

- `OrderStatus` - Estados del pedido (6 estados)
- `OrderPriority` - Prioridades (4 niveles)
- `OrderLineStatus` - Estados de línea
- `BatchStatus` - Estados de batch
- `PrintItemStatus` - Estados de item

### DTOs (Data Transfer Objects)

- `CustomerCreate`, `CustomerUpdate`
- `OrderCreate`, `OrderUpdate`
- `OrderLineCreate`
- `ProductionBatchCreate`

---

## 📊 Métricas del Sistema

### KPIs de Pedidos
- Total de pedidos
- Pedidos activos
- Tasa de completitud
- Tiempo promedio de completitud

### KPIs de Producción
- Items producidos
- Tasa de éxito
- Filamento usado
- Tiempo total de producción

### KPIs de Cliente
- Clientes activos
- Revenue total
- Pedidos por cliente
- Cliente top

---

## 🎨 Características del Diseño

### ✅ Completado

1. **Arquitectura de Componentes**
   - Frontend, Backend, Servicios, Database
   - Integración con sistema existente

2. **Modelo de Datos**
   - 8 entidades principales
   - Validaciones Pydantic
   - Properties calculadas

3. **Flujos de Trabajo**
   - Creación de pedido (44 pasos)
   - Producción (59 pasos)
   - Seguimiento en tiempo real
   - Máquina de estados

4. **API Endpoints**
   - CRUD de clientes (5 endpoints)
   - CRUD de pedidos (8 endpoints)
   - Gestión de producción (4 endpoints)
   - Métricas y reportes (3 endpoints)

5. **Base de Datos JSON**
   - 3 archivos con estructura completa
   - Datos de ejemplo realistas
   - Estadísticas agregadas

### ⏸️ Pendiente

1. **Controladores**
   - `orders_controller.py`
   - `customers_controller.py`
   - `production_controller.py`

2. **Servicios**
   - `order_service.py`
   - `production_service.py`
   - `metrics_service.py`

3. **Frontend**
   - Templates HTML
   - Módulos JavaScript
   - Estilos CSS

4. **Testing**
   - Tests unitarios
   - Tests de integración
   - Tests end-to-end

---

## 🚦 Plan de Implementación

### Fase 1: Fundamentos ✅ (Completa)
- Modelos de datos
- Estructura de base de datos
- Documentación y diagramas

### Fase 2: Backend API ⏸️ (Siguiente)
- Implementar controladores
- Crear endpoints REST
- Integrar con API principal

### Fase 3: Servicios ⏸️
- Lógica de negocio
- Cálculos y validaciones
- Métricas y reportes

### Fase 4: Frontend ⏸️
- Vistas principales
- Dashboard de pedidos
- Formularios de creación

### Fase 5: Integración ⏸️
- Conectar con Print Wizard
- Actualizar tracking en tiempo real
- Gestión de batches

### Fase 6: Testing & Refinamiento ⏸️
- Tests completos
- Optimización de UX
- Documentación de usuario

---

## 📞 Referencias Rápidas

### Documentos
- [Especificación Completa](./sistema-pedidos-produccion.md)
- [Resumen Ejecutivo](./resumen-sistema-pedidos.md)

### Código
- [Modelos Pydantic](../src/models/order_models.py)
- [Base de Datos](../base_datos/)

### Diagramas
- [Arquitectura](../infografia/sistema_pedidos_arquitectura.mmd)
- [Entidades](../infografia/sistema_pedidos_entidades.mmd)
- [Estados](../infografia/sistema_pedidos_estados.mmd)
- [Flujo Creación](../infografia/sistema_pedidos_flujo_creacion.mmd)
- [Flujo Producción](../infografia/sistema_pedidos_flujo_produccion.mmd)

---

## 💡 Tips

### Para Desarrolladores
1. Empieza leyendo el resumen ejecutivo
2. Revisa los diagramas para entender la arquitectura
3. Explora los modelos Pydantic
4. Usa los datos de ejemplo como referencia
5. Sigue las especificaciones de endpoints al implementar

### Para Gestores de Proyecto
1. Lee la visión general en la especificación
2. Revisa los casos de uso
3. Verifica las fases de implementación
4. Estima tiempos basándote en el plan

### Para Diseñadores UX
1. Revisa los wireframes ASCII en la especificación
2. Consulta los flujos de trabajo
3. Diseña basándote en los casos de uso
4. Prioriza vistas: Dashboard > Lista > Detalle > Formulario

---

**Última actualización:** 2025-10-07  
**Versión:** 1.0  
**Estado:** Diseño completo, implementación pendiente
