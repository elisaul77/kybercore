"""Tests unitarios para el sistema de pedidos.

Valida la funcionalidad de servicios, repositorios y modelos.
"""

import pytest
from datetime import datetime
from pathlib import Path
import json
import tempfile
import shutil

from src.database import (
    CustomersRepository,
    OrdersRepository,
    ProductionRepository,
    JSONRepositoryError,
)
from src.services import (
    CustomerService,
    OrderService,
    ProductionService,
    MetricsService,
)
from src.models.order_models import (
    Order,
    OrderLine,
    OrderStatus,
    OrderPriority,
    BatchStatus,
)


@pytest.fixture
def temp_db_dir():
    """Crea un directorio temporal para pruebas."""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)


@pytest.fixture
def customers_repo(temp_db_dir):
    """Repositorio de clientes con datos de prueba."""
    repo = CustomersRepository()
    repo._file_path = temp_db_dir / "customers.json"
    repo._initialize_file()
    
    # Añadir datos de prueba
    test_data = {
        "metadata": {"version": "1.0", "last_updated": datetime.utcnow().isoformat()},
        "customers": [
            {
                "customer_id": "TEST001",
                "name": "Test Customer",
                "email": "test@example.com",
                "status": "active",
                "total_orders": 5,
                "lifetime_value": 1500.0,
                "created_at": datetime.utcnow().isoformat(),
            }
        ],
    }
    repo._write_json(test_data)
    return repo


@pytest.fixture
def orders_repo(temp_db_dir):
    """Repositorio de pedidos con datos de prueba."""
    repo = OrdersRepository()
    repo._file_path = temp_db_dir / "orders.json"
    repo._initialize_file()
    return repo


class TestRepositories:
    """Tests para repositorios de datos."""

    def test_customers_repository_list(self, customers_repo):
        """Verifica que se puedan listar clientes."""
        customers = customers_repo.list_customers()
        assert len(customers) == 1
        assert customers[0]["customer_id"] == "TEST001"

    def test_customers_repository_get_by_id(self, customers_repo):
        """Verifica que se pueda obtener un cliente por ID."""
        customer = customers_repo.get_customer_by_id("TEST001")
        assert customer["name"] == "Test Customer"
        assert customer["email"] == "test@example.com"

    def test_customers_repository_get_nonexistent(self, customers_repo):
        """Verifica manejo de clientes inexistentes."""
        with pytest.raises(JSONRepositoryError):
            customers_repo.get_customer_by_id("NONEXISTENT")

    def test_orders_repository_upsert(self, orders_repo):
        """Verifica inserción y actualización de pedidos."""
        order_data = {
            "order_id": "ORD001",
            "customer_id": "TEST001",
            "status": "pending",
            "priority": "normal",
            "lines": [],
            "total_price": 100.0,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        # Insertar
        result = orders_repo.upsert_order(order_data)
        assert result["order_id"] == "ORD001"
        
        # Actualizar
        order_data["total_price"] = 150.0
        result = orders_repo.upsert_order(order_data)
        assert result["total_price"] == 150.0

    def test_orders_repository_delete(self, orders_repo):
        """Verifica eliminación de pedidos."""
        order_data = {
            "order_id": "ORD002",
            "customer_id": "TEST001",
            "status": "pending",
            "lines": [],
            "created_at": datetime.utcnow().isoformat(),
        }
        orders_repo.upsert_order(order_data)
        
        # Eliminar
        orders_repo.delete_order("ORD002")
        
        # Verificar que no existe
        with pytest.raises(JSONRepositoryError):
            orders_repo.get_order_by_id("ORD002")


class TestOrderModels:
    """Tests para modelos de pedidos."""

    def test_order_creation(self):
        """Verifica creación básica de pedido."""
        order = Order(
            order_id="ORD001",
            customer_id="TEST001",
            lines=[],
            status=OrderStatus.PENDING,
            priority=OrderPriority.NORMAL,
        )
        assert order.order_id == "ORD001"
        assert order.status == OrderStatus.PENDING

    def test_order_line_calculation(self):
        """Verifica cálculo de totales de línea."""
        line = OrderLine(
            line_id="LINE001",
            part_name="Test Part",
            quantity=5,
            unit_price=10.0,
        )
        assert line.total == 50.0

    def test_order_recalculate_totals(self):
        """Verifica recálculo de totales de pedido."""
        order = Order(
            order_id="ORD001",
            customer_id="TEST001",
            lines=[
                OrderLine(
                    line_id="LINE001",
                    part_name="Part A",
                    quantity=2,
                    unit_price=10.0,
                ),
                OrderLine(
                    line_id="LINE002",
                    part_name="Part B",
                    quantity=3,
                    unit_price=15.0,
                ),
            ],
            status=OrderStatus.PENDING,
        )
        order.recalculate_totals()
        
        assert order.subtotal == 65.0  # 20 + 45
        assert order.total_price == 65.0  # Sin impuestos por defecto

    def test_order_status_update(self):
        """Verifica actualización de estado."""
        order = Order(
            order_id="ORD001",
            customer_id="TEST001",
            lines=[],
            status=OrderStatus.PENDING,
        )
        
        order.update_status(OrderStatus.IN_PRODUCTION)
        assert order.status == OrderStatus.IN_PRODUCTION


class TestServices:
    """Tests para servicios de negocio."""

    def test_customer_service_get_all(self, customers_repo, monkeypatch):
        """Verifica obtención de todos los clientes."""
        service = CustomerService()
        monkeypatch.setattr(service, "_repo", customers_repo)
        
        customers = service.get_all_customers()
        assert len(customers) == 1
        assert customers[0].customer_id == "TEST001"

    def test_customer_service_search(self, customers_repo, monkeypatch):
        """Verifica búsqueda de clientes."""
        service = CustomerService()
        monkeypatch.setattr(service, "_repo", customers_repo)
        
        # Buscar por nombre
        results = service.search_customers(name="Test")
        assert len(results) == 1
        
        # Buscar sin resultados
        results = service.search_customers(name="Nonexistent")
        assert len(results) == 0

    def test_customer_service_validate(self, customers_repo, monkeypatch):
        """Verifica validación de clientes."""
        service = CustomerService()
        monkeypatch.setattr(service, "_repo", customers_repo)
        
        assert service.validate_customer("TEST001") is True
        assert service.validate_customer("NONEXISTENT") is False

    def test_order_service_create(self, orders_repo, customers_repo, monkeypatch):
        """Verifica creación de pedidos."""
        service = OrderService()
        monkeypatch.setattr(service, "_repo", orders_repo)
        monkeypatch.setattr(service, "_customers_repo", customers_repo)
        
        order_data = {
            "customer_id": "TEST001",
            "lines": [
                {
                    "part_name": "Test Part",
                    "quantity": 5,
                    "unit_price": 10.0,
                }
            ],
        }
        
        order = service.create_order(order_data)
        assert order.customer_id == "TEST001"
        assert len(order.lines) == 1
        assert order.total_price == 50.0

    def test_order_service_invalid_customer(self, orders_repo, customers_repo, monkeypatch):
        """Verifica rechazo de pedidos con cliente inválido."""
        service = OrderService()
        monkeypatch.setattr(service, "_repo", orders_repo)
        monkeypatch.setattr(service, "_customers_repo", customers_repo)
        
        order_data = {
            "customer_id": "INVALID",
            "lines": [],
        }
        
        with pytest.raises(ValueError, match="Cliente no válido"):
            service.create_order(order_data)


class TestIntegration:
    """Tests de integración del sistema."""

    def test_order_to_production_flow(self, orders_repo, customers_repo, temp_db_dir, monkeypatch):
        """Verifica flujo completo de pedido a producción."""
        # Setup
        order_service = OrderService()
        monkeypatch.setattr(order_service, "_repo", orders_repo)
        monkeypatch.setattr(order_service, "_customers_repo", customers_repo)
        
        production_repo = ProductionRepository()
        production_repo._file_path = temp_db_dir / "production_tracking.json"
        production_repo._initialize_file()
        
        production_service = ProductionService()
        monkeypatch.setattr(production_service, "_repo", production_repo)
        monkeypatch.setattr(production_service, "_orders_repo", orders_repo)
        
        # 1. Crear pedido
        order_data = {
            "customer_id": "TEST001",
            "lines": [{"part_name": "Part A", "quantity": 10, "unit_price": 5.0}],
        }
        order = order_service.create_order(order_data)
        assert order.status == OrderStatus.PENDING
        
        # 2. Crear lote de producción
        batch = production_service.create_batch_from_order(order.order_id)
        assert batch.order_id == order.order_id
        assert batch.status == BatchStatus.QUEUED
        
        # 3. Iniciar producción
        batch = production_service.update_batch_status(batch.batch_id, BatchStatus.IN_PROGRESS)
        assert batch.status == BatchStatus.IN_PROGRESS
        assert batch.started_at is not None
        
        # 4. Completar producción
        batch = production_service.update_batch_status(batch.batch_id, BatchStatus.COMPLETED)
        assert batch.status == BatchStatus.COMPLETED
        assert batch.completed_at is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
