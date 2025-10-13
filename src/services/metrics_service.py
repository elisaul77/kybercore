"""Servicio de métricas y análisis.

Proporciona análisis agregados, KPIs y métricas del sistema de pedidos
y producción.
"""

from __future__ import annotations

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict

from ..database import OrdersRepository, ProductionRepository, CustomersRepository
from ..models.order_models import Order, ProductionBatch, OrderStatus, BatchStatus


class MetricsService:
    """Servicio para cálculo de métricas y análisis."""

    def __init__(self) -> None:
        self._orders_repo = OrdersRepository()
        self._production_repo = ProductionRepository()
        self._customers_repo = CustomersRepository()

    def get_dashboard_metrics(self) -> Dict:
        """Obtiene métricas principales para el dashboard."""
        orders_data = self._orders_repo.list_orders()
        orders = [Order(**o) for o in orders_data]
        
        batches_data = self._production_repo.list_batches()
        batches = [ProductionBatch(**b) for b in batches_data]
        
        customers_data = self._customers_repo.list_customers()

        # Métricas de pedidos
        pending_orders = [o for o in orders if o.status == OrderStatus.PENDING]
        in_production_orders = [o for o in orders if o.status == OrderStatus.IN_PROGRESS]
        completed_orders = [o for o in orders if o.status == OrderStatus.COMPLETED]

        # Métricas de producción
        active_batches = [b for b in batches if b.status in [BatchStatus.IN_PROGRESS, BatchStatus.QUEUED]]
        completed_batches = [b for b in batches if b.status == BatchStatus.COMPLETED]

        # Calcular valores totales
        total_revenue = sum(o.total_estimated_cost for o in completed_orders)
        pending_revenue = sum(o.total_estimated_cost for o in pending_orders + in_production_orders)

        return {
            "orders": {
                "total": len(orders),
                "pending": len(pending_orders),
                "in_production": len(in_production_orders),
                "completed": len(completed_orders),
                "completion_rate": (
                    len(completed_orders) / len(orders) * 100
                    if orders else 0.0
                ),
            },
            "production": {
                "total_batches": len(batches),
                "active_batches": len(active_batches),
                "completed_batches": len(completed_batches),
                "average_progress": (
                    sum(b.completion_percentage for b in batches) / len(batches)
                    if batches else 0.0
                ),
            },
            "financial": {
                "total_revenue": total_revenue,
                "pending_revenue": pending_revenue,
                "average_order_value": (
                    total_revenue / len(completed_orders)
                    if completed_orders else 0.0
                ),
            },
            "customers": {
                "total": len(customers_data),
                "active": len([c for c in customers_data if c.get("status") == "active"]),
            },
            "generated_at": datetime.utcnow().isoformat(),
        }

    def get_order_metrics(self, period_days: int = 30) -> Dict:
        """Obtiene métricas detalladas de pedidos."""
        orders_data = self._orders_repo.list_orders()
        orders = [Order(**o) for o in orders_data]

        cutoff_date = datetime.utcnow() - timedelta(days=period_days)

        # Filtrar por periodo
        recent_orders = []
        for order in orders:
            try:
                created = datetime.fromisoformat(order.created_at.replace("Z", "+00:00"))
                if created >= cutoff_date:
                    recent_orders.append(order)
            except (ValueError, AttributeError):
                continue

        # Análisis por estado
        by_status = defaultdict(int)
        for order in recent_orders:
            by_status[order.status.value] += 1

        # Análisis por prioridad
        by_priority = defaultdict(int)
        for order in recent_orders:
            by_priority[order.priority.value] += 1

        # Análisis temporal
        by_date = defaultdict(int)
        for order in recent_orders:
            try:
                date = datetime.fromisoformat(order.created_at.replace("Z", "+00:00")).date()
                by_date[date.isoformat()] += 1
            except (ValueError, AttributeError):
                continue

        return {
            "period_days": period_days,
            "total_orders": len(recent_orders),
            "by_status": dict(by_status),
            "by_priority": dict(by_priority),
            "by_date": dict(by_date),
            "average_items_per_order": (
                sum(len(o.lines) for o in recent_orders) / len(recent_orders)
                if recent_orders else 0.0
            ),
            "generated_at": datetime.utcnow().isoformat(),
        }

    def get_production_metrics(self, period_days: int = 30) -> Dict:
        """Obtiene métricas detalladas de producción."""
        batches_data = self._production_repo.list_batches()
        batches = [ProductionBatch(**b) for b in batches_data]

        cutoff_date = datetime.utcnow() - timedelta(days=period_days)

        # Filtrar por periodo
        recent_batches = []
        for batch in batches:
            try:
                created = datetime.fromisoformat(batch.created_at.replace("Z", "+00:00"))
                if created >= cutoff_date:
                    recent_batches.append(batch)
            except (ValueError, AttributeError):
                continue

        # Análisis por estado
        by_status = defaultdict(int)
        for batch in recent_batches:
            by_status[batch.status.value] += 1

        # Calcular tiempos de producción
        production_times = []
        for batch in recent_batches:
            if batch.started_at and batch.completed_at:
                try:
                    started = datetime.fromisoformat(batch.started_at.replace("Z", "+00:00"))
                    completed = datetime.fromisoformat(batch.completed_at.replace("Z", "+00:00"))
                    duration = (completed - started).total_seconds() / 3600  # horas
                    production_times.append(duration)
                except (ValueError, AttributeError):
                    continue

        return {
            "period_days": period_days,
            "total_batches": len(recent_batches),
            "by_status": dict(by_status),
            "average_progress": (
                sum(b.completion_percentage for b in recent_batches) / len(recent_batches)
                if recent_batches else 0.0
            ),
            "average_production_time_hours": (
                sum(production_times) / len(production_times)
                if production_times else 0.0
            ),
            "total_items_produced": sum(len(b.print_items) for b in recent_batches),
            "generated_at": datetime.utcnow().isoformat(),
        }

    def get_customer_metrics(self) -> Dict:
        """Obtiene métricas de clientes."""
        customers_data = self._customers_repo.list_customers()
        orders_data = self._orders_repo.list_orders()

        # Análisis por estado de cliente
        by_status = defaultdict(int)
        for customer in customers_data:
            by_status[customer.get("status", "unknown")] += 1

        # Top clientes por valor
        top_customers = sorted(
            customers_data,
            key=lambda c: c.get("lifetime_value", 0.0),
            reverse=True,
        )[:10]

        # Pedidos por cliente
        orders_by_customer = defaultdict(int)
        for order in orders_data:
            orders_by_customer[order.get("customer_id")] += 1

        return {
            "total_customers": len(customers_data),
            "by_status": dict(by_status),
            "average_lifetime_value": (
                sum(c.get("lifetime_value", 0.0) for c in customers_data) / len(customers_data)
                if customers_data else 0.0
            ),
            "average_orders_per_customer": (
                len(orders_data) / len(customers_data)
                if customers_data else 0.0
            ),
            "top_customers": [
                {
                    "customer_id": c.get("customer_id"),
                    "name": c.get("name"),
                    "lifetime_value": c.get("lifetime_value", 0.0),
                }
                for c in top_customers
            ],
            "generated_at": datetime.utcnow().isoformat(),
        }

    def get_performance_indicators(self) -> Dict:
        """Obtiene KPIs principales del sistema."""
        dashboard = self.get_dashboard_metrics()
        order_metrics = self.get_order_metrics(period_days=30)
        production_metrics = self.get_production_metrics(period_days=30)

        return {
            "order_fulfillment_rate": dashboard["orders"]["completion_rate"],
            "average_production_time": production_metrics["average_production_time_hours"],
            "active_capacity_utilization": (
                dashboard["production"]["active_batches"] / 10 * 100  # Asumiendo capacidad de 10
            ),
            "revenue_per_day": (
                dashboard["financial"]["total_revenue"] / 30  # Últimos 30 días
            ),
            "customer_satisfaction_score": 0.0,  # TODO: Implementar cuando haya feedback
            "on_time_delivery_rate": 0.0,  # TODO: Implementar tracking de plazos
            "generated_at": datetime.utcnow().isoformat(),
        }

    # Métodos preparados para futura integración con IA
    def predict_demand(self, days_ahead: int = 7) -> Dict:
        """
        Predice la demanda futura de pedidos.
        
        TODO: Integrar modelos de series temporales y ML para
        predicción de demanda basada en históricos y tendencias.
        """
        return {
            "prediction_period_days": days_ahead,
            "predicted_orders": 0,
            "confidence": 0.0,
            "trend": "unknown",
            "factors": [],
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }

    def identify_bottlenecks(self) -> Dict:
        """
        Identifica cuellos de botella en el sistema.
        
        TODO: Integrar análisis avanzado de flujos, tiempos de espera
        y utilización de recursos.
        """
        return {
            "bottlenecks": [],
            "severity": "unknown",
            "impact": {
                "orders_affected": 0,
                "delay_hours": 0.0,
            },
            "recommendations": [],
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }

    def generate_insights(self) -> Dict:
        """
        Genera insights automáticos del sistema.
        
        TODO: Integrar análisis inteligente de patrones, anomalías
        y oportunidades de optimización.
        """
        return {
            "insights": [],
            "opportunities": [],
            "risks": [],
            "generated_at": datetime.utcnow().isoformat(),
            "ai_ready": False,
        }
