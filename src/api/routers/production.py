"""Router de producción.

Endpoints para gestión de lotes de producción y seguimiento.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Body

from src.models.order_models import ProductionBatch, BatchStatus
from src.services import ProductionService

router = APIRouter(prefix="/api/production", tags=["production"])
service = ProductionService()


@router.get("/batches", response_model=List[ProductionBatch])
async def list_batches():
    """Lista todos los lotes de producción."""
    try:
        return service.get_all_batches()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batches/active", response_model=List[ProductionBatch])
async def list_active_batches():
    """Lista los lotes en producción activa."""
    try:
        return service.get_active_batches()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batches/{batch_id}", response_model=ProductionBatch)
async def get_batch(batch_id: str):
    """Obtiene un lote específico por ID."""
    try:
        return service.get_batch(batch_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/{order_id}/batches", response_model=List[ProductionBatch])
async def get_batches_by_order(order_id: str):
    """Obtiene todos los lotes asociados a un pedido."""
    try:
        return service.get_batches_by_order(order_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batches", response_model=ProductionBatch, status_code=201)
async def create_batch_from_order(
    order_id: str = Body(..., embed=True),
    printer_id: Optional[str] = Body(None, embed=True),
):
    """Crea un lote de producción a partir de un pedido."""
    try:
        return service.create_batch_from_order(order_id, printer_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/batches/{batch_id}/status", response_model=ProductionBatch)
async def update_batch_status(
    batch_id: str,
    status: BatchStatus = Body(..., embed=True),
):
    """Actualiza el estado de un lote."""
    try:
        return service.update_batch_status(batch_id, status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/batches/{batch_id}/items/{item_id}/progress", response_model=ProductionBatch)
async def update_item_progress(
    batch_id: str,
    item_id: str,
    progress: float = Body(..., embed=True),
):
    """Actualiza el progreso de un item específico."""
    try:
        return service.update_item_progress(batch_id, item_id, progress)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_production_statistics():
    """Obtiene estadísticas globales de producción."""
    try:
        return service.get_production_statistics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Endpoints de IA (preparados para futura integración)
@router.post("/optimize-scheduling")
async def optimize_batch_scheduling(batch_ids: List[str] = Body(...)):
    """
    Optimiza la programación de lotes en la flota.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.optimize_batch_scheduling(batch_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batches/{batch_id}/predict-completion")
async def predict_batch_completion(batch_id: str):
    """
    Predice el tiempo de finalización de un lote.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.predict_batch_completion(batch_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batches/{batch_id}/anomalies")
async def detect_production_anomalies(batch_id: str):
    """
    Detecta anomalías en el proceso de producción.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.detect_production_anomalies(batch_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
