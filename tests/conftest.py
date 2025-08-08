"""
Tests de configuración y utilidades para KyberCore
"""

import pytest
import asyncio
from typing import Generator
from fastapi.testclient import TestClient
from src.api.main import app

@pytest.fixture(scope="session")
def test_client() -> Generator[TestClient, None, None]:
    """
    Fixture que proporciona un cliente de pruebas para toda la sesión
    """
    with TestClient(app) as client:
        yield client

@pytest.fixture(scope="session")
def event_loop():
    """
    Fixture para el event loop de asyncio
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Datos de prueba
VALID_PRINTER_IDS = ["prusamk4", "voron24", "bambulab"]
VALID_FILAMENT_IDS = ["pla", "abs", "petg", "tpu"]
INVALID_IDS = ["invalid", "nonexistent", "", "null"]

# Configuración de timeouts
API_TIMEOUT = 5.0  # segundos
SLOW_ENDPOINT_THRESHOLD = 2.0  # segundos
