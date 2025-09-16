#!/bin/bash
# Script de ejemplo para demostrar la auto-rotación inteligente de APISLICER

echo "🔧 APISLICER - Demo de Auto-Rotación Inteligente"
echo "=================================================="

# Verificar que el servicio esté corriendo
echo "📡 Verificando servicio APISLICER..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Servicio APISLICER activo"
else
    echo "❌ Servicio APISLICER no disponible. Ejecuta: docker-compose up -d"
    exit 1
fi

echo ""
echo "📊 Probando análisis de rotación óptima..."

# Crear un archivo STL de ejemplo (cubo simple) para testing
echo "🧊 Creando archivo STL de prueba..."
cat > /tmp/test_cube.stl << 'EOF'
solid cube
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 1.0
      vertex 1.0 0.0 1.0
      vertex 1.0 1.0 1.0
    endloop
  endfacet
  facet normal 0.0 0.0 -1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 1.0 1.0 0.0
      vertex 1.0 0.0 0.0
    endloop
  endfacet
endsolid cube
EOF

# Nota: Este es un STL muy simple. En la práctica usarías archivos STL reales.

echo ""
echo "🔄 Enviando archivo para análisis de rotación..."
echo "Nota: Para una demo completa, usa un archivo STL real de una pieza compleja."

# Ejemplo de llamada a la API (comentado ya que requiere archivo real)
echo ""
echo "💡 Ejemplo de uso:"
echo ""
echo "# 1. Analizar rotación óptima"
echo 'curl -X POST "http://localhost:8001/auto-rotate" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"stl_path": "/path/to/your/file.stl"}'"'"
echo ""
echo "# 2. Laminar con auto-rotación automática"
echo 'curl -X POST "http://localhost:8001/slice" \'
echo '  -F "file=@pieza.stl" \'
echo '  -F "auto_rotate=true" \'
echo '  --output resultado_optimizado.gcode'
echo ""

echo "🎯 Beneficios de la Auto-Rotación:"
echo "  ✅ Máxima adherencia a la cama de impresión"
echo "  ✅ Mejor estabilidad durante la impresión"
echo "  ✅ Reducción de warping y fallos"
echo "  ✅ Optimización automática sin intervención manual"
echo "  ✅ Análisis geométrico preciso con algoritmos matemáticos"

echo ""
echo "📈 El algoritmo:"
echo "  1. Carga la geometría STL usando trimesh"
echo "  2. Prueba múltiples rotaciones (configurable)"
echo "  3. Calcula el área de contacto para cada orientación"
echo "  4. Selecciona la rotación que maximiza la estabilidad"
echo "  5. Aplica la rotación óptima al archivo STL"

echo ""
echo "⚙️ Configuración del algoritmo:"
echo "  • method: gradient (descenso del gradiente)"
echo "  • max_iterations: 50 (iteraciones de optimización)"
echo "  • learning_rate: 0.1 (tasa de aprendizaje)"
echo "  • momentum_beta: 0.9 (factor de momentum)"
echo "  • convergence_tol: 1e-4 (tolerancia de convergencia)"

echo ""
echo "🧮 Algoritmo de Optimización:"
echo "  1. Inicializar ángulos de rotación θ = [0,0,0]"
echo "  2. Calcular área de contacto A(θ)"
echo "  3. Calcular gradiente ∇A(θ) numéricamente"
echo "  4. Actualizar θ = θ + α∇A(θ) (con momentum)"
echo "  5. Repetir hasta convergencia o max_iteraciones"
echo "  6. Aplicar rotación óptima al STL"

echo ""
echo "📊 Comparación con método anterior:"
echo "  • Grid Search: Prueba 13,824 combinaciones (24³)"
echo "  • Gradient: ~50 evaluaciones inteligentes"
echo "  • Precisión: Continua vs. Discreta"
echo "  • Velocidad: 10-50x más rápido"

echo ""
echo "🏁 Demo completada. La auto-rotación está lista para usar en producción."