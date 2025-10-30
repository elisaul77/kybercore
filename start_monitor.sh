#!/bin/bash
# Script de inicio para el Dashboard de Monitoreo de KyberCore

echo "🚀 Iniciando KyberCore Print Monitor Dashboard..."
echo ""

# Verificar dependencias
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📦 Instalando dependencias..."
    pip install -r requirements.txt
    echo ""
fi

# Iniciar dashboard
echo "🖥️  Dashboard disponible en: http://localhost:5000"
echo "📡 Moonraker configurado en: http://10.10.10.71:7126"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo "=========================================="
echo ""

python3 monitor_dashboard.py
