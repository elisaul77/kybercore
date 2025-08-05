from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

router = APIRouter()
templates = Jinja2Templates(directory="src/templates")

@router.get("/dashboard", response_class=HTMLResponse)
def dashboard_view(request: Request):
    """Renderiza el módulo de dashboard."""
    return templates.TemplateResponse("modules/dashboard.html", {"request": request})
