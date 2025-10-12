"""Servicio de gestión de clientes.

Proporciona lógica de negocio para clientes, incluyendo validación,
búsqueda y estadísticas.
"""

from __future__ import annotations

from typing import Dict, List, Optional
from datetime import datetime

from ..database import CustomersRepository, JSONRepositoryError
from ..models.order_models import Customer


class CustomerService:
    """Servicio para operaciones de clientes."""

    def __init__(self) -> None:
        self._repo = CustomersRepository()

    def get_all_customers(self) -> List[Customer]:
        """Obtiene todos los clientes del sistema."""
        customers_data = self._repo.list_customers()
        
        # Convertir strings de fechas a objetos datetime si es necesario
        for customer in customers_data:
            if isinstance(customer.get('created_at'), str):
                customer['created_at'] = datetime.fromisoformat(customer['created_at'].replace('Z', '+00:00'))
            if customer.get('last_order_at') and isinstance(customer.get('last_order_at'), str):
                customer['last_order_at'] = datetime.fromisoformat(customer['last_order_at'].replace('Z', '+00:00'))
        
        return [Customer(**data) for data in customers_data]

    def get_customer(self, customer_id: str) -> Customer:
        """Obtiene un cliente por ID."""
        try:
            customer_data = self._repo.get_customer_by_id(customer_id)
            
            # Convertir strings de fechas a objetos datetime si es necesario
            if isinstance(customer_data.get('created_at'), str):
                customer_data['created_at'] = datetime.fromisoformat(customer_data['created_at'].replace('Z', '+00:00'))
            if customer_data.get('last_order_at') and isinstance(customer_data.get('last_order_at'), str):
                customer_data['last_order_at'] = datetime.fromisoformat(customer_data['last_order_at'].replace('Z', '+00:00'))
            
            return Customer(**customer_data)
        except JSONRepositoryError as exc:
            raise ValueError(f"Cliente no encontrado: {customer_id}") from exc

    def search_customers(
        self,
        name: Optional[str] = None,
        email: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Customer]:
        """Busca clientes con filtros opcionales."""
        customers = self.get_all_customers()
        
        if name:
            name_lower = name.lower()
            customers = [
                c for c in customers
                if name_lower in c.name.lower()
            ]
        
        if email:
            email_lower = email.lower()
            customers = [
                c for c in customers
                if c.email and email_lower in c.email.lower()
            ]
        
        # Note: El modelo Customer no tiene campo 'status' nativo
        # Si se necesita, se debe añadir al modelo
        
        return customers

    def get_customer_statistics(self, customer_id: str) -> Dict:
        """Obtiene estadísticas de un cliente específico."""
        customer = self.get_customer(customer_id)
        
        # Calcular estadísticas básicas usando campos disponibles
        stats = {
            "customer_id": customer.id,
            "name": customer.name,
            "total_orders": customer.total_orders,
            "last_order_at": customer.last_order_at.isoformat() if customer.last_order_at else None,
            "member_since": customer.created_at.isoformat() if customer.created_at else None,
        }
        
        return stats

    def validate_customer(self, customer_id: str) -> bool:
        """Valida si un cliente existe."""
        try:
            customer = self.get_customer(customer_id)
            return customer.id is not None
        except (ValueError, JSONRepositoryError):
            return False

    def create_customer(self, customer_data: Dict) -> Customer:
        """
        Crea un nuevo cliente.
        
        Args:
            customer_data: Diccionario con los datos del cliente
            
        Returns:
            El cliente creado
            
        Raises:
            ValueError: Si los datos son inválidos
        """
        import uuid
        from datetime import datetime
        
        # Validar campos requeridos
        if not customer_data.get('name'):
            raise ValueError("El nombre del cliente es requerido")
        if not customer_data.get('email'):
            raise ValueError("El email del cliente es requerido")
        
        # Verificar email único
        existing_customers = self.get_all_customers()
        if any(c.email == customer_data['email'] for c in existing_customers):
            raise ValueError(f"Ya existe un cliente con el email: {customer_data['email']}")
        
        # Preparar datos completos
        now = datetime.utcnow()
        full_data = {
            'id': str(uuid.uuid4()),
            'name': customer_data['name'],
            'email': customer_data['email'],
            'phone': customer_data.get('phone'),
            'company': customer_data.get('company'),
            'address': customer_data.get('address'),
            'notes': customer_data.get('notes'),
            'total_orders': 0,
            'last_order_at': None,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        # Guardar en repositorio
        self._repo.create_customer(full_data)
        
        # Convertir strings de fecha a datetime para el modelo Pydantic
        model_data = full_data.copy()
        model_data['created_at'] = now
        model_data['updated_at'] = now
        
        return Customer(**model_data)

    def update_customer(self, customer_id: str, customer_data: Dict) -> Customer:
        """
        Actualiza un cliente existente.
        
        Args:
            customer_id: ID del cliente a actualizar
            customer_data: Diccionario con los campos a actualizar
            
        Returns:
            El cliente actualizado
            
        Raises:
            ValueError: Si el cliente no existe o los datos son inválidos
        """
        from datetime import datetime
        
        # Verificar que existe
        existing = self.get_customer(customer_id)
        
        # Si se cambia el email, verificar que sea único
        if 'email' in customer_data and customer_data['email'] != existing.email:
            all_customers = self.get_all_customers()
            if any(c.email == customer_data['email'] and c.id != customer_id for c in all_customers):
                raise ValueError(f"Ya existe otro cliente con el email: {customer_data['email']}")
        
        # Actualizar timestamp
        customer_data['updated_at'] = datetime.utcnow().isoformat()
        
        # Actualizar en repositorio
        self._repo.update_customer(customer_id, customer_data)
        
        # Retornar actualizado
        return self.get_customer(customer_id)

    def delete_customer(self, customer_id: str) -> None:
        """
        Elimina un cliente.
        
        Args:
            customer_id: ID del cliente a eliminar
            
        Raises:
            ValueError: Si el cliente no existe
        """
        # Verificar que existe
        self.get_customer(customer_id)
        
        # Eliminar del repositorio
        self._repo.delete_customer(customer_id)

    # Métodos preparados para futura integración con IA
    def get_customer_recommendations(self, customer_id: str) -> Dict:
        """
        Obtiene recomendaciones personalizadas para un cliente.
        
        TODO: Integrar con módulo de IA para análisis de patrones de compra
        y sugerencias de productos/configuraciones.
        """
        customer = self.get_customer(customer_id)
        
        # Placeholder - retorna estructura base
        return {
            "customer_id": customer_id,
            "recommendations": [],
            "confidence": 0.0,
            "based_on": "historical_orders",
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,  # Cambiar a True cuando se integre IA
        }

    def predict_customer_churn(self, customer_id: str) -> Dict:
        """
        Predice probabilidad de pérdida del cliente.
        
        TODO: Integrar modelo ML para análisis de comportamiento
        y predicción de churn.
        """
        customer = self.get_customer(customer_id)
        
        # Placeholder - retorna estructura base
        return {
            "customer_id": customer_id,
            "churn_probability": 0.0,
            "risk_level": "unknown",
            "factors": [],
            "recommendations": [],
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,  # Cambiar a True cuando se integre IA
        }
