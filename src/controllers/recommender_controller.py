from fastapi import APIRouter, HTTPException
from src.services.recommender_service import RecommenderService
from src.services.fleet_service import FleetService

router = APIRouter()
recommender_service = RecommenderService()
fleet_service = FleetService() # Usamos este servicio para obtener los datos de las impresoras y filamentos

@router.get("/get_profile")
def get_ai_profile(printer_id: str, filament_id: str):
    app_data = fleet_service.get_app_data()
    
    printer = next((p for p in app_data.printers if p.id == printer_id), None)
    filament = next((f for f in app_data.filaments if f.id == filament_id), None)

    if not printer or not filament:
        raise HTTPException(status_code=404, detail="Impresora o filamento no encontrado.")

    return recommender_service.get_ai_profile(printer, filament)