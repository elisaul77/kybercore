#!/usr/bin/env python3
"""
Test para verificar que la eliminación de proyectos funciona correctamente
(JSON + carpeta física).
"""
import json
import requests
from pathlib import Path
import time

BASE_URL = "http://localhost:8000"

def get_projects():
    """Obtiene la lista de proyectos"""
    response = requests.get(f"{BASE_URL}/api/gallery/projects")
    response.raise_for_status()
    return response.json()

def delete_project(project_id: int):
    """Elimina un proyecto"""
    response = requests.post(f"{BASE_URL}/api/gallery/projects/{project_id}/delete")
    response.raise_for_status()
    return response.json()

def verify_folder_deleted(project_name: str, project_id: int):
    """Verifica que la carpeta física fue eliminada"""
    project_folder = Path(__file__).parent.parent / "src" / "proyect" / f"{project_name} - {project_id}"
    return not project_folder.exists()

def main():
    print("🧪 Test de eliminación completa de proyectos\n")
    
    # 1. Obtener proyectos actuales
    print("📋 Obteniendo lista de proyectos...")
    data = get_projects()
    projects = data['projects']
    initial_count = len(projects)
    initial_stls = data['statistics']['total_stls']
    
    print(f"   ✅ Proyectos actuales: {initial_count}")
    print(f"   ✅ STLs totales: {initial_stls}")
    
    if initial_count == 0:
        print("\n⚠️ No hay proyectos para probar la eliminación")
        return
    
    # 2. Seleccionar el último proyecto para prueba
    test_project = projects[-1]
    project_id = test_project['id']
    project_name = test_project['nombre']
    project_stls = len(test_project.get('archivos', []))
    
    print(f"\n🎯 Proyecto de prueba:")
    print(f"   ID: {project_id}")
    print(f"   Nombre: {project_name}")
    print(f"   STLs: {project_stls}")
    
    # 3. Verificar que la carpeta existe ANTES
    project_folder = Path(__file__).parent.parent / "src" / "proyect" / f"{project_name} - {project_id}"
    folder_exists_before = project_folder.exists()
    print(f"\n📁 Carpeta antes de eliminar: {'✅ Existe' if folder_exists_before else '❌ No existe'}")
    
    if not folder_exists_before:
        print("   ⚠️ La carpeta ya no existe, posiblemente ya fue eliminada antes")
    
    # 4. Eliminar proyecto
    print(f"\n🗑️ Eliminando proyecto ID {project_id}...")
    result = delete_project(project_id)
    print(f"   ✅ Respuesta: {result['message']}")
    print(f"   ✅ Carpeta eliminada: {result.get('folder_deleted', 'N/A')}")
    
    # 5. Esperar un momento para que se complete la operación
    time.sleep(1)
    
    # 6. Verificar que la carpeta fue eliminada
    folder_exists_after = project_folder.exists()
    print(f"\n📁 Carpeta después de eliminar: {'❌ Aún existe' if folder_exists_after else '✅ Eliminada'}")
    
    # 7. Verificar estadísticas actualizadas
    print("\n📊 Verificando estadísticas...")
    data_after = get_projects()
    final_count = len(data_after['projects'])
    final_stls = data_after['statistics']['total_stls']
    
    expected_count = initial_count - 1
    expected_stls = initial_stls - project_stls
    
    print(f"   Proyectos:")
    print(f"      Antes: {initial_count}")
    print(f"      Después: {final_count}")
    print(f"      Esperado: {expected_count}")
    print(f"      {'✅ Correcto' if final_count == expected_count else '❌ Incorrecto'}")
    
    print(f"\n   STLs:")
    print(f"      Antes: {initial_stls}")
    print(f"      Después: {final_stls}")
    print(f"      Esperado: {expected_stls}")
    print(f"      {'✅ Correcto' if final_stls == expected_stls else '❌ Incorrecto'}")
    
    # 8. Resumen
    all_passed = (
        not folder_exists_after and
        final_count == expected_count and
        final_stls == expected_stls
    )
    
    print(f"\n{'='*50}")
    print(f"   {'✅ TODOS LOS TESTS PASARON' if all_passed else '❌ ALGUNOS TESTS FALLARON'}")
    print(f"{'='*50}")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    try:
        exit(main())
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error de conexión: {e}")
        print("   ⚠️ Asegúrate de que el servidor esté corriendo en http://localhost:8000")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        exit(1)
