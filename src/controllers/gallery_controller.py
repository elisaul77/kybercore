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
import logging

# Importar servicio de extracción de imágenes de PDFs
from src.services.pdf_image_extractor import process_project_pdfs

logger = logging.getLogger(__name__)

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

    # Determinar carpeta del proyecto. Algunos proyectos guardaron la ruta completa
    # en el campo 'carpeta' (ej: 'src/proyect/ATX Power supply - 6749455'). En ese caso
    # no debemos volver a anteponer 'src/proyect' o generará una ruta duplicada.
    folder_name = project.get('carpeta') or f"{project.get('nombre')} - {project.get('id')}"

    # Normalizar base del directorio del proyecto
    if folder_name.startswith("src" + os.sep) or folder_name.startswith("src/"):
        base_folder = folder_name
    else:
        base_folder = os.path.join("src", "proyect", folder_name)

    # Construir ruta a la imagen
    image_path = os.path.join(base_folder, "images", filename)

    # DEBUG: imprimir información para entender fallos en la resolución de rutas
    try:
        print(f"[gallery_controller] Resuelto proyecto: {project.get('nombre')} (id={project.get('id')})")
        print(f"[gallery_controller] carpeta campo: {project.get('carpeta')}")
        print(f"[gallery_controller] image_path calculada: {image_path}")
        print(f"[gallery_controller] existe en FS: {os.path.exists(image_path)}")
    except Exception as _:
        print("[gallery_controller] DEBUG: error imprimiendo info del proyecto")

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

    # Normalizar base del directorio del proyecto (mismo criterio que para imágenes)
    if folder_name.startswith("src" + os.sep) or folder_name.startswith("src/"):
        base_folder = folder_name
    else:
        base_folder = os.path.join("src", "proyect", folder_name)

    # Construir ruta al archivo
    file_path = os.path.join(base_folder, "files", filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    return FileResponse(file_path, filename=filename)

@router.get("/projects/files/{project_id}/{filename}")
async def get_project_file_by_id(project_id: int, filename: str):
    """Sirve archivos STL de proyectos por ID del proyecto"""
    data = load_projects_data()
    project = next((p for p in data['proyectos'] if p.get('id') == project_id), None)

    if not project:
        raise HTTPException(status_code=404, detail=f"Proyecto no encontrado: {project_id}")

    folder_name = project.get('carpeta') or f"{project.get('nombre')} - {project.get('id')}"

    # Normalizar base del directorio del proyecto
    if folder_name.startswith("src" + os.sep) or folder_name.startswith("src/"):
        base_folder = folder_name
    else:
        base_folder = os.path.join("src", "proyect", folder_name)

    # Construir ruta al archivo
    file_path = os.path.join(base_folder, "files", filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Archivo no encontrado: {filename}")

    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")

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

    project_name = name
    temp_zip_path = None
    project_path = None
    source_badge = None

    try:
        # Guardar archivo ZIP temporalmente para inspección y extracción
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_zip:
            content = await zip_file.read()
            temp_zip.write(content)
            temp_zip_path = temp_zip.name

        # --- Lógica para extraer nombre del proyecto desde README.txt ---
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            # Buscar README.txt en el ZIP (insensible a mayúsculas/minúsculas y rutas)
            readme_filename = next((f for f in zip_ref.namelist() if f.lower().endswith('readme.txt')), None)
            
            if readme_filename:
                readme_content = zip_ref.read(readme_filename).decode('utf-8', errors='ignore')
                if "Thingiverse" in readme_content:
                    source_badge = "Thingiverse"
                    # Asumir formato 'NOMBRE : URL' en la primera línea
                    first_line = readme_content.splitlines()[0]
                    if ':' in first_line:
                        parsed_name = first_line.split(':')[0].strip()
                        # Limpiar el texto "on Thingiverse" del nombre
                        parsed_name = parsed_name.replace("on Thingiverse", "").strip()
                        if parsed_name:
                            project_name = parsed_name
        # --- Fin de la lógica del README ---

        # Cargar datos actuales
        data = load_projects_data()
        
        # Generar nuevo ID
        new_id = max((p.get('id', 0) for p in data['proyectos']), default=0) + 1
        
        # Crear directorio del proyecto con el nombre final
        project_dir = f"src/proyect/{project_name} - {new_id}"
        project_path = Path(project_dir)
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Crear subdirectorios
        (project_path / "files").mkdir(exist_ok=True)
        (project_path / "images").mkdir(exist_ok=True)
        
        # Extraer ZIP al directorio final
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            extracted_files = []
            image_files = []
            pdf_files = []
            
            # 🔍 Listar todos los archivos del ZIP para debugging
            logger.info(f"📦 Contenido del ZIP ({len(zip_ref.filelist)} elementos):")
            for idx, file_info in enumerate(zip_ref.filelist):
                logger.info(f"  [{idx+1}] {'DIR' if file_info.is_dir() else 'FILE'}: {file_info.filename} ({file_info.file_size} bytes)")
            
            for file_info in zip_ref.filelist:
                if file_info.is_dir():
                    continue
                
                filename = os.path.basename(file_info.filename)
                if not filename:
                    continue
                
                file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
                
                if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                    dest_path = project_path / "images" / filename
                    with zip_ref.open(file_info) as source, open(dest_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                    image_files.append(filename)
                
                elif file_ext == 'pdf':
                    # Guardar PDFs en el directorio files para procesarlos después
                    dest_path = project_path / "files" / filename
                    with zip_ref.open(file_info) as source, open(dest_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                    pdf_files.append(filename)
                    extracted_files.append({
                        "nombre": filename,
                        "tipo": "PDF",
                        "tamano": f"{file_info.file_size / 1024:.2f} KB" if file_info.file_size > 0 else "0 KB"
                    })
                    
                elif file_ext in ['stl', '3mf', 'obj', 'ply', 'gcode', 'gco', 'txt', 'md', 'json']:
                    dest_path = project_path / "files" / filename
                    with zip_ref.open(file_info) as source, open(dest_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                    
                    # Determinar el tipo de archivo
                    if file_ext in ['stl', '3mf', 'obj', 'ply']:
                        tipo = "3MF" if file_ext == '3mf' else "STL" if file_ext == 'stl' else "3D Model"
                    elif file_ext in ['gcode', 'gco']:
                        tipo = "G-code"
                    else:
                        tipo = "Archivo"
                    
                    extracted_files.append({
                        "nombre": filename,
                        "tipo": tipo,
                        "tamano": f"{file_info.file_size / 1024:.2f} KB" if file_info.file_size > 0 else "0 KB"
                    })
        
        # � Resumen de extracción
        stl_count = len([f for f in extracted_files if f['tipo'] in ['STL', '3D Model', '3MF']])
        logger.info(f"📊 Resumen de extracción:")
        logger.info(f"   - {stl_count} archivos 3D (STL/OBJ/PLY/3MF)")
        logger.info(f"   - {len(image_files)} imágenes")
        logger.info(f"   - {len(pdf_files)} archivos PDF")
        logger.info(f"   - {len(extracted_files)} archivos totales")
        
        if stl_count == 0:
            logger.warning(f"⚠️ ¡ATENCIÓN! No se encontraron archivos 3D en el ZIP.")
            logger.warning(f"⚠️ Verifica que hayas descargado los archivos MODEL FILES desde Printables, no solo el PDF de instrucciones.")
        
        # �📄 Procesar PDFs para extraer imágenes si no hay imágenes directas
        if not image_files and pdf_files:
            logger.info(f"📄 No se encontraron imágenes directas. Procesando {len(pdf_files)} PDFs...")
            try:
                extracted_pdf_images = process_project_pdfs(
                    project_path / "files",
                    project_path / "images"
                )
                if extracted_pdf_images:
                    # Obtener solo los nombres de archivo de las rutas completas
                    for img_path in extracted_pdf_images:
                        img_filename = os.path.basename(img_path)
                        image_files.append(img_filename)
                    logger.info(f"✅ Extraídas {len(image_files)} imágenes desde PDFs")
            except Exception as e:
                logger.error(f"❌ Error al procesar PDFs: {e}")
        
        # Crear el diccionario de badges base
        # Contar archivos 3D (STL, 3MF, etc.)
        num_3d_files = len([f for f in extracted_files if f['tipo'] in ['STL', '3MF', '3D Model']])
        badges = {
            "estado": "Listo",
            "tipo": category.title(),
            "piezas": f"{num_3d_files} piezas"
        }
        # Añadir el badge de origen si se identificó
        if source_badge:
            badges["origen"] = source_badge

        # Crear nuevo proyecto en JSON
        new_project = {
            "id": new_id,
            "nombre": project_name, # Usar el nombre final y limpio
            "descripcion": description,
            "autor": "Usuario",
            "fecha_creacion": datetime.now().strftime("%Y-%m-%d"),
            "estado": "listo",
            "favorito": False,
            "imagen": f"/api/gallery/projects/{project_name.lower().replace(' ', '-')}-{new_id}/images/{image_files[0]}" if image_files else None,
            "badges": badges,
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
        
        data['proyectos'].append(new_project)
        data['estadisticas']['total_proyectos'] = len(data['proyectos'])
        # Contar archivos 3D (STL, 3MF, etc.)
        data['estadisticas']['total_stls'] += len([f for f in extracted_files if f['tipo'] in ['STL', '3MF', '3D Model']])
        
        if save_projects_data(data):
            return {
                "success": True,
                "message": f"Proyecto '{project_name}' creado correctamente",
                "project": new_project,
                "extracted_files": len(extracted_files),
                "images": len(image_files)
            }
        else:
            raise HTTPException(status_code=500, detail="Error al guardar el proyecto")
            
    except zipfile.BadZipFile:
        if project_path and project_path.exists():
            shutil.rmtree(project_path)
        raise HTTPException(status_code=400, detail="El archivo ZIP está corrupto")
    
    except Exception as e:
        if project_path and project_path.exists():
            shutil.rmtree(project_path)
        raise HTTPException(status_code=500, detail=f"Error al procesar el proyecto: {str(e)}")

    finally:
        # Limpiar archivo temporal
        if temp_zip_path and os.path.exists(temp_zip_path):
            os.unlink(temp_zip_path)


@router.post("/projects/import-thingiverse")
async def import_thingiverse_project(request: Request):
    """Importa un proyecto desde Thingiverse o Printables usando su URL"""
    try:
        body = await request.json()
        url = body.get('url', '').strip()
        auto_analyze = body.get('auto_analyze', True)
        enable_nesting = body.get('enable_nesting', False)
        
        if not url:
            raise HTTPException(status_code=400, detail="URL es requerida")
        
        # Detectar plataforma y validar URL
        platform = None
        item_id = None
        
        if 'thingiverse.com/thing:' in url:
            platform = 'thingiverse'
            try:
                item_id = url.split('thing:')[1].split('/')[0].split('?')[0]
            except Exception:
                raise HTTPException(status_code=400, detail="No se pudo extraer el ID del proyecto de Thingiverse")
        
        elif 'printables.com/model/' in url:
            platform = 'printables'
            try:
                # URL format: https://www.printables.com/model/123456-project-name
                # or https://www.printables.com/model/123456
                model_part = url.split('printables.com/model/')[1]
                item_id = model_part.split('/')[0].split('-')[0].split('?')[0]
            except Exception:
                raise HTTPException(status_code=400, detail="No se pudo extraer el ID del modelo de Printables")
        
        else:
            raise HTTPException(status_code=400, detail="URL inválida. Debe ser una URL de Thingiverse o Printables")
        
        # Crear nombre de proyecto basado en la plataforma
        project_name = f"{platform.capitalize()}_{item_id}"
        
        # Crear carpeta del proyecto
        project_folder = Path("src/proyect") / f"{project_name}_{item_id}"
        project_folder.mkdir(parents=True, exist_ok=True)
        
        # Aquí implementarías la descarga real desde Thingiverse/Printables
        # Por ahora, creamos un proyecto de demostración
        
        # Cargar datos actuales
        data = load_projects_data()
        
        # Generar nuevo ID
        max_id = max([p['id'] for p in data['proyectos']], default=0)
        new_id = max_id + 1
        
        # Crear nuevo proyecto
        new_project = {
            "id": new_id,
            "nombre": project_name,
            "descripcion": f"Proyecto importado desde {platform.capitalize()} (ID:{item_id})",
            "autor": platform.capitalize(),
            "fecha_creacion": datetime.now().strftime("%Y-%m-%d"),
            "estado": "pendiente",
            "favorito": False,
            "imagen": None,
            "badges": {
                "estado": "Descargando",
                "tipo": "Importado",
                "piezas": "0 piezas",
                "origen": platform.capitalize()
            },
            "progreso": {
                "porcentaje": 10,
                "mensaje": "Proyecto importado, descarga en progreso..."
            },
            "archivos": [],
            "estadisticas": {
                "tiempo_estimado": "Por calcular",
                "filamento_estimado": "Por calcular",
                "complejidad": "Desconocida"
            },
            "aiAnalysis": {
                "tiempo_estimado": "Calculando...",
                "filamento_total": "0g",
                "costo_estimado": "$0.00",
                "recomendaciones": [
                    "Descarga en progreso",
                    "Análisis disponible después de la descarga"
                ]
            },
            "source": platform,
            "item_id": item_id,
            "original_url": url,
            "nesting_enabled": enable_nesting
        }
        
        # Agregar proyecto
        data['proyectos'].append(new_project)
        data['estadisticas']['total_proyectos'] = len(data['proyectos'])
        
        if save_projects_data(data):
            # Aquí podrías lanzar una tarea en segundo plano para descargar los archivos
            # Por ahora retornamos éxito inmediato
            
            return {
                "success": True,
                "message": f"Proyecto de {platform.capitalize()} importado correctamente",
                "name": project_name,
                "id": new_id,
                "platform": platform,
                "item_id": item_id,
                "stl_count": 0,  # Se actualizará después de la descarga
                "note": "La descarga de archivos se iniciará en segundo plano"
            }
        else:
            # Limpiar carpeta si falla el guardado
            if project_folder.exists():
                shutil.rmtree(project_folder)
            raise HTTPException(status_code=500, detail="Error al guardar el proyecto")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error importando desde Thingiverse: {e}")
        raise HTTPException(status_code=500, detail=f"Error al importar proyecto: {str(e)}")
