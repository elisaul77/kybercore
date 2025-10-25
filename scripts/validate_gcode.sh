#!/bin/bash

# Script de validación de G-code - Verifica que contenga comandos de temperatura
# Uso: ./validate_gcode.sh <ruta_al_archivo.gcode>

GCODE_FILE="$1"

if [ -z "$GCODE_FILE" ]; then
    echo "❌ Error: Debes proporcionar la ruta al archivo G-code"
    echo "Uso: $0 <ruta_al_archivo.gcode>"
    exit 1
fi

if [ ! -f "$GCODE_FILE" ]; then
    echo "❌ Error: Archivo no encontrado: $GCODE_FILE"
    exit 1
fi

echo "🔍 Validando G-code: $GCODE_FILE"
echo ""

# Variables de control
has_bed_set=false
has_bed_wait=false
has_hotend_set=false
has_hotend_wait=false
bed_temp=""
hotend_temp=""
line_count=0
max_lines=200  # Solo revisar las primeras 200 líneas (inicio del G-code)

# Buscar comandos de temperatura en las primeras líneas
while IFS= read -r line && [ $line_count -lt $max_lines ]; do
    ((line_count++))
    
    # M140: Set bed temperature (no wait)
    if [[ $line =~ M140[[:space:]]S([0-9]+) ]]; then
        temp="${BASH_REMATCH[1]}"
        if [ "$temp" != "0" ]; then
            has_bed_set=true
            bed_temp="$temp"
        fi
    fi
    
    # M190: Set bed temperature and wait
    if [[ $line =~ M190[[:space:]]S([0-9]+) ]]; then
        temp="${BASH_REMATCH[1]}"
        if [ "$temp" != "0" ]; then
            has_bed_wait=true
            bed_temp="$temp"
        fi
    fi
    
    # M104: Set hotend temperature (no wait)
    if [[ $line =~ M104[[:space:]]S([0-9]+) ]]; then
        temp="${BASH_REMATCH[1]}"
        if [ "$temp" != "0" ]; then
            has_hotend_set=true
            hotend_temp="$temp"
        fi
    fi
    
    # M109: Set hotend temperature and wait
    if [[ $line =~ M109[[:space:]]S([0-9]+) ]]; then
        temp="${BASH_REMATCH[1]}"
        if [ "$temp" != "0" ]; then
            has_hotend_wait=true
            hotend_temp="$temp"
        fi
    fi
done < "$GCODE_FILE"

# Mostrar resultados
echo "📊 Resultados de la validación:"
echo ""

if $has_bed_set || $has_bed_wait; then
    echo "✅ Cama (Bed):"
    [ $has_bed_set = true ] && echo "   - M140 S${bed_temp} (set temperatura)"
    [ $has_bed_wait = true ] && echo "   - M190 S${bed_temp} (set y esperar)"
else
    echo "❌ Cama (Bed): NO SE ENCONTRARON COMANDOS DE TEMPERATURA"
fi

echo ""

if $has_hotend_set || $has_hotend_wait; then
    echo "✅ Hotend (Extrusor):"
    [ $has_hotend_set = true ] && echo "   - M104 S${hotend_temp} (set temperatura)"
    [ $has_hotend_wait = true ] && echo "   - M109 S${hotend_temp} (set y esperar)"
else
    echo "❌ Hotend: NO SE ENCONTRARON COMANDOS DE TEMPERATURA"
fi

echo ""

# Validación final
if ($has_bed_set || $has_bed_wait) && ($has_hotend_set || $has_hotend_wait); then
    echo "✅ VALIDACIÓN EXITOSA: El G-code contiene comandos de temperatura correctos"
    exit 0
else
    echo "❌ VALIDACIÓN FALLIDA: Faltan comandos de temperatura críticos"
    exit 1
fi
