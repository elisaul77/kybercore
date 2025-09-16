# 🔄 Visor STL Interactivo - KyberCore APISLICER

Un visor 3D interactivo para archivos STL con análisis automático de rotación óptima.

## ✨ Características

- **👁️ Visualización 3D Interactiva**: Usa Three.js para renderizar archivos STL en el navegador
- **🔄 Análisis de Auto-Rotación**: Tres métodos de optimización (Grid Search, Gradient, Auto-adaptativo)
- **📊 Comparación de Resultados**: Visualiza mejoras porcentuales y ángulos óptimos
- **🎮 Controles Interactivos**: Rotación, zoom y pan con OrbitControls
- **📱 Interfaz Moderna**: Diseño responsive con Tailwind CSS

## 🚀 Uso Rápido

### 🐳 Opción 1: Con Docker (Recomendado)
```bash
# Verificar servicios
docker ps | grep apislicer

# Si no está ejecutándose:
cd APISLICER && docker compose up -d

# Acceder al visor
open http://localhost:8001/test_auto_rotate.html
```

### 📜 Opción 2: Script Automático
```bash
# Ejecutar el script de prueba
./test_stl_viewer.sh
```

### 🌐 Opción 3: Acceso Directo
1. Abrir: `http://localhost:8001/test_auto_rotate.html`
2. Seleccionar un archivo STL
3. Hacer clic en "🚀 Subir y Analizar"

## 🎮 Controles del Visor 3D

| Control | Acción |
|---------|--------|
| 🖱️ Clic izquierdo + arrastrar | Rotar la vista |
| 🖱️ Scroll del mouse | Zoom in/out |
| 🖱️ Clic derecho + arrastrar | Pan (mover vista) |

## 📋 Estructura de Resultados

### Información del Modelo
- **Caras**: Número de triángulos en el mesh
- **Vértices**: Número de puntos en el mesh
- **Volumen**: Volumen calculado en cm³
- **Complejidad**: Clasificación automática (Simple/Complejo)

### Métodos de Optimización

#### 🔍 Grid Search
- **Mejora %**: Porcentaje de mejora en área de contacto
- **Área Original/Óptima**: Comparación de áreas de contacto
- **Rotación**: Ángulos óptimos [X, Y, Z] en grados
- **Rotaciones Probadas**: Número total de combinaciones evaluadas

#### 🔥 Gradient Híbrido
- **Mejora %**: Optimización usando descenso del gradiente
- **Área Original/Óptima**: Comparación de áreas
- **Rotación**: Ángulos óptimos encontrados
- **Iteraciones**: Número de pasos del algoritmo

#### 🤖 Auto (Adaptativo)
- **Mejora %**: Método elegido automáticamente según complejidad
- **Área Original/Óptima**: Resultados finales
- **Rotación**: Ángulos óptimos aplicados
- **Método Usado**: Algoritmo seleccionado (Grid/Gradient)

## 🛠️ Tecnologías Utilizadas

- **Three.js**: Motor 3D para visualización
- **STLLoader**: Carga de archivos STL
- **OrbitControls**: Controles de cámara interactivos
- **Tailwind CSS**: Framework de estilos
- **FastAPI**: Backend para análisis de rotación

## � Configuración con Docker

### Servicios Requeridos
- **APISLICER API**: Puerto 8001 - Backend para análisis STL
- **KyberCore Web** (opcional): Puerto 5000 - Servidor web alternativo

### Inicio de Servicios
```bash
# Iniciar APISLICER (requerido)
cd APISLICER
docker compose up -d

# Verificar estado
docker ps | grep apislicer

# Iniciar KyberCore web (opcional)
cd ..
docker compose up -d
```

### Verificación
```bash
# API funcionando
curl -s http://localhost:8001/health

# HTML accesible
curl -s http://localhost:8001/test_auto_rotate.html | head -3

# Servicios ejecutándose
docker ps | grep -E '(apislicer|kybercore)'
```

### URLs de Acceso
- **Principal**: `http://localhost:8001/test_auto_rotate.html`
- **Alternativa**: `http://localhost:5000/static/test_auto_rotate.html`

## 🔧 Requisitos

- Docker y Docker Compose
- Navegador web moderno con WebGL
- Contenedor APISLICER ejecutándose

## 🚀 Inicio del Servicio

```bash
# Iniciar APISLICER
cd APISLICER
docker compose up -d

# Verificar estado
docker ps | grep apislicer
```

## 📊 API Endpoints Utilizados

- `POST /upload`: Subida de archivos STL
- `POST /auto-rotate`: Análisis de rotación óptima
- `GET /test_auto_rotate.html`: Interfaz web

## 🎯 Consejos de Uso

1. **Archivos Grandes**: Para archivos STL complejos, el análisis puede tomar tiempo
2. **Mejoras Pequeñas**: Valores < 1% pueden indicar que el modelo ya está bien orientado
3. **Visualización**: Usa los controles 3D para inspeccionar diferentes ángulos
4. **Comparación**: Revisa los tres métodos para encontrar el mejor resultado

## 🐛 Solución de Problemas

### El visor no carga
- Verificar que el contenedor APISLICER esté ejecutándose
- Comprobar que el puerto 8001 esté accesible
- Revisar la consola del navegador (F12) para errores de JavaScript

### El análisis falla
- Verificar que el archivo STL sea válido
- Comprobar logs del contenedor: `docker logs apislicer-slicer-api`
- Revisar que el archivo no esté corrupto

### Controles 3D no responden
- Asegurarse de que WebGL esté habilitado en el navegador
- Intentar con un navegador diferente (Chrome/Firefox/Edge)

---

**¡Disfruta explorando tus modelos STL con el poder de la IA!** 🤖✨