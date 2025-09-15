from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import subprocess
import tempfile
import uuid
from pathlib import Path
import logging
from datetime import datetime
import configparser
from typing import Optional, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="3D Slicer API", description="API para laminar archivos STL y generar gcode")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/uploads"
OUTPUT_DIR = "/app/output"
CONFIG_DIR = "/app/config"
PRINTER_CONFIG_DIR = f"{CONFIG_DIR}/printer_config"
PRINTER_STL_CONFIG_DIR = f"{CONFIG_DIR}/printer_stl_config"

# Crear directorios si no existen
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(PRINTER_CONFIG_DIR, exist_ok=True)
os.makedirs(PRINTER_STL_CONFIG_DIR, exist_ok=True)

# Modelos de datos
class ProfileGenerationRequest(BaseModel):
    job_id: str
    printer_model: str  # "ender3", "prusa_mk3", etc.
    material_config: dict
    production_config: dict
    printer_config: dict

@app.post("/slice")
async def slice_stl(
    file: UploadFile = File(...),
    layer_height: float = 0.2,
    fill_density: int = 20,
    nozzle_temp: int = 210,
    bed_temp: int = 60,
    printer_profile: str = "ender3",
    custom_profile: str = None  # job_id para perfil personalizado
):
    """
    Recibe un archivo STL y devuelve el gcode laminado.
    Si se especifica custom_profile, usa el perfil personalizado generado.
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
        if custom_profile:
            # Usar perfil personalizado
            profile_path = f"{PRINTER_STL_CONFIG_DIR}/{custom_profile}.ini"
            if not os.path.exists(profile_path):
                raise HTTPException(
                    status_code=404, 
                    detail=f"Perfil personalizado no encontrado: {custom_profile}"
                )
            logger.info(f"Usando perfil personalizado: {profile_path}")
        else:
            # Usar perfil base
            profile_path = f"{PRINTER_CONFIG_DIR}/{printer_profile}.ini"
            if not os.path.exists(profile_path):
                raise HTTPException(
                    status_code=404, 
                    detail=f"Perfil base no encontrado: {printer_profile}"
                )
            logger.info(f"Usando perfil base: {profile_path}")
        
        # Comando de PrusaSlicer
        cmd = [
            "prusa-slicer",
            "--export-gcode",
            "--load", profile_path,
            "--output", gcode_path,
            stl_path
        ]
        
        # Solo agregar parámetros si no se usa perfil personalizado
        if not custom_profile:
            cmd.extend([
                "--layer-height", str(layer_height),
                "--fill-density", f"{fill_density}%",
                "--temperature", str(nozzle_temp),
                "--bed-temperature", str(bed_temp)
            ])
        
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
            "ender5",
            "prusa_mk3",
            "generic"
        ]
    }

@app.post("/generate-profile")
async def generate_custom_profile(request: ProfileGenerationRequest):
    """
    Genera un perfil personalizado de impresión basado en las configuraciones del wizard.
    Combina el perfil base de la impresora con configuraciones específicas de material y producción.
    """
    try:
        logger.info(f"Generando perfil personalizado para job_id: {request.job_id}")
        
        # Verificar que existe el perfil base de la impresora
        base_profile_path = f"{PRINTER_CONFIG_DIR}/{request.printer_model}.ini"
        if not os.path.exists(base_profile_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Perfil base no encontrado: {request.printer_model}"
            )
        
        # Leer perfil base
        config = configparser.ConfigParser()
        config.read(base_profile_path)
        
        # Aplicar configuraciones de material
        material_config = request.material_config
        material_type = material_config.get("type", "PLA").upper()
        
        # Configuraciones específicas por material
        material_settings = {
            "PLA": {
                "temperature": 210,
                "bed_temperature": 60,
                "retract_length": 5,
                "retract_speed": 40,
                "first_layer_temperature": 210,
                "first_layer_bed_temperature": 60
            },
            "PETG": {
                "temperature": 235,
                "bed_temperature": 85,
                "retract_length": 6,
                "retract_speed": 45,
                "first_layer_temperature": 235,
                "first_layer_bed_temperature": 85
            },
            "ABS": {
                "temperature": 245,
                "bed_temperature": 100,
                "retract_length": 7,
                "retract_speed": 50,
                "first_layer_temperature": 245,
                "first_layer_bed_temperature": 100
            }
        }
        
        if material_type in material_settings:
            settings = material_settings[material_type]
            for key, value in settings.items():
                if config.has_section("print"):
                    config.set("print", key, str(value))
        
        # Aplicar configuraciones de producción
        production_config = request.production_config
        mode = production_config.get("mode", "prototype")
        priority = production_config.get("priority", "speed")
        
        # Configuraciones por modo y prioridad
        production_settings = {
            "prototype": {
                "speed": {
                    "layer_height": 0.3,
                    "fill_density": 15,
                    "speed_factor": 1.2,
                    "quality_preset": "draft"
                },
                "economy": {
                    "layer_height": 0.2,
                    "fill_density": 10,
                    "speed_factor": 1.0,
                    "quality_preset": "normal"
                }
            },
            "factory": {
                "quality": {
                    "layer_height": 0.1,
                    "fill_density": 25,
                    "speed_factor": 0.6,
                    "quality_preset": "fine"
                },
                "consistency": {
                    "layer_height": 0.15,
                    "fill_density": 20,
                    "speed_factor": 0.8,
                    "quality_preset": "normal"
                }
            }
        }
        
        if mode in production_settings and priority in production_settings[mode]:
            settings = production_settings[mode][priority]
            
            # Aplicar configuraciones de capa y relleno
            config.set("print", "layer_height", str(settings["layer_height"]))
            config.set("print", "fill_density", str(settings["fill_density"]))
            
            # Ajustar velocidades según el factor de velocidad
            speed_factor = settings["speed_factor"]
            if config.has_section("print"):
                for speed_key in ["perimeter_speed", "infill_speed", "travel_speed"]:
                    if config.has_option("print", speed_key):
                        base_speed = config.getint("print", speed_key)
                        new_speed = int(base_speed * speed_factor)
                        config.set("print", speed_key, str(new_speed))
        
        # Aplicar configuraciones específicas de impresora si existen
        printer_config = request.printer_config
        if printer_config.get("bed_adhesion", False):
            # Agregar raft o brim si es necesario
            if not config.has_section("print:skirt"):
                config.add_section("print:skirt")
            config.set("print:skirt", "skirt_height", "1")
            config.set("print:skirt", "skirt_distance", "2")
        
        # Generar nombre del perfil personalizado
        custom_profile_path = f"{PRINTER_STL_CONFIG_DIR}/{request.job_id}.ini"
        
        # Agregar metadata al perfil
        if not config.has_section("metadata"):
            config.add_section("metadata")
        config.set("metadata", "job_id", request.job_id)
        config.set("metadata", "generated_at", datetime.now().isoformat())
        config.set("metadata", "base_printer", request.printer_model)
        config.set("metadata", "material", material_type)
        config.set("metadata", "production_mode", f"{mode}_{priority}")
        
        # Guardar perfil personalizado
        with open(custom_profile_path, 'w') as configfile:
            config.write(configfile)
        
        logger.info(f"Perfil personalizado generado: {custom_profile_path}")
        
        return {
            "success": True,
            "profile_path": custom_profile_path,
            "profile_name": f"{request.job_id}.ini",
            "job_id": request.job_id,
            "base_printer": request.printer_model,
            "material": material_type,
            "production_mode": f"{mode}_{priority}",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generando perfil personalizado: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)