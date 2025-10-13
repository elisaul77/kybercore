"""Repositorio especializado para seguimiento de producción."""

from __future__ import annotations

from typing import Dict, List

from .json_repository import BaseJSONRepository


class ProductionRepository(BaseJSONRepository):
    def __init__(self) -> None:
        super().__init__(filename="production_tracking.json", data_key="production_tracking")

    def list_batches(self) -> List[Dict]:
        payload = self.load()
        return payload.get("production_tracking", [])

    def get_batch(self, batch_id: str) -> Dict:
        batches = self.list_batches()
        for batch in batches:
            if batch.get("id") == batch_id:
                return batch
        raise ValueError(f"Lote {batch_id} no encontrado")
