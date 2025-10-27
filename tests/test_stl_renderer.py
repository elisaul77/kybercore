#!/usr/bin/env python3
"""
Script para probar el renderizado STL y generar previews.
"""
import sys
from pathlib import Path

# Agregar el directorio src al path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.services.stl_renderer import STLRenderer

def test_stl_rendering():
    """Prueba el renderizado de un archivo STL."""
    print("🧪 Probando renderizado STL...")

    # Buscar un archivo STL en el proyecto
    projects_dir = Path("src/proyect")

    if not projects_dir.exists():
        print("❌ No existe el directorio de proyectos")
        return False

    stl_file = None
    for project_dir in projects_dir.iterdir():
        if project_dir.is_dir():
            files_dir = project_dir / "files"
            if files_dir.exists():
                for file in files_dir.iterdir():
                    if file.suffix.lower() == '.stl':
                        stl_file = file
                        break
            if stl_file:
                break

    if not stl_file:
        print("❌ No se encontró ningún archivo STL para probar")
        return False

    print(f"📁 Archivo STL encontrado: {stl_file}")

    # Crear directorio de salida
    output_dir = Path("test_output")
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / "test_preview.png"

    # Renderizar
    renderer = STLRenderer()
    image_bytes = renderer.render_stl_to_image(str(stl_file), str(output_file))

    if output_file.exists():
        print(f"✅ Preview generado exitosamente: {output_file}")
        print(f"   Tamaño: {output_file.stat().st_size} bytes")
        return True
    else:
        print("❌ Error generando el preview")
        return False

if __name__ == "__main__":
    success = test_stl_rendering()
    sys.exit(0 if success else 1)
