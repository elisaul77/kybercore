#!/bin/bash
# Script de arranque que envía logs tanto a consola como a archivo

# Crear carpeta de logs si no existe
mkdir -p /app/logs

# Ejecutar Uvicorn y enviar logs a consola Y archivo simultáneamente
uvicorn src.api.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --backlog 32 \
  --timeout-keep-alive 5 \
  --timeout-graceful-shutdown 10 \
  --log-level info 2>&1 | tee -a /app/logs/kybercore.log
