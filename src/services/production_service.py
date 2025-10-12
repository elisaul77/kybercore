"""Servicio de seguimiento de producción.

Proporciona lógica de negocio para gestionar lotes de producción,
items y progreso de manufactura.
"""

from __future__ import annotations

from typing import Dict, List, Optional
from datetime import datetime
import uuid

from ..database import ProductionRepository, OrdersRepository, JSONRepositoryError
from ..models.order_models import ProductionBatch, PrintItem, BatchStatus


class ProductionService:
    """Servicio para operaciones de producción."""

    def __init__(self) -> None:
        self._repo = ProductionRepository()
        self._orders_repo = OrdersRepository()

    def get_all_batches(self) -> List[ProductionBatch]:
        """Obtiene todos los lotes de producción."""
        batches_data = self._repo.list_batches()
        return [ProductionBatch(**data) for data in batches_data]

    def get_batch(self, batch_id: str) -> ProductionBatch:
        """Obtiene un lote por ID."""
        try:
            batch_data = self._repo.get_batch(batch_id)
            return ProductionBatch(**batch_data)
        except (ValueError, JSONRepositoryError) as exc:
            raise ValueError(f"Lote no encontrado: {batch_id}") from exc

    def get_batches_by_order(self, order_id: str) -> List[ProductionBatch]:
        """Obtiene todos los lotes asociados a un pedido."""
        all_batches = self.get_all_batches()
        return [b for b in all_batches if b.order_id == order_id]

    def get_active_batches(self) -> List[ProductionBatch]:
        """Obtiene lotes en producción activa."""
        all_batches = self.get_all_batches()
        active_statuses = [BatchStatus.IN_PROGRESS, BatchStatus.QUEUED]
        return [b for b in all_batches if b.status in active_statuses]

    def create_batch_from_order(self, order_id: str, printer_id: Optional[str] = None) -> ProductionBatch:
        """
        Crea un lote de producción a partir de un pedido.
        
        TODO: Integrar con sistema de asignación automática de impresoras.
        """
        # Validar que el pedido existe
        try:
            order_data = self._orders_repo.get_order_by_id(order_id)
        except JSONRepositoryError as exc:
            raise ValueError(f"Pedido no válido: {order_id}") from exc

        # Generar datos del lote
        batch_id = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.utcnow().isoformat()

        batch_data = {
            "batch_id": batch_id,
            "order_id": order_id,
            "printer_id": printer_id,
            "status": BatchStatus.QUEUED.value,
            "items": [],
            "started_at": None,
            "completed_at": None,
            "created_at": now,
            "updated_at": now,
        }

        # TODO: Convertir líneas de pedido en items de producción
        # Por ahora, estructura mínima
        
        batch = ProductionBatch(**batch_data)
        
        # Guardar (usando updater del repositorio base)
        def updater(payload):
            batches = payload.get("production_tracking", [])
            batches.append(batch.model_dump())
            payload["production_tracking"] = batches
            return payload
        
        self._repo.update_payload(updater)
        return batch

    def update_batch_status(self, batch_id: str, new_status: BatchStatus) -> ProductionBatch:
        """Actualiza el estado de un lote."""
        batch = self.get_batch(batch_id)
        batch.status = new_status
        batch.updated_at = datetime.utcnow().isoformat()

        # Actualizar timestamps según estado
        if new_status == BatchStatus.IN_PROGRESS and not batch.started_at:
            batch.started_at = datetime.utcnow().isoformat()
        elif new_status == BatchStatus.COMPLETED:
            batch.completed_at = datetime.utcnow().isoformat()

        # Guardar
        def updater(payload):
            batches = payload.get("production_tracking", [])
            for idx, b in enumerate(batches):
                if b.get("batch_id") == batch_id:
                    batches[idx] = batch.model_dump()
                    break
            payload["production_tracking"] = batches
            return payload

        self._repo.update_payload(updater)
        return batch

    def update_item_progress(
        self,
        batch_id: str,
        item_id: str,
        progress: float,
    ) -> ProductionBatch:
        """Actualiza el progreso de un item específico."""
        batch = self.get_batch(batch_id)

        # Buscar y actualizar item
        updated = False
        for item in batch.items:
            if item.item_id == item_id:
                item.progress = max(0.0, min(100.0, progress))
                item.updated_at = datetime.utcnow().isoformat()
                updated = True
                break

        if not updated:
            raise ValueError(f"Item {item_id} no encontrado en lote {batch_id}")

        # Recalcular progreso del lote
        if batch.items:
            total_progress = sum(item.progress for item in batch.items)
            batch.progress = total_progress / len(batch.items)
        
        batch.updated_at = datetime.utcnow().isoformat()

        # Guardar
        def updater(payload):
            batches = payload.get("production_tracking", [])
            for idx, b in enumerate(batches):
                if b.get("batch_id") == batch_id:
                    batches[idx] = batch.model_dump()
                    break
            payload["production_tracking"] = batches
            return payload

        self._repo.update_payload(updater)
        return batch

    def get_production_statistics(self) -> Dict:
        """Obtiene estadísticas globales de producción."""
        batches = self.get_all_batches()

        stats = {
            "total_batches": len(batches),
            "by_status": {},
            "active_batches": 0,
            "completed_today": 0,
            "average_progress": 0.0,
        }

        # Contar por estado
        for batch in batches:
            status = batch.status.value
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1

            if batch.status in [BatchStatus.IN_PROGRESS, BatchStatus.QUEUED]:
                stats["active_batches"] += 1

        # Calcular progreso promedio
        if batches:
            total_progress = sum(b.progress for b in batches)
            stats["average_progress"] = total_progress / len(batches)

        return stats

    # Métodos preparados para futura integración con IA
    def optimize_batch_scheduling(self, batch_ids: List[str]) -> Dict:
        """
        Optimiza la programación de lotes en la flota.
        
        TODO: Integrar con sistema de gestión de impresoras y
        algoritmos de optimización multi-objetivo.
        """
        batches = [self.get_batch(bid) for bid in batch_ids]

        return {
            "batches": batch_ids,
            "optimized_assignment": {},
            "estimated_completion": None,
            "resource_utilization": 0.0,
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }

    def predict_batch_completion(self, batch_id: str) -> Dict:
        """
        Predice el tiempo de finalización de un lote.
        
        TODO: Integrar modelos de ML basados en velocidad de impresión,
        fallos históricos y complejidad de piezas.
        """
        batch = self.get_batch(batch_id)

        return {
            "batch_id": batch_id,
            "predicted_completion": None,
            "confidence": 0.0,
            "current_progress": batch.progress,
            "estimated_remaining_time": None,
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }

    def detect_production_anomalies(self, batch_id: str) -> Dict:
        """
        Detecta anomalías en el proceso de producción.
        
        TODO: Integrar análisis de logs, sensores y visión por computadora
        para detección temprana de fallos.
        """
        batch = self.get_batch(batch_id)

        return {
            "batch_id": batch_id,
            "anomalies_detected": [],
            "risk_level": "unknown",
            "recommendations": [],
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }
