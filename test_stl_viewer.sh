#!/bin/bash
# Script para probar el visor STL interactivo

echo "🚀 Iniciando visor STL interactivo de KyberCore..."
echo ""
echo "📋 Características del visor:"
echo "  ✅ Carga archivos STL directamente desde el navegador"
echo "  ✅ Visualización 3D interactiva con Three.js"
echo "  ✅ Controles de órbita (rotar, zoom, pan)"
echo "  ✅ Comparación lado a lado: Original vs Optimizado"
echo "  ✅ Análisis automático de rotación óptima"
echo "  ✅ Tres métodos de optimización: Grid, Gradient, Auto"
echo ""
echo "🌐 URLs disponibles:"
echo "  📄 API SLICER: http://localhost:8001/test_auto_rotate.html"
echo "  📄 Web Static: http://localhost:5000/static/test_auto_rotate.html"
echo ""

# Verificar contenedores
echo "🔍 Verificando servicios..."
if docker ps | grep -q apislicer; then
    echo "  ✅ APISLICER API ejecutándose en puerto 8001"
else
    echo "  ❌ APISLICER API no encontrado"
    echo "     Ejecuta: cd APISLICER && docker compose up -d"
fi

if docker ps | grep -q kybercore; then
    echo "  ✅ KyberCore Web ejecutándose en puerto 5000"
else
    echo "  ❌ KyberCore Web no encontrado"
    echo "     Ejecuta: docker compose up -d"
fi

echo ""
echo "🎯 Para usar el visor:"
echo "1. Abre una de las URLs arriba en tu navegador"
echo "2. Selecciona un archivo STL usando el botón '📤 Subir Archivo STL'"
echo "3. El modelo se cargará automáticamente en el visor izquierdo"
echo "4. Haz clic en '🚀 Subir y Analizar' para ejecutar el análisis de rotación"
echo "5. Compara los resultados de los tres métodos de optimización"
echo "6. Observa la versión optimizada en el visor derecho"
echo ""
echo "🎮 Controles del visor 3D:"
echo "  🖱️  Clic izquierdo + arrastrar: Rotar vista"
echo "  🖱️  Scroll: Zoom in/out"
echo "  🖱️  Clic derecho + arrastrar: Pan (mover vista)"
echo ""

# Intentar abrir en navegador
if command -v xdg-open &> /dev/null; then
    echo "🌐 Intentando abrir en navegador..."
    xdg-open http://localhost:8001/test_auto_rotate.html 2>/dev/null &
elif command -v open &> /dev/null; then
    echo "🌐 Intentando abrir en navegador..."
    open http://localhost:8001/test_auto_rotate.html 2>/dev/null &
else
    echo "🌐 Abre manualmente: http://localhost:8001/test_auto_rotate.html"
fi

echo ""
echo "✨ ¡Listo! El visor STL está preparado para usar."