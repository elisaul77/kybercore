# Tests de KyberCore

## 📂 Estructura

- **`unit/`** - Tests unitarios Python (pytest)
- **`integration/`** - Tests de integración Docker  
- **`html/`** - Interfaces de test interactivas (navegador)

## 🧪 Ejecutar Tests

### Tests Python
```bash
# Todos los tests
./scripts/run_tests.sh

# Solo tests unitarios
pytest tests/unit/

# Solo tests de integración
pytest tests/integration/

# Test específico
pytest tests/unit/test_controllers.py -v
```

### Tests HTML Interactivos
Los tests HTML son interfaces web para probar funcionalidades manualmente:

1. Inicia los servicios:
   ```bash
   docker compose up -d
   ```

2. Abre en tu navegador:
   - `tests/html/test_simple.html` - Test básico de funcionalidad
   - `tests/html/test_wizard.html` - Test del wizard de configuración
   - `tests/html/test_print_flow.html` - Test del flujo completo de impresión
   - `tests/html/test_integrated_flow.html` - Test de integración E2E

## 📝 Añadir Nuevos Tests

### Test Unitario
```python
# tests/unit/test_mi_modulo.py
import pytest
from src.mi_modulo import mi_funcion

def test_mi_funcion():
    resultado = mi_funcion(parametro="test")
    assert resultado == "esperado"
```

### Test de Integración
```python
# tests/integration/test_mi_integracion.py
import pytest
from docker import DockerClient

def test_contenedor_funcionando():
    client = DockerClient.from_env()
    container = client.containers.get("kybercore")
    assert container.status == "running"
```

## 🐛 Troubleshooting

- Si los tests fallan, verifica que los contenedores estén corriendo: `docker compose ps`
- Para ver logs: `docker compose logs -f`
- Para reiniciar: `docker compose restart`
