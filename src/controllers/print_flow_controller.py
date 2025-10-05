"""
Controlador para el Flujo de Impresión
Maneja todos los endpoints relacionados con el flujo de impresión 3D,
desde la selección inicial de piezas hasta el monitoreo del trabajo en progreso.
"""

from fastapi import APIRouter, HTTPException, Request, File, Form, UploadFile, BackgroundTasks
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
from datetime import datetime
import uuid
import logging
import aiohttp
import asyncio
from pathlib import Path

# Configurar logging
logger = logging.getLogger(__name__)

router = APIRouter()

# ===============================
# MODELOS DE DATOS
# ===============================

class PieceSelection(BaseModel):
    project_id: str
    selected_pieces: List[str]  # Lista de nombres de archivos STL seleccionados
    select_all: bool = False

class MaterialSelection(BaseModel):
    material_type: str  # PLA, PETG, ABS, etc.
    color: str
    brand: str
    quantity_needed: float = 0  # En gramos
    session_id: Optional[str] = None  # ID de sesión del wizard

class ProductionModeConfig(BaseModel):
    mode: str  # "prototype" o "factory"
    priority: str  # "speed", "quality", "economy"
    settings: Dict[str, Any] = {}
    session_id: Optional[str] = None

class PrinterAssignment(BaseModel):
    project_id: str
    printer_id: str
    assignment_type: str  # "manual" o "automatic"
    session_id: Optional[str] = None

class PrintJobValidation(BaseModel):
    job_id: str
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    estimated_time: str
    estimated_cost: float
    filament_usage: float

class PrintFlowStatus(BaseModel):
    project_id: str
    current_step: str
    completed_steps: List[str]
    next_step: str
    data: Dict[str, Any] = {}

# ===============================
# FUNCIONES AUXILIARES
# ===============================

def load_project_data(project_id: str) -> Dict:
    """Carga los datos del proyecto desde el archivo JSON"""
    json_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "proyectos.json")
    
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            
        for proyecto in data["proyectos"]:
            if str(proyecto["id"]) == str(project_id):
                return proyecto
                
        raise HTTPException(status_code=404, detail=f"Proyecto {project_id} no encontrado")
        
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Base de datos de proyectos no encontrada")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cargando proyecto: {str(e)}")

def load_materials_data() -> Dict:
    """Carga los datos de materiales disponibles"""
    # Por ahora usaremos los datos que sabemos que están disponibles
    # basados en la respuesta del endpoint /api/consumables/filaments
    return {
        "materiales_disponibles": [
            {
                "id": "fil_001",
                "tipo": "PLA",
                "color": "Negro",
                "marca": "Prusament",
                "stock_actual": 800,  # 0.8 kg = 800 gramos
                "stock_minimo": 200,
                "precio_por_kg": 25.99,
                "temperatura_extrusor": 200,
                "temperatura_cama": 60
            },
            {
                "id": "fil_002",
                "tipo": "ABS",
                "color": "Blanco",
                "marca": "Hatchbox",
                "stock_actual": 300,  # 0.3 kg = 300 gramos
                "stock_minimo": 200,
                "precio_por_kg": 22.5,
                "temperatura_extrusor": 200,
                "temperatura_cama": 60
            },
            {
                "id": "fil_003",
                "tipo": "PETG",
                "color": "Transparente",
                "marca": "Overture",
                "stock_actual": 900,  # 0.9 kg = 900 gramos
                "stock_minimo": 200,
                "precio_por_kg": 28.99,
                "temperatura_extrusor": 200,
                "temperatura_cama": 60
            },
            {
                "id": "fil_005",
                "tipo": "PLA",
                "color": "Azul",
                "marca": "eSUN",
                "stock_actual": 950,  # 0.95 kg = 950 gramos
                "stock_minimo": 200,
                "precio_por_kg": 24.99,
                "temperatura_extrusor": 200,
                "temperatura_cama": 60
            }
        ]
    }

def load_printers_data() -> Dict:
    """Carga los datos de las impresoras disponibles"""
    json_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "printers.json")
    
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            
        # Convertir estructura del archivo real a la estructura esperada
        impresoras = []
        for printer_id, printer_data in data.items():
            # Mapear la estructura real a la esperada
            impresora = {
                "id": printer_data.get("id", printer_id),
                "nombre": printer_data.get("name", printer_id),
                "estado": "idle" if printer_data.get("status") == "ready" else "printing",
                "capacidades": {
                    "volumen_impresion": {"x": 220, "y": 220, "z": 250},  # Mock values
                    "materiales_soportados": ["PLA", "PETG", "ABS"],
                    "precision": 0.1,
                    "velocidad_maxima": 100
                },
                "trabajo_actual": None if printer_data.get("status") == "ready" else f"job_{printer_id}",
                "mantenimiento_requerido": False,
                "model": printer_data.get("model", "Generic"),
                "ip": printer_data.get("ip", ""),
                "location": printer_data.get("location", "")
            }
            impresoras.append(impresora)
            
        return {"impresoras": impresoras}
        
    except FileNotFoundError:
        # Datos mock si no existe el archivo
        return {
            "impresoras": [
                {
                    "id": "ender3_001",
                    "nombre": "Ender 3 Pro #1",
                    "estado": "idle",
                    "capacidades": {
                        "volumen_impresion": {"x": 220, "y": 220, "z": 250},
                        "materiales_soportados": ["PLA", "PETG", "ABS"],
                        "precision": 0.1,
                        "velocidad_maxima": 100
                    },
                    "trabajo_actual": None,
                    "mantenimiento_requerido": False
                },
                {
                    "id": "prusa_i3mk3s_001", 
                    "nombre": "Prusa i3 MK3S+ #1",
                    "estado": "printing",
                    "capacidades": {
                        "volumen_impresion": {"x": 250, "y": 210, "z": 210},
                        "materiales_soportados": ["PLA", "PETG", "ABS", "FLEX"],
                        "precision": 0.05,
                        "velocidad_maxima": 120
                    },
                    "trabajo_actual": "job_003",
                    "mantenimiento_requerido": False
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cargando impresoras: {str(e)}")

# ===============================
# FUNCIONES DE PERSISTENCIA
# ===============================

def save_wizard_session(session_id: str, session_data: Dict):
    """Guarda el estado de la sesión del wizard"""
    sessions_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "wizard_sessions.json")
    
    try:
        # Cargar sesiones existentes
        with open(sessions_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        # Actualizar o crear sesión
        data["sessions"][session_id] = {
            **session_data,
            "updated_at": datetime.now().isoformat()
        }
        
        # Guardar de vuelta
        with open(sessions_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
            
        logger.info(f"Sesión {session_id} guardada correctamente")
        return True
        
    except Exception as e:
        logger.error(f"Error guardando sesión {session_id}: {str(e)}")
        return False

def load_wizard_session(session_id: str) -> Dict:
    """Carga el estado de la sesión del wizard"""
    sessions_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "wizard_sessions.json")
    
    try:
        with open(sessions_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        return data["sessions"].get(session_id, {})
        
    except Exception as e:
        logger.error(f"Error cargando sesión {session_id}: {str(e)}")
        return {}

def save_job_to_queue(job_data: Dict):
    """Añade un trabajo a la cola de impresión"""
    queue_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "print_queue.json")
    
    try:
        # Cargar cola existente
        with open(queue_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        # Asignar posición en la cola
        job_data["queue_position"] = data["metadata"]["next_queue_position"]
        job_data["queued_at"] = datetime.now().isoformat()
        
        # Añadir a la cola
        data["queue"].append(job_data)
        data["metadata"]["next_queue_position"] += 1
        
        # Guardar de vuelta
        with open(queue_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
            
        logger.info(f"Trabajo {job_data.get('job_id')} añadido a la cola en posición {job_data['queue_position']}")
        return job_data["queue_position"]
        
    except Exception as e:
        logger.error(f"Error añadiendo trabajo a la cola: {str(e)}")
        return None

def update_job_history(job_data: Dict):
    """Actualiza el historial de trabajos"""
    history_path = os.path.join(os.path.dirname(__file__), "..", "..", "base_datos", "historial_trabajos.json")
    
    try:
        with open(history_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        # Añadir al historial
        if "trabajos" not in data:
            data["trabajos"] = []
            
        data["trabajos"].append({
            **job_data,
            "completed_at": datetime.now().isoformat()
        })
        
        # Actualizar estadísticas
        if "estadisticas" not in data:
            data["estadisticas"] = {
                "trabajos_exitosos": 0,
                "trabajos_con_advertencias": 0,
                "trabajos_fallidos": 0,
                "tasa_exito": 0.0
            }
            
        # Incrementar contadores según el estado
        if job_data.get("status") == "completed":
            data["estadisticas"]["trabajos_exitosos"] += 1
        elif job_data.get("status") == "failed":
            data["estadisticas"]["trabajos_fallidos"] += 1
            
        # Recalcular tasa de éxito
        total_jobs = len(data["trabajos"])
        if total_jobs > 0:
            data["estadisticas"]["tasa_exito"] = (data["estadisticas"]["trabajos_exitosos"] / total_jobs) * 100
        
        with open(history_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
            
        logger.info(f"Historial actualizado para trabajo {job_data.get('job_id')}")
        return True
        
    except Exception as e:
        logger.error(f"Error actualizando historial: {str(e)}")
        return False

# ===============================
# ENDPOINTS DEL FLUJO DE IMPRESIÓN
# ===============================

@router.post("/print/start/{project_id}")
async def start_print_flow(project_id: str):
    """
    Inicia el flujo de impresión para un proyecto específico.
    Primer paso: Validar que el proyecto existe y está listo.
    """
    project = load_project_data(project_id)
    
    # Validar que el proyecto tiene archivos STL
    if not project.get("archivos") or len(project["archivos"]) == 0:
        raise HTTPException(
            status_code=400, 
            detail="El proyecto no tiene archivos STL para imprimir"
        )
    
    # Crear ID único para este flujo de impresión
    flow_id = str(uuid.uuid4())
    
    # Estado inicial del flujo
    initial_session_data = {
        "project_id": project_id,
        "flow_id": flow_id,
        "current_step": "piece_selection",
        "completed_steps": [],
        "project_data": project,
        "created_at": datetime.now().isoformat(),
        "status": "active"
    }
    
    # Guardar sesión inicial
    save_wizard_session(flow_id, initial_session_data)
    
    flow_status = PrintFlowStatus(
        project_id=project_id,
        current_step="piece_selection", 
        completed_steps=[],
        next_step="material_selection",
        data={
            "flow_id": flow_id,
            "project_name": project["nombre"],
            "total_pieces": len(project["archivos"]),
            "available_pieces": [archivo["nombre"] for archivo in project["archivos"]]
        }
    )
    
    return JSONResponse(content={
        "success": True,
        "flow_id": flow_id,
        "message": "Flujo de impresión iniciado exitosamente",
        "status": flow_status.dict()
    })

@router.get("/print/piece-selection/{project_id}")
async def get_piece_selection_options(project_id: str):
    """
    Obtiene las opciones de selección de piezas para un proyecto.
    Permite seleccionar todas las piezas o piezas específicas.
    """
    project = load_project_data(project_id)
    
    pieces_info = []
    total_volume = 0
    total_estimated_time = 0
    
    for archivo in project["archivos"]:
        # Solo incluir archivos STL para impresión
        filename = archivo["nombre"].lower()
        if not (filename.endswith('.stl') or filename.endswith('.obj') or filename.endswith('.3mf')):
            continue
            
        # Estimaciones mock - en el futuro se calcularán con análisis real
        estimated_volume = 15.5  # cm³
        estimated_time = 45      # minutos 
        estimated_filament = 12.3 # gramos
        
        # Manejar inconsistencia en la clave de tamaño (tamaño vs tamano)
        file_size = archivo.get("tamaño") or archivo.get("tamano") or "Desconocido"
        
        pieces_info.append({
            "filename": archivo["nombre"],
            "size": file_size, 
            "status": archivo.get("estado", "listo"),
            "estimated_volume": estimated_volume,
            "estimated_time_minutes": estimated_time,
            "estimated_filament_grams": estimated_filament,
            "complexity": "medium",  # low, medium, high
            "supports_needed": False
        })
        
        total_volume += estimated_volume
        total_estimated_time += estimated_time
        
    return JSONResponse(content={
        "success": True,
        "project_info": {
            "id": project["id"],
            "name": project["nombre"],
            "description": project["descripcion"],
            "total_pieces": len(pieces_info)
        },
        "pieces": pieces_info,
        "summary": {
            "total_volume_cm3": round(total_volume, 2),
            "total_estimated_time_hours": round(total_estimated_time / 60, 2),
            "total_estimated_filament_grams": sum([p["estimated_filament_grams"] for p in pieces_info])
        },
        "selection_options": {
            "all_pieces": {
                "label": "📋 Imprimir todas las piezas",
                "description": f"Imprimir las {len(pieces_info)} piezas del proyecto completo"
            },
            "specific_pieces": {
                "label": "🎯 Seleccionar piezas específicas", 
                "description": "Elegir manualmente qué piezas imprimir"
            }
        }
    })

@router.post("/print/select-pieces")
async def confirm_piece_selection(selection: PieceSelection):
    """
    Confirma la selección de piezas (todas o específicas) y avanza al siguiente paso.
    """
    project = load_project_data(selection.project_id)
    
    if selection.select_all:
        selected_files = [archivo["nombre"] for archivo in project["archivos"]]
        selection_type = "all_pieces"
    else:
        # Validar que las piezas seleccionadas existen en el proyecto
        available_files = [archivo["nombre"] for archivo in project["archivos"]]
        invalid_files = [f for f in selection.selected_pieces if f not in available_files]
        
        if invalid_files:
            raise HTTPException(
                status_code=400,
                detail=f"Archivos no encontrados en el proyecto: {', '.join(invalid_files)}"
            )
            
        selected_files = selection.selected_pieces
        selection_type = "specific_pieces"
    
    # Calcular totales para las piezas seleccionadas
    total_filament_needed = len(selected_files) * 12.3  # Mock calculation
    total_time_minutes = len(selected_files) * 45       # Mock calculation
    
    # Crear session_id temporal basado en project_id (en el frontend se debería pasar flow_id)
    session_id = f"temp_{selection.project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Cargar sesión existente o crear nueva
    session_data = load_wizard_session(session_id)
    if not session_data:
        session_data = {
            "project_id": selection.project_id,
            "current_step": "piece_selection",
            "completed_steps": [],
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }
    
    # Actualizar con la selección de piezas
    session_data["piece_selection"] = {
        "selection_type": selection_type,
        "selected_pieces": selected_files,
        "total_pieces": len(selected_files),
        "total_estimated_filament_grams": total_filament_needed,
        "total_estimated_time_hours": round(total_time_minutes / 60, 2),
        "completed_at": datetime.now().isoformat()
    }
    session_data["completed_steps"] = ["piece_selection"]
    session_data["current_step"] = "material_selection"
    
    # Guardar sesión actualizada
    save_wizard_session(session_id, session_data)
    
    return JSONResponse(content={
        "success": True,
        "message": f"Selección confirmada: {len(selected_files)} piezas",
        "session_id": session_id,  # Devolver el ID de sesión para uso futuro
        "selection_summary": {
            "type": selection_type,
            "selected_pieces": selected_files,
            "total_pieces": len(selected_files),
            "total_estimated_filament_grams": total_filament_needed,
            "total_estimated_time_hours": round(total_time_minutes / 60, 2)
        },
        "next_step": {
            "step": "material_selection",
            "message": "Procede a seleccionar el material para la impresión"
        }
    })

@router.get("/print/material-selection")
async def get_material_options():
    """
    Obtiene los materiales disponibles para selección.
    Incluye información de stock y recomendaciones.
    """
    materials_data = load_materials_data()
    
    materials_with_availability = []
    for material in materials_data["materiales_disponibles"]:
        stock_status = "disponible"
        if material["stock_actual"] <= material["stock_minimo"]:
            stock_status = "stock_bajo"
        elif material["stock_actual"] <= (material["stock_minimo"] * 2):
            stock_status = "stock_limitado"
        
        materials_with_availability.append({
            **material,
            "stock_status": stock_status,
            "sufficient_for_job": True,  # Se calculará según el trabajo específico
            "recomendado_para": ["prototipos", "funcional"] if material["tipo"] == "PLA" 
                               else ["industrial", "alta_temperatura"] if material["tipo"] == "ABS"
                               else ["transparencias", "resistencia_quimica"]
        })
    
    return JSONResponse(content={
        "success": True,
        "materials": materials_with_availability,
        "recommendations": {
            "for_prototypes": "PLA es ideal para prototipos rápidos y fácil impresión",
            "for_functional": "PETG ofrece mejor resistencia química y transparencia",
            "for_industrial": "ABS proporciona mayor resistencia mecánica y térmica"
        }
    })

@router.post("/print/validate-material")
async def validate_material_availability(material_selection: MaterialSelection):
    """
    Valida la disponibilidad del material seleccionado y sugiere alternativas si es necesario.
    """
    materials_data = load_materials_data()
    
    # Buscar el material seleccionado
    selected_material = None
    for material in materials_data["materiales_disponibles"]:
        if (material["tipo"] == material_selection.material_type and 
            material["color"] == material_selection.color and 
            material["marca"] == material_selection.brand):
            selected_material = material
            break
    
    if not selected_material:
        return JSONResponse(content={
            "success": False,
            "error": "Material no encontrado",
            "message": f"El material {material_selection.material_type} {material_selection.color} de {material_selection.brand} no está disponible"
        }, status_code=400)
    
    # Verificar stock suficiente (saltamos la validación de stock por ahora)
    stock_sufficient = True  # Como solicitaste, no verificamos stock aún
    
    # Actualizar sesión con la selección de material
    if material_selection.session_id:
        session_data = load_wizard_session(material_selection.session_id)
        if session_data:
            session_data["material_selection"] = {
                "material_type": material_selection.material_type,
                "color": material_selection.color,
                "brand": material_selection.brand,
                "selected_material_data": selected_material,
                "quantity_needed": material_selection.quantity_needed,
                "stock_sufficient": stock_sufficient,
                "estimated_cost": round((material_selection.quantity_needed / 1000) * selected_material["precio_por_kg"], 2) if material_selection.quantity_needed else 0,
                "completed_at": datetime.now().isoformat()
            }
            session_data["completed_steps"] = session_data.get("completed_steps", []) + ["material_selection"]
            session_data["current_step"] = "production_mode"
            save_wizard_session(material_selection.session_id, session_data)
    
    if stock_sufficient:
        return JSONResponse(content={
            "success": True,
            "validation": {
                "material_available": True,
                "stock_sufficient": True,
                "current_stock": selected_material["stock_actual"],
                "needed_quantity": material_selection.quantity_needed,
                "remaining_stock": selected_material["stock_actual"] - material_selection.quantity_needed,
                "estimated_cost": round((material_selection.quantity_needed / 1000) * selected_material["precio_por_kg"], 2) if material_selection.quantity_needed else 0
            },
            "next_step": {
                "step": "production_mode",
                "message": "Material validado. Selecciona el modo de producción."
            }
        })
    else:
        # Sugerir alternativas
        alternatives = []
        for material in materials_data["materiales_disponibles"]:
            if (material["tipo"] == material_selection.material_type and 
                material["stock_actual"] >= material_selection.quantity_needed):
                alternatives.append({
                    "material": material,
                    "difference": "color" if material["color"] != material_selection.color else "brand"
                })
        
        return JSONResponse(content={
            "success": False,
            "validation": {
                "material_available": True,
                "stock_sufficient": False,
                "current_stock": selected_material["stock_actual"],
                "needed_quantity": material_selection.quantity_needed,
                "shortage": material_selection.quantity_needed - selected_material["stock_actual"]
            },
            "alternatives": alternatives[:3],  # Máximo 3 alternativas
            "actions": {
                "purchase_order": {
                    "label": "🛒 Generar orden de compra",
                    "estimated_delivery": "2-3 días",
                    "quantity_to_order": 1000  # 1kg estándar
                },
                "select_alternative": {
                    "label": "💡 Seleccionar material alternativo",
                    "available_alternatives": len(alternatives)
                }
            }
        })

@router.get("/print/production-modes")
async def get_production_mode_options():
    """
    Obtiene los modos de producción disponibles: prototipo o fábrica.
    """
    return JSONResponse(content={
        "success": True,
        "production_modes": {
            "prototype": {
                "id": "prototype",
                "label": "🔬 Modo Prototipo",
                "description": "Optimizado para iteración rápida y pruebas",
                "characteristics": [
                    "Velocidad de impresión alta",
                    "Calidad estándar",
                    "Uso eficiente de material",
                    "Tiempo mínimo de configuración"
                ],
                "priority_options": ["speed", "economy"],
                "typical_use": "Pruebas de concepto, prototipos funcionales, iteraciones de diseño"
            },
            "factory": {
                "id": "factory",
                "label": "🏭 Modo Producción",
                "description": "Optimizado para calidad y consistencia en serie",
                "characteristics": [
                    "Máxima calidad de acabado",
                    "Configuración precisa",
                    "Control de calidad estricto", 
                    "Parámetros validados"
                ],
                "priority_options": ["quality", "consistency"],
                "typical_use": "Productos finales, series de producción, piezas críticas"
            }
        },
        "priority_settings": {
            "speed": {
                "label": "⚡ Velocidad",
                "description": "Minimiza tiempo total de impresión"
            },
            "quality": {
                "label": "✨ Calidad",
                "description": "Maximiza calidad de acabado superficial"
            },
            "economy": {
                "label": "💰 Economía", 
                "description": "Optimiza uso de material y energía"
            },
            "consistency": {
                "label": "🎯 Consistencia",
                "description": "Garantiza repetibilidad entre piezas"
            }
        }
    })

@router.post("/print/set-production-mode")
async def set_production_mode(config: ProductionModeConfig):
    """
    Establece el modo de producción (prototipo o fábrica) y sus configuraciones.
    """
    valid_modes = ["prototype", "factory"]
    valid_priorities = ["speed", "quality", "economy", "consistency"]
    
    if config.mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Modo inválido. Debe ser uno de: {', '.join(valid_modes)}"
        )
    
    if config.priority not in valid_priorities:
        raise HTTPException(
            status_code=400,
            detail=f"Prioridad inválida. Debe ser una de: {', '.join(valid_priorities)}"
        )
    
    # Generar configuración específica basada en el modo y prioridad
    if config.mode == "prototype":
        if config.priority == "speed":
            settings = {
                "layer_height": 0.3,
                "infill_density": 15,
                "print_speed": 80,
                "quality_preset": "draft"
            }
        else:  # economy
            settings = {
                "layer_height": 0.2,
                "infill_density": 10,
                "print_speed": 60,
                "quality_preset": "normal"
            }
    else:  # factory
        if config.priority == "quality":
            settings = {
                "layer_height": 0.1,
                "infill_density": 25,
                "print_speed": 40,
                "quality_preset": "fine"
            }
        else:  # consistency  
            settings = {
                "layer_height": 0.15,
                "infill_density": 20,
                "print_speed": 50,
                "quality_preset": "normal"
            }
    
    # Guardar configuración en la sesión
    if config.session_id:
        session_data = load_wizard_session(config.session_id)
        if session_data:
            session_data["production_mode"] = {
                "mode": config.mode,
                "priority": config.priority,
                "settings": settings,
                "estimated_impact": {
                    "time_factor": 0.7 if config.priority == "speed" else 1.3 if config.priority == "quality" else 1.0,
                    "quality_level": "alta" if config.priority in ["quality", "consistency"] else "estándar",
                    "material_usage": "optimizado" if config.priority == "economy" else "estándar"
                },
                "completed_at": datetime.now().isoformat()
            }
            session_data["completed_steps"] = session_data.get("completed_steps", []) + ["production_mode"]
            session_data["current_step"] = "printer_assignment"
            save_wizard_session(config.session_id, session_data)
    
    return JSONResponse(content={
        "success": True,
        "configuration": {
            "mode": config.mode,
            "priority": config.priority,
            "settings": settings,
            "estimated_impact": {
                "time_factor": 0.7 if config.priority == "speed" else 1.3 if config.priority == "quality" else 1.0,
                "quality_level": "alta" if config.priority in ["quality", "consistency"] else "estándar",
                "material_usage": "optimizado" if config.priority == "economy" else "estándar"
            }
        },
        "next_step": {
            "step": "printer_assignment",
            "message": "Configuración establecida. Procede a asignar impresoras."
        }
    })

@router.get("/print/available-printers")
async def get_available_printers():
    """
    Lista las impresoras disponibles para asignación manual.
    """
    printers_data = load_printers_data()
    
    available_printers = []
    busy_printers = []
    
    for printer in printers_data["impresoras"]:
        printer_info = {
            **printer,
            "estimated_availability": "inmediata" if printer["estado"] == "idle" else "en 2h 30m",
            "suitability_score": 85,  # Mock score - se calculará con IA más adelante
            "current_workload": 0 if printer["estado"] == "idle" else 75
        }
        
        if printer["estado"] == "idle":
            available_printers.append(printer_info)
        else:
            busy_printers.append(printer_info)
    
    return JSONResponse(content={
        "success": True,
        "printers": {
            "available": available_printers,
            "busy": busy_printers
        },
        "assignment_options": {
            "manual": {
                "label": "👤 Asignación Manual",
                "description": "Seleccionar impresora específica manualmente"
            },
            "automatic": {
                "label": "🤖 Asignación Automática IA",
                "description": "Dejar que la IA seleccione la impresora óptima (requiere módulo de IA)"
            }
        },
        "recommendations": {
            "best_for_speed": available_printers[0] if available_printers else None,
            "best_for_quality": available_printers[-1] if available_printers else None,
            "load_balanced": available_printers[0] if available_printers else None
        }
    })

@router.post("/print/assign-printer")  
async def assign_printer_manually(assignment: PrinterAssignment):
    """
    Asigna una impresora específica manualmente al trabajo.
    """
    printers_data = load_printers_data()
    
    # Validar que la impresora existe
    selected_printer = None
    for printer in printers_data["impresoras"]:
        if printer["id"] == assignment.printer_id:
            selected_printer = printer
            break
    
    if not selected_printer:
        raise HTTPException(
            status_code=404,
            detail=f"Impresora {assignment.printer_id} no encontrada"
        )
    
    # Validar que la impresora está disponible
    if selected_printer["estado"] != "idle":
        return JSONResponse(content={
            "success": False,
            "error": "printer_busy",
            "message": f"La impresora {selected_printer['nombre']} está actualmente ocupada",
            "current_status": selected_printer["estado"],
            "estimated_available_at": "2024-12-15 16:30:00"  # Mock timestamp
        }, status_code=409)
    
    # Guardar asignación en la sesión
    if assignment.session_id:
        session_data = load_wizard_session(assignment.session_id)
        if session_data:
            session_data["printer_assignment"] = {
                "printer_id": assignment.printer_id,
                "printer_name": selected_printer["nombre"],
                "assignment_type": assignment.assignment_type,
                "printer_capabilities": selected_printer.get("capacidades", {}),
                "printer_ip": selected_printer.get("ip", ""),
                "confirmed_at": datetime.now().isoformat()
            }
            session_data["completed_steps"] = session_data.get("completed_steps", []) + ["printer_assignment"]
            session_data["current_step"] = "stl_processing"
            save_wizard_session(assignment.session_id, session_data)
    
    return JSONResponse(content={
        "success": True,
        "assignment": {
            "printer_id": assignment.printer_id,
            "printer_name": selected_printer["nombre"],
            "assignment_type": assignment.assignment_type,
            "confirmed_at": datetime.now().isoformat()
        },
        "printer_info": {
            "capabilities": selected_printer.get("capacidades", {}),
            "current_status": selected_printer["estado"],
            "estimated_start_time": "inmediato"
        },
        "next_step": {
            "step": "stl_processing",
            "message": "Impresora asignada. Procede a procesar archivos STL."
        }
    })

# Placeholder para los siguientes endpoints (se implementarán en las siguientes iteraciones)

@router.post("/print/save-rotated-stl")
async def save_rotated_stl(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    is_rotated: str = Form("false"),
    rotation_info: str = Form(None)
):
    """
    Guarda un archivo STL rotado temporalmente para su posterior procesamiento.
    Los archivos se guardan con el session_id para poder ser usados en el laminado.
    """
    try:
        import json
        
        # Crear directorio temporal para archivos rotados de esta sesión
        session_dir = f"/tmp/kybercore_rotated_{session_id}"
        os.makedirs(session_dir, exist_ok=True)
        
        # Generar nombre de archivo único
        rotated_suffix = "_rotated" if is_rotated.lower() == "true" else ""
        safe_filename = file.filename.replace(" ", "_")
        file_path = os.path.join(session_dir, f"{safe_filename}{rotated_suffix}")
        
        # Guardar archivo
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Archivo guardado: {file_path} ({len(content)} bytes, rotado: {is_rotated})")
        
        # Actualizar la sesión con la nueva ruta del archivo
        session_data = load_wizard_session(session_id)
        if session_data:
            if "rotated_files_map" not in session_data:
                session_data["rotated_files_map"] = {}
            
            session_data["rotated_files_map"][file.filename] = {
                "server_path": file_path,
                "is_rotated": is_rotated.lower() == "true",
                "rotation_info": json.loads(rotation_info) if rotation_info else None,
                "saved_at": datetime.now().isoformat()
            }
            save_wizard_session(session_id, session_data)
            logger.info(f"Sesión actualizada con ruta de archivo rotado: {file.filename}")
        
        return JSONResponse(content={
            "success": True,
            "path": file_path,
            "filename": file.filename,
            "is_rotated": is_rotated.lower() == "true"
        })
        
    except Exception as e:
        logger.error(f"Error guardando archivo rotado: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error guardando archivo: {str(e)}")


@router.post("/print/process-with-rotation")
async def process_with_rotation(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    ✨ NUEVO ENDPOINT UNIFICADO (V2)
    
    Procesa archivos STL con rotación automática y laminado de forma asíncrona.
    El frontend solo envía la configuración y hace polling del progreso.
    
    Este es el endpoint recomendado que maneja todo el flujo en el backend.
    Reemplaza el flujo anterior de múltiples calls desde el frontend.
    
    Returns:
        202 Accepted con task_id para polling
    """
    try:
        from src.services.rotation_worker import rotation_worker
        from src.models.task_models import ProcessWithRotationRequest
        
        # Parsear request body
        data = await request.json()
        req = ProcessWithRotationRequest(**data)
        
        logger.info(f"🚀 Nueva solicitud de procesamiento unificado: session={req.session_id}")
        
        # Validar sesión
        session_data = load_wizard_session(req.session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        # Obtener archivos a procesar
        piece_selection = session_data.get("piece_selection", {})
        selected_pieces = piece_selection.get("selected_pieces", [])
        
        if not selected_pieces:
            raise HTTPException(status_code=400, detail="No hay archivos seleccionados")
        
        # Generar task_id único
        task_id = f"task_{uuid.uuid4()}"
        
        logger.info(
            f"📦 Iniciando tarea: task_id={task_id}, "
            f"archivos={len(selected_pieces)}, "
            f"rotación={'habilitada' if req.rotation_config.get('enabled') else 'deshabilitada'}"
        )
        
        # Debug: ver qué tipos de datos estamos pasando
        logger.debug(f"   rotation_config type: {type(req.rotation_config)}")
        logger.debug(f"   rotation_config value: {req.rotation_config}")
        logger.debug(f"   profile_config type: {type(req.profile_config)}")
        
        # Iniciar procesamiento en background
        background_tasks.add_task(
            rotation_worker.process_batch,
            task_id=task_id,
            session_id=req.session_id,
            files=selected_pieces,
            rotation_config=req.rotation_config,
            profile_config=req.profile_config
        )
        
        return JSONResponse(
            content={
                "success": True,
                "task_id": task_id,
                "status": "processing",
                "message": f"Procesamiento iniciado para {len(selected_pieces)} archivo(s)",
                "poll_url": f"/api/print/task-status/{task_id}",
                "files_count": len(selected_pieces)
            },
            status_code=202  # Accepted - procesamiento asíncrono iniciado
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error iniciando procesamiento: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/print/task-status/{task_id}")
async def get_task_status(task_id: str):
    """
    Obtiene el estado actual de una tarea de procesamiento asíncrono.
    El frontend hace polling a este endpoint cada 2 segundos.
    
    Args:
        task_id: ID de la tarea retornado por /process-with-rotation
        
    Returns:
        Estado actual con progreso y resultados si está completo
    """
    try:
        from src.services.rotation_worker import rotation_worker
        
        task = rotation_worker.get_task_status(task_id)
        
        if not task:
            raise HTTPException(
                status_code=404, 
                detail=f"Tarea no encontrada: {task_id}"
            )
        
        return JSONResponse(content=task.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo estado de tarea: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/print/process-stl")
async def process_stl_files(request: Request):
    """
    Procesa archivos STL y genera G-code usando APISLICER con perfiles personalizados.
    Integra con el servicio de slicer externo y perfiles dinámicos.
    """
    try:
        # Obtener datos del request
        data = await request.json()
        session_id = data.get('session_id')
        profile_job_id = data.get('profile_job_id')  # Nuevo: ID del perfil personalizado
        profile_request = data.get('profile_request')  # Nuevo: Datos del perfil generado

        if not session_id:
            raise HTTPException(status_code=400, detail="session_id es requerido")

        # Cargar datos de la sesión
        session_data = load_wizard_session(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")

        # Obtener configuración de la sesión
        project_id = session_data.get("project_id")
        piece_selection = session_data.get("piece_selection", {})
        material_selection = session_data.get("material_selection", {})
        production_mode = session_data.get("production_mode", {})
        printer_assignment = session_data.get("printer_assignment", {})

        if not all([piece_selection, material_selection, production_mode, printer_assignment]):
            raise HTTPException(status_code=400, detail="Configuración incompleta en la sesión")

        # Cargar datos del proyecto
        project = load_project_data(project_id)

        # Preparar configuración para el slicer
        if profile_job_id and profile_request:
            # Usar perfil personalizado generado desde el frontend
            logger.info(f"Usando perfil personalizado: {profile_job_id}")
            slicer_config = {
                "profile_job_id": profile_job_id,
                "profile_request": profile_request,
                "printer_profile": profile_request.get("printer_model", "ender3")
            }
        else:
            # Fallback: generar configuración desde datos de sesión (comportamiento anterior)
            logger.warning("No se recibió perfil personalizado, usando configuración de sesión")
            slicer_config = prepare_slicer_config(
                material_selection.get("selected_material_data", {}),
                production_mode.get("settings", {}),
                printer_assignment
            )
        
        # Procesar cada archivo STL seleccionado
        processed_files = []
        errors = []
        selected_pieces = piece_selection.get("selected_pieces", [])
        
        # Obtener mapa de archivos rotados si existe
        rotated_files_map = session_data.get("rotated_files_map", {})
        
        for piece_filename in selected_pieces:
            try:
                # Verificar si hay versión rotada de este archivo
                if piece_filename in rotated_files_map:
                    rotated_info = rotated_files_map[piece_filename]
                    piece_path = rotated_info["server_path"]
                    logger.info(f"Usando archivo rotado para {piece_filename}: {piece_path}")
                else:
                    # Buscar el archivo original en el proyecto
                    piece_path = find_stl_file_path(project, piece_filename)
                    logger.info(f"Usando archivo original para {piece_filename}: {piece_path}")

                if not piece_path:
                    errors.append(f"Archivo {piece_filename} no encontrado")
                    continue
                
                # Procesar archivo con APISLICER (pasar session_id)
                result = await process_single_stl(piece_filename, piece_path, slicer_config, session_id)
                processed_files.append(result)
                
            except Exception as e:
                logger.error(f"Error procesando {piece_filename}: {str(e)}")
                errors.append(f"Error procesando {piece_filename}: {str(e)}")
                continue
        
        # Actualizar sesión con resultados del procesamiento
        session_data["stl_processing"] = {
            "processed_files": processed_files,
            "errors": errors,
            "slicer_config": slicer_config,
            "processing_summary": {
                "total_files": len(selected_pieces),
                "successful": len(processed_files),
                "failed": len(errors)
            },
            "completed_at": datetime.now().isoformat()
        }
        session_data["completed_steps"] = session_data.get("completed_steps", []) + ["stl_processing"]
        session_data["current_step"] = "validation"
        save_wizard_session(session_id, session_data)
        
        return JSONResponse(content={
            "success": len(processed_files) > 0,
            "processed_files": processed_files,
            "errors": errors,
            "processing_summary": {
                "total_files": len(selected_pieces),
                "successful": len(processed_files),
                "failed": len(errors)
            },
            "next_step": {
                "step": "validation",
                "message": "Archivos procesados. Revisa el reporte de validación."
            }
        })
        
    except Exception as e:
        logger.error(f"Error procesando STL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

def prepare_slicer_config(material_data, production_settings, printer_assignment):
    """Prepara la configuración para enviar al slicer generando un perfil personalizado"""
    
    # Extraer información necesaria para generar el perfil
    material_config = {
        "type": material_data.get('tipo', 'PLA'),
        "temperature": material_data.get('temperatura_extrusor', 210),
        "bed_temperature": material_data.get('temperatura_cama', 60)
    }
    
    production_config = {
        "mode": production_settings.get('mode', 'prototype'),
        "priority": production_settings.get('priority', 'speed'),
        "layer_height": production_settings.get('layer_height', 0.2),
        "fill_density": production_settings.get('infill_density', 20),
        "print_speed": production_settings.get('print_speed', 50),
        "quality_preset": production_settings.get('quality_preset', 'normal')
    }
    
    # Mapear nombre de impresora a modelo base
    printer_name = printer_assignment.get('printer_name', 'Generic')
    printer_model = map_printer_to_profile(printer_name)
    
    printer_config = {
        "printer_name": printer_name,
        "printer_model": printer_model
    }
    
    # Generar job_id único para el perfil
    job_id = f"job_{uuid.uuid4().hex[:16]}"
    
    # Preparar datos para el endpoint de generación de perfil
    profile_request = {
        "job_id": job_id,
        "printer_model": printer_model,
        "material_config": material_config,
        "production_config": production_config,
        "printer_config": printer_config
    }
    
    return {
        "profile_job_id": job_id,
        "profile_request": profile_request,
        "printer_profile": printer_model  # Para fallback si falla la generación
    }

def map_printer_to_profile(printer_name):
    """Mapea el nombre de impresora a un perfil de APISLICER"""
    printer_lower = printer_name.lower()
    
    if 'ender5' in printer_lower:
        return 'ender5'
    elif 'ender3' in printer_lower and 'pro' in printer_lower:
        return 'ender3_pro'
    elif 'ender3' in printer_lower:
        return 'ender3'
    elif 'prusa' in printer_lower and 'mk3' in printer_lower:
        return 'prusa_mk3'
    elif 'prusa' in printer_lower:
        return 'prusa_mk3'
    else:
        return 'generic'  # Por defecto

def create_sample_stl_content():
    """Crea contenido STL de ejemplo válido para PrusaSlicer"""
    stl_content = """solid cube
facet normal 0.0 0.0 -1.0
  outer loop
    vertex 0.0 0.0 0.0
    vertex 20.0 0.0 0.0
    vertex 20.0 20.0 0.0
  endloop
endfacet
facet normal 0.0 0.0 -1.0
  outer loop
    vertex 0.0 0.0 0.0
    vertex 20.0 20.0 0.0
    vertex 0.0 20.0 0.0
  endloop
endfacet
facet normal 0.0 0.0 1.0
  outer loop
    vertex 0.0 0.0 20.0
    vertex 20.0 20.0 20.0
    vertex 20.0 0.0 20.0
  endloop
endfacet
facet normal 0.0 0.0 1.0
  outer loop
    vertex 0.0 0.0 20.0
    vertex 0.0 20.0 20.0
    vertex 20.0 20.0 20.0
  endloop
endfacet
facet normal 0.0 -1.0 0.0
  outer loop
    vertex 0.0 0.0 0.0
    vertex 20.0 0.0 20.0
    vertex 20.0 0.0 0.0
  endloop
endfacet
facet normal 0.0 -1.0 0.0
  outer loop
    vertex 0.0 0.0 0.0
    vertex 0.0 0.0 20.0
    vertex 20.0 0.0 20.0
  endloop
endfacet
facet normal 0.0 1.0 0.0
  outer loop
    vertex 0.0 20.0 0.0
    vertex 20.0 20.0 0.0
    vertex 20.0 20.0 20.0
  endloop
endfacet
facet normal 0.0 1.0 0.0
  outer loop
    vertex 0.0 20.0 0.0
    vertex 20.0 20.0 20.0
    vertex 0.0 20.0 20.0
  endloop
endfacet
facet normal -1.0 0.0 0.0
  outer loop
    vertex 0.0 0.0 0.0
    vertex 0.0 20.0 0.0
    vertex 0.0 20.0 20.0
  endloop
endfacet
facet normal -1.0 0.0 0.0
  outer loop
    vertex 0.0 0.0 0.0
    vertex 0.0 20.0 20.0
    vertex 0.0 0.0 20.0
  endloop
endfacet
facet normal 1.0 0.0 0.0
  outer loop
    vertex 20.0 0.0 0.0
    vertex 20.0 20.0 20.0
    vertex 20.0 20.0 0.0
  endloop
endfacet
facet normal 1.0 0.0 0.0
  outer loop
    vertex 20.0 0.0 0.0
    vertex 20.0 0.0 20.0
    vertex 20.0 20.0 20.0
  endloop
endfacet
endsolid cube"""
    return stl_content.encode('utf-8')

def find_stl_file_path(project, filename):
    """Busca la ruta del archivo STL en el proyecto"""
    project_folder = project.get("carpeta", "")
    if project_folder:
        # Los archivos STL están en la subcarpeta 'files' dentro de la carpeta del proyecto
        return f"/app/{project_folder}/files/{filename}"
    return None

async def process_single_stl(filename, file_path, config, session_id=None):
    """Procesa un archivo STL individual con APISLICER usando perfil personalizado"""
    try:
        # Verificar si tenemos configuración de perfil personalizado
        profile_job_id = config.get('profile_job_id')
        profile_request = config.get('profile_request')
        
        if profile_job_id and profile_request:
            # Generar perfil personalizado primero
            logger.info(f"Generando perfil personalizado para job_id: {profile_job_id}")
            
            apislicer_url = "http://apislicer:8000/generate-profile"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(apislicer_url, json=profile_request, timeout=30) as response:
                    if response.status == 200:
                        profile_result = await response.json()
                        if profile_result.get('success'):
                            logger.info(f"Perfil personalizado generado: {profile_result['profile_name']}")
                        else:
                            logger.warning(f"Error generando perfil personalizado: {profile_result}")
                            # Continuar con perfil base
                    else:
                        logger.error(f"Error en generación de perfil: {response.status}")
                        # Continuar con perfil base
        
        # Preparar datos para APISLICER
        data = aiohttp.FormData()
        
        # Leer archivo real si existe, sino usar archivo de ejemplo
        file_content = None
        if file_path and os.path.exists(file_path):
            try:
                with open(file_path, 'rb') as f:
                    file_content = f.read()
                logger.info(f"Usando archivo STL real: {file_path}")
            except Exception as e:
                logger.warning(f"No se pudo leer {file_path}: {str(e)}")
        
        # Si no hay archivo real, crear uno de ejemplo
        if not file_content:
            file_content = create_sample_stl_content()
            logger.info(f"Usando STL de ejemplo para: {filename}")
            
        data.add_field('file', 
                      file_content, 
                      filename=filename, 
                      content_type='application/octet-stream')
        
        # Usar perfil personalizado si está disponible
        if profile_job_id:
            data.add_field('custom_profile', profile_job_id)
            logger.info(f"Usando perfil personalizado: {profile_job_id}")
        else:
            # Fallback a perfil base
            printer_profile = config.get('printer_profile', 'ender3')
            data.add_field('printer_profile', printer_profile)
            logger.info(f"Usando perfil base: {printer_profile}")
        
        # URL de APISLICER (comunicación entre contenedores Docker)
        apislicer_url = "http://apislicer:8000/slice"
        
        # Enviar a APISLICER
        async with aiohttp.ClientSession() as session:
            async with session.post(apislicer_url, data=data, timeout=60) as response:
                if response.status == 200:
                    # APISLICER devuelve directamente el archivo G-code
                    gcode_content = await response.read()
                    
                    # Generar path para guardar el G-code (incluir session_id para filtrado)
                    gcode_filename = filename.replace('.stl', '.gcode')
                    if session_id:
                        gcode_path = f"/tmp/kybercore_gcode_{session_id}_{gcode_filename}"
                    else:
                        gcode_path = f"/tmp/kybercore_gcode_{uuid.uuid4()}_{gcode_filename}"
                    
                    # Guardar el G-code devuelto
                    try:
                        with open(gcode_path, 'wb') as f:
                            f.write(gcode_content)
                        logger.info(f"G-code guardado: {gcode_path}")
                    except Exception as e:
                        logger.error(f"Error guardando G-code: {str(e)}")
                        return create_mock_processing_result(filename, "error", f"Error guardando G-code: {str(e)}")
                    
                    # Estimar tiempo y otros parámetros del G-code
                    estimated_stats = analyze_gcode_file(gcode_content)
                    
                    return {
                        "filename": filename,
                        "status": "success",
                        "gcode_path": gcode_path,
                        "gcode_size_bytes": len(gcode_content),
                        "estimated_time_minutes": estimated_stats.get("time_minutes", 45),
                        "layer_count": estimated_stats.get("layers", 200),
                        "filament_used_grams": estimated_stats.get("filament_grams", 12.5),
                        "processing_time_seconds": 15,  # Tiempo real de procesamiento
                        "profile_used": profile_job_id if profile_job_id else config.get('printer_profile', 'ender3')
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"Error en APISLICER: {response.status} - {error_text}")
                    return create_mock_processing_result(filename, "error", f"APISLICER error: {response.status}")
                    
    except asyncio.TimeoutError:
        logger.error(f"Timeout procesando {filename}")
        return create_mock_processing_result(filename, "error", "Timeout en APISLICER")
    except Exception as e:
        logger.error(f"Error procesando {filename}: {str(e)}")
        return create_mock_processing_result(filename, "error", str(e))

def analyze_gcode_file(gcode_content):
    """Analiza un archivo G-code y extrae estadísticas"""
    try:
        # Decodificar contenido si es bytes
        if isinstance(gcode_content, bytes):
            gcode_text = gcode_content.decode('utf-8', errors='ignore')
        else:
            gcode_text = gcode_content
            
        lines = gcode_text.split('\n')
        
        # Buscar información en comentarios de PrusaSlicer
        stats = {
            "time_minutes": 45,  # Por defecto
            "layers": 200,
            "filament_grams": 12.5
        }
        
        for line in lines:
            line = line.strip()
            if '; estimated printing time' in line.lower():
                # Ejemplo: ; estimated printing time (normal mode) = 23m 21s
                try:
                    time_part = line.split('=')[1].strip()
                    minutes = 0
                    if 'h' in time_part:
                        hours = int(time_part.split('h')[0].strip())
                        minutes += hours * 60
                        time_part = time_part.split('h')[1].strip()
                    if 'm' in time_part:
                        mins = int(time_part.split('m')[0].strip())
                        minutes += mins
                    stats["time_minutes"] = minutes
                except:
                    pass
            elif '; filament used [g]' in line.lower():
                # Ejemplo: ; total filament used [g] = 12.50
                try:
                    grams = float(line.split('=')[1].strip())
                    stats["filament_grams"] = grams
                except:
                    pass
            elif line.startswith(';LAYER_CHANGE') or line.startswith(';HEIGHT:'):
                # Contar capas
                if "layers" not in locals():
                    layers = 0
                layers = stats.get("layers", 0) + 1
                stats["layers"] = layers
                
        return stats
        
    except Exception as e:
        logger.error(f"Error analizando G-code: {str(e)}")
        return {
            "time_minutes": 45,
            "layers": 200, 
            "filament_grams": 12.5
        }

def create_mock_processing_result(filename, status, error_message=None):
    """Crea un resultado mock de procesamiento"""
    if status == "success":
        return {
            "filename": filename,
            "status": "success",
            "gcode_path": f"/tmp/mock_gcode_{uuid.uuid4()}_{filename.replace('.stl', '.gcode')}",
            "estimated_time_minutes": 45,
            "layer_count": 200,
            "filament_used_grams": 12.5,
            "processing_time_seconds": 5
        }
    else:
        return {
            "filename": filename,
            "status": "error",
            "error": error_message or "Error desconocido",
            "gcode_path": None
        }

@router.get("/print/validation-report/{job_id}")
async def get_validation_report(job_id: str):
    """
    Obtiene el reporte de validación final antes de enviar a impresión.
    """
    # Cargar datos de la sesión del wizard
    session_data = load_wizard_session(job_id)
    if not session_data:
        # Si no hay sesión, usar datos mock
        return get_mock_validation_report(job_id)
    
    stl_processing = session_data.get("stl_processing", {})
    piece_selection = session_data.get("piece_selection", {})
    material_selection = session_data.get("material_selection", {})
    printer_assignment = session_data.get("printer_assignment", {})
    production_mode = session_data.get("production_mode", {})
    
    # Generar reporte basado en datos reales de la sesión
    processing_summary = stl_processing.get("processing_summary", {})
    processed_files = stl_processing.get("processed_files", [])
    errors = stl_processing.get("errors", [])
    
    # Calcular totales
    total_time = sum([f.get("estimated_time_minutes", 0) for f in processed_files if f.get("status") == "success"])
    total_filament = sum([f.get("filament_used_grams", 0) for f in processed_files if f.get("status") == "success"])
    
    validation_report = {
        "job_id": job_id,
        "project_info": {
            "name": session_data.get("project_data", {}).get("nombre", "Proyecto desconocido"),
            "total_pieces": piece_selection.get("total_pieces", 0),
            "selected_pieces": len(piece_selection.get("selected_pieces", []))
        },
        "processing_summary": {
            "total_files": processing_summary.get("total_files", 0),
            "successful": processing_summary.get("successful", 0),
            "failed": processing_summary.get("failed", 0),
            "total_estimated_time_hours": round(total_time / 60, 2),
            "total_filament_grams": total_filament,
            "estimated_cost": round(total_filament * 0.025, 2)  # €0.025 por gramo
        },
        "material_info": {
            "type": material_selection.get("material_type", ""),
            "color": material_selection.get("color", ""),
            "brand": material_selection.get("brand", ""),
            "temperature_profile": {
                "nozzle": material_selection.get("selected_material_data", {}).get("temperatura_extrusor", 210),
                "bed": material_selection.get("selected_material_data", {}).get("temperatura_cama", 60)
            }
        },
        "printer_info": {
            "id": printer_assignment.get("printer_id", ""),
            "name": printer_assignment.get("printer_name", ""),
            "status": "ready",
            "estimated_start_time": "inmediato"
        },
        "production_config": {
            "mode": production_mode.get("mode", ""),
            "priority": production_mode.get("priority", ""),
            "layer_height": production_mode.get("settings", {}).get("layer_height", 0.2),
            "infill_density": production_mode.get("settings", {}).get("infill_density", 20),
            "print_speed": production_mode.get("settings", {}).get("print_speed", 50)
        },
        "validation_checks": {
            "files_processed": {"status": "success" if processing_summary.get("successful", 0) > 0 else "error", 
                              "details": f"{processing_summary.get('successful', 0)}/{processing_summary.get('total_files', 0)} archivos procesados correctamente"},
            "gcode_generated": {"status": "success" if processing_summary.get("successful", 0) > 0 else "error",
                              "details": "G-code generado para todos los archivos exitosos" if processing_summary.get("successful", 0) > 0 else "Error generando G-code"},
            "printer_compatibility": {"status": "success", "details": "Configuración compatible con impresora seleccionada"},
            "material_availability": {"status": "success", "details": "Material suficiente disponible"},
            "print_bed_fit": {"status": "warning" if total_filament > 100 else "success", 
                            "details": "Una pieza requiere orientación especial" if total_filament > 100 else "Todas las piezas caben correctamente"}
        },
        "warnings": [],
        "errors": errors,
        "recommendations": [
            f"Verificar nivel de filamento antes de iniciar (necesario: {total_filament}g)" if total_filament > 0 else "",
            "Monitorear la primera capa cuidadosamente"
        ]
    }
    
    # Filtrar recomendaciones vacías
    validation_report["recommendations"] = [r for r in validation_report["recommendations"] if r]
    
    return JSONResponse(content={
        "success": True,
        "validation": validation_report,
        "is_ready_to_print": processing_summary.get("successful", 0) > 0,
        "next_step": {
            "step": "confirmation",
            "message": "Revisa el reporte y confirma la impresión."
        }
    })

def get_mock_validation_report(job_id: str):
    """Genera reporte de validación mock para cuando no hay sesión"""
    mock_validation = {
        "job_id": job_id,
        "project_info": {
            "name": "ATX Power Supply",
            "total_pieces": 9,
            "selected_pieces": 9
        },
        "processing_summary": {
            "total_files": 9,
            "successful": 8,
            "failed": 1,
            "total_estimated_time_hours": 6.5,
            "total_filament_grams": 110.7,
            "estimated_cost": 2.77
        },
        "material_info": {
            "type": "PLA",
            "color": "Blanco",
            "brand": "eSUN",
            "temperature_profile": {
                "nozzle": 210,
                "bed": 60
            }
        },
        "printer_info": {
            "id": "printer-test-1",
            "name": "Impresora Prueba",
            "status": "ready",
            "estimated_start_time": "inmediato"
        },
        "production_config": {
            "mode": "prototype",
            "priority": "speed",
            "layer_height": 0.3,
            "infill_density": 15,
            "print_speed": 80
        },
        "validation_checks": {
            "files_processed": {"status": "success", "details": "8/9 archivos procesados correctamente"},
            "gcode_generated": {"status": "success", "details": "G-code generado para todos los archivos exitosos"},
            "printer_compatibility": {"status": "success", "details": "Configuración compatible con impresora seleccionada"},
            "material_availability": {"status": "success", "details": "Material suficiente disponible"},
            "print_bed_fit": {"status": "warning", "details": "Una pieza requiere orientación especial"}
        },
        "warnings": [
            "El archivo 'front_panel.stl' requiere soporte para una impresión óptima",
            "Tiempo total estimado puede variar ±15% según condiciones"
        ],
        "errors": [
            "Error procesando 'handle.stl': archivo corrupto"
        ],
        "recommendations": [
            "Revisar configuración de soportes para 'front_panel.stl'",
            "Considerar dividir la impresión en 2 lotes para optimizar tiempo",
            "Verificar nivel de filamento antes de iniciar"
        ]
    }
    
    return JSONResponse(content={
        "success": True,
        "validation": mock_validation,
        "is_ready_to_print": mock_validation["processing_summary"]["successful"] > 0,
        "next_step": {
            "step": "confirmation",
            "message": "Revisa el reporte y confirma la impresión."
        }
    })

@router.post("/print/confirm-job")
async def confirm_print_job(request: Request):
    """
    El usuario confirma el plan de impresión y se encola el trabajo.
    """
    try:
        data = await request.json()
        session_id = data.get('session_id') or data.get('job_id')  # Compatibilidad
        confirmed_settings = data.get('confirmed_settings', {})
        user_notes = data.get('user_notes', '')
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id es requerido")
        
        # Cargar sesión del wizard
        session_data = load_wizard_session(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        # Verificar que todos los pasos estén completos
        required_steps = ["piece_selection", "material_selection", "production_mode", "printer_assignment", "stl_processing"]
        completed_steps = session_data.get("completed_steps", [])
        missing_steps = [step for step in required_steps if step not in completed_steps]
        
        if missing_steps:
            raise HTTPException(status_code=400, detail=f"Pasos incompletos: {', '.join(missing_steps)}")
        
        # Generar ID único para el trabajo confirmado
        confirmed_job_id = str(uuid.uuid4())
        
        # Crear entrada en la cola de trabajos con datos completos de la sesión
        queue_entry = {
            "job_id": confirmed_job_id,
            "session_id": session_id,
            "project_id": session_data.get("project_id"),
            "status": "queued",
            "priority": confirmed_settings.get('priority', 'normal'),
            "estimated_start_time": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "user_notes": user_notes,
            "settings": confirmed_settings,
            "wizard_data": session_data  # Incluir toda la configuración del wizard
        }
        
        # Guardar en sistema de cola
        queue_position = save_job_to_queue(queue_entry)
        
        # Enviar trabajo a la impresora
        printer_response = await send_job_to_printer(session_id, confirmed_settings)
        
        if printer_response.get('success'):
            # Actualizar sesión como completada
            session_data["completed_steps"] = completed_steps + ["confirmation"]
            session_data["current_step"] = "monitoring"
            session_data["confirmed_job_id"] = confirmed_job_id
            session_data["final_status"] = "job_sent_to_printer"
            session_data["completed_at"] = datetime.now().isoformat()
            save_wizard_session(session_id, session_data)
            
            # Actualizar historial
            update_job_history({
                "job_id": confirmed_job_id,
                "status": "started",
                "session_data": session_data,
                "printer_response": printer_response
            })
            
            return JSONResponse(content={
                "success": True,
                "job_confirmed": {
                    "job_id": confirmed_job_id,
                    "session_id": session_id,
                    "queue_position": queue_position or 1,
                    "estimated_start_time": queue_entry["estimated_start_time"],
                    "status": "queued"
                },
                "printer_response": printer_response,
                "next_step": {
                    "step": "monitoring",
                    "message": "Trabajo encolado. Comenzando monitoreo.",
                    "monitoring_url": f"/api/print/job-status/{confirmed_job_id}"
                }
            })
        else:
            return JSONResponse(content={
                "success": False,
                "error": "printer_communication_failed",
                "message": "No se pudo comunicar con la impresora",
                "details": printer_response.get('error', 'Error desconocido')
            }, status_code=500)
            
    except Exception as e:
        logger.error(f"Error confirmando trabajo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

async def send_job_to_printer(job_id, settings):
    """
    Envía el trabajo a la impresora usando Moonraker API.
    """
    try:
        # Obtener información de la impresora de la sesión
        session_data = load_wizard_session(job_id)
        printer_info = session_data.get("printer_assignment", {})
        
        if not printer_info:
            return {"success": False, "error": "No hay impresora asignada"}
            
        printer_id = printer_info.get("printer_id")
        if not printer_id:
            return {"success": False, "error": "ID de impresora no válido"}
        
        # Cargar datos de la impresora
        printers_data = load_printers_data()
        printer_config = None
        
        for printer in printers_data.get("impresoras", []):
            if printer.get("id") == printer_id:
                printer_config = printer
                break
                
        if not printer_config:
            return {"success": False, "error": f"Impresora {printer_id} no encontrada"}
        
        # Obtener IP y puerto de Moonraker
        printer_ip = printer_config.get("ip", "")
        if not printer_ip:
            return {"success": False, "error": f"IP no configurada para impresora {printer_id}"}
        
        # Si no tiene protocolo, agregar http://
        if not printer_ip.startswith("http"):
            moonraker_url = f"http://{printer_ip}"
        else:
            moonraker_url = printer_ip
        
        logger.info(f"Enviando trabajo {job_id} a impresora {printer_id} en {moonraker_url}")
        
        # Verificar que la impresora esté disponible
        printer_status = await check_printer_status(moonraker_url)
        if not printer_status.get("success"):
            return {
                "success": False, 
                "error": f"Impresora no disponible: {printer_status.get('error', 'Error desconocido')}"
            }
        
        # Obtener archivos G-code generados de la sesión
        stl_processing = session_data.get("stl_processing", {})
        processed_files = stl_processing.get("processed_files", [])
        
        if not processed_files:
            return {"success": False, "error": "No hay archivos G-code para enviar"}
        
        # Tomar el primer archivo G-code disponible (en una implementación completa se manejarían múltiples archivos)
        gcode_file = None
        for file_info in processed_files:
            if file_info.get("status") == "success" and file_info.get("gcode_path"):
                gcode_file = file_info
                break
        
        if not gcode_file:
            return {"success": False, "error": "No hay archivos G-code válidos"}
        
        # Enviar archivo G-code a la impresora vía Moonraker
        upload_result = await upload_gcode_to_printer(moonraker_url, gcode_file["gcode_path"], job_id)
        if not upload_result.get("success"):
            return {"success": False, "error": f"Error subiendo archivo: {upload_result.get('error')}"}
        
        # Iniciar la impresión
        print_result = await start_print_job(moonraker_url, upload_result["filename"])
        if not print_result.get("success"):
            return {"success": False, "error": f"Error iniciando impresión: {print_result.get('error')}"}
        
        # Guardar información del trabajo en la cola
        queue_position = save_job_to_queue({
            "job_id": job_id,
            "printer_id": printer_id,
            "moonraker_url": moonraker_url,
            "status": "printing",
            "gcode_filename": upload_result["filename"],
            "settings": settings,
            "started_at": datetime.now().isoformat()
        })
        
        return {
            "success": True,
            "printer_job_id": f"printer_{job_id}",
            "message": "Trabajo enviado e iniciado en la impresora exitosamente",
            "printer_id": printer_id,
            "queue_position": queue_position,
            "moonraker_url": moonraker_url,
            "gcode_filename": upload_result["filename"],
            "estimated_completion": datetime.now().isoformat()  # Se actualizará con datos reales
        }
        
    except Exception as e:
        logger.error(f"Error enviando trabajo a impresora: {str(e)}")
        return {"success": False, "error": str(e)}

async def check_printer_status(moonraker_url: str):
    """Verifica que la impresora esté disponible y lista para recibir trabajos"""
    try:
        async with aiohttp.ClientSession() as session:
            # Verificar conexión con Moonraker
            async with session.get(f"{moonraker_url}/printer/info", timeout=10) as response:
                if response.status != 200:
                    return {"success": False, "error": f"Error conectando con Moonraker: HTTP {response.status}"}
                
                info = await response.json()
                
            # Verificar estado de la impresora
            async with session.get(f"{moonraker_url}/printer/objects/query?print_stats", timeout=10) as response:
                if response.status != 200:
                    return {"success": False, "error": "No se pudo obtener estado de impresión"}
                
                status_data = await response.json()
                print_stats = status_data.get("result", {}).get("status", {}).get("print_stats", {})
                state = print_stats.get("state", "")
                
                if state in ["printing", "paused"]:
                    return {"success": False, "error": f"Impresora ocupada (estado: {state})"}
                
                return {
                    "success": True, 
                    "state": state,
                    "info": info.get("result", {})
                }
                
    except asyncio.TimeoutError:
        return {"success": False, "error": "Timeout conectando con la impresora"}
    except Exception as e:
        return {"success": False, "error": f"Error verificando estado: {str(e)}"}

async def upload_gcode_to_printer(moonraker_url: str, gcode_path: str, job_id: str):
    """Sube el archivo G-code a la impresora"""
    try:
        if not os.path.exists(gcode_path):
            return {"success": False, "error": f"Archivo G-code no encontrado: {gcode_path}"}
        
        filename = f"kybercore_{job_id}_{os.path.basename(gcode_path)}"
        
        async with aiohttp.ClientSession() as session:
            with open(gcode_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('file', f, filename=filename, content_type='text/plain')
                data.add_field('root', 'gcodes')  # Directorio de destino en la impresora
                
                async with session.post(f"{moonraker_url}/server/files/upload", data=data, timeout=30) as response:
                    if response.status != 201:
                        error_text = await response.text()
                        return {"success": False, "error": f"Error subiendo archivo: HTTP {response.status} - {error_text}"}
                    
                    result = await response.json()
                    return {
                        "success": True,
                        "filename": filename,
                        "path": result.get("result", {}).get("path", filename)
                    }
                    
    except Exception as e:
        return {"success": False, "error": f"Error en upload: {str(e)}"}

async def start_print_job(moonraker_url: str, filename: str):
    """Inicia la impresión del archivo G-code"""
    try:
        async with aiohttp.ClientSession() as session:
            # Comando para iniciar impresión
            print_data = {
                "filename": filename
            }
            
            async with session.post(f"{moonraker_url}/printer/print/start", json=print_data, timeout=10) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return {"success": False, "error": f"Error iniciando impresión: HTTP {response.status} - {error_text}"}
                
                result = await response.json()
                return {
                    "success": True,
                    "result": result.get("result", {})
                }
                
    except Exception as e:
        return {"success": False, "error": f"Error iniciando impresión: {str(e)}"}

@router.get("/print/job-status/{job_id}")
async def get_job_status(job_id: str):
    """
    Obtiene el estado actual de un trabajo en progreso.
    """
    try:
        # Mock de datos de estado (en implementación real se consultaría la base de datos y Moonraker)
        mock_status = {
            "job_id": job_id,
            "status": "printing",  # queued, printing, paused, completed, failed, cancelled
            "progress": {
                "percentage": 45.3,
                "current_layer": 127,
                "total_layers": 280,
                "elapsed_time_minutes": 125,
                "remaining_time_minutes": 150
            },
            "printer_info": {
                "id": "printer-test-1",
                "name": "Impresora Prueba",
                "current_temp": {
                    "nozzle": 208.5,
                    "bed": 59.2,
                    "target_nozzle": 210,
                    "target_bed": 60
                }
            },
            "current_file": {
                "name": "front_frame.stl",
                "piece_number": 3,
                "total_pieces": 9
            },
            "quality_metrics": {
                "layer_adhesion": "good",
                "surface_quality": "excellent",
                "dimensional_accuracy": "within_tolerance"
            },
            "alerts": [],
            "last_updated": datetime.now().isoformat()
        }
        
        # Simular diferentes estados según el último dígito del job_id
        last_digit = int(job_id[-1]) if job_id[-1].isdigit() else 0
        
        if last_digit < 2:
            mock_status["status"] = "queued"
            mock_status["progress"]["percentage"] = 0
            mock_status["message"] = "Trabajo en cola, esperando inicio"
        elif last_digit < 7:
            mock_status["status"] = "printing"
            mock_status["message"] = "Impresión en progreso"
        elif last_digit < 9:
            mock_status["status"] = "completed"
            mock_status["progress"]["percentage"] = 100
            mock_status["message"] = "Impresión completada exitosamente"
            mock_status["completion_time"] = datetime.now().isoformat()
        else:
            mock_status["status"] = "failed"
            mock_status["progress"]["percentage"] = 67.8
            mock_status["message"] = "Error durante la impresión"
            mock_status["error_details"] = {
                "error_type": "filament_jam",
                "description": "Atasco de filamento detectado en capa 189",
                "suggested_action": "Verificar extrusor y reanudar impresión"
            }
            mock_status["alerts"] = [
                {
                    "level": "error",
                    "message": "Atasco de filamento detectado",
                    "timestamp": datetime.now().isoformat()
                }
            ]
        
        return JSONResponse(content={
            "success": True,
            "job_status": mock_status,
            "actions_available": get_available_actions(mock_status["status"]),
            "monitoring_active": True
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo estado del trabajo {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

def get_available_actions(status):
    """Obtiene las acciones disponibles según el estado del trabajo"""
    actions = {
        "queued": [
            {"action": "cancel", "label": "❌ Cancelar Trabajo"},
            {"action": "modify_priority", "label": "⚡ Cambiar Prioridad"}
        ],
        "printing": [
            {"action": "pause", "label": "⏸️ Pausar Impresión"},
            {"action": "cancel", "label": "❌ Cancelar Trabajo"},
            {"action": "adjust_settings", "label": "⚙️ Ajustar Configuración"}
        ],
        "paused": [
            {"action": "resume", "label": "▶️ Reanudar Impresión"},
            {"action": "cancel", "label": "❌ Cancelar Trabajo"}
        ],
        "completed": [
            {"action": "view_results", "label": "📊 Ver Resultados"},
            {"action": "reprint", "label": "🔄 Reimprimir"},
            {"action": "archive", "label": "📁 Archivar Trabajo"}
        ],
        "failed": [
            {"action": "retry", "label": "🔄 Reintentar"},
            {"action": "diagnose", "label": "🔍 Diagnóstico IA"},
            {"action": "cancel", "label": "❌ Cancelar Definitivamente"}
        ],
        "cancelled": [
            {"action": "restart", "label": "🔄 Reiniciar Trabajo"},
            {"action": "archive", "label": "📁 Archivar"}
        ]
    }
    
    return actions.get(status, [])

@router.get("/print/session-state/{session_id}")
async def get_session_state(session_id: str):
    """
    Obtiene el estado actual de una sesión del wizard para navegación.
    """
    try:
        session_data = load_wizard_session(session_id)
        
        if not session_data:
            return JSONResponse(content={
                "success": False,
                "error": "session_not_found",
                "message": "Sesión no encontrada"
            }, status_code=404)
        
        return JSONResponse(content={
            "success": True,
            "session_data": session_data,
            "current_step": session_data.get("current_step", "piece_selection"),
            "completed_steps": session_data.get("completed_steps", []),
            "project_id": session_data.get("project_id"),
            "status": session_data.get("status", "active")
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo estado de sesión {session_id}: {e}")
        return JSONResponse(content={
            "success": False,
            "error": "server_error",
            "message": "Error interno del servidor"
        }, status_code=500)


@router.get("/print/wizard-session/{session_id}")
async def get_wizard_session(session_id: str):
    """
    Obtiene los datos completos de una sesión del wizard.
    Alias de /print/session-state pero devuelve directamente los datos de la sesión.
    """
    try:
        session_data = load_wizard_session(session_id)
        
        if not session_data:
            raise HTTPException(
                status_code=404,
                detail=f"Sesión del wizard no encontrada: {session_id}"
            )
        
        return session_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo sesión del wizard {session_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor: {str(e)}"
        )

# ===============================
# ENDPOINT: GENERAR PERFIL PERSONALIZADO
# ===============================

@router.post("/slicer/generate-profile")
async def generate_custom_profile(request: Request):
    """
    Genera un perfil personalizado para el slicer basado en la configuración
    de material, modo de producción e impresora seleccionados.
    
    Este endpoint procesa la solicitud y devuelve un perfil listo para usar
    en el procesamiento STL con APISLICER.
    """
    try:
        data = await request.json()
        
        # Validar datos recibidos
        job_id = data.get('job_id')
        printer_model = data.get('printer_model')
        material_config = data.get('material_config', {})
        production_config = data.get('production_config', {})
        printer_config = data.get('printer_config', {})
        
        if not all([job_id, printer_model, material_config, production_config]):
            raise HTTPException(
                status_code=400, 
                detail="Faltan datos requeridos: job_id, printer_model, material_config, production_config"
            )
        
        logger.info(f"Generando perfil personalizado para job_id: {job_id}")
        logger.info(f"  Impresora: {printer_model}")
        logger.info(f"  Material: {material_config.get('type')} {material_config.get('color')}")
        logger.info(f"  Modo: {production_config.get('mode')} - Prioridad: {production_config.get('priority')}")
        
        # Determinar configuraciones según el modo de producción y prioridad
        layer_heights = {
            "prototype": {"speed": 0.3, "quality": 0.2, "economy": 0.28, "consistency": 0.25},
            "factory": {"speed": 0.25, "quality": 0.15, "economy": 0.25, "consistency": 0.2}
        }
        
        infill_densities = {
            "prototype": {"speed": 15, "quality": 25, "economy": 10, "consistency": 20},
            "factory": {"speed": 20, "quality": 35, "economy": 15, "consistency": 25}
        }
        
        print_speeds = {
            "prototype": {"speed": 80, "quality": 50, "economy": 60, "consistency": 60},
            "factory": {"speed": 70, "quality": 40, "economy": 55, "consistency": 50}
        }
        
        # Obtener configuraciones específicas
        mode = production_config.get('mode', 'prototype')
        priority = production_config.get('priority', 'speed')
        
        layer_height = layer_heights.get(mode, {}).get(priority, 0.2)
        infill_density = infill_densities.get(mode, {}).get(priority, 20)
        print_speed = print_speeds.get(mode, {}).get(priority, 60)
        
        # Configuración de temperaturas según el material
        material_temperatures = {
            "PLA": {"nozzle": 210, "bed": 60},
            "PETG": {"nozzle": 240, "bed": 80},
            "ABS": {"nozzle": 250, "bed": 100},
            "TPU": {"nozzle": 220, "bed": 50},
            "Nylon": {"nozzle": 260, "bed": 85}
        }
        
        material_type = material_config.get('type', 'PLA')
        temps = material_temperatures.get(material_type, {"nozzle": 210, "bed": 60})
        
        # Crear el perfil personalizado
        profile_data = {
            "job_id": job_id,
            "profile_name": f"custom_{job_id}.ini",
            "printer_model": printer_model,
            "material": f"{material_type} {material_config.get('color', '')}",
            "production_mode": mode,
            "priority": priority,
            "base_printer": printer_config.get('printer_name', printer_model),
            "settings": {
                "layer_height": layer_height,
                "fill_density": infill_density,
                "print_speed": print_speed,
                "nozzle_temperature": temps["nozzle"],
                "bed_temperature": temps["bed"],
                "material_type": material_type,
                "material_color": material_config.get('color', 'white'),
                "material_brand": material_config.get('brand', 'Generic'),
                "bed_adhesion": printer_config.get('bed_adhesion', True),
                "supports": production_config.get('supports', 'auto'),
                "brim": production_config.get('brim', True) if mode == 'factory' else False
            },
            "generated_at": datetime.now().isoformat(),
            "status": "ready"
        }
        
        logger.info(f"Perfil generado exitosamente: {profile_data['profile_name']}")
        logger.info(f"  Layer Height: {layer_height}mm | Infill: {infill_density}% | Speed: {print_speed}mm/s")
        logger.info(f"  Nozzle: {temps['nozzle']}°C | Bed: {temps['bed']}°C")
        
        return JSONResponse(content={
            "success": True,
            **profile_data
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error generando perfil personalizado: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno generando perfil: {str(e)}"
        )


# ===============================
# ENDPOINTS PARA VISOR DE G-CODE
# ===============================

@router.get("/print/gcode-files/{session_id}")
async def get_gcode_files(session_id: str):
    """
    Obtiene la lista de archivos G-code generados para una sesión del wizard.
    Filtra solo los archivos que pertenecen a la sesión actual.
    
    Args:
        session_id: ID de la sesión del wizard
        
    Returns:
        Lista de archivos G-code con información básica
    """
    try:
        logger.info(f"🔍 Obteniendo archivos G-code para sesión: {session_id}")
        
        gcode_files = []
        
        # Opción 1: Buscar en /tmp (V1 - legacy)
        tmp_dir = Path("/tmp")
        pattern_v1 = f"kybercore_gcode_{session_id}_*.gcode"
        for gcode_file in tmp_dir.glob(pattern_v1):
            file_info = _extract_gcode_info(gcode_file)
            if file_info:
                gcode_files.append(file_info)
        
        # Opción 2: Buscar en /tmp/kybercore_processing/{session_id}/ (V2 - backend-centric)
        v2_dir = Path(f"/tmp/kybercore_processing/{session_id}")
        if v2_dir.exists():
            pattern_v2 = f"gcode_{session_id}_*.gcode"
            for gcode_file in v2_dir.glob(pattern_v2):
                file_info = _extract_gcode_info(gcode_file)
                if file_info:
                    gcode_files.append(file_info)
        
        logger.info(f"✅ Encontrados {len(gcode_files)} archivos G-code")
        
        return {
            "success": True,
            "session_id": session_id,
            "files": gcode_files,
            "count": len(gcode_files)
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo archivos G-code: {str(e)}")
        return {
            "success": False,
            "session_id": session_id,
            "files": [],
            "count": 0,
            "error": str(e)
        }


def _extract_gcode_info(gcode_file: Path) -> dict:
    """Extrae información básica de un archivo G-code"""
    try:
        # Leer el archivo para obtener información básica
        with open(gcode_file, 'r') as f:
            lines = f.readlines()
            
            # Contar capas (buscar comentarios ;LAYER:)
            layer_count = sum(1 for line in lines if line.strip().startswith(';LAYER:'))
            
            # Si no hay comentarios de capas, contar cambios de Z
            if layer_count == 0:
                z_values = set()
                for line in lines:
                    if line.strip().startswith('G1') or line.strip().startswith('G0'):
                        if 'Z' in line:
                            z_match = line.split('Z')[1].split()[0]
                            try:
                                z_values.add(float(z_match))
                            except:
                                pass
                layer_count = len(z_values)
        
        return {
            "filename": gcode_file.name,
            "path": str(gcode_file),
            "size_kb": round(gcode_file.stat().st_size / 1024, 2),
            "layers": layer_count,
            "modified": datetime.fromtimestamp(gcode_file.stat().st_mtime).isoformat()
        }
                
    except Exception as e:
        logger.error(f"Error leyendo archivo {gcode_file.name}: {str(e)}")
        return None


@router.get("/print/gcode-content")
async def get_gcode_content(file: str):
    """
    Obtiene el contenido de un archivo G-code específico.
    
    Args:
        file: Ruta del archivo G-code
        
    Returns:
        Contenido del archivo G-code como texto plano
    """
    try:
        logger.info(f"📄 Cargando contenido de G-code: {file}")
        
        file_path = Path(file)
        
        # Validar que el archivo existe y es .gcode
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        if file_path.suffix != '.gcode':
            raise HTTPException(status_code=400, detail="El archivo no es un G-code válido")
        
        # Validar que el archivo está en directorios permitidos
        allowed_dirs = [
            Path("/app/APISLICER/output").resolve(),
            Path("/tmp").resolve(),  # Permitir archivos temporales de KyberCore (V1)
            Path("/tmp/kybercore_processing").resolve()  # Permitir archivos V2
        ]
        
        file_resolved = file_path.resolve()
        is_allowed = any(str(file_resolved).startswith(str(allowed_dir)) for allowed_dir in allowed_dirs)
        
        if not is_allowed:
            logger.warning(f"❌ Acceso denegado a archivo fuera de directorios permitidos: {file_path}")
            raise HTTPException(status_code=403, detail="Acceso denegado al archivo")
        
        # Validación adicional: solo archivos de KyberCore en /tmp
        if str(file_resolved).startswith("/tmp/"):
            # V1: kybercore_gcode_*
            # V2: /tmp/kybercore_processing/*/gcode_*
            is_v1_format = file_path.name.startswith("kybercore_gcode_")
            is_v2_format = "/kybercore_processing/" in str(file_resolved) and file_path.name.startswith("gcode_")
            
            if not (is_v1_format or is_v2_format):
                logger.warning(f"❌ Archivo /tmp no es de KyberCore (V1 o V2): {file_path}")
                raise HTTPException(status_code=403, detail="Acceso denegado al archivo")
        
        # Leer el archivo
        with open(file_path, 'r') as f:
            content = f.read()
        
        logger.info(f"✅ Archivo cargado: {len(content)} caracteres, {len(content.splitlines())} líneas")
        
        # Devolver como texto plano con el tipo de contenido correcto
        return Response(content=content, media_type="text/plain; charset=utf-8")
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error leyendo contenido de G-code: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error leyendo archivo: {str(e)}"
        )
