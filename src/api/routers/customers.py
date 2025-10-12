"""Router de clientes.

Endpoints para gestión de clientes y consultas relacionadas.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from src.models.order_models import Customer
from src.services import CustomerService

router = APIRouter(prefix="/api/customers", tags=["customers"])
service = CustomerService()


class CustomerCreate(BaseModel):
    """Esquema para crear un cliente."""
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    """Esquema para actualizar un cliente."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


@router.get("/", response_model=List[Customer])
async def list_customers(
    name: Optional[str] = Query(None, description="Filtrar por nombre"),
    email: Optional[str] = Query(None, description="Filtrar por email"),
    status: Optional[str] = Query(None, description="Filtrar por estado"),
):
    """Lista todos los clientes con filtros opcionales."""
    try:
        if name or email or status:
            return service.search_customers(name=name, email=email, status=status)
        return service.get_all_customers()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Customer)
async def create_customer(customer_data: CustomerCreate):
    """Crea un nuevo cliente."""
    try:
        return service.create_customer(customer_data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    """Obtiene un cliente específico por ID."""
    try:
        return service.get_customer(customer_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerUpdate):
    """Actualiza un cliente existente."""
    try:
        # Filtrar solo los campos que se enviaron
        update_data = {k: v for k, v in customer_data.model_dump().items() if v is not None}
        return service.update_customer(customer_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str):
    """Elimina un cliente."""
    try:
        service.delete_customer(customer_id)
        return {"message": "Cliente eliminado exitosamente", "customer_id": customer_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{customer_id}/statistics")
async def get_customer_statistics(customer_id: str):
    """Obtiene estadísticas de un cliente."""
    try:
        return service.get_customer_statistics(customer_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{customer_id}/recommendations")
async def get_customer_recommendations(customer_id: str):
    """
    Obtiene recomendaciones personalizadas para un cliente.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.get_customer_recommendations(customer_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{customer_id}/churn-prediction")
async def predict_customer_churn(customer_id: str):
    """
    Predice la probabilidad de pérdida del cliente.
    
    Nota: Esta funcionalidad será potenciada con IA en futuras versiones.
    """
    try:
        return service.predict_customer_churn(customer_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{customer_id}/validate")
async def validate_customer(customer_id: str):
    """Valida si un cliente existe y está activo."""
    try:
        is_valid = service.validate_customer(customer_id)
        return {
            "customer_id": customer_id,
            "valid": is_valid,
            "message": "Cliente válido y activo" if is_valid else "Cliente inválido o inactivo",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
