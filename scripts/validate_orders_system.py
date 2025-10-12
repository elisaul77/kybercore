#!/usr/bin/env python3
"""Script de validación del sistema de pedidos.

Prueba las funcionalidades básicas sin necesitar pytest.
"""

import sys
from pathlib import Path

# Añadir el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.services import CustomerService, OrderService, MetricsService
from src.models.order_models import OrderStatus, OrderPriority


def test_customer_service():
    """Prueba el servicio de clientes."""
    print("🧪 Testeando CustomerService...")
    service = CustomerService()
    
    try:
        customers = service.get_all_customers()
        print(f"  ✅ Clientes encontrados: {len(customers)}")
        
        if customers:
            customer = customers[0]
            print(f"  ✅ Cliente de ejemplo: {customer.name} ({customer.id})")
            
            stats = service.get_customer_statistics(customer.id)
            print(f"  ✅ Estadísticas obtenidas: {stats['total_orders']} pedidos")
        
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def test_order_service():
    """Prueba el servicio de pedidos."""
    print("\n🧪 Testeando OrderService...")
    service = OrderService()
    
    try:
        orders = service.get_all_orders()
        print(f"  ✅ Pedidos encontrados: {len(orders)}")
        
        if orders:
            order = orders[0]
            print(f"  ✅ Pedido de ejemplo: {order.id} - Estado: {order.status.value}")
            print(f"  ✅ Total estimado: ${order.total_estimated_cost:.2f}")
        
        # Probar filtrado
        pending = service.get_pending_orders()
        print(f"  ✅ Pedidos pendientes: {len(pending)}")
        
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_metrics_service():
    """Prueba el servicio de métricas."""
    print("\n🧪 Testeando MetricsService...")
    service = MetricsService()
    
    try:
        dashboard = service.get_dashboard_metrics()
        print(f"  ✅ Métricas del dashboard:")
        print(f"    - Total de pedidos: {dashboard['orders']['total']}")
        print(f"    - Pedidos pendientes: {dashboard['orders']['pending']}")
        print(f"    - Tasa de completitud: {dashboard['orders']['completion_rate']:.1f}%")
        print(f"    - Ingresos totales: ${dashboard['financial']['total_revenue']:.2f}")
        
        kpis = service.get_performance_indicators()
        print(f"  ✅ KPIs obtenidos correctamente")
        
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_order_creation():
    """Prueba la creación de un pedido."""
    print("\n🧪 Testeando creación de pedido...")
    
    # Primero obtener un cliente válido
    customer_service = CustomerService()
    try:
        customers = customer_service.get_all_customers()
        if not customers:
            print("  ⚠️  No hay clientes disponibles, saltando test")
            return True
        
        customer_id = customers[0].id
        print(f"  ℹ️  Usando cliente: {customer_id}")
        
        # Crear pedido de prueba
        order_service = OrderService()
        test_order_data = {
            "customer_id": customer_id,
            "lines": [
                {
                    "part_name": "Test Part A",
                    "quantity": 5,
                    "unit_price": 10.0,
                },
                {
                    "part_name": "Test Part B",
                    "quantity": 3,
                    "unit_price": 15.0,
                }
            ],
            "priority": "high",
        }
        
        print("  ℹ️  Creando pedido de prueba...")
        order = order_service.create_order(test_order_data)
        print(f"  ✅ Pedido creado: {order.id}")
        print(f"  ✅ Total calculado: ${order.total_estimated_cost:.2f}")
        print(f"  ✅ Líneas de pedido: {len(order.order_lines)}")
        
        # Limpiar: eliminar el pedido de prueba
        print(f"  ℹ️  Limpiando pedido de prueba...")
        order_service.delete_order(order.id)
        print(f"  ✅ Pedido eliminado correctamente")
        
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Ejecuta todos los tests de validación."""
    print("=" * 60)
    print("VALIDACIÓN DEL SISTEMA DE PEDIDOS")
    print("=" * 60)
    
    results = []
    
    results.append(("CustomerService", test_customer_service()))
    results.append(("OrderService", test_order_service()))
    results.append(("MetricsService", test_metrics_service()))
    results.append(("Creación de pedido", test_order_creation()))
    
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nResultado: {passed}/{total} tests pasados")
    
    if passed == total:
        print("\n🎉 ¡Todos los tests pasaron exitosamente!")
        return 0
    else:
        print("\n⚠️  Algunos tests fallaron")
        return 1


if __name__ == "__main__":
    sys.exit(main())
