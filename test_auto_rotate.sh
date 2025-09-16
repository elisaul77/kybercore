#!/bin/bash
# Script para acceder fácilmente a la interfaz de pruebas de auto-rotación

echo "🌐 Accediendo a la interfaz de pruebas de auto-rotación STL..."
echo "📱 URL: http://localhost:8001/test_auto_rotate.html"
echo ""
echo "Para probar:"
echo "1. Abre la URL en tu navegador"
echo "2. Selecciona un archivo STL"
echo "3. Haz clic en 'Subir y Analizar'"
echo "4. Compara los resultados de los 3 métodos: Grid, Gradient y Auto"
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