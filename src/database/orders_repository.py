"""Repositorio especializado para pedidos."""

from __future__ import annotations

from typing import Dict, List, Optional

from .json_repository import BaseJSONRepository, JSONRepositoryError


class OrdersRepository(BaseJSONRepository):
    def __init__(self) -> None:
        super().__init__(filename="orders.json", data_key="orders")

    def list_orders(self) -> List[Dict]:
        payload = self.load()
        return payload.get("orders", [])

    def get_order_by_id(self, order_id: str) -> Dict:
        orders = self.list_orders()
        try:
            return next(o for o in orders if o.get("id") == order_id or o.get("order_id") == order_id)
        except StopIteration as exc:
            raise JSONRepositoryError(f"Pedido {order_id} no encontrado") from exc

    def upsert_order(self, order: Dict) -> Dict:
        def updater(payload: Dict) -> Dict:
            orders: List[Dict] = payload.get("orders", [])
            existing_index: Optional[int] = None
            order_id = order.get("id") or order.get("order_id")
            
            for idx, existing in enumerate(orders):
                existing_id = existing.get("id") or existing.get("order_id")
                if existing_id == order_id:
                    existing_index = idx
                    break
            
            if existing_index is None:
                orders.append(order)
            else:
                orders[existing_index] = order
            payload["orders"] = orders
            return payload

        updated = self.update_payload(updater)
        order_id = order.get("id") or order.get("order_id")
        return next(o for o in updated["orders"] if (o.get("id") or o.get("order_id")) == order_id)

    def delete_order(self, order_id: str) -> None:
        def updater(payload: Dict) -> Dict:
            orders: List[Dict] = payload.get("orders", [])
            filtered = [o for o in orders if o.get("id") != order_id and o.get("order_id") != order_id]
            if len(filtered) == len(orders):
                raise JSONRepositoryError(f"Pedido {order_id} no encontrado para eliminar")
            payload["orders"] = filtered
            return payload

        self.update_payload(updater)
