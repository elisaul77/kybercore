from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import subprocess
import tempfile
import uuid
from pathlib import Path
import logging
import configparser
import json
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="3D Slicer API", description="API para laminar archivos STL y generar gcode")

UPLOAD_DIR = "/app/uploads"
OUTPUT_DIR = "/app/output"
CONFIG_DIR = "/app/config"
PRINTER_CONFIG_DIR = "/app/config/printer_configs"
STL_CONFIG_DIR = "/app/config/printer_stl_config"

# Crear directorios si no existen
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(PRINTER_CONFIG_DIR, exist_ok=True)
os.makedirs(STL_CONFIG_DIR, exist_ok=True)

# Modelos de datos para configuración dinámica
class MaterialConfig(BaseModel):
    tipo: str  # PLA, PETG, ABS, etc.
    color: str
    marca: str
    precio_por_kg: float = 0

class ProductionModeConfig(BaseModel):
    mode: str  # "prototype" o "factory"
    priority: str  # "speed", "quality", "economy", "consistency"
    settings: Dict[str, Any] = {}

class PrinterConfig(BaseModel):
    id: str
    nombre: str
    model: str
    marca: str = ""

class ProfileGenerationRequest(BaseModel):
    job_id: str
    material: MaterialConfig
    production_mode: ProductionModeConfig
    printer: PrinterConfig

@app.post("/generate-profile")
async def generate_dynamic_profile(request: ProfileGenerationRequest):
    """
    Genera un perfil de impresión dinámico basado en las configuraciones del wizard.
    Combina el perfil base de la impresora con configuraciones específicas de material y modo de producción.
    """
    try:
        job_id = request.job_id
        material = request.material
        production_mode = request.production_mode
        printer = request.printer

        logger.info(f"Generando perfil dinámico para job {job_id}")

        # Determinar el perfil base de la impresora
        base_profile_name = map_printer_to_base_profile(printer.model, printer.marca)
        base_profile_path = os.path.join(PRINTER_CONFIG_DIR, f"{base_profile_name}.ini")

        if not os.path.exists(base_profile_path):
            raise HTTPException(
                status_code=404,
                detail=f"Perfil base no encontrado para impresora {printer.model}"
            )

        # Leer el perfil base
        config = configparser.ConfigParser(interpolation=None)  # Deshabilitar interpolación
        config.read(base_profile_path)

        # Aplicar configuraciones específicas del material
        apply_material_config(config, material)

        # Aplicar configuraciones del modo de producción
        apply_production_config(config, production_mode)

        # Generar nombre del perfil personalizado
        custom_profile_filename = f"{job_id}.ini"
        custom_profile_path = os.path.join(STL_CONFIG_DIR, custom_profile_filename)

        # Guardar el perfil personalizado
        with open(custom_profile_path, 'w') as configfile:
            config.write(configfile)

        logger.info(f"Perfil dinámico generado: {custom_profile_path}")

        return {
            "success": True,
            "profile_path": custom_profile_path,
            "profile_name": custom_profile_filename,
            "job_id": job_id,
            "base_profile": base_profile_name,
            "applied_configurations": {
                "material": f"{material.tipo} {material.color} ({material.marca})",
                "production_mode": f"{production_mode.mode} - {production_mode.priority}",
                "printer": f"{printer.nombre} ({printer.model})"
            }
        }

    except Exception as e:
        logger.error(f"Error generando perfil dinámico: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generando perfil: {str(e)}")

def map_printer_to_base_profile(model: str, marca: str = "") -> str:
    """Mapea el modelo de impresora a un perfil base disponible"""
    model_lower = model.lower()
    marca_lower = marca.lower()

    # Mapeos específicos
    if 'ender' in model_lower:
        if '3' in model_lower or 'pro' in model_lower:
            return 'ender3_pro' if 'pro' in model_lower else 'ender3'
    elif 'prusa' in marca_lower or 'mk3' in model_lower:
        return 'prusa_mk3'

    # Por defecto usar ender3
    return 'ender3'

def apply_material_config(config: configparser.ConfigParser, material: MaterialConfig):
    """Aplica configuraciones específicas del material al perfil"""

    # Configuraciones de temperatura por material
    material_temps = {
        "PLA": {"nozzle": 210, "bed": 60, "retraction": 5, "retraction_speed": 40},
        "PETG": {"nozzle": 235, "bed": 85, "retraction": 6, "retraction_speed": 45},
        "ABS": {"nozzle": 245, "bed": 100, "retraction": 7, "retraction_speed": 50},
        "TPU": {"nozzle": 220, "bed": 50, "retraction": 8, "retraction_speed": 30}
    }

    temps = material_temps.get(material.tipo.upper(), material_temps["PLA"])

    # Aplicar temperaturas
    if 'temperature' in config['print']:
        config['print']['temperature'] = str(temps["nozzle"])
    if 'bed_temperature' in config['print']:
        config['print']['bed_temperature'] = str(temps["bed"])
    if 'first_layer_temperature' in config['print']:
        config['print']['first_layer_temperature'] = str(temps["nozzle"])
    if 'first_layer_bed_temperature' in config['print']:
        config['print']['first_layer_bed_temperature'] = str(temps["bed"])

    # Aplicar retracción
    if 'retract_length' in config['print']:
        config['print']['retract_length'] = str(temps["retraction"])
    if 'retract_speed' in config['print']:
        config['print']['retract_speed'] = str(temps["retraction_speed"])

def apply_production_config(config: configparser.ConfigParser, production_mode: ProductionModeConfig):
    """Aplica configuraciones del modo de producción al perfil"""

    mode = production_mode.mode
    priority = production_mode.priority

    # Configuraciones base por modo y prioridad
    configs = {
        "prototype": {
            "speed": {
                "layer_height": 0.3,
                "fill_density": "15%",
                "perimeter_speed": 50,
                "infill_speed": 80,
                "travel_speed": 120
            },
            "economy": {
                "layer_height": 0.2,
                "fill_density": "10%",
                "perimeter_speed": 40,
                "infill_speed": 60,
                "travel_speed": 100
            }
        },
        "factory": {
            "quality": {
                "layer_height": 0.1,
                "fill_density": "25%",
                "perimeter_speed": 30,
                "infill_speed": 40,
                "travel_speed": 80
            },
            "consistency": {
                "layer_height": 0.15,
                "fill_density": "20%",
                "perimeter_speed": 35,
                "infill_speed": 45,
                "travel_speed": 90
            }
        }
    }

    # Obtener configuración específica
    mode_config = configs.get(mode, {}).get(priority, configs["prototype"]["speed"])

    # Aplicar configuraciones al perfil
    if 'layer_height' in config['print']:
        config['print']['layer_height'] = str(mode_config["layer_height"])
    if 'fill_density' in config['print']:
        config['print']['fill_density'] = mode_config["fill_density"]
    if 'perimeter_speed' in config['print']:
        config['print']['perimeter_speed'] = str(mode_config["perimeter_speed"])
    if 'infill_speed' in config['print']:
        config['print']['infill_speed'] = str(mode_config["infill_speed"])
    if 'travel_speed' in config['print']:
        config['print']['travel_speed'] = str(mode_config["travel_speed"])

@app.post("/slice")
async def slice_stl(
    file: UploadFile = File(...),
    layer_height: float = 0.2,
    fill_density: int = 20,
    nozzle_temp: int = 210,
    bed_temp: int = 60,
    printer_profile: str = "ender3",
    job_id: Optional[str] = None
):
    """
    Recibe un archivo STL y devuelve el gcode laminado.
    Si se proporciona job_id, usa el perfil dinámico generado para ese trabajo.
    """
    
    # Validar archivo STL
    if not file.filename.lower().endswith('.stl'):
        raise HTTPException(status_code=400, detail="El archivo debe ser .stl")
    
    # Generar ID único para este trabajo
    job_id = str(uuid.uuid4())
    
    try:
        # Guardar archivo STL temporal
        stl_path = f"{UPLOAD_DIR}/{job_id}.stl"
        with open(stl_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"Archivo STL guardado: {stl_path}")
        
        # Ruta del gcode de salida
        gcode_path = f"{OUTPUT_DIR}/{job_id}.gcode"
        
        # Determinar qué perfil usar
        if job_id:
            # Usar perfil dinámico generado por el wizard
            profile_path = f"{STL_CONFIG_DIR}/{job_id}.ini"
            if not os.path.exists(profile_path):
                raise HTTPException(
                    status_code=404,
                    detail=f"Perfil dinámico no encontrado para job {job_id}"
                )
            logger.info(f"Usando perfil dinámico: {profile_path}")
        else:
            # Usar perfil base
            profile_path = f"{PRINTER_CONFIG_DIR}/{printer_profile}.ini"
            logger.info(f"Usando perfil base: {profile_path}")
        
        # Comando de PrusaSlicer
        cmd = [
            "prusa-slicer",
            "--export-gcode",
            "--load", profile_path,
            "--output", gcode_path,
            stl_path
        ]
        
        logger.info(f"Ejecutando: {' '.join(cmd)}")
        
        # Ejecutar PrusaSlicer
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Error en PrusaSlicer: {result.stderr}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error en laminado: {result.stderr}"
            )
        
        # Verificar que se generó el gcode
        if not os.path.exists(gcode_path):
            raise HTTPException(
                status_code=500, 
                detail="No se pudo generar el archivo gcode"
            )
        
        logger.info(f"Gcode generado exitosamente: {gcode_path}")
        
        # Devolver el archivo gcode
        return FileResponse(
            path=gcode_path,
            filename=f"{file.filename.replace('.stl', '.gcode')}",
            media_type="text/plain"
        )
        
    except Exception as e:
        logger.error(f"Error procesando archivo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Limpiar archivo STL temporal
        if os.path.exists(stl_path):
            os.remove(stl_path)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "3D Slicer API"}

@app.get("/profiles")
async def get_printer_profiles():
    """Obtener lista de perfiles de impresora disponibles"""
    return {
        "available_profiles": [
            "ender3",
            "ender3_pro", 
            "prusa_mk3",
            "custom"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)