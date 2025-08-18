from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
import json
import os
from pathlib import Path

router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")

def load_projects_data():
    """Cargar datos de proyectos desde el archivo JSON"""
    json_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "proyectos.json")
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        # Datos por defecto si no existe el archivo
        return {
            "estadisticas": {
                "total_proyectos": 0,
                "total_stls": 0,
                "completados": 0,
                "en_progreso": 0,
                "tasa_exito": 0
            },
            "proyectos": []
        }

def save_projects_data(data):
    """Guardar datos de proyectos en el archivo JSON"""
    json_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "proyectos.json")
    try:
        with open(json_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error guardando proyectos: {e}")
        return False

@router.get("/gallery", response_class=HTMLResponse)
async def get_gallery_module(request: Request):
    """Endpoint para servir el módulo de galería de proyectos"""
    data = load_projects_data()
    return templates.TemplateResponse("modules/gallery_dynamic.html", {
        "request": request,
        "estadisticas": data["estadisticas"],
        "proyectos": data["proyectos"]
    })

@router.get("/projects")
async def get_projects():
    """API endpoint para obtener todos los proyectos"""
    data = load_projects_data()
    return {
        "projects": data["proyectos"],
        "statistics": data["estadisticas"]
    }

@router.get("/projects/{project_id}")
async def get_project(project_id: int):
    """API endpoint para obtener un proyecto específico"""
    data = load_projects_data()
    project = next((p for p in data["proyectos"] if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project

@router.get("/projects/{project_slug}/image/{filename}")
async def get_project_image(project_slug: str, filename: str):
    """Sirve imágenes de proyectos"""
    # Mapear slug a carpeta
    slug_to_folder = {
        "atx-power-supply-6749455": "ATX Power supply - 6749455",
        "aquarium-guard-tower-3139513": "Aquarium Guard Tower - 3139513", 
        "flexi-dog-2810483": "Flexi Dog - 2810483"
    }
    
    folder_name = slug_to_folder.get(project_slug)
    if not folder_name:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Construir ruta a la imagen
    image_path = os.path.join("src", "proyect", folder_name, "images", filename)
    
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    return FileResponse(image_path)

@router.get("/projects/{project_slug}/file/{filename}")
async def get_project_file(project_slug: str, filename: str):
    """Sirve archivos STL de proyectos"""
    # Mapear slug a carpeta
    slug_to_folder = {
        "atx-power-supply-6749455": "ATX Power supply - 6749455",
        "aquarium-guard-tower-3139513": "Aquarium Guard Tower - 3139513",
        "flexi-dog-2810483": "Flexi Dog - 2810483"
    }
    
    folder_name = slug_to_folder.get(project_slug)
    if not folder_name:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Construir ruta al archivo
    file_path = os.path.join("src", "proyect", folder_name, "files", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    return FileResponse(file_path, filename=filename)

@router.post("/projects/{project_id}/favorite")
async def toggle_favorite(project_id: int):
    """Cambiar estado de favorito de un proyecto"""
    data = load_projects_data()
    project = next((p for p in data["proyectos"] if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Cambiar estado de favorito
    project["favorito"] = not project.get("favorito", False)
    
    # Guardar cambios
    if save_projects_data(data):
        return {"message": "Estado de favorito actualizado", "favorito": project["favorito"]}
    else:
        raise HTTPException(status_code=500, detail="Error al guardar cambios")


@router.post("/projects/{project_id}/duplicate")
async def duplicate_project(project_id: int):
    """Duplica un proyecto y lo guarda en el JSON (simulación)."""
    data = load_projects_data()
    project = next((p for p in data["proyectos"] if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Crear copia superficial y asignar nuevo ID
    new_id = max((p.get('id', 0) for p in data['proyectos']), default=0) + 1
    new_project = json.loads(json.dumps(project))
    new_project['id'] = new_id
    new_project['nombre'] = f"{project.get('nombre')} - Copia"
    new_project['favorito'] = False
    data['proyectos'].append(new_project)

    # Actualizar estadísticas mínimas
    data['estadisticas']['total_proyectos'] = len(data['proyectos'])

    if save_projects_data(data):
        return {"message": "Proyecto duplicado", "project": new_project}
    else:
        raise HTTPException(status_code=500, detail="Error al guardar copia")


@router.post("/projects/{project_id}/delete")
async def delete_project(project_id: int):
    """Elimina un proyecto del JSON (simulación)."""
    data = load_projects_data()
    idx = next((i for i, p in enumerate(data['proyectos']) if p.get('id') == project_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    removed = data['proyectos'].pop(idx)
    data['estadisticas']['total_proyectos'] = len(data['proyectos'])

    if save_projects_data(data):
        return {"message": "Proyecto eliminado", "removed": removed}
    else:
        raise HTTPException(status_code=500, detail="Error al eliminar proyecto")


@router.post("/projects/{project_id}/export")
async def export_project(project_id: int):
    """Simula la exportación de un proyecto (no crea archivos)."""
    data = load_projects_data()
    project = next((p for p in data['proyectos'] if p.get('id') == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # En esta simulación solo devolvemos un mensaje
    return {"message": "Exportación iniciada", "project": {"id": project_id, "nombre": project.get('nombre')}}

@router.get("/projects/stats")
async def get_projects_stats():
    """Obtener estadísticas de proyectos"""
    data = load_projects_data()
    return data["estadisticas"]
