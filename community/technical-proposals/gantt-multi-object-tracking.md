# 📐 Propuesta Técnica: Diagrama de Gantt para Objetos Multi-Impresión

**Título de la Propuesta:** Sistema de Visualización y Control por Objeto Individual en Impresiones Multi-Objeto

**Autor:** @elisaul77

**Fecha:** 07/08/2025

**Categoría:** 🌐 Interfaz, 🔍 Análisis, 🤖 IA

**Complejidad Estimada:** 🟠 Alta

---

## ❓ Problema que Resuelve

Cuando imprimes varios objetos en el mismo plato con diferentes tiempos (ej: objetos de 15 minutos y objetos de 1 hora), actualmente **no puedes saber cuándo termina cada objeto individual**. Esto significa:

- ❌ **Pérdida de tiempo**: Objetos pequeños se enfrían mientras esperan que terminen los grandes
- ❌ **Análisis de fallos confuso**: Si algo falla, no sabes qué objeto específico causó el problema
- ❌ **Productividad limitada**: No puedes retirar objetos listos para empezar su post-procesado
- ❌ **Estrés innecesario**: No sabes si la impresión falló por un objeto específico o todo el trabajo

## 💡 Solución Propuesta

Crear un **sistema de visualización tipo Diagrama de Gantt** que muestre cada objeto como una barra de progreso individual, permitiendo:

🎯 **Ver el progreso de cada objeto** en tiempo real con estimaciones precisas
⏸️ **Pausar automáticamente** (opcional) cuando objetos terminan para retirarlos
� **Identificar exactamente** qué objeto falló y cuándo
📊 **Optimizar productividad** retirando objetos listos mientras otros siguen imprimiendo

## � Casos de Uso

**Caso 1: Prototipos Mixtos**
- Imprimes 3 prototipos pequeños (20min cada uno) + 1 prototipo complejo (2 horas)
- Ves el Gantt: a los 20min el primer prototipo termina → Sistema sugiere pausa opcional
- Retiras el prototipo, lo envías a post-procesado, y resumes la impresión
- Sigues retirando prototipos conforme terminan mientras el complejo continúa

**Caso 2: Detección de Fallo Específico**
- Objeto A falla en capa 15 por mala adhesión
- El Gantt te muestra exactamente que **solo** el Objeto A falló
- Sistema sugiere: "Pausar y reiniciar solo Objeto A" vs "Reiniciar toda la impresión"
- Objetos B y C que van bien pueden continuar sin problemas

**Caso 3: Optimización de Productividad**
- Planificas tu tiempo viendo que objetos pequeños terminan en 30min
- Preparas el post-procesado mientras la impresora sigue trabajando
- Maximizas el paralelismo: trabajo manual + trabajo automatizado

## ✨ Beneficios Esperados

- **⏰ 30% menos tiempo total**: Retirar objetos listos inmediatamente
- **🎯 Identificación precisa de fallos**: Saber exactamente qué objeto causó el problema
- **📈 Productividad máxima**: Trabajar en objetos listos mientras otros siguen
- **😌 Menos estrés**: Control visual total de lo que está pasando
- **🔧 Mejor toma de decisiones**: Datos claros para decidir si pausar, reiniciar, o continuar

## 🔧 Componentes Técnicos Principales

- **Analizador de G-code:** Lee el archivo y identifica donde empieza/termina cada objeto
- **Monitor de Progreso:** Conecta con Moonraker para saber la línea actual de G-code
- **Calculadora de Tiempo:** Estima cuánto falta para cada objeto basado en velocidades reales  
- **Interfaz de Gantt:** Muestra barras de progreso visual por objeto
- **Sistema de Pausas:** Controla pausas opcionales manteniendo temperatura
- **Analizador de Fallos:** Correlaciona errores con objetos específicos

## � Fases de Implementación

### Fase 1: Análisis Básico de G-code
- [ ] Crear parser que identifique objetos en archivo G-code
- [ ] Detectar rangos de líneas por objeto
- [ ] Estimar tiempos básicos por objeto
- [ ] Probar con archivos de PrusaSlicer y Cura

### Fase 2: Tracking en Tiempo Real
- [ ] Conectar con Moonraker para obtener progreso actual
- [ ] Calcular progreso de cada objeto en tiempo real
- [ ] Detectar cuándo un objeto individual termina
- [ ] Crear API para consultar estados

### Fase 3: Interfaz Visual
- [ ] Crear componente de diagrama de Gantt
- [ ] Mostrar barras de progreso por objeto
- [ ] Colores y estados visuales (en progreso, completado, fallido)
- [ ] Timeline interactivo con información detallada

### Fase 4: Control de Pausas
- [ ] Sistema de pausa inteligente al completar objetos
- [ ] Opciones: automática, manual, o solo notificación
- [ ] Mantener temperatura durante pausas
- [ ] Resumido suave con verificaciones

### Fase 5: Análisis de Fallos
- [ ] Correlacionar errores con objetos específicos
- [ ] Timeline de eventos mostrando cuándo/dónde falló
- [ ] Sugerencias: reiniciar objeto vs toda la impresión
- [ ] Reportes detallados por objeto

## 🔌 Integraciones Necesarias

- **Moonraker/Klipper:** Para obtener progreso actual y controlar pausas
- **Slicers Populares:** PrusaSlicer, Cura, SuperSlicer (analizar formatos de comentarios)
- **Sistema de Archivos:** Para leer y analizar archivos G-code
- **Base de Datos:** Para guardar historial de objetos y análisis de rendimiento

## 📊 Cómo Mediríamos el Éxito

- **Tiempo de Producción:** 30% reducción en tiempo total de completar múltiples objetos
- **Precisión de Detección:** 90% exactitud identificando qué objeto específico falló
- **Adopción de Usuarios:** 80% de usuarios con impresiones multi-objeto usan la funcionalidad
- **Satisfacción:** 95% de usuarios reportan mayor control y menos ansiedad
- **Productividad:** 50% mejora en utilización de tiempo durante impresiones largas

## 🤝 ¿Cómo Puedes Ayudar?

- [x] Puedo ayudar con el diseño (autor de la idea)
- [x] Puedo ayudar con la implementación
- [x] Puedo ayudar con las pruebas
- [x] Puedo proporcionar casos de uso reales
- [x] Puedo ayudar con la documentación

## � Información Adicional

Esta funcionalidad posicionaría a KyberCore como **el único orquestador 3D** que ofrece control granular a nivel de objeto individual. Es especialmente valioso para:

- **Workshops de prototipado** que manejan múltiples proyectos
- **Pequeñas producciones** con objetos de diferentes tiempos
- **Entornos educativos** donde estudiantes necesitan ver el progreso detallado
- **Makers avanzados** que quieren maximizar productividad

**Referencias útiles:**
- [Análisis de formatos G-code](enlace-pendiente)
- [API de Moonraker](https://moonraker.readthedocs.io/)
- [Librerías de Gantt para web](enlace-pendiente)

---

**💡 Siguiente paso:** Crear GitHub Issue para discusión detallada y feedback de la comunidad sobre viabilidad técnica y casos de uso adicionales.
