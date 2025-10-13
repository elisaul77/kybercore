"""
Controlador para el módulo de visualización de pedidos
Parte del sistema KyberCore - Orquestador inteligente de impresoras 3D
"""

from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

@router.get("/orders-view", response_class=HTMLResponse)
async def get_orders_module_html(request: Request):
    """Retorna el HTML del módulo de pedidos para la SPA"""
    return templates.TemplateResponse("modules/orders.html", {"request": request})
