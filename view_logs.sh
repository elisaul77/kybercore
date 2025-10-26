#!/bin/bash
# Script para ver logs de KyberCore de forma conveniente

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${GREEN}KyberCore Log Viewer${NC}"
    echo ""
    echo "Uso: ./view_logs.sh [opción]"
    echo ""
    echo "Opciones:"
    echo "  kybercore, kb    - Ver logs de KyberCore (por defecto)"
    echo "  apislicer, api   - Ver logs de APISLICER"
    echo "  all, both        - Ver logs de ambos servicios"
    echo "  follow, f        - Seguir logs de Docker en tiempo real"
    echo "  live, tail       - Seguir logs locales en tiempo real"
    echo "  file, local      - Ver información de logs locales"
    echo "  errors, err      - Solo errores"
    echo "  temps, temp      - Solo temperaturas"
    echo "  ai               - Solo logs de IA"
    echo "  clean            - Limpiar logs antiguos"
    echo "  help, h          - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./view_logs.sh                    # Ver últimos logs de kybercore"
    echo "  ./view_logs.sh follow             # Seguir logs en tiempo real"
    echo "  ./view_logs.sh apislicer          # Ver logs de APISLICER"
    echo "  ./view_logs.sh errors             # Solo errores"
    echo "  ./view_logs.sh temps              # Ver temperaturas"
    echo "  ./view_logs.sh file               # Ver logs guardados localmente"
}

case "$1" in
    kybercore|kb|"")
        echo -e "${BLUE}📋 Logs de KyberCore (últimas 100 líneas)${NC}"
        docker compose logs --tail=100 kybercore
        ;;
    apislicer|api)
        echo -e "${BLUE}📋 Logs de APISLICER (últimas 100 líneas)${NC}"
        docker compose logs --tail=100 apislicer
        ;;
    all|both)
        echo -e "${BLUE}📋 Logs de todos los servicios (últimas 50 líneas cada uno)${NC}"
        docker compose logs --tail=50
        ;;
    follow|f)
        echo -e "${GREEN}👁️  Siguiendo logs en tiempo real (Ctrl+C para salir)${NC}"
        docker compose logs -f
        ;;
    errors|err)
        echo -e "${RED}❌ Buscando errores en todos los servicios${NC}"
        docker compose logs | grep -i -E "(error|failed|exception|❌)" | tail -50
        ;;
    temps|temp)
        echo -e "${YELLOW}🌡️  Logs de temperaturas${NC}"
        docker compose logs | grep -E "(🌡️|Temperatura|RECIBIDAS|Material:)" | tail -30
        ;;
    ai)
        echo -e "${YELLOW}🤖 Logs de IA${NC}"
        docker compose logs kybercore | grep -E "(🤖|OpenAI|Gemini|IA|ai_profile)" | tail -30
        ;;
    file|files|local)
        echo -e "${BLUE}📂 Logs guardados en ./logs/${NC}"
        if [ -d "./logs" ] && [ "$(ls -A ./logs/*.log 2>/dev/null)" ]; then
            echo -e "${GREEN}Archivos disponibles:${NC}"
            ls -lh ./logs/*.log 2>/dev/null
            echo ""
            echo -e "${YELLOW}Estadísticas:${NC}"
            wc -l ./logs/*.log
            echo ""
            echo -e "${GREEN}Para ver los logs:${NC}"
            echo "  tail -f logs/kybercore.log     # Seguir en tiempo real"
            echo "  tail -50 logs/kybercore.log    # Ver últimas 50 líneas"
            echo "  grep 'PETG' logs/*.log         # Buscar PETG"
            echo "  grep '🌡️' logs/kybercore.log  # Ver temperaturas"
        else
            echo -e "${YELLOW}⚠️  No hay archivos .log en ./logs/${NC}"
            echo "Los logs se generarán cuando uses la aplicación."
        fi
        ;;
    live|tail)
        echo -e "${GREEN}👁️  Siguiendo logs locales en tiempo real (Ctrl+C para salir)${NC}"
        if [ -f "./logs/kybercore.log" ]; then
            tail -f logs/kybercore.log logs/apislicer.log
        else
            echo -e "${RED}❌ No se encontraron archivos de log locales${NC}"
            exit 1
        fi
        ;;
    clean)
        echo -e "${YELLOW}🧹 Limpiando logs antiguos...${NC}"
        read -p "¿Estás seguro? Esto eliminará archivos de log en ./logs/ (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -f ./logs/*.log
            echo -e "${GREEN}✅ Logs limpiados${NC}"
        else
            echo -e "${BLUE}❌ Operación cancelada${NC}"
        fi
        ;;
    help|h|-h|--help)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Opción no reconocida: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
