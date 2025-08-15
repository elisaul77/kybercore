from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

@router.get("/gallery", response_class=HTMLResponse)
async def get_gallery_module(request: Request):
    """Endpoint para servir el módulo de galería de proyectos"""
    return templates.TemplateResponse("modules/gallery.html", {"request": request})
