# Dockerfile para KyberCore
FROM python:3.11-slim

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar dependencias
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto (ajusta según tu API, por ejemplo 8000 para FastAPI)
EXPOSE 8000

# Comando de inicio (ajusta según tu entrypoint)
CMD ["python", "main.py"]
