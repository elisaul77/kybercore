# Sistema de Numeración Automática para Ideas de la Comunidad

## Implementación

Para asegurar que cada idea de la comunidad reciba un número único automáticamente, implementamos las siguientes estrategias:

### 1. Numeración Automática en GitHub Issues

Cada vez que se crea un issue usando nuestros templates:
- GitHub asigna automáticamente un número único (#1, #2, #3, etc.)
- Estos números son inmutables y únicos en todo el repositorio
- Se muestran en la URL y título del issue

### 2. Labels para Identificación Rápida

Utilizamos un sistema de labels para categorizar automáticamente:
- `idea: new` - Ideas nuevas pendientes de evaluación
- `idea: approved` - Ideas aprobadas para desarrollo
- `idea: in-progress` - Ideas en desarrollo activo
- `idea: completed` - Ideas implementadas
- `idea: rejected` - Ideas que no se implementarán

### 3. Referencia Cruzada con Ideas Board

El archivo `community/ideas-board.md` mantiene referencias a:
- Número de issue de GitHub (ej: #45)
- ID interno para ideas rápidas (ej: ID-001)
- Links directos entre ambos sistemas

### 4. Workflow de Numeración

```
Idea Rápida (ideas-board.md) → Issue de GitHub → Número Automático
     ↓                              ↓                    ↓
   ID-XXX                         #123              #123 en título
```

## Cómo Funciona

1. **Ideas Rápidas**: Se registran en `ideas-board.md` con ID-XXX
2. **Evaluación**: Si la idea tiene potencial, se promueve a GitHub Issue
3. **Tracking Oficial**: GitHub Issue recibe número automático (#123)
4. **Referencia**: Se actualiza `ideas-board.md` con link al issue

## Ventajas del Sistema

- ✅ **Numeración automática**: GitHub maneja la secuencia
- ✅ **No hay duplicados**: Sistema nativo previene colisiones
- ✅ **Trazabilidad completa**: Desde idea inicial hasta implementación
- ✅ **Crédito automático**: GitHub registra el autor original
- ✅ **Búsqueda fácil**: Por número, autor, o contenido
- ✅ **Historial inmutable**: No se pueden perder registros

## Templates Disponibles

1. **💡 Community Idea** - Para ideas generales de la comunidad
2. **🚀 Feature Request** - Para solicitudes específicas de funcionalidades
3. **📐 Technical Proposal** - Para propuestas técnicas complejas

Cada template asigna automáticamente:
- Labels apropiados para categorización
- Formato estándar para fácil procesamiento
- Campos requeridos para evaluación completa
