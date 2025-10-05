# Documentación KyberCore

## 📚 Contenido

### `architecture/` - Arquitectura del Sistema
- **[Sistema de Auto-Rotación](architecture/auto-rotation-system.md)** - Documentación completa del sistema de optimización de orientación STL
- **[Flujo de Auto-Rotación](architecture/flujo_auto_rotacion.mmd)** - Diagrama de secuencia Mermaid del flujo completo
- **[Diagramas APISLICER](architecture/apislicer-diagrams.md)** - Arquitectura del servicio de slicing
- Diagramas de flujo (Mermaid)
- Diagramas de secuencia del wizard
- Arquitectura de componentes

### `api/` - Documentación de APIs
- **KyberCore API** - API principal del orquestador
- **APISLICER API** - API de slicing STL → G-code
- Endpoints y ejemplos

### `guides/` - Guías de Usuario
- **[Guía Rápida: Auto-Rotación](guides/auto-rotation-quickstart.md)** - Inicio rápido para desarrolladores
- **[Guía del Wizard](guides/wizard-test-guide.md)** - Testing del wizard de impresión
- **[Guía del Visor G-code](guides/gcode-viewer-guide.md)** - Uso del visualizador 3D
- Instalación y configuración
- Troubleshooting común

### `research/` - Investigación y Propuestas
- **[Investigación Principal](research/investigacion.md)** - Investigación académica y justificación
- Propuestas técnicas
- Análisis de viabilidad

## 🆕 Últimas Actualizaciones

### [Sistema de Auto-Rotación v1.0.0](CHANGELOG-auto-rotation.md) - 2024-10-04
- ✨ **Optimización Automática** de orientación STL
- 🎚️ **Umbral Dinámico** ajustable (0-20%)
- 🤖 **Algoritmo Dual**: Exploración estratégica + Gradient Descent
- 💾 **Persistencia Temporal** de archivos rotados
- 📊 **Trazabilidad Completa** del proceso

**[Ver Changelog Completo →](CHANGELOG-auto-rotation.md)**

## 📖 Documentos Principales

| Documento | Descripción | Última Actualización |
|-----------|-------------|---------------------|
| [Sistema de Auto-Rotación](architecture/auto-rotation-system.md) | Arquitectura completa con diagramas Mermaid | 2024-10-04 |
| [Guía Rápida Auto-Rotación](guides/auto-rotation-quickstart.md) | Testing, debugging y troubleshooting | 2024-10-04 |
| [Changelog Auto-Rotación](CHANGELOG-auto-rotation.md) | Historial de cambios y features | 2024-10-04 |
| [Guía del Wizard](guides/wizard-test-guide.md) | Testing del flujo completo | 2024-10-03 |
| [Visor G-code](guides/gcode-viewer-guide.md) | Visualización 3D de G-code | 2024-10-02 |

## 🔗 Enlaces Útiles

- [README Principal](../README.md)
- [Contribuir](../CONTRIBUTING.md)
- [Roadmap](../README.md#roadmap)
- [Issues](https://github.com/kybercore/kybercore/issues)

## 📝 Convenciones

- Los diagramas usan Mermaid (formato `.mmd`)
- La documentación está en Markdown
- Los ejemplos de código incluyen comentarios
- Los diagramas de secuencia usan autonumber
- Los changelog siguen [Keep a Changelog](https://keepachangelog.com/)

## 🎯 Navegación Rápida

### Para Usuarios
1. [Instalación](../README.md#instalación)
2. [Guía de Inicio Rápido](guides/auto-rotation-quickstart.md#para-usuarios)
3. [Usar Auto-Rotación](architecture/auto-rotation-system.md#casos-de-uso)

### Para Desarrolladores
1. [Arquitectura General](architecture/)
2. [Guía de Desarrollo](guides/auto-rotation-quickstart.md#para-desarrolladores)
3. [Testing](guides/auto-rotation-quickstart.md#testing)
4. [Debugging](guides/auto-rotation-quickstart.md#debugging)

### Para Investigadores
1. [Investigación Académica](research/investigacion.md)
2. [Algoritmos de Optimización](architecture/auto-rotation-system.md#algoritmos-de-optimización)
3. [Métricas](CHANGELOG-auto-rotation.md#métricas-de-mejora)

## 🔍 Búsqueda Rápida

| Busco... | Documento |
|----------|-----------|
| Cómo usar auto-rotación | [Casos de Uso](architecture/auto-rotation-system.md#casos-de-uso) |
| Endpoints de la API | [API y Endpoints](architecture/auto-rotation-system.md#api-y-endpoints) |
| Problemas comunes | [Troubleshooting](architecture/auto-rotation-system.md#troubleshooting) |
| Testing | [Guía Rápida](guides/auto-rotation-quickstart.md#testing) |
| Arquitectura | [Sistema Completo](architecture/auto-rotation-system.md) |
| Flujo detallado | [Diagrama Mermaid](architecture/flujo_auto_rotacion.mmd) |

```
