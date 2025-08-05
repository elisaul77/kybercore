
from fastapi import APIRouter, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from src.services.fleet_service import FleetService
from src.schemas.printer import Printer, PrinterCreate

from src.services.fleet_service import fleet_service
router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

# Endpoint para datos globales de la flota (estructura SPA)
@router.get("/data")
def get_fleet_data():
    # Obtener impresoras reales
    printers = fleet_service.list_printers()
    # Simular filamentos y cola de impresión
    filaments = [
        {"id": "pla1", "name": "PLA Blanco"},
        {"id": "abs1", "name": "ABS Negro"}
    ]
    print_queue = []
    fleet = [
        {
            "name": p.name,
            "status": p.status,
            "job": "-",
            "progress": 0,
            "color": "gray"
        } for p in printers
    ]
    return {
        "printers": [vars(p) for p in printers],
        "filaments": filaments,
        "print_queue": print_queue,
        "fleet": fleet
    }

# REST API: CRUD impresoras
@router.get("/printers", response_model=list[Printer])
def list_printers():
    return fleet_service.list_printers()

@router.get("/printers/{printer_id}", response_model=Printer)
def get_printer(printer_id: str):
    printer = fleet_service.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Impresora no encontrada")
    return printer

@router.post("/printers", response_model=Printer)
def add_printer(printer: PrinterCreate):
    return fleet_service.add_printer(printer)

@router.put("/printers/{printer_id}", response_model=Printer)
def update_printer(printer_id: str, printer: PrinterCreate):
    updated = fleet_service.update_printer(printer_id, printer)
    if not updated:
        raise HTTPException(status_code=404, detail="Impresora no encontrada")
    return updated

@router.delete("/printers/{printer_id}")
def delete_printer(printer_id: str):
    deleted = fleet_service.delete_printer(printer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Impresora no encontrada")
    return {"ok": True}

# Endpoint para renderizar el módulo de gestión de flota como HTML
@router.get("/fleet", response_class=HTMLResponse)
def fleet_view(request: Request):
    """Renderiza el módulo de gestión de flota."""
    return templates.TemplateResponse("modules/fleet.html", {"request": request})