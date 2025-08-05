from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

@router.get("/new-job", response_class=HTMLResponse)
def new_job_view(request: Request):
    """Renderiza el módulo de creación de trabajos."""
    return templates.TemplateResponse("modules/new-job.html", {"request": request})
