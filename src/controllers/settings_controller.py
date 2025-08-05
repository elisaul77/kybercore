from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

@router.get("/settings", response_class=HTMLResponse)
def settings_view(request: Request):
    """Renderiza el módulo de configuración."""
    return templates.TemplateResponse("modules/settings.html", {"request": request})
