#!/bin/bash

# Script para probar la interfaz de auto-rotación STL
echo "🚀 Iniciando prueba de auto-rotación STL..."
echo ""
echo "📋 Verificando que el contenedor APISLICER esté corriendo..."

if ! docker ps | grep -q apislicer-slicer-api; then
    echo "❌ El contenedor APISLICER no está corriendo."
    echo "Ejecuta: docker compose up apislicer -d"
    exit 1
fi

echo "✅ Contenedor APISLICER está corriendo en puerto 8001"
echo ""
echo "🌐 Abre tu navegador y ve a:"
echo "http://localhost:8001/test_auto_rotate.html"
echo ""
echo "📤 Desde ahí podrás:"
echo "  - Subir archivos STL"
echo "  - Comparar métodos de auto-rotación (Grid, Gradient, Auto)"
echo "  - Ver visualización 3D antes/después"
echo "  - Analizar mejoras en área de contacto"
echo ""
echo "💡 Archivos de prueba disponibles:"
echo "  - /app/uploads/94Gengar.stl (modelo complejo)"
echo "  - /app/uploads/test_cube.stl (modelo simple)"
echo "  - /app/uploads/test_pyramid_down.stl (modelo simple)"
echo ""
echo "Presiona Ctrl+C para salir..."