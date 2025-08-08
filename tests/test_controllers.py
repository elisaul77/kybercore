"""
Pruebas específicas para los controladores de KyberCore
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

class TestFleetController:
    """Pruebas específicas para el controlador de flota"""
    
    def test_fleet_data_structure(self):
        """Verifica la estructura completa de datos de flota"""
        response = client.get("/api/fleet/data")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verificar estructura principal
        assert isinstance(data["printers"], list)
        assert isinstance(data["filaments"], list)
        assert isinstance(data["fleet"], list)
        assert isinstance(data["print_queue"], list)
        
        # Verificar estructura de impresoras
        for printer in data["printers"]:
            assert "id" in printer
            assert "name" in printer
            assert isinstance(printer["id"], str)
            assert isinstance(printer["name"], str)
            
        # Verificar estructura de filamentos
        for filament in data["filaments"]:
            assert "id" in filament
            assert "name" in filament
            assert isinstance(filament["id"], str)
            assert isinstance(filament["name"], str)
            
        # Verificar estructura de flota
        for fleet_printer in data["fleet"]:
            assert "name" in fleet_printer
            assert "status" in fleet_printer
            assert "job" in fleet_printer
            assert "progress" in fleet_printer
            assert "color" in fleet_printer
            
        # Verificar estructura de cola de impresión
        for job in data["print_queue"]:
            assert "name" in job
            assert "eta" in job

class TestRecommenderController:
    """Pruebas específicas para el controlador del recomendador"""
    
    def test_recommender_with_all_valid_combinations(self):
        """Prueba el recomendador con todas las combinaciones válidas"""
        # Primero obtener los IDs válidos
        fleet_response = client.get("/api/fleet/data")
        fleet_data = fleet_response.json()
        
        printers = fleet_data["printers"]
        filaments = fleet_data["filaments"]
        
        # Probar al menos las primeras 3 combinaciones para no saturar
        combinations_tested = 0
        max_combinations = 3
        
        for printer in printers[:2]:  # Solo primeras 2 impresoras
            for filament in filaments[:2]:  # Solo primeros 2 filamentos
                if combinations_tested >= max_combinations:
                    break
                    
                response = client.get(
                    f"/api/recommender/get_profile?printer_id={printer['id']}&filament_id={filament['id']}"
                )
                assert response.status_code == 200
                
                profile = response.json()
                
                # Verificar que todos los campos numéricos son válidos
                numeric_fields = ["layer_height", "nozzle_temp", "bed_temp", "print_speed"]
                for field in numeric_fields:
                    assert field in profile
                    # Verificar que se puede convertir a float
                    try:
                        # Limpiar el valor eliminando unidades y espacios adicionales
                        clean_value = profile[field].replace("mm", "").replace("°C", "").replace("/s", "").strip()
                        # Manejar casos como "80 mm/s" -> "80 "
                        clean_value = clean_value.split()[0] if ' ' in clean_value else clean_value
                        float(clean_value)
                    except (ValueError, AttributeError):
                        pytest.fail(f"Campo {field} no es un valor numérico válido: {profile[field]}")
                
                combinations_tested += 1
                
            if combinations_tested >= max_combinations:
                break
    
    def test_recommender_response_consistency(self):
        """Verifica que el recomendador sea consistente en respuestas"""
        # Hacer la misma petición varias veces
        endpoint = "/api/recommender/get_profile?printer_id=prusamk4&filament_id=pla"
        
        responses = []
        for _ in range(3):
            response = client.get(endpoint)
            assert response.status_code == 200
            responses.append(response.json())
        
        # Verificar que las respuestas son consistentes
        first_response = responses[0]
        for response in responses[1:]:
            assert response == first_response, "El recomendador debe ser determinístico"

class TestAnalysisController:
    """Pruebas para futuros endpoints de análisis"""
    
    def test_analysis_endpoints_not_implemented_yet(self):
        """Placeholder para futuras pruebas de análisis"""
        # Estos endpoints aún no existen, pero podemos verificar que no causen errores 500
        analysis_endpoints = [
            "/api/analysis/log",
            "/api/analysis/photo",
            "/api/analysis/failure"
        ]
        
        for endpoint in analysis_endpoints:
            response = client.get(endpoint)
            # Debe retornar 404 (not found) no 500 (server error)
            assert response.status_code == 404
