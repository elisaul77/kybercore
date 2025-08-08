#!/bin/bash

# Script para ejecutar pruebas con Docker Compose
# Uso: ./run_tests.sh [opciones]

echo "🧪 Iniciando pruebas de KyberCore con Docker Compose..."

# Verificar que Docker Compose esté disponible (probando ambas versiones)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Error: Ni docker-compose ni 'docker compose' están disponibles"
    echo "   Instala Docker Desktop o docker-compose"
    exit 1
fi

echo "✅ Usando: $DOCKER_COMPOSE_CMD"

# Función para limpiar al salir
cleanup() {
    echo "🧹 Limpiando contenedores..."
    $DOCKER_COMPOSE_CMD down
}
trap cleanup EXIT

# Levantar los servicios
echo "🚀 Levantando servicios con Docker Compose..."
$DOCKER_COMPOSE_CMD up -d --build

# Esperar a que el servicio esté listo
echo "⏳ Esperando a que la API esté lista..."
timeout=60
counter=0

while ! curl -f -s http://localhost:8000/ > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ Timeout: La API no respondió en $timeout segundos"
        $DOCKER_COMPOSE_CMD logs kybercore
        cleanup
        exit 1
    fi
    echo "   Esperando... (${counter}s/${timeout}s)"
done

echo "✅ API lista en http://localhost:8000"

# Ejecutar las pruebas dentro del contenedor
echo "🧪 Ejecutando pruebas..."

# Verificar si pytest está disponible
echo "🔍 Verificando pytest..."
if ! $DOCKER_COMPOSE_CMD exec -T kybercore python -c "import pytest" &>/dev/null; then
    echo "📦 Instalando pytest..."
    $DOCKER_COMPOSE_CMD exec -T kybercore pip install pytest pytest-asyncio httpx
fi

# Ejecutar las pruebas
if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
    $DOCKER_COMPOSE_CMD exec -T kybercore python -m pytest tests/ -v
elif [ "$1" = "--coverage" ]; then
    $DOCKER_COMPOSE_CMD exec -T kybercore pip install pytest-cov
    $DOCKER_COMPOSE_CMD exec -T kybercore python -m pytest tests/ --cov=src --cov-report=term-missing
else
    $DOCKER_COMPOSE_CMD exec -T kybercore python -m pytest tests/
fi

# Capturar el código de salida
test_exit_code=$?

if [ $test_exit_code -eq 0 ]; then
    echo "✅ Todas las pruebas pasaron correctamente"
else
    echo "❌ Algunas pruebas fallaron"
fi

# Mostrar logs de la aplicación si hay errores
if [ $test_exit_code -ne 0 ]; then
    echo "📋 Logs de la aplicación:"
    $DOCKER_COMPOSE_CMD logs kybercore --tail=20
fi

exit $test_exit_code
