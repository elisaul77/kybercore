#!/bin/bash
# Script para iniciar la aplicación KyberCore

echo "Iniciando el servidor de KyberCore en http://127.0.0.1:8000"

# Ejecuta la aplicación FastAPI con uvicorn
python3 -m uvicorn src.api.main:app --reload
