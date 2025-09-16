#!/bin/bash
# Script para abrir la interfaz completa de pruebas de auto-rotación STL

echo "🌐 Abriendo interfaz completa de pruebas de auto-rotación STL..."
echo "📱 URL: http://localhost:8001/test_auto_rotate.html"
echo ""
echo "✨ Características de la interfaz:"
echo "  • Visor 3D interactivo con Three.js"
echo "  • Comparación de 3 métodos: Grid, Gradient, Auto"
echo "  • Información detallada del modelo"
echo "  • Visualización lado a lado (original vs optimizada)"
echo "  • Log en tiempo real del procesamiento"
echo ""

# Verificar que el contenedor esté corriendo
if docker ps | grep -q apislicer; then
    echo "✅ Contenedor APISLICER ejecutándose"
else
    echo "❌ Contenedor APISLICER no encontrado. Ejecuta: cd APISLICER && docker compose up -d"
    exit 1
fi

# Abrir en navegador si está disponible
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8001/test_auto_rotate.html
elif command -v open &> /dev/null; then
    open http://localhost:8001/test_auto_rotate.html
else
    echo "Abre manualmente: http://localhost:8001/test_auto_rotate.html"
fi
