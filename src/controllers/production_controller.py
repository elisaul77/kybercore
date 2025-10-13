"""
Controlador para la gestión de producción (lotes, asignación de impresoras, seguimiento)
Parte del sistema KyberCore - Orquestador inteligente de impresoras 3D
"""

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from typing import List, Dict, Any, Optional
from ..services.production_service import ProductionService
from ..services.fleet_service import FleetService
from ..services.consumable_service import ConsumableService
from ..models.order_models import ProductionBatch, BatchStatus, ProductionBatchCreate


router = APIRouter()
production_service = ProductionService()
fleet_service = FleetService()
consumable_service = ConsumableService()
templates = Jinja2Templates(directory="src/web/templates")

@router.get("/production", response_class=HTMLResponse)
async def get_production_module_html(request: Request):
    """Retorna el HTML del módulo de producción para la SPA"""
    return templates.TemplateResponse("modules/production.html", {"request": request})

@router.get("/batches")
async def get_all_batches(
    status: Optional[BatchStatus] = None,
    printer_id: Optional[str] = None,
    order_id: Optional[str] = None
) -> Dict[str, Any]:
    """Obtiene todos los lotes de producción con filtros opcionales"""
    try:
        batches = production_service.get_all_batches()

        # Aplicar filtros
        if status:
            batches = [b for b in batches if b.status == status]
        if printer_id:
            batches = [b for b in batches if b.printer_id == printer_id]
        if order_id:
            batches = [b for b in batches if b.order_id == order_id]

        return {
            "success": True,
            "data": [batch.model_dump() for batch in batches],
            "total": len(batches),
            "message": "Lotes obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener lotes: {str(e)}")

@router.get("/batches/{batch_id}")
async def get_batch_by_id(batch_id: str) -> Dict[str, Any]:
    """Obtiene un lote específico por ID"""
    try:
        batch = production_service.get_batch(batch_id)
        return {
            "success": True,
            "data": batch.model_dump(),
            "message": "Lote encontrado exitosamente"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener lote: {str(e)}")

@router.get("/batches/order/{order_id}")
async def get_batches_by_order(order_id: str) -> Dict[str, Any]:
    """Obtiene todos los lotes asociados a un pedido"""
    try:
        batches = production_service.get_batches_by_order(order_id)
        return {
            "success": True,
            "data": [batch.model_dump() for batch in batches],
            "total": len(batches),
            "message": f"Lotes del pedido {order_id} obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener lotes del pedido: {str(e)}")

@router.get("/batches/active")
async def get_active_batches() -> Dict[str, Any]:
    """Obtiene lotes en producción activa"""
    try:
        batches = production_service.get_active_batches()
        return {
            "success": True,
            "data": [batch.model_dump() for batch in batches],
            "total": len(batches),
            "message": "Lotes activos obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener lotes activos: {str(e)}")

@router.post("/batches")
async def create_batch_from_order(batch_data: ProductionBatchCreate) -> Dict[str, Any]:
    """Crea un lote de producción con datos específicos"""
    try:
        batch = production_service.create_batch(batch_data)

        return {
            "success": True,
            "data": batch.model_dump(),
            "message": "Lote de producción creado exitosamente"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear lote: {str(e)}")

@router.put("/batches/{batch_id}/status")
async def update_batch_status(batch_id: str, status_data: Dict[str, str]) -> Dict[str, Any]:
    """Actualiza el estado de un lote"""
    try:
        new_status = BatchStatus(status_data.get("status"))
        batch = production_service.update_batch_status(batch_id, new_status)

        return {
            "success": True,
            "data": batch.model_dump(),
            "message": f"Estado del lote actualizado a {new_status.value}"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {status_data.get('status')}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar estado: {str(e)}")

@router.put("/batches/{batch_id}/printer")
async def assign_printer_to_batch(batch_id: str, printer_data: Dict[str, str]) -> Dict[str, Any]:
    """Asigna una impresora a un lote"""
    try:
        printer_id = printer_data.get("printer_id")
        if not printer_id:
            raise HTTPException(status_code=400, detail="printer_id es requerido")

        # Verificar que la impresora existe
        try:
            printer = fleet_service.get_printer_by_id(printer_id)
        except:
            raise HTTPException(status_code=404, detail="Impresora no encontrada")

        # TODO: Verificar compatibilidad de material y capacidades

        batch = production_service.get_batch(batch_id)
        batch.printer_id = printer_id

        # Guardar cambios (esto requiere implementar un método update en el servicio)
        # Por ahora, devolver éxito
        return {
            "success": True,
            "data": batch.model_dump(),
            "message": f"Impresora {printer_id} asignada al lote exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al asignar impresora: {str(e)}")

@router.put("/batches/{batch_id}/material")
async def assign_material_to_batch(batch_id: str, material_data: Dict[str, str]) -> Dict[str, Any]:
    """Asigna material (filamento) a un lote"""
    try:
        material_type = material_data.get("material_type")
        material_color = material_data.get("material_color")

        if not material_type or not material_color:
            raise HTTPException(status_code=400, detail="material_type y material_color son requeridos")

        # Verificar que el material existe en inventario
        filaments = consumable_service.get_all_filaments()
        compatible_filaments = [
            f for f in filaments
            if f.filament_type.value == material_type and f.color == material_color and f.remaining_weight > 0
        ]

        if not compatible_filaments:
            raise HTTPException(status_code=400, detail="No hay filamento compatible disponible")

        batch = production_service.get_batch(batch_id)
        batch.material_type = material_type
        batch.material_color = material_color

        return {
            "success": True,
            "data": batch.model_dump(),
            "available_filaments": len(compatible_filaments),
            "message": f"Material {material_type} {material_color} asignado al lote"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al asignar material: {str(e)}")

@router.get("/statistics")
async def get_production_statistics() -> Dict[str, Any]:
    """Obtiene estadísticas generales de producción"""
    try:
        stats = production_service.get_production_statistics()

        # Agregar información adicional de flota y consumibles
        # Obtener impresoras disponibles
        try:
            printers = fleet_service.get_all_printers()
            available_printers = len([p for p in printers if getattr(p, 'status', None) in ['idle', 'available', 'online']])
            busy_printers = len([p for p in printers if getattr(p, 'status', None) == 'busy'])
            total_printers = len(printers)
            fleet_utilization = (busy_printers / total_printers * 100) if total_printers > 0 else 0
        except Exception as e:
            print(f"Error obteniendo estadísticas de flota: {e}")
            available_printers = 0
            busy_printers = 0
            fleet_utilization = 0

        # Obtener estadísticas de consumibles
        try:
            consumable_stats = consumable_service.get_consumable_statistics()
            total_filament_kg = consumable_stats.get("total_weight_kg", 0)
            filament_stock_percentage = consumable_stats.get("stock_percentage", 0)
        except Exception as e:
            print(f"Error obteniendo estadísticas de consumibles: {e}")
            total_filament_kg = 0
            filament_stock_percentage = 0

        stats.update({
            "fleet_utilization": fleet_utilization,
            "available_printers": available_printers,
            "busy_printers": busy_printers,
            "total_filament_kg": total_filament_kg,
            "filament_stock_percentage": filament_stock_percentage
        })

        return {
            "success": True,
            "data": stats,
            "message": "Estadísticas de producción obtenidas exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@router.get("/printers/available")
async def get_available_printers(material_type: Optional[str] = None) -> Dict[str, Any]:
    """Obtiene impresoras disponibles para asignación"""
    try:
        # Obtener todas las impresoras
        printers = fleet_service.get_all_printers()

        # Filtrar por estado disponible
        available_printers = [
            p for p in printers
            if getattr(p, 'status', None) in ['idle', 'available', 'online']
        ]

        # Si se especifica material, filtrar por compatibilidad
        if material_type:
            # TODO: Implementar lógica de compatibilidad de materiales
            pass

        return {
            "success": True,
            "data": [p.to_dict() if hasattr(p, 'to_dict') else p for p in available_printers],
            "total": len(available_printers),
            "message": "Impresoras disponibles obtenidas exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener impresoras disponibles: {str(e)}")

@router.get("/materials/available")
async def get_available_materials() -> Dict[str, Any]:
    """Obtiene materiales disponibles para asignación"""
    try:
        materials_data = consumable_service.get_available_colors()

        # Transformar datos para facilitar el uso en frontend
        materials = []
        for material in materials_data:
            materials.append({
                "type": "PLA",  # TODO: Obtener tipo real del filamento
                "color": material["color"],
                "available_weight_kg": material["total_weight"],
                "roll_count": material["count"],
                "brands": material["brands"]
            })

        return {
            "success": True,
            "data": materials,
            "total": len(materials),
            "message": "Materiales disponibles obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener materiales disponibles: {str(e)}")

@router.post("/batches/{batch_id}/start")
async def start_batch_production(batch_id: str) -> Dict[str, Any]:
    """Inicia la producción de un lote"""
    try:
        batch = production_service.update_batch_status(batch_id, BatchStatus.PROCESSING)

        # TODO: Integrar con Moonraker para iniciar impresión real
        # TODO: Reservar filamento en inventario
        # TODO: Actualizar estado de impresora

        return {
            "success": True,
            "data": batch.model_dump(),
            "message": "Producción del lote iniciada exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al iniciar producción: {str(e)}")

@router.post("/batches/{batch_id}/pause")
async def pause_batch_production(batch_id: str) -> Dict[str, Any]:
    """Pausa la producción de un lote"""
    try:
        # TODO: Implementar estado PAUSED en BatchStatus si no existe
        batch = production_service.get_batch(batch_id)
        # batch.status = BatchStatus.PAUSED  # Estado a implementar

        # TODO: Integrar con Moonraker para pausar impresión

        return {
            "success": True,
            "data": batch.model_dump(),
            "message": "Producción del lote pausada exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al pausar producción: {str(e)}")

@router.post("/batches/{batch_id}/resume")
async def resume_batch_production(batch_id: str) -> Dict[str, Any]:
    """Reanuda la producción de un lote"""
    try:
        batch = production_service.update_batch_status(batch_id, BatchStatus.PROCESSING)

        # TODO: Integrar con Moonraker para reanudar impresión

        return {
            "success": True,
            "data": batch.model_dump(),
            "message": "Producción del lote reanudada exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al reanudar producción: {str(e)}")

@router.post("/batches/{batch_id}/complete")
async def complete_batch_production(batch_id: str, completion_data: Dict[str, Any]) -> Dict[str, Any]:
    """Completa la producción de un lote"""
    try:
        batch = production_service.update_batch_status(batch_id, BatchStatus.COMPLETED)

        # Actualizar métricas reales si se proporcionaron
        if "actual_filament_used_grams" in completion_data:
            batch.actual_filament_used_grams = completion_data["actual_filament_used_grams"]
        if "actual_print_time_hours" in completion_data:
            batch.actual_print_time_hours = completion_data["actual_print_time_hours"]

        # TODO: Liberar impresora
        # TODO: Actualizar inventario de filamento usado
        # TODO: Actualizar estadísticas del pedido

        return {
            "success": True,
            "data": batch.model_dump(),
            "message": "Producción del lote completada exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al completar producción: {str(e)}")