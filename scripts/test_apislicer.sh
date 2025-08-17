#!/bin/bash

# Script para probar el servicio APISLICER
# Uso: ./scripts/test_apislicer.sh

set -e

echo "=== Probando APISLICER ==="

# Verificar que el servicio esté corriendo
echo "1. Verificando estado del servicio..."
docker ps --filter "name=apislicer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Probar health check
echo -e "\n2. Probando health check..."
curl -s http://localhost:8001/health | jq . || echo "Health check failed"

# Crear STL de prueba
echo -e "\n3. Creando archivo STL de prueba..."
cat > /tmp/test_cube.stl << 'EOF'
solid cube
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 1.0
      vertex 1.0 0.0 1.0
      vertex 1.0 1.0 1.0
    endloop
  endfacet
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 1.0
      vertex 1.0 1.0 1.0
      vertex 0.0 1.0 1.0
    endloop
  endfacet
  facet normal 0.0 0.0 -1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 1.0 1.0 0.0
      vertex 1.0 0.0 0.0
    endloop
  endfacet
  facet normal 0.0 0.0 -1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 0.0 1.0 0.0
      vertex 1.0 1.0 0.0
    endloop
  endfacet
endsolid cube
EOF

echo "STL creado: $(wc -c < /tmp/test_cube.stl) bytes"

# Probar endpoint de slice
echo -e "\n4. Enviando STL para slice..."
curl -w "\nHTTP Status: %{http_code}\nTotal time: %{time_total}s\n" \
     -F "file=@/tmp/test_cube.stl" \
     -F "layer_height=0.2" \
     -F "fill_density=20" \
     -F "nozzle_temp=210" \
     -F "bed_temp=60" \
     -F "printer_profile=ender3" \
     http://localhost:8001/slice \
     -o /tmp/output_gcode.gcode

# Verificar resultado
echo -e "\n5. Verificando resultado..."
if [ -f /tmp/output_gcode.gcode ]; then
    file_size=$(wc -c < /tmp/output_gcode.gcode)
    echo "Archivo gcode generado: $file_size bytes"
    
    if [ $file_size -gt 1000 ]; then
        echo "✅ SUCCESS: G-code generado correctamente"
        echo "Primeras líneas del G-code:"
        head -10 /tmp/output_gcode.gcode
    else
        echo "❌ ERROR: Archivo muy pequeño, probablemente un error"
        echo "Contenido:"
        cat /tmp/output_gcode.gcode
    fi
else
    echo "❌ ERROR: No se generó archivo de salida"
fi

# Mostrar logs recientes si hay error
if [ $? -ne 0 ]; then
    echo -e "\n6. Logs del servicio:"
    docker compose -f docker-compose.yml logs --tail 20 apislicer
fi

echo -e "\n=== Fin de prueba ==="
