# Dockerfile para KyberCore (optimizado para evitar procesos zombie)
FROM python:3.13-slim

# Instalar dependencias del sistema mínimas
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements primero para aprovechar cache de Docker
COPY requirements.txt ./

# Instalar dependencias con versiones específicas
RUN pip install --no-cache-dir --upgrade pip==23.3.1 && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Configurar variables de entorno para optimización
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONOPTIMIZE=1

# Crear usuario no-root para seguridad
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Comando optimizado con parámetros válidos de Uvicorn
CMD ["uvicorn", "src.api.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--backlog", "32", \
     "--timeout-keep-alive", "5", \
     "--timeout-graceful-shutdown", "10", \
     "--log-level", "info"]
