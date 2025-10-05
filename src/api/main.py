from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response
from fastapi.templating import Jinja2Templates
import aiohttp
from contextlib import asynccontextmanager
import os
from pathlib import Path
from dotenv import load_dotenv
from src.controllers import fleet_controller, recommender_controller, analysis_controller, dashboard_controller, new_job_controller, settings_controller, websocket_controller, consumable_controller, gallery_controller, print_flow_controller

# Cargar variables de entorno desde .env
env_path = Path(__file__).parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Variables de entorno cargadas desde: {env_path}")
else:
    print(f"⚠️  Archivo .env no encontrado en: {env_path}")
    print("⚠️  Usando valores por defecto de las variables de entorno")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Iniciando KyberCore...")
    yield
    # Shutdown
    print("🛑 Cerrando KyberCore...")
    try:
        # Importar servicios para limpieza
        from src.services.websocket_service import websocket_manager
        from src.services.realtime_monitor import realtime_monitor
        from src.services.fleet_service import fleet_service
        
        # Detener monitoreo primero
        await realtime_monitor.cleanup()
        
        # Cerrar WebSocket manager
        await websocket_manager.shutdown()
        
        # Limpiar fleet service
        await fleet_service.cleanup()
        
        print("✅ KyberCore cerrado limpiamente")
    except Exception as e:
        print(f"❌ Error durante shutdown: {e}")
        print("✅ KyberCore cerrado con errores")

app = FastAPI(
    title="KyberCore API",
    description="La API para el orquestador de impresoras 3D KyberCore.",
    version="0.1.0",
    lifespan=lifespan
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
app.include_router(websocket_controller.router, prefix="/api", tags=["WebSocket"])
app.include_router(recommender_controller.router, prefix="/api/recommender", tags=["Recommender"])
app.include_router(analysis_controller.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(dashboard_controller.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(new_job_controller.router, prefix="/api/new-job", tags=["NewJob"])
app.include_router(settings_controller.router, prefix="/api/settings", tags=["Settings"])
app.include_router(consumable_controller.router, prefix="/api/consumables", tags=["Consumables"])
app.include_router(gallery_controller.router, prefix="/api/gallery", tags=["Gallery"])
app.include_router(print_flow_controller.router, prefix="/api", tags=["PrintFlow"])

# Servir la SPA: una sola plantilla con todas las secciones
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Página de consumibles
@app.get("/consumables", response_class=HTMLResponse)
async def get_consumables_page(request: Request):
    return templates.TemplateResponse("modules/consumables.html", {"request": request})

# Endpoint de health check para monitoreo y testing
@app.get("/health")
async def health_check():
    """Endpoint de health check para verificar el estado de la aplicación"""
    return {
        "status": "healthy",
        "service": "KyberCore",
        "version": "0.1.0",
        "message": "API funcionando correctamente"
    }

# Proxy endpoint para APISLICER
@app.api_route("/api/slicer/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_to_slicer(request: Request, path: str):
    """Proxy para redirigir llamadas a APISLICER"""

    apislicer_url = f"http://apislicer:8000/{path}"

    # Preparar headers
    headers = dict(request.headers)
    # Remover headers que no deben ser forwarded
    headers.pop('host', None)

    try:
        async with aiohttp.ClientSession() as session:
            # Forward the request
            async with session.request(
                method=request.method,
                url=apislicer_url,
                headers=headers,
                data=await request.body(),
                params=request.query_params
            ) as response:
                # Get response content
                content = await response.read()
                return Response(
                    content=content,
                    status_code=response.status,
                    headers=dict(response.headers)
                )
    except Exception as e:
        return {"error": f"Error connecting to APISLICER: {str(e)}"}