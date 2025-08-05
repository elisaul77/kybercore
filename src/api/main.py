from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.controllers import fleet_controller, recommender_controller

app = FastAPI(
    title="KyberCore API",
    description="La API para el orquestador de impresoras 3D KyberCore.",
    version="0.1.0",
)

# Configuración de CORS
origins = [
    "*",  # Permite todos los orígenes. En producción, deberías restringirlo.
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir los routers de los controladores
app.include_router(fleet_controller.router, prefix="/api/fleet", tags=["Fleet"])
app.include_router(recommender_controller.router, prefix="/api/recommender", tags=["Recommender"])

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de KyberCore"}