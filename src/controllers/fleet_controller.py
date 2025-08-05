
from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from src.services.fleet_service import FleetService
from src.models.models import AppData

router = APIRouter()
fleet_service = FleetService()
templates = Jinja2Templates(directory="src/templates")

@router.get("/data", response_model=AppData)
def get_app_data():
    return fleet_service.get_app_data()

# Endpoint para renderizar el módulo de gestión de flota como HTML
@router.get("/fleet", response_class=HTMLResponse)
def fleet_view(request: Request):
    """Renderiza el módulo de gestión de flota."""
    return templates.TemplateResponse("modules/fleet.html", {"request": request})