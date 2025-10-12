"""Router de pedidos.

Endpoints para gestión completa de pedidos.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Body

from src.models.order_models import Order, OrderStatus, OrderPriority
from src.services import OrderService

router = APIRouter(prefix="/api/orders", tags=["orders"])
service = OrderService()


@router.get("/", response_model=List[Order])
async def list_orders(
    customer_id: Optional[str] = Query(None, description="Filtrar por cliente"),
    status: Optional[str] = Query(None, description="Filtrar por estado"),
):
    """Lista todos los pedidos con filtros opcionales."""
    try:
        return service.get_all_orders(customer_id=customer_id, status=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending", response_model=List[Order])
async def list_pending_orders():
    """Lista todos los pedidos pendientes."""
    try:
        return service.get_pending_orders()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overdue", response_model=List[Order])
async def list_overdue_orders(
    days: int = Query(0, description="Días de anticipación (0 = solo vencidos)"),
):
    """Lista pedidos vencidos o próximos a vencer."""
    try:
        return service.get_overdue_orders(days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Obtiene un pedido específico por ID."""
    try:
        return service.get_order(order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Order, status_code=201)
async def create_order(order_data: dict = Body(...)):
    """Crea un nuevo pedido."""
    try:
        return service.create_order(order_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{order_id}", response_model=Order)
async def update_order(order_id: str, updates: dict = Body(...)):
    """Actualiza un pedido existente."""
    try:
        return service.update_order(order_id, updates)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{order_id}/status", response_model=Order)
async def update_order_status(
    order_id: str,
    status: OrderStatus = Body(..., embed=True),
):
    """Actualiza el estado de un pedido."""
    try:
        return service.update_order_status(order_id, status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/cancel", response_model=Order)
async def cancel_order(
    order_id: str,
    reason: Optional[str] = Body(None, embed=True),
):
    """Cancela un pedido."""
    try:
        return service.cancel_order(order_id, reason=reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{order_id}")
async def delete_order(order_id: str):
    """Elimina un pedido."""
    try:
        success = service.delete_order(order_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Pedido {order_id} no encontrado")
        return {"message": "Pedido eliminado exitosamente", "order_id": order_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/lines", response_model=Order)
async def add_order_line(order_id: str, line_data: dict = Body(...)):
    """Añade una línea a un pedido."""
    try:
        return service.add_order_line(order_id, line_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{order_id}/lines/{line_id}", response_model=Order)
async def remove_order_line(order_id: str, line_id: str):
    """Elimina una línea de un pedido."""
    try:
        return service.remove_order_line(order_id, line_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Endpoints de IA (preparados para futura integración)
@router.post("/optimize-scheduling")
async def optimize_order_scheduling(order_ids: List[str] = Body(...)):
    """
    Optimiza la programación de múltiples pedidos.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.optimize_order_scheduling(order_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{order_id}/predict-completion")
async def predict_order_completion(order_id: str):
    """
    Predice el tiempo de finalización de un pedido.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.predict_order_completion(order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/lines", response_model=Order)
async def add_order_lines(
    order_id: str,
    items: List[dict] = Body(..., description="Lista de items a agregar al pedido"),
):
    """
    Agrega order_lines a un pedido existente.
    
    Útil para pedidos de tipo design_and_print donde los items se agregan
    después de que el diseño ha sido aprobado.
    
    Args:
        order_id: ID del pedido al que se agregarán los items
        items: Lista de items con el mismo formato que en POST /orders/
    
    Returns:
        Pedido actualizado con las nuevas líneas agregadas
    """
    try:
        return service.add_order_lines(order_id, items)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{order_id}/suggestions")
async def suggest_order_improvements(order_id: str):
    """
    Sugiere mejoras para un pedido.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.suggest_order_improvements(order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
