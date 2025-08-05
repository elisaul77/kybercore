from fastapi import APIRouter
from src.services.fleet_service import FleetService
from src.models.models import AppData

router = APIRouter()
fleet_service = FleetService()

@router.get("/data", response_model=AppData)
def get_app_data():
    return fleet_service.get_app_data()