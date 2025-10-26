#!/bin/bash
# Script de arranque para APISLICER que envía logs a consola y archivo

# Crear carpeta de logs si no existe
mkdir -p /app/logs

# Iniciar Xvfb en background
Xvfb :99 -screen 0 1024x768x24 &

# Esperar a que Xvfb inicie
sleep 2

# Cambiar al directorio de la aplicación
cd /app/app

# Ejecutar FastAPI y enviar logs a consola Y archivo simultáneamente
python3 -u -m uvicorn main:app --host 0.0.0.0 --port 8000 2>&1 | tee -a /app/logs/apislicer.log
