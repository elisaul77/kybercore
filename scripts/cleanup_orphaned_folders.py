#!/usr/bin/env python3
"""
Script para limpiar carpetas huérfanas de proyectos eliminados del JSON.
"""
import json
import shutil
from pathlib import Path
import sys

def load_projects_json():
    """Carga el archivo proyectos.json"""
    json_path = Path(__file__).parent.parent / "base_datos" / "proyectos.json"
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ No se encontró {json_path}")
        sys.exit(1)

def get_project_ids(data):
    """Obtiene todos los IDs de proyectos del JSON"""
    return set(p.get('id') for p in data.get('proyectos', []) if p.get('id'))

def find_orphaned_folders():
    """Encuentra carpetas de proyectos que no están en el JSON"""
    data = load_projects_json()
    valid_ids = get_project_ids(data)
    
    projects_dir = Path(__file__).parent.parent / "src" / "proyect"
    if not projects_dir.exists():
        print(f"⚠️ No existe el directorio {projects_dir}")
        return []
    
    orphaned = []
    for folder in projects_dir.iterdir():
        if not folder.is_dir():
            continue
        
        # Extraer ID del nombre de carpeta (formato: "nombre - ID")
        folder_name = folder.name
        if ' - ' in folder_name:
            try:
                folder_id = int(folder_name.split(' - ')[-1])
                if folder_id not in valid_ids:
                    orphaned.append((folder, folder_id))
            except ValueError:
                print(f"⚠️ No se pudo extraer ID de: {folder_name}")
    
    return orphaned

def main():
    print("🔍 Buscando carpetas huérfanas...")
    
    orphaned = find_orphaned_folders()
    
    if not orphaned:
        print("✅ No se encontraron carpetas huérfanas")
        return
    
    print(f"\n📋 Se encontraron {len(orphaned)} carpetas huérfanas:\n")
    for folder, folder_id in orphaned:
        print(f"   🗑️  ID {folder_id}: {folder.name}")
    
    print("\n⚠️ ADVERTENCIA: Esta operación eliminará permanentemente estas carpetas.")
    response = input("\n¿Deseas continuar? (yes/no): ")
    
    if response.lower() not in ['yes', 'y', 'si', 's']:
        print("❌ Operación cancelada")
        return
    
    print("\n🗑️ Eliminando carpetas huérfanas...")
    deleted_count = 0
    failed_count = 0
    
    for folder, folder_id in orphaned:
        try:
            shutil.rmtree(folder)
            print(f"   ✅ Eliminada: ID {folder_id}")
            deleted_count += 1
        except Exception as e:
            print(f"   ❌ Error eliminando ID {folder_id}: {e}")
            failed_count += 1
    
    print(f"\n📊 Resumen:")
    print(f"   ✅ Eliminadas exitosamente: {deleted_count}")
    if failed_count > 0:
        print(f"   ❌ Fallos: {failed_count}")
    
    # Recalcular estadísticas
    data = load_projects_json()
    total_stls = sum(len(p.get('archivos', [])) for p in data.get('proyectos', []))
    data['estadisticas']['total_stls'] = total_stls
    
    json_path = Path(__file__).parent.parent / "base_datos" / "proyectos.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Estadísticas actualizadas: {total_stls} STLs totales")

if __name__ == "__main__":
    main()
