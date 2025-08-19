from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
import json
import os
import zipfile
import shutil
from pathlib import Path
from datetime import datetime
import tempfile

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
@router.get("/projects/{project_slug}/images/{filename}")
async def get_project_image(project_slug: str, filename: str):
    """Sirve imágenes de proyectos"""
    # Resolver dinámicamente el slug buscando el proyecto en el JSON
    data = load_projects_data()

    # Intentar extraer ID del slug (forma: some-name-<id>)
    folder_name = None
    project = None
    try:
        if '-' in project_slug:
            possible_id = project_slug.split('-')[-1]
            if possible_id.isdigit():
                pid = int(possible_id)
                project = next((p for p in data['proyectos'] if p.get('id') == pid), None)
    except Exception:
        project = None

    # Si no se encontró por id, intentar buscar por campo 'imagen' que contenga el slug
    if not project:
        project = next((p for p in data['proyectos'] if p.get('imagen') and f"/api/gallery/projects/{project_slug}/" in p.get('imagen')), None)

    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Determinar carpeta del proyecto
    folder_name = project.get('carpeta') or f"{project.get('nombre')} - {project.get('id')}"

    # Construir ruta a la imagen
    image_path = os.path.join("src", "proyect", folder_name, "images", filename)

    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    return FileResponse(image_path)

@router.get("/projects/{project_slug}/file/{filename}")
async def get_project_file(project_slug: str, filename: str):
    """Sirve archivos STL de proyectos"""
    # Resolver dinámicamente el slug buscando el proyecto en el JSON
    data = load_projects_data()

    project = None
    try:
        if '-' in project_slug:
            possible_id = project_slug.split('-')[-1]
            if possible_id.isdigit():
                pid = int(possible_id)
                project = next((p for p in data['proyectos'] if p.get('id') == pid), None)
    except Exception:
        project = None

    if not project:
        project = next((p for p in data['proyectos'] if p.get('imagen') and f"/api/gallery/projects/{project_slug}/" in p.get('imagen')), None)

    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    folder_name = project.get('carpeta') or f"{project.get('nombre')} - {project.get('id')}"

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


@router.post("/projects/create")
async def create_project(
    name: str = Form(...),
    description: str = Form(""),
    category: str = Form("funcional"),
    zip_file: UploadFile = File(...)
):
    """Crear un nuevo proyecto desde un archivo ZIP"""
    
    # Validar archivo ZIP
    if not zip_file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un ZIP")
    
    # Cargar datos actuales
    data = load_projects_data()
    
    # Generar nuevo ID
    new_id = max((p.get('id', 0) for p in data['proyectos']), default=0) + 1
    
    # Crear directorio del proyecto
    project_dir = f"src/proyect/{name} - {new_id}"
    project_path = Path(project_dir)
    project_path.mkdir(parents=True, exist_ok=True)
    
    # Crear subdirectorios
    (project_path / "files").mkdir(exist_ok=True)
    (project_path / "images").mkdir(exist_ok=True)
    
    try:
        # Guardar archivo ZIP temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_zip:
            content = await zip_file.read()
            temp_zip.write(content)
            temp_zip_path = temp_zip.name
        
        # Extraer ZIP
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            extracted_files = []
            image_files = []
            
            for file_info in zip_ref.filelist:
                if file_info.is_dir():
                    continue
                
                # Obtener nombre de archivo sin ruta
                filename = os.path.basename(file_info.filename)
                if not filename:  # Saltear si es solo directorio
                    continue
                
                # Determinar dónde extraer según extensión
                file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
                
                if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                    # Extraer imágenes a carpeta images
                    dest_path = project_path / "images" / filename
                    with zip_ref.open(file_info) as source, open(dest_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                    image_files.append(filename)
                    
                elif file_ext in ['stl', 'obj', 'ply', 'gcode', 'gco', 'txt', 'md', 'json']:
                    # Extraer archivos 3D y documentos a carpeta files
                    dest_path = project_path / "files" / filename
                    with zip_ref.open(file_info) as source, open(dest_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                    extracted_files.append({
                        "nombre": filename,
                        "tipo": "STL" if file_ext == 'stl' else "G-code" if file_ext in ['gcode', 'gco'] else "Archivo",
                        "tamano": f"{file_info.file_size / 1024:.2f} KB" if file_info.file_size > 0 else "0 KB"
                    })
        
        # Limpiar archivo temporal
        os.unlink(temp_zip_path)
        
        # Crear nuevo proyecto en JSON
        new_project = {
            "id": new_id,
            "nombre": name,
            "descripcion": description,
            "autor": "Usuario",
            "fecha_creacion": datetime.now().strftime("%Y-%m-%d"),
            "estado": "listo",
            "favorito": False,
                # Usar ruta plural '/images/' para coincidir con la carpeta en el filesystem
                "imagen": f"/api/gallery/projects/{name.lower().replace(' ', '-')}-{new_id}/images/{image_files[0]}" if image_files else None,
            "badges": {
                "estado": "Listo",
                "tipo": category.title(),
                "piezas": f"{len([f for f in extracted_files if f['tipo'] == 'STL'])} piezas"
            },
            "progreso": {
                "porcentaje": 100,
                "mensaje": "Listo para imprimir"
            },
            "archivos": extracted_files,
            "estadisticas": {
                "tiempo_estimado": "2-4 horas",
                "filamento_estimado": "50-100g",
                "complejidad": "Media"
            },
            "aiAnalysis": {
                "tiempo_estimado": "3 horas",
                "filamento_total": "75g",
                "costo_estimado": "$2.50",
                "recomendaciones": [
                    "Usar soporte en voladizos",
                    "Temperatura de cama: 60°C"
                ]
            }
        }
        
        # Agregar proyecto a los datos
        data['proyectos'].append(new_project)
        
        # Actualizar estadísticas
        data['estadisticas']['total_proyectos'] = len(data['proyectos'])
        data['estadisticas']['total_stls'] += len([f for f in extracted_files if f['tipo'] == 'STL'])
        
        # Guardar datos actualizados
        if save_projects_data(data):
            return {
                "success": True,
                "message": f"Proyecto '{name}' creado correctamente",
                "project": new_project,
                "extracted_files": len(extracted_files),
                "images": len(image_files)
            }
        else:
            raise HTTPException(status_code=500, detail="Error al guardar el proyecto")
            
    except zipfile.BadZipFile:
        # Limpiar directorio si hay error
        if project_path.exists():
            shutil.rmtree(project_path)
        raise HTTPException(status_code=400, detail="El archivo ZIP está corrupto")
    
    except Exception as e:
        # Limpiar directorio si hay error
        if project_path.exists():
            shutil.rmtree(project_path)
        # Limpiar archivo temporal si existe
        if 'temp_zip_path' in locals() and os.path.exists(temp_zip_path):
            os.unlink(temp_zip_path)
        raise HTTPException(status_code=500, detail=f"Error al procesar el proyecto: {str(e)}")
