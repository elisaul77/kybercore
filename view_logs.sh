#!/bin/bash
# Script de ayuda para ver los logs del contenedor de KyberCore en tiempo real.
# Uso: ./view_logs.sh

echo "Mostrando logs de KyberCore... (Presiona Ctrl+C para salir)"
docker logs -f kybercore
