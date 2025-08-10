"""
Controlador para la gestión de consumibles (filamentos y materiales)
Parte del sistema KyberCore - Orquestador inteligente de impresoras 3D
"""


from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from typing import List, Dict, Any, Optional
from ..services.consumable_service import ConsumableService
from ..models.consumable import Filament, FilamentType, FilamentBrand, StockStatus


router = APIRouter()
consumable_service = ConsumableService()
templates = Jinja2Templates(directory="src/web/templates")

@router.get("/consumables", response_class=HTMLResponse)
async def get_consumables_module_html(request: Request):
    """Retorna el HTML del módulo de consumibles para la SPA"""
    return templates.TemplateResponse("modules/consumables.html", {"request": request})

@router.get("/filaments")
async def get_all_filaments(
    status: Optional[StockStatus] = None,
    filament_type: Optional[FilamentType] = None,
    brand: Optional[FilamentBrand] = None
) -> Dict[str, Any]:
    """Obtiene todos los filamentos con filtros opcionales"""
    try:
        filaments = consumable_service.get_all_filaments(status=status, filament_type=filament_type, brand=brand)
        return {
            "success": True,
            "data": [filament.to_dict() for filament in filaments],
            "total": len(filaments),
            "message": "Filamentos obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener filamentos: {str(e)}")

@router.get("/filaments/{filament_id}")
async def get_filament_by_id(filament_id: str) -> Dict[str, Any]:
    """Obtiene un filamento específico por ID"""
    try:
        filament = consumable_service.get_filament_by_id(filament_id)
        if not filament:
            raise HTTPException(status_code=404, detail="Filamento no encontrado")
        
        return {
            "success": True,
            "data": filament.to_dict(),
            "message": "Filamento encontrado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener filamento: {str(e)}")

@router.post("/filaments")
async def create_filament(filament_data: Dict[str, Any]) -> Dict[str, Any]:
    """Crea un nuevo filamento"""
    try:
        filament = consumable_service.create_filament(filament_data)
        return {
            "success": True,
            "data": filament.to_dict(),
            "message": "Filamento creado exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear filamento: {str(e)}")

@router.put("/filaments/{filament_id}")
async def update_filament(filament_id: str, filament_data: Dict[str, Any]) -> Dict[str, Any]:
    """Actualiza un filamento existente"""
    try:
        filament = consumable_service.update_filament(filament_id, filament_data)
        if not filament:
            raise HTTPException(status_code=404, detail="Filamento no encontrado")
        
        return {
            "success": True,
            "data": filament.to_dict(),
            "message": "Filamento actualizado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar filamento: {str(e)}")

@router.delete("/filaments/{filament_id}")
async def delete_filament(filament_id: str) -> Dict[str, Any]:
    """Elimina un filamento"""
    try:
        success = consumable_service.delete_filament(filament_id)
        if not success:
            raise HTTPException(status_code=404, detail="Filamento no encontrado")
        
        return {
            "success": True,
            "message": "Filamento eliminado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar filamento: {str(e)}")

@router.post("/filaments/{filament_id}/consume")
async def consume_filament(filament_id: str, consumption_data: Dict[str, float]) -> Dict[str, Any]:
    """Consume una cantidad específica de filamento"""
    try:
        amount = consumption_data.get("amount_kg", 0)
        if amount <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor que 0")
        
        success = consumable_service.consume_filament(filament_id, amount)
        if not success:
            raise HTTPException(status_code=400, detail="No hay suficiente filamento disponible")
        
        filament = consumable_service.get_filament_by_id(filament_id)
        return {
            "success": True,
            "data": filament.to_dict(),
            "message": f"Se consumieron {amount}kg de filamento exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consumir filamento: {str(e)}")

@router.post("/filaments/{filament_id}/restock")
async def restock_filament(filament_id: str, restock_data: Dict[str, float]) -> Dict[str, Any]:
    """Añade stock a un filamento"""
    try:
        amount = restock_data.get("amount_kg", 0)
        if amount <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor que 0")
        
        success = consumable_service.restock_filament(filament_id, amount)
        if not success:
            raise HTTPException(status_code=404, detail="Filamento no encontrado")
        
        filament = consumable_service.get_filament_by_id(filament_id)
        return {
            "success": True,
            "data": filament.to_dict(),
            "message": f"Se añadieron {amount}kg de filamento exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al reabastecer filamento: {str(e)}")

@router.get("/stats")
async def get_consumable_stats() -> Dict[str, Any]:
    """Obtiene estadísticas generales de consumibles para KPIs"""
    try:
        stats = consumable_service.get_consumable_statistics()
        return {
            "success": True,
            "data": stats,
            "message": "Estadísticas obtenidas exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@router.get("/low-stock")
async def get_low_stock_items() -> Dict[str, Any]:
    """Obtiene items con stock bajo para alertas"""
    try:
        low_stock_items = consumable_service.get_low_stock_items()
        return {
            "success": True,
            "data": [item.to_dict() for item in low_stock_items],
            "total": len(low_stock_items),
            "message": "Items con stock bajo obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener items con stock bajo: {str(e)}")

@router.get("/colors")
async def get_available_colors() -> Dict[str, Any]:
    """Obtiene colores disponibles en stock"""
    try:
        colors = consumable_service.get_available_colors()
        return {
            "success": True,
            "data": colors,
            "message": "Colores disponibles obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener colores: {str(e)}")

@router.get("/types")
async def get_filament_types() -> Dict[str, Any]:
    """Obtiene tipos de filamento disponibles"""
    try:
        types = consumable_service.get_filament_types()
        return {
            "success": True,
            "data": types,
            "message": "Tipos de filamento obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener tipos: {str(e)}")

@router.get("/brands")
async def get_filament_brands() -> Dict[str, Any]:
    """Obtiene marcas de filamento disponibles"""
    try:
        brands = consumable_service.get_filament_brands()
        return {
            "success": True,
            "data": brands,
            "message": "Marcas de filamento obtenidas exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener marcas: {str(e)}")
