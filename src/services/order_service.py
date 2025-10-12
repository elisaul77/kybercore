"""Servicio de gestión de pedidos.

Proporciona lógica de negocio para pedidos, incluyendo creación,
actualización, validación y cálculo de totales.
"""

from __future__ import annotations

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import uuid

from ..database import OrdersRepository, CustomersRepository, JSONRepositoryError
from ..models.order_models import (
    Order,
    OrderLine,
    OrderStatus,
    OrderPriority,
    Customer,
)


class OrderService:
    """Servicio para operaciones de pedidos."""

    def __init__(self) -> None:
        self._repo = OrdersRepository()
        self._customers_repo = CustomersRepository()

    def get_all_orders(
        self,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Order]:
        """Obtiene todos los pedidos con filtros opcionales."""
        orders_data = self._repo.list_orders()
        
        if customer_id:
            orders_data = [o for o in orders_data if o.get("customer_id") == customer_id]
        
        if status:
            orders_data = [o for o in orders_data if o.get("status") == status]
        
        return [Order(**data) for data in orders_data]

    def get_order(self, order_id: str) -> Order:
        """Obtiene un pedido por ID."""
        try:
            order_data = self._repo.get_order_by_id(order_id)
            return Order(**order_data)
        except JSONRepositoryError as exc:
            raise ValueError(f"Pedido no encontrado: {order_id}") from exc

    def create_order(self, order_data: Dict) -> Order:
        """Crea un nuevo pedido. Soporta tanto print_only como design_and_print."""
        # Validar cliente
        customer_id = order_data.get("customer_id")
        if not customer_id:
            raise ValueError("Se requiere customer_id para crear un pedido")
        
        try:
            self._customers_repo.get_customer_by_id(customer_id)
        except JSONRepositoryError as exc:
            raise ValueError(f"Cliente no válido: {customer_id}") from exc

        # El modelo Order usa 'order_number' en lugar de 'order_id'
        if "order_number" not in order_data:
            # Generar número de pedido automático
            now = datetime.utcnow()
            order_data["order_number"] = f"ORD-{now.year}-{now.month:02d}-{uuid.uuid4().hex[:6].upper()}"

        # Obtener tipo de pedido (por defecto print_only)
        order_type = order_data.get("order_type", "print_only")
        
        # Establecer estado inicial según el tipo
        if order_type == "design_and_print":
            order_data.setdefault("status", "pending_design")  # Esperando diseño
        else:
            order_data.setdefault("status", OrderStatus.PENDING.value)
            
        order_data.setdefault("priority", OrderPriority.NORMAL.value)

        # Convertir 'items' a 'order_lines' si viene del frontend
        if "items" in order_data:
            items = order_data.pop("items")
            order_lines = []
            
            # Solo procesar items si no es un pedido de diseño o si tiene items
            if items:  # Permitir arrays vacíos para design_and_print
                for item in items:
                    # Soporte para items de galería (print_only) con campos nuevos
                    order_line = {
                        "id": f"line_{uuid.uuid4().hex[:8]}",
                        "order_id": order_data.get("id", "temp"),  # Se actualizará después
                        "project_id": item.get("project_id"),  # De galería
                        "project_name": item.get("project_name") or item.get("name", "Sin nombre"),
                        "is_full_project": item.get("is_full_project", True),  # True = proyecto completo
                        "file_id": item.get("file_id"),  # Para archivos individuales
                        "file_name": item.get("file_name"),  # Nombre del archivo individual
                        "quantity": item.get("quantity", 1),
                        "material": item.get("material", "PLA"),
                        "color": item.get("color"),
                        "file_path": item.get("file_path"),
                        "notes": item.get("notes"),
                        "unit_price": item.get("unit_price", 0.0),
                        "status": "pending",
                        "progress_percentage": 0.0
                    }
                    order_lines.append(order_line)
            
            order_data["order_lines"] = order_lines
        else:
            # Si no hay items key, asegurar que order_lines esté vacío para design_and_print
            order_data.setdefault("order_lines", [])

        # El modelo espera 'order_lines' en lugar de 'lines'
        if "lines" in order_data and "order_lines" not in order_data:
            order_data["order_lines"] = order_data.pop("lines")

        # Validar y crear instancia
        order = Order(**order_data)
        
        # Recalcular totales
        order.recalculate_totals()

        # Guardar en repositorio (usar mode='json' para serializar datetime)
        saved_data = self._repo.upsert_order(order.model_dump(mode='json'))
        return Order(**saved_data)

    def update_order(self, order_id: str, updates: Dict) -> Order:
        """Actualiza un pedido existente."""
        # Obtener pedido actual
        order = self.get_order(order_id)
        
        # Guardar estado original para detectar cambios
        original_status = order.status
        was_design_order = order.order_type == "design_and_print"
        had_no_items = len(order.order_lines or []) == 0
        
        # Convertir 'items' a 'order_lines' si viene del frontend
        if "items" in updates:
            items = updates.pop("items")
            order_lines = []
            
            if items:  # Si hay items
                for item in items:
                    # Soporte para items de galería con campos nuevos
                    order_line = {
                        "id": f"line_{uuid.uuid4().hex[:8]}",
                        "order_id": order_id,
                        "project_id": item.get("project_id"),
                        "project_name": item.get("project_name") or item.get("name", "Sin nombre"),
                        "is_full_project": item.get("is_full_project", True),
                        "file_id": item.get("file_id"),
                        "file_name": item.get("file_name"),
                        "quantity": item.get("quantity", 1),
                        "unit_price": item.get("unit_price", 0.0),
                        "material": item.get("material", "PLA"),
                        "color": item.get("color", ""),
                        "file_path": item.get("file_path", ""),
                        "notes": item.get("notes", ""),
                        "completed": 0,
                        "in_progress": 0,
                        "pending": item.get("quantity", 1),
                        "failed": 0,
                        "status": "pending",
                    }
                    order_lines.append(order_line)
            
            updates["order_lines"] = order_lines
        
        # Aplicar actualizaciones
        order_dict = order.model_dump()
        order_dict.update(updates)
        order_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Validar y recalcular
        updated_order = Order(**order_dict)
        updated_order.recalculate_totals()
        
        # LÓGICA ESPECIAL: Si era un pedido de diseño sin items y ahora tiene items,
        # cambiar automáticamente el estado de pending_design a pending
        has_new_items = len(updated_order.order_lines or []) > 0
        
        if (was_design_order and 
            original_status in ["pending_design", "design_in_progress", "design_review"] and 
            had_no_items and 
            has_new_items):
            # Los archivos STL ya fueron agregados, cambiar a estado pending
            updated_order.status = "pending"
            print(f"✅ Pedido {order_id} cambió automáticamente de {original_status} a 'pending' (STLs agregados)")
        
        # Guardar (usar mode='json' para serializar datetime)
        saved_data = self._repo.upsert_order(updated_order.model_dump(mode='json'))
        return Order(**saved_data)

    def update_order_status(self, order_id: str, new_status: OrderStatus) -> Order:
        """Actualiza el estado de un pedido."""
        order = self.get_order(order_id)
        order.update_status(new_status)
        
        saved_data = self._repo.upsert_order(order.model_dump())
        return Order(**saved_data)

    def cancel_order(self, order_id: str, reason: Optional[str] = None) -> Order:
        """Cancela un pedido."""
        order = self.get_order(order_id)
        
        if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
            raise ValueError(f"No se puede cancelar un pedido en estado {order.status.value}")
        
        order.update_status(OrderStatus.CANCELLED)
        
        if reason:
            notes = order.notes or []
            notes.append({
                "timestamp": datetime.utcnow().isoformat(),
                "type": "cancellation",
                "content": reason,
            })
            order.notes = notes
        
        saved_data = self._repo.upsert_order(order.model_dump())
        return Order(**saved_data)

    def delete_order(self, order_id: str) -> bool:
        """Elimina un pedido."""
        try:
            # El repositorio espera 'order_id' pero el modelo usa 'id'
            # Intentar eliminar por ambos campos
            self._repo.delete_order(order_id)
            return True
        except JSONRepositoryError:
            return False

    def add_order_line(self, order_id: str, line_data: Dict) -> Order:
        """Añade una línea de pedido."""
        order = self.get_order(order_id)
        
        # Generar ID si no existe
        if "line_id" not in line_data:
            line_data["line_id"] = f"LINE-{uuid.uuid4().hex[:8].upper()}"
        
        # Crear línea
        new_line = OrderLine(**line_data)
        
        # Añadir al pedido
        lines = list(order.lines)
        lines.append(new_line)
        order.lines = lines
        
        # Recalcular totales
        order.recalculate_totals()
        
        # Guardar
        saved_data = self._repo.upsert_order(order.model_dump())
        return Order(**saved_data)

    def remove_order_line(self, order_id: str, line_id: str) -> Order:
        """Elimina una línea de pedido."""
        order = self.get_order(order_id)
        
        # Filtrar línea
        original_count = len(order.lines)
        order.lines = [line for line in order.lines if line.line_id != line_id]
        
        if len(order.lines) == original_count:
            raise ValueError(f"Línea {line_id} no encontrada en pedido {order_id}")
        
        # Recalcular totales
        order.recalculate_totals()
        
        # Guardar
        saved_data = self._repo.upsert_order(order.model_dump())
        return Order(**saved_data)

    def get_pending_orders(self) -> List[Order]:
        """Obtiene pedidos pendientes."""
        return self.get_all_orders(status=OrderStatus.PENDING.value)

    def get_overdue_orders(self, days: int = 0) -> List[Order]:
        """Obtiene pedidos vencidos o próximos a vencer."""
        all_orders = self.get_all_orders()
        cutoff_date = datetime.utcnow() + timedelta(days=days)
        
        overdue = []
        for order in all_orders:
            if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
                continue
            
            if order.delivery_date:
                delivery = datetime.fromisoformat(order.delivery_date.replace("Z", "+00:00"))
                if delivery <= cutoff_date:
                    overdue.append(order)
        
        return overdue

    # Métodos preparados para futura integración con IA
    def optimize_order_scheduling(self, order_ids: List[str]) -> Dict:
        """
        Optimiza la programación de múltiples pedidos.
        
        TODO: Integrar algoritmos de optimización multi-objetivo
        considerando recursos, plazos y prioridades.
        """
        orders = [self.get_order(oid) for oid in order_ids]
        
        return {
            "orders": order_ids,
            "optimized_schedule": [],
            "estimated_completion": None,
            "resource_allocation": {},
            "conflicts": [],
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }

    def predict_order_completion(self, order_id: str) -> Dict:
        """
        Predice el tiempo de finalización de un pedido.
        
        TODO: Integrar modelo ML basado en históricos y capacidad actual.
        """
        order = self.get_order(order_id)
        
        return {
            "order_id": order_id,
            "predicted_completion": None,
            "confidence": 0.0,
            "bottlenecks": [],
            "recommendations": [],
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }

    def add_order_lines(self, order_id: str, items: List[Dict]) -> Order:
        """
        Agrega order_lines a un pedido existente.
        Útil para pedidos de tipo design_and_print donde los items se agregan
        después de que el diseño ha sido aprobado.
        
        Args:
            order_id: ID del pedido
            items: Lista de items a agregar (mismo formato que en create_order)
            
        Returns:
            Order actualizado con las nuevas líneas
            
        Raises:
            ValueError: Si el pedido no existe o los items son inválidos
        """
        # Obtener pedido existente
        order = self.get_order(order_id)
        
        # Convertir items a order_lines
        new_order_lines = []
        for item in items:
            order_line = {
                "id": f"line_{uuid.uuid4().hex[:8]}",
                "order_id": order_id,
                "project_id": item.get("project_id"),
                "project_name": item.get("project_name") or item.get("name", "Sin nombre"),
                "is_full_project": item.get("is_full_project", True),
                "file_id": item.get("file_id"),
                "file_name": item.get("file_name"),
                "quantity": item.get("quantity", 1),
                "material": item.get("material", "PLA"),
                "color": item.get("color"),
                "file_path": item.get("file_path"),
                "notes": item.get("notes"),
                "unit_price": item.get("unit_price", 0.0),
                "status": "pending",
                "progress_percentage": 0.0
            }
            new_order_lines.append(OrderLine(**order_line))
        
        # Agregar las nuevas líneas al pedido
        current_lines = order.order_lines or []
        all_lines = current_lines + new_order_lines
        
        # Actualizar el pedido
        order_dict = order.model_dump()
        order_dict["order_lines"] = [line.model_dump() for line in all_lines]
        order_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Si el pedido estaba en pending_design, cambiar a pending
        if order.status == "pending_design" or order.status == "design_approved":
            order_dict["status"] = OrderStatus.PENDING.value
        
        # Validar y recalcular
        updated_order = Order(**order_dict)
        updated_order.recalculate_totals()
        
        # Guardar
        saved_data = self._repo.upsert_order(updated_order.model_dump(mode='json'))
        return Order(**saved_data)

    def suggest_order_improvements(self, order_id: str) -> Dict:
        """
        Sugiere mejoras para un pedido.
        
        TODO: Integrar análisis de configuraciones óptimas y alternativas.
        """
        order = self.get_order(order_id)
        
        return {
            "order_id": order_id,
            "suggestions": [],
            "potential_savings": {"time": 0.0, "cost": 0.0},
            "quality_impact": "unknown",
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }
