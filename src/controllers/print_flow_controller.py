"""
Controlador para el Flujo de Impresión
Maneja todos los endpoints relacionados con el flujo de impresión 3D,
desde la selección inicial de piezas hasta el monitoreo del trabajo en progreso.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
from datetime import datetime
import uuid
import logging

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
    quantity_needed: float  # En gramos

class ProductionModeConfig(BaseModel):
    mode: str  # "prototype" o "factory"
    priority: str  # "speed", "quality", "economy"
    settings: Dict[str, Any] = {}

class PrinterAssignment(BaseModel):
    project_id: str
    printer_id: str
    assignment_type: str  # "manual" o "automatic"

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
    # Por ahora usaremos datos mock, luego se conectará a la base de datos real
    return {
        "materiales_disponibles": [
            {
                "id": "pla_blanco_001",
                "tipo": "PLA",
                "color": "Blanco",
                "marca": "eSUN",
                "stock_actual": 950,  # gramos
                "stock_minimo": 200,
                "precio_por_kg": 25.50,
                "temperatura_extrusor": 210,
                "temperatura_cama": 60
            },
            {
                "id": "petg_transparente_001", 
                "tipo": "PETG",
                "color": "Transparente",
                "marca": "Prusament",
                "stock_actual": 750,
                "stock_minimo": 200,
                "precio_por_kg": 32.90,
                "temperatura_extrusor": 235,
                "temperatura_cama": 85
            },
            {
                "id": "abs_negro_001",
                "tipo": "ABS",
                "color": "Negro", 
                "marca": "Hatchbox",
                "stock_actual": 600,
                "stock_minimo": 150,
                "precio_por_kg": 28.75,
                "temperatura_extrusor": 245,
                "temperatura_cama": 100
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
        # Estimaciones mock - en el futuro se calcularán con análisis real
        estimated_volume = 15.5  # cm³
        estimated_time = 45      # minutos 
        estimated_filament = 12.3 # gramos
        
        pieces_info.append({
            "filename": archivo["nombre"],
            "size": archivo["tamaño"], 
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
    
    return JSONResponse(content={
        "success": True,
        "message": f"Selección confirmada: {len(selected_files)} piezas",
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
    
    # Verificar stock suficiente
    stock_sufficient = selected_material["stock_actual"] >= material_selection.quantity_needed
    
    if stock_sufficient:
        return JSONResponse(content={
            "success": True,
            "validation": {
                "material_available": True,
                "stock_sufficient": True,
                "current_stock": selected_material["stock_actual"],
                "needed_quantity": material_selection.quantity_needed,
                "remaining_stock": selected_material["stock_actual"] - material_selection.quantity_needed,
                "estimated_cost": round((material_selection.quantity_needed / 1000) * selected_material["precio_por_kg"], 2)
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
    
    return JSONResponse(content={
        "success": True,
        "assignment": {
            "printer_id": assignment.printer_id,
            "printer_name": selected_printer["nombre"],
            "assignment_type": assignment.assignment_type,
            "confirmed_at": datetime.now().isoformat()
        },
        "printer_info": {
            "capabilities": selected_printer["capacidades"],
            "current_status": selected_printer["estado"],
            "estimated_start_time": "inmediato"
        },
        "next_step": {
            "step": "stl_processing",
            "message": "Impresora asignada. Procede a procesar archivos STL."
        }
    })

# Placeholder para los siguientes endpoints (se implementarán en las siguientes iteraciones)

@router.post("/print/process-stl")
async def process_stl_files(request: Request):
    """
    Procesa archivos STL y genera G-code usando APISLICER.
    Integra con el servicio de slicer externo.
    """
    try:
        # Obtener datos del request
        data = await request.json()
        project_id = data.get('project_id')
        selected_pieces = data.get('selected_pieces', [])
        material_config = data.get('material_config', {})
        production_config = data.get('production_config', {})
        printer_config = data.get('printer_config', {})
        
        if not project_id:
            raise HTTPException(status_code=400, detail="project_id es requerido")
        
        # Cargar datos del proyecto
        project = load_project_data(project_id)
        
        # Preparar configuración para el slicer
        slicer_config = prepare_slicer_config(material_config, production_config, printer_config)
        
        # Procesar cada archivo STL seleccionado
        processed_files = []
        errors = []
        
        for piece_filename in selected_pieces:
            try:
                # Buscar el archivo en el proyecto
                piece_path = find_stl_file_path(project, piece_filename)
                if not piece_path:
                    errors.append(f"Archivo {piece_filename} no encontrado")
                    continue
                
                # Procesar archivo con APISLICER
                result = await process_single_stl(piece_filename, piece_path, slicer_config)
                processed_files.append(result)
                
            except Exception as e:
                errors.append(f"Error procesando {piece_filename}: {str(e)}")
                continue
        
        # Generar reporte de validación
        validation_report = generate_validation_report(processed_files, errors)
        
        return JSONResponse(content={
            "success": len(processed_files) > 0,
            "processed_files": processed_files,
            "errors": errors,
            "validation_report": validation_report,
            "next_step": {
                "step": "validation",
                "message": "Archivos procesados. Revisa el reporte de validación."
            }
        })
        
    except Exception as e:
        logger.error(f"Error procesando STL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

def prepare_slicer_config(material_config, production_config, printer_config):
    """Prepara la configuración para enviar al slicer"""
    
    # Configuración base por material
    material_settings = {
        "PLA": {"nozzle_temp": 210, "bed_temp": 60},
        "PETG": {"nozzle_temp": 235, "bed_temp": 85},
        "ABS": {"nozzle_temp": 245, "bed_temp": 100}
    }
    
    # Obtener configuración del material
    material_type = material_config.get('tipo', 'PLA')
    temps = material_settings.get(material_type, material_settings["PLA"])
    
    # Configuración de producción
    prod_settings = production_config.get('settings', {})
    
    return {
        "layer_height": prod_settings.get('layer_height', 0.2),
        "fill_density": prod_settings.get('infill_density', 20),
        "nozzle_temp": temps["nozzle_temp"],
        "bed_temp": temps["bed_temp"],
        "printer_profile": map_printer_to_profile(printer_config.get('nombre', 'Generic'))
    }

def map_printer_to_profile(printer_name):
    """Mapea el nombre de impresora a un perfil de APISLICER"""
    if 'ender' in printer_name.lower():
        return 'ender3'
    elif 'prusa' in printer_name.lower():
        return 'prusa_mk3'
    else:
        return 'ender3'  # Por defecto

def find_stl_file_path(project, filename):
    """Busca la ruta del archivo STL en el proyecto"""
    # Por ahora es mock, en una implementación real buscaría en el sistema de archivos
    project_folder = project.get("carpeta", "")
    if project_folder:
        return f"/app/{project_folder}/{filename}"
    return None

async def process_single_stl(filename, file_path, config):
    """Procesa un archivo STL individual con APISLICER"""
    import aiohttp
    
    try:
        # Verificar si el archivo existe (mock check)
        # En implementación real se verificaría si existe el archivo
        
        # Preparar datos para APISLICER
        data = aiohttp.FormData()
        
        # Por ahora usaremos un archivo mock
        # En implementación real se leería el archivo desde file_path
        mock_stl_content = b"STL mock content"  # Placeholder
        data.add_field('file', 
                      mock_stl_content, 
                      filename=filename, 
                      content_type='application/octet-stream')
        
        # Agregar parámetros de configuración
        for key, value in config.items():
            data.add_field(key, str(value))
        
        # Llamar a APISLICER
        async with aiohttp.ClientSession() as session:
            async with session.post('http://apislicer-slicer-api:8000/slice', data=data) as response:
                if response.status == 200:
                    # Archivo procesado exitosamente
                    gcode_content = await response.read()
                    
                    return {
                        "filename": filename,
                        "original_size": "mock_size",
                        "gcode_size": len(gcode_content),
                        "estimated_print_time": "45 min",  # Mock
                        "filament_usage": "12.5g",         # Mock
                        "status": "success",
                        "gcode_path": f"/tmp/{filename.replace('.stl', '.gcode')}"
                    }
                else:
                    error_msg = await response.text()
                    raise Exception(f"APISLICER error: {error_msg}")
                    
    except Exception as e:
        return {
            "filename": filename,
            "status": "error",
            "error": str(e)
        }

def generate_validation_report(processed_files, errors):
    """Genera reporte de validación del procesamiento"""
    successful_files = [f for f in processed_files if f.get('status') == 'success']
    failed_files = [f for f in processed_files if f.get('status') == 'error']
    
    total_print_time = 0
    total_filament = 0
    
    for file_data in successful_files:
        # Parse mock values (en implementación real se calcularían correctamente)
        time_str = file_data.get('estimated_print_time', '0 min')
        if 'min' in time_str:
            time_val = int(time_str.split(' ')[0])
            total_print_time += time_val
            
        filament_str = file_data.get('filament_usage', '0g')
        if 'g' in filament_str:
            filament_val = float(filament_str.replace('g', ''))
            total_filament += filament_val
    
    return {
        "total_files": len(processed_files) + len(errors),
        "successful": len(successful_files),
        "failed": len(failed_files) + len(errors),
        "total_estimated_time_minutes": total_print_time,
        "total_filament_grams": total_filament,
        "estimated_cost": total_filament * 0.025,  # €0.025 por gramo
        "warnings": [],
        "errors": errors + [f.get('error') for f in failed_files if f.get('error')]
    }

@router.get("/print/validation-report/{job_id}")
async def get_validation_report(job_id: str):
    """
    Obtiene el reporte de validación final antes de enviar a impresión.
    """
    # Por ahora usaremos datos mock, en implementación real se consultaría la base de datos
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
        "is_ready_to_print": len(mock_validation["errors"]) == 0 or mock_validation["processing_summary"]["successful"] > 0,
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
        job_id = data.get('job_id')
        confirmed_settings = data.get('confirmed_settings', {})
        user_notes = data.get('user_notes', '')
        
        if not job_id:
            raise HTTPException(status_code=400, detail="job_id es requerido")
        
        # Generar ID único para el trabajo confirmado
        confirmed_job_id = str(uuid.uuid4())
        
        # Crear entrada en la cola de trabajos (mock)
        queue_entry = {
            "job_id": confirmed_job_id,
            "original_validation_id": job_id,
            "status": "queued",
            "priority": confirmed_settings.get('priority', 'normal'),
            "estimated_start_time": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "user_notes": user_notes,
            "settings": confirmed_settings
        }
        
        # Mock: guardar en sistema de cola (en implementación real se guardaría en base de datos)
        # save_job_to_queue(queue_entry)
        
        # Mock: enviar trabajo a la impresora (en implementación real se integraría con Moonraker)
        printer_response = await send_job_to_printer(confirmed_job_id, confirmed_settings)
        
        if printer_response.get('success'):
            return JSONResponse(content={
                "success": True,
                "job_confirmed": {
                    "job_id": confirmed_job_id,
                    "queue_position": 1,
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
    Por ahora es una simulación.
    """
    try:
        # Mock de comunicación con impresora
        # En implementación real se haría:
        # 1. Enviar archivo G-code a la impresora vía Moonraker
        # 2. Iniciar el trabajo de impresión
        # 3. Configurar monitoreo en tiempo real
        
        return {
            "success": True,
            "printer_job_id": f"printer_{job_id}",
            "message": "Trabajo enviado a impresora exitosamente",
            "estimated_completion": "2024-12-15 22:30:00"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

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