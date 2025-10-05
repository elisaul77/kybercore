from fastapi import APIRouter, Request, HTTPException, File, UploadFile, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from src.services.fleet_service import FleetService
from src.models.printer import Printer
from src.schemas.printer import PrinterCreate
from pydantic import BaseModel
from typing import List, Optional

from src.services.fleet_service import fleet_service

# Schema para comandos de impresora
class PrinterCommand(BaseModel):
    command: str  # 'home', 'pause', 'resume', 'cancel', 'restart_klipper', 'restart_firmware'
    axis: str = None  # Para comando home: 'X', 'Y', 'Z'
    parameters: dict = None  # Parámetros adicionales

# Schema para comandos masivos
class BulkCommand(BaseModel):
    command: str  # Mismo formato que PrinterCommand
    axis: str = None
    parameters: dict = None
    printer_ids: Optional[List[str]] = None  # Si es None, aplica a todas las impresoras
    filters: Optional[dict] = None  # Filtros para seleccionar impresoras: {'status': ['printing', 'idle'], 'tags': ['production']}
    confirmation_required: bool = True  # Para comandos destructivos
    
# Schema para respuesta de comandos masivos
class BulkCommandResult(BaseModel):
    total_printers: int
    successful: int
    failed: int
    results: List[dict]  # Lista de resultados por impresora
    summary: str
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
            if not command.axis or command.axis not in ["X", "Y", "Z", "XYZ"]:
                raise HTTPException(status_code=400, detail="Eje no válido para comando home. Use X, Y, Z o XYZ")
            result = await fleet_service.home_printer(printer_id, command.axis)
        elif command.command == "pause":
            result = await fleet_service.pause_printer(printer_id)
        elif command.command == "resume":
            result = await fleet_service.resume_printer(printer_id)
        elif command.command == "cancel":
            result = await fleet_service.cancel_printer(printer_id)
        elif command.command == "restart_klipper":
            result = await fleet_service.restart_klipper(printer_id)
        elif command.command == "restart_firmware":
            result = await fleet_service.restart_firmware(printer_id)
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

# 🚀 NUEVO: Endpoint para comandos masivos en la flota
@router.post("/bulk/command", response_model=BulkCommandResult)
async def send_bulk_command(bulk_command: BulkCommand):
    """Envía un comando a múltiples impresoras simultáneamente."""
    try:
        # Obtener lista de impresoras objetivo
        target_printers = await fleet_service.get_target_printers(
            printer_ids=bulk_command.printer_ids,
            filters=bulk_command.filters
        )
        
        if not target_printers:
            raise HTTPException(status_code=400, detail="No se encontraron impresoras que cumplan los criterios")
        
        # Validar comando
        valid_commands = ["home", "pause", "resume", "cancel", "restart_klipper", "restart_firmware"]
        if bulk_command.command not in valid_commands:
            raise HTTPException(status_code=400, detail=f"Comando no válido: {bulk_command.command}")
        
        # Ejecutar comando en paralelo en todas las impresoras
        results = await fleet_service.execute_bulk_command(
            printers=target_printers,
            command=bulk_command.command,
            axis=bulk_command.axis,
            parameters=bulk_command.parameters or {}
        )
        
        # Analizar resultados
        successful = sum(1 for r in results if r["success"])
        failed = len(results) - successful
        
        summary = f"Comando {bulk_command.command} ejecutado en {len(target_printers)} impresoras: {successful} exitosos, {failed} fallidos"
        
        return BulkCommandResult(
            total_printers=len(target_printers),
            successful=successful,
            failed=failed,
            results=results,
            summary=summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando comando masivo: {str(e)}")

# 🚀 NUEVO: Endpoint para obtener información de selección masiva
@router.get("/bulk/selection-info")
async def get_bulk_selection_info():
    """Obtiene información para ayudar en la selección masiva de impresoras."""
    try:
        printers = await fleet_service.list_printers()
        
        # Agrupar por estado
        status_groups = {}
        for printer in printers:
            status = printer.status
            if status not in status_groups:
                status_groups[status] = []
            status_groups[status].append({
                "id": printer.id,
                "name": printer.name,
                "ip": printer.ip_address
            })
        
        # Obtener tags únicos (si existen)
        all_tags = set()
        for printer in printers:
            if hasattr(printer, 'tags') and printer.tags:
                all_tags.update(printer.tags)
        
        return {
            "total_printers": len(printers),
            "status_groups": status_groups,
            "available_tags": list(all_tags),
            "suggested_filters": {
                "all_printers": {"description": "Todas las impresoras", "count": len(printers)},
                "idle_only": {"description": "Solo impresoras inactivas", "count": len(status_groups.get("idle", []))},
                "printing_only": {"description": "Solo impresoras imprimiendo", "count": len(status_groups.get("printing", []))},
                "error_only": {"description": "Solo impresoras con error", "count": len(status_groups.get("error", []))}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo información de selección: {str(e)}")

# 🚀 NUEVO: Endpoint para validar comando masivo antes de ejecutar
@router.post("/bulk/validate")
async def validate_bulk_command(bulk_command: BulkCommand):
    """Valida un comando masivo sin ejecutarlo, útil para confirmación."""
    try:
        # Obtener impresoras objetivo
        target_printers = await fleet_service.get_target_printers(
            printer_ids=bulk_command.printer_ids,
            filters=bulk_command.filters
        )
        
        # Análisis de impacto
        impact_analysis = {
            "total_affected": len(target_printers),
            "printers_by_status": {},
            "warnings": [],
            "safe_to_execute": True
        }
        
        # Agrupar por estado
        for printer in target_printers:
            status = printer.status
            if status not in impact_analysis["printers_by_status"]:
                impact_analysis["printers_by_status"][status] = 0
            impact_analysis["printers_by_status"][status] += 1
        
        # Generar warnings para comandos potencialmente destructivos
        if bulk_command.command in ["cancel", "restart_klipper", "restart_firmware"]:
            printing_count = impact_analysis["printers_by_status"].get("printing", 0)
            if printing_count > 0:
                impact_analysis["warnings"].append(
                    f"⚠️ El comando {bulk_command.command} interrumpirá {printing_count} impresión(es) activa(s)"
                )
                impact_analysis["safe_to_execute"] = False
        
        if bulk_command.command == "restart_firmware" and len(target_printers) > 5:
            impact_analysis["warnings"].append(
                "⚠️ Reiniciar firmware en más de 5 impresoras puede causar carga en la red"
            )
        
        return {
            "valid": True,
            "command": bulk_command.command,
            "impact_analysis": impact_analysis,
            "target_printers": [{"id": p.id, "name": p.name, "status": p.status} for p in target_printers],
            "estimated_duration": f"{len(target_printers) * 2} segundos"  # Estimación básica
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validando comando: {str(e)}")

# === ENDPOINTS PARA GESTIÓN DE ARCHIVOS G-CODE ===

@router.get("/printers/{printer_id}/files")
async def list_printer_gcode_files(printer_id: str):
    """Lista archivos G-code disponibles en una impresora específica."""
    try:
        files = await fleet_service.list_printer_gcode_files(printer_id)
        return {
            "printer_id": printer_id,
            "files": files,
            "total_files": len(files)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listando archivos: {str(e)}")

@router.get("/printers/{printer_id}/files/{filename}/metadata")
async def get_gcode_metadata(printer_id: str, filename: str):
    """Obtiene metadatos de un archivo G-code específico."""
    try:
        metadata = await fleet_service.get_printer_gcode_metadata(printer_id, filename)
        if not metadata:
            raise HTTPException(status_code=404, detail="Metadatos no encontrados")
        return {
            "printer_id": printer_id,
            "filename": filename,
            "metadata": metadata
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo metadatos: {str(e)}")

@router.post("/printers/{printer_id}/files/upload")
async def upload_gcode_file(
    printer_id: str, 
    file: UploadFile = File(...),
    start_print: bool = Form(False)
):
    """Sube un archivo G-code a una impresora específica."""
    try:
        # Validar que sea un archivo G-code
        if not file.filename.lower().endswith(('.gcode', '.g', '.gco')):
            raise HTTPException(status_code=400, detail="El archivo debe ser un G-code (.gcode, .g, .gco)")
        
        # Leer el contenido del archivo
        file_content = await file.read()
        
        result = await fleet_service.upload_gcode_to_printer(printer_id, file_content, file.filename, start_print)
        if not result:
            raise HTTPException(status_code=500, detail="Error subiendo archivo")
        
        return {
            "success": True,
            "printer_id": printer_id,
            "filename": file.filename,
            "size": len(file_content),
            "start_print": start_print,
            "result": result
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {str(e)}")

@router.post("/printers/{printer_id}/files/{filename}/print")
async def start_print_job(printer_id: str, filename: str):
    """Inicia la impresión de un archivo G-code específico."""
    try:
        result = await fleet_service.start_printer_print(printer_id, filename)
        return {
            "success": result.get("success", False),
            "printer_id": printer_id,
            "filename": filename,
            "message": result.get("message", ""),
            "error": result.get("error")
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error iniciando impresión: {str(e)}")

@router.delete("/printers/{printer_id}/files/{filename}")
async def delete_gcode_file(printer_id: str, filename: str):
    """Elimina un archivo G-code de una impresora específica."""
    try:
        result = await fleet_service.delete_printer_gcode_file(printer_id, filename)
        if not result:
            raise HTTPException(status_code=500, detail="Error eliminando archivo")
        
        return {
            "success": True,
            "printer_id": printer_id,
            "filename": filename,
            "result": result
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando archivo: {str(e)}")

@router.get("/printers/{printer_id}/files/{filename}/thumbnails")
async def get_gcode_thumbnails(printer_id: str, filename: str):
    """Obtiene thumbnails de un archivo G-code específico."""
    try:
        result = await fleet_service.get_printer_gcode_thumbnails(printer_id, filename)
        thumbnails = result.get("thumbnails", [])
        return {
            "printer_id": printer_id,
            "filename": filename,
            "thumbnails": thumbnails,
            "total_thumbnails": len(thumbnails)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo thumbnails: {str(e)}")

@router.get("/printers/{printer_id}/files/{filename}")
async def download_gcode_file(printer_id: str, filename: str):
    """Descarga un archivo G-code de una impresora específica."""
    try:
        from fastapi.responses import Response
        
        file_content = await fleet_service.download_printer_gcode_file(printer_id, filename)
        
        return Response(
            content=file_content,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/octet-stream"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error descargando archivo: {str(e)}")

# 🆕 FASE 1: Endpoint para validar estado detallado de impresora
@router.get("/{printer_id}/status")
async def get_printer_detailed_status(printer_id: str):
    """
    Obtiene el estado detallado de una impresora consultando Moonraker.
    Este endpoint es usado por el Paso 7 para validar si la impresora está lista para imprimir.
    
    Accesible en:
    - /api/printers/{printer_id}/status
    - /api/fleet/printers/{printer_id}/status
    """
    try:
        status = await fleet_service.get_detailed_printer_status(printer_id)
        return status
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo estado de impresora: {str(e)}")

# 🆕 FASE 2: Endpoint para recuperación automática de impresora
@router.post("/{printer_id}/recover")
async def recover_printer(printer_id: str, recovery_method: str = "full"):
    """
    Intenta recuperar una impresora que está en estado de error.
    
    Args:
        printer_id: ID de la impresora
        recovery_method: Método de recuperación ("restart_firmware", "home_all", "full")
    
    Accesible en:
    - /api/printers/{printer_id}/recover
    - /api/fleet/printers/{printer_id}/recover
    """
    try:
        if recovery_method not in ["restart_firmware", "home_all", "full"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Método de recuperación inválido: {recovery_method}. Use 'restart_firmware', 'home_all' o 'full'"
            )
        
        result = await fleet_service.recover_printer(printer_id, recovery_method)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recuperando impresora: {str(e)}")

# Endpoint para renderizar el módulo de gestión de flota como HTML
@router.get("/fleet", response_class=HTMLResponse)
def fleet_view(request: Request):
    """Renderiza el módulo de gestión de flota."""
    return templates.TemplateResponse("modules/fleet.html", {"request": request})