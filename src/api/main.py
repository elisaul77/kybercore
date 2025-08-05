from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from src.controllers import fleet_controller, recommender_controller, analysis_controller, dashboard_controller, new_job_controller, settings_controller

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

# Montar el directorio de archivos estáticos
app.mount("/static", StaticFiles(directory="src/web/static"), name="static")

# Configurar Jinja2Templates
templates = Jinja2Templates(directory="src/web/templates")

# Incluir los routers de los controladores
app.include_router(fleet_controller.router, prefix="/api/fleet", tags=["Fleet"])
app.include_router(recommender_controller.router, prefix="/api/recommender", tags=["Recommender"])
app.include_router(analysis_controller.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(dashboard_controller.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(new_job_controller.router, prefix="/api/new-job", tags=["NewJob"])
app.include_router(settings_controller.router, prefix="/api/settings", tags=["Settings"])

# Servir la SPA: una sola plantilla con todas las secciones
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})