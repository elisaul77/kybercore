from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import json
import os

router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

def load_projects_data():
    """Cargar datos de proyectos desde el archivo JSON"""
    json_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "proyectos.json")
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        # Datos por defecto si no existe el archivo
        return {
            "estadisticas": {
                "total_proyectos": 0,
                "total_stls": 0,
                "completados": 0,
                "en_progreso": 0,
                "tasa_exito": 0
            },
            "proyectos": []
        }

@router.get("/gallery", response_class=HTMLResponse)
async def get_gallery_module(request: Request):
    """Endpoint para servir el módulo de galería de proyectos"""
    data = load_projects_data()
    return templates.TemplateResponse("modules/gallery_dynamic.html", {
        "request": request,
        "estadisticas": data["estadisticas"],
        "proyectos": data["proyectos"]
    })
