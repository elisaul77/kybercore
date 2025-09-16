#!/bin/bash
echo "=== Probando endpoint de información del modelo ==="

# Primero subir un archivo STL de prueba
echo "Subiendo archivo STL..."
UPLOAD_RESPONSE=$(curl -s -X POST "http://localhost:8001/upload" \
  -F "file=@uploads/94Gengar.stl" \
  -H "Content-Type: multipart/form-data")

echo "Respuesta de upload: $UPLOAD_RESPONSE"

# Extraer el nombre del archivo
FILENAME=$(echo $UPLOAD_RESPONSE | jq -r '.file_name')
echo "Nombre del archivo: $FILENAME"

if [ "$FILENAME" != "null" ] && [ -n "$FILENAME" ]; then
    echo "Obteniendo información del modelo..."
    MODEL_INFO=$(curl -s "http://localhost:8001/model-info/$FILENAME")
    echo "Información del modelo:"
    echo $MODEL_INFO | jq '.'
else
    echo "Error: No se pudo obtener el nombre del archivo"
fi
