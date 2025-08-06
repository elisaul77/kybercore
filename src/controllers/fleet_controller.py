from fastapi import APIRouter, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from src.services.fleet_service import FleetService
from src.models.printer import Printer
from src.schemas.printer import PrinterCreate
from pydantic import BaseModel

from src.services.fleet_service import fleet_service

# Schema para comandos de impresora
class PrinterCommand(BaseModel):
    command: str  # 'home', 'pause', 'resume', 'cancel'
    axis: str = None  # Para comando home: 'X', 'Y', 'Z'
    parameters: dict = None  # Parámetros adicionales
router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

# Endpoint para datos globales de la flota (estructura SPA)
@router.get("/data")
async def get_fleet_data():
    # Obtener impresoras reales
    printers = await fleet_service.list_printers()
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
async def list_printers():
    printers = await fleet_service.list_printers()
    result = []
    for p in printers:
        d = p.model_dump()
        if 'realtime_data' not in d or d['realtime_data'] is None:
            d['realtime_data'] = {}
        result.append(d)
    return result

@router.get("/printers/{printer_id}", response_model=Printer)
async def get_printer(printer_id: str):
    printer = await fleet_service.get_printer(printer_id)
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

# Endpoint para enviar comandos a impresoras
@router.post("/printers/{printer_id}/command")
async def send_printer_command(printer_id: str, command: PrinterCommand):
    """Envía un comando a una impresora específica."""
    try:
        # Verificar que la impresora existe
        printer = await fleet_service.get_printer(printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Impresora no encontrada")
        
        # Ejecutar comando según el tipo
        result = None
        if command.command == "home":
            if not command.axis or command.axis not in ["X", "Y", "Z"]:
                raise HTTPException(status_code=400, detail="Eje no válido para comando home")
            result = await fleet_service.home_printer(printer_id, command.axis)
        elif command.command == "pause":
            result = await fleet_service.pause_printer(printer_id)
        elif command.command == "resume":
            result = await fleet_service.resume_printer(printer_id)
        elif command.command == "cancel":
            result = await fleet_service.cancel_printer(printer_id)
        else:
            raise HTTPException(status_code=400, detail=f"Comando no válido: {command.command}")
        
        return {
            "success": True,
            "message": f"Comando {command.command} ejecutado exitosamente",
            "printer_id": printer_id,
            "command": command.command,
            "result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando comando: {str(e)}")

# Endpoint para renderizar el módulo de gestión de flota como HTML
@router.get("/fleet", response_class=HTMLResponse)
def fleet_view(request: Request):
    """Renderiza el módulo de gestión de flota."""
    return templates.TemplateResponse("modules/fleet.html", {"request": request})