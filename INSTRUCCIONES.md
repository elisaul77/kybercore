# Instrucciones para ejecutar la API de KyberCore en local

1. Instala las dependencias:
   ```cmd
   pip install -r requirements.txt
   ```
2. Ejecuta el servidor FastAPI con Uvicorn:
   ```cmd
   uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
   ```
3. Accede a la verificación de salud:
   - Navega a: http://localhost:8000/health

4. Documentación interactiva:
   - Swagger UI: http://localhost:8000/docs
   - Redoc: http://localhost:8000/redoc

Si usas Docker, asegúrate de que el Dockerfile y docker-compose.yml expongan el puerto 8000.
