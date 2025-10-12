"""Repositorio especializado para clientes."""

from __future__ import annotations

from typing import Dict, List

from .json_repository import BaseJSONRepository, JSONRepositoryError


class CustomersRepository(BaseJSONRepository):
    def __init__(self) -> None:
        super().__init__(filename="customers.json", data_key="customers")

    def list_customers(self) -> List[Dict]:
        """Lista todos los clientes."""
        payload = self.load()
        return payload.get("customers", [])

    def get_customer_by_id(self, customer_id: str) -> Dict:
        customers = self.list_customers()
        try:
            return next(c for c in customers if c.get("id") == customer_id or c.get("customer_id") == customer_id)
        except StopIteration as exc:
            raise JSONRepositoryError(f"Cliente {customer_id} no encontrado") from exc

    def create_customer(self, customer_data: Dict) -> Dict:
        """Crea un nuevo cliente."""
        payload = self.load()
        customers = payload.get("customers", [])
        
        # Agregar nuevo cliente
        customers.append(customer_data)
        
        # Guardar solo la lista de customers, no el payload completo
        self.save(customers)
        
        return customer_data

    def update_customer(self, customer_id: str, update_data: Dict) -> Dict:
        """Actualiza un cliente existente."""
        payload = self.load()
        customers = payload.get("customers", [])
        
        # Buscar y actualizar
        updated = False
        for i, customer in enumerate(customers):
            if customer.get("id") == customer_id or customer.get("customer_id") == customer_id:
                # Actualizar campos
                customers[i].update(update_data)
                updated = True
                break
        
        if not updated:
            raise JSONRepositoryError(f"Cliente {customer_id} no encontrado")
        
        # Guardar solo la lista de customers
        self.save(customers)
        
        return customers[i]

    def delete_customer(self, customer_id: str) -> None:
        """Elimina un cliente."""
        payload = self.load()
        customers = payload.get("customers", [])
        
        # Filtrar el cliente a eliminar
        original_count = len(customers)
        customers = [c for c in customers if c.get("id") != customer_id and c.get("customer_id") != customer_id]
        
        if len(customers) == original_count:
            raise JSONRepositoryError(f"Cliente {customer_id} no encontrado")
        
        # Guardar solo la lista de customers
        self.save(customers)
