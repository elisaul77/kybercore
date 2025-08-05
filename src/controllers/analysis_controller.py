from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

@router.get("/analysis", response_class=HTMLResponse)
def analysis_view(request: Request):
    """Renderiza el módulo de análisis inteligente de fallos."""
    return templates.TemplateResponse("modules/analysis.html", {"request": request})
