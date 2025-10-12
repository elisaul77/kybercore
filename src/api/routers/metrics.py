"""Router de métricas y análisis.

Endpoints para obtención de métricas, KPIs y análisis del sistema.
"""

from fastapi import APIRouter, HTTPException, Query

from src.services import MetricsService

router = APIRouter(prefix="/api/metrics", tags=["metrics"])
service = MetricsService()


@router.get("/dashboard")
async def get_dashboard_metrics():
    """Obtiene métricas principales para el dashboard."""
    try:
        return service.get_dashboard_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
async def get_order_metrics(
    period_days: int = Query(30, description="Periodo en días para el análisis"),
):
    """Obtiene métricas detalladas de pedidos."""
    try:
        return service.get_order_metrics(period_days=period_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/production")
async def get_production_metrics(
    period_days: int = Query(30, description="Periodo en días para el análisis"),
):
    """Obtiene métricas detalladas de producción."""
    try:
        return service.get_production_metrics(period_days=period_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customers")
async def get_customer_metrics():
    """Obtiene métricas de clientes."""
    try:
        return service.get_customer_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kpis")
async def get_performance_indicators():
    """Obtiene KPIs principales del sistema."""
    try:
        return service.get_performance_indicators()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Endpoints de IA (preparados para futura integración)
@router.get("/predict-demand")
async def predict_demand(
    days_ahead: int = Query(7, description="Días hacia adelante para la predicción"),
):
    """
    Predice la demanda futura de pedidos.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.predict_demand(days_ahead=days_ahead)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bottlenecks")
async def identify_bottlenecks():
    """
    Identifica cuellos de botella en el sistema.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.identify_bottlenecks()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights")
async def generate_insights():
    """
    Genera insights automáticos del sistema.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.generate_insights()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
