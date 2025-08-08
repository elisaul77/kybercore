# Test Configuration for KyberCore

## Estructura de Pruebas

### Archivos principales:
- `test_endpoints.py` - Pruebas completas de endpoints y casos edge
- `test_controllers.py` - Pruebas específicas para cada controlador
- `test_docker.py` - Pruebas específicas para entorno Docker
- `conftest.py` - Configuración y fixtures compartidas
- `../run_tests.sh` - Script para ejecutar pruebas con Docker Compose

### Tipos de pruebas incluidas:

#### 1. Pruebas básicas de endpoints
- Verificación de códigos de estado HTTP
- Validación de estructura de respuestas JSON
- Tiempo de respuesta

#### 2. Pruebas de validación de datos
- Estructura de datos de flota
- Consistencia del recomendador IA
- Campos requeridos en respuestas

#### 3. Pruebas de manejo de errores
- Endpoints inexistentes (404)
- Parámetros malformados (400/422)
- Casos edge y valores inválidos

#### 4. Pruebas de integración
- Consistencia entre módulos
- Flujo completo de datos

#### 5. Pruebas de rendimiento
- Tiempo de respuesta de endpoints
- Detección de endpoints lentos

## Cómo ejecutar las pruebas

### Con Docker Compose (Recomendado)

```bash
# Ejecutar todas las pruebas
./run_tests.sh

# Ejecutar con verbose output
./run_tests.sh -v

# Ejecutar con coverage
./run_tests.sh --coverage
```

### Localmente (desarrollo)

```bash
# Instalar dependencias de testing
pip install -r requirements.txt

# Ejecutar todas las pruebas
pytest tests/

# Ejecutar con verbose output
pytest tests/ -v

# Ejecutar un archivo específico
pytest tests/test_endpoints.py -v

# Ejecutar con coverage
pytest tests/ --cov=src --cov-report=html
```

## Configuración adicional recomendada

Para mayor cobertura, considera instalar:
```bash
pip install pytest-cov pytest-mock coverage
```

## Estructura de archivos de test

```
tests/
├── conftest.py              # Configuración y fixtures
├── test_endpoints.py        # Pruebas de endpoints principales
├── test_controllers.py      # Pruebas de controladores específicos
├── test_docker.py           # Pruebas específicas para Docker
├── README.md               # Esta documentación
└── ../run_tests.sh          # Script de ejecución con Docker
```

## Próximos pasos

- Agregar pruebas para nuevos endpoints de análisis IA
- Implementar pruebas de carga con pytest-benchmark
- Agregar pruebas de seguridad y autenticación
- Configurar CI/CD para ejecutar pruebas automáticamente

Organiza aquí los tests por dominio, por ejemplo:
- test_api.py
- test_jobs.py
- test_printers.py
- ...
