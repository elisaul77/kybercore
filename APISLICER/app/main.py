from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os
import subprocess
import tempfile
import uuid
from pathlib import Path
import logging
import configparser
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="3D Slicer API", description="API para laminar archivos STL y generar gcode")

UPLOAD_DIR = "/app/uploads"
OUTPUT_DIR = "/app/output"
CONFIG_DIR = "/app/config"

# Crear directorios si no existen
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(f"{CONFIG_DIR}/printer_config", exist_ok=True)
os.makedirs(f"{CONFIG_DIR}/printer_stl_config", exist_ok=True)

# ===============================
# MODELOS DE DATOS
# ===============================

class ProfileGenerationRequest(BaseModel):
    job_id: str
    printer_model: str  # ender3, prusa_mk3, etc.
    material_config: Dict[str, Any]
    production_config: Dict[str, Any]
    printer_config: Optional[Dict[str, Any]] = None

class ProfileConfig(BaseModel):
    layer_height: float = 0.2
    infill_density: int = 20
    print_speed: int = 50
    nozzle_temp: int = 210
    bed_temp: int = 60
    retract_length: float = 5.0
    retract_speed: int = 40
    first_layer_speed: int = 30
    quality_preset: str = "normal"

# ===============================
# FUNCIONES AUXILIARES
# ===============================

def load_base_printer_profile(printer_model: str) -> Dict[str, str]:
    """Carga el perfil base de la impresora"""
    profile_path = f"{CONFIG_DIR}/printer_config/{printer_model}.ini"
    
    if not os.path.exists(profile_path):
        logger.warning(f"Perfil base no encontrado: {profile_path}, usando ender3 por defecto")
        profile_path = f"{CONFIG_DIR}/printer_config/ender3.ini"
    
    # Configurar parser para permitir valores con % sin interpolación
    config = configparser.ConfigParser()
    config.optionxform = str  # Preservar mayúsculas/minúsculas de las claves
    
    # Leer archivo con interpolación deshabilitada
    with open(profile_path, 'r') as f:
        content = f.read()
        # Escapar los % para evitar errores de interpolación
        content = content.replace('%', '%%')
        config.read_string(content)
    
    # Convertir a diccionario plano
    profile_data = {}
    
    # Leer valores por defecto (sin sección)
    if config.defaults():
        profile_data.update(dict(config.defaults()))
    
    # Leer todas las secciones
    for section_name in config.sections():
        for key, value in config[section_name].items():
            # Restaurar % escapados
            value = value.replace('%%', '%')
            
            # Prefijo con sección para evitar conflictos
            prefixed_key = f"{section_name}_{key}" if section_name != 'print' else key
            profile_data[prefixed_key] = value
            
            # También mantener clave sin prefijo para compatibilidad
            profile_data[key] = value
    
    return profile_data

def apply_material_settings(profile_data: Dict[str, str], material_config: Dict[str, Any]) -> Dict[str, str]:
    """Aplica configuraciones específicas del material"""
    material_type = material_config.get('material_type', 'PLA').upper()
    
    # Configuraciones por tipo de material
    material_settings = {
        'PLA': {
            'temperature': '210',
            'bed_temperature': '60',
            'first_layer_temperature': '210',
            'first_layer_bed_temperature': '60',
            'retract_length': '5',
            'retract_speed': '40'
        },
        'PETG': {
            'temperature': '235',
            'bed_temperature': '85',
            'first_layer_temperature': '235', 
            'first_layer_bed_temperature': '85',
            'retract_length': '3',
            'retract_speed': '30'
        },
        'ABS': {
            'temperature': '245',
            'bed_temperature': '100',
            'first_layer_temperature': '245',
            'first_layer_bed_temperature': '100',
            'retract_length': '4',
            'retract_speed': '35'
        }
    }
    
    if material_type in material_settings:
        profile_data.update(material_settings[material_type])
    
    return profile_data

def apply_production_settings(profile_data: Dict[str, str], production_config: Dict[str, Any]) -> Dict[str, str]:
    """Aplica configuraciones de modo de producción y prioridades"""
    mode = production_config.get('mode', 'prototype')
    priority = production_config.get('priority', 'speed')
    settings = production_config.get('settings', {})
    
    # Aplicar configuraciones específicas
    if 'layer_height' in settings:
        profile_data['layer_height'] = str(settings['layer_height'])
    
    if 'infill_density' in settings:
        profile_data['fill_density'] = f"{settings['infill_density']}%"
    
    if 'print_speed' in settings:
        profile_data['perimeter_speed'] = str(settings['print_speed'])
        profile_data['infill_speed'] = str(settings['print_speed'] + 10)
    
    # Ajustes específicos por prioridad
    if priority == 'speed':
        profile_data['layer_height'] = str(settings.get('layer_height', 0.3))
        profile_data['travel_speed'] = '150'
        profile_data['first_layer_speed'] = '40'
    elif priority == 'quality':
        profile_data['layer_height'] = str(settings.get('layer_height', 0.1))
        profile_data['perimeter_speed'] = '30'
        profile_data['first_layer_speed'] = '20'
    elif priority == 'economy':
        profile_data['fill_density'] = f"{settings.get('infill_density', 10)}%"
        profile_data['perimeter_speed'] = str(settings.get('print_speed', 50))
    
    return profile_data

def generate_profile_file(job_id: str, profile_data: Dict[str, str]) -> str:
    """Genera el archivo .ini con la configuración personalizada"""
    profile_path = f"{CONFIG_DIR}/printer_stl_config/{job_id}.ini"
    
    with open(profile_path, 'w') as f:
        # Escribir encabezado
        f.write(f"# Perfil personalizado generado para job_id: {job_id}\n")
        f.write(f"# Generado el: {datetime.now().isoformat()}\n")
        f.write("\n")
        
        # Escribir configuraciones
        for key, value in profile_data.items():
            f.write(f"{key} = {value}\n")
    
    return profile_path

# ===============================
# ENDPOINTS
# ===============================

@app.post("/generate-profile")
async def generate_custom_profile(request: ProfileGenerationRequest):
    """
    Genera un perfil personalizado combinando el perfil base de la impresora
    con las configuraciones específicas del material y modo de producción
    """
    try:
        logger.info(f"Generando perfil personalizado para job_id: {request.job_id}")
        
        # 1. Cargar perfil base de la impresora
        base_profile = load_base_printer_profile(request.printer_model)
        
        # 2. Aplicar configuraciones del material
        profile_with_material = apply_material_settings(base_profile, request.material_config)
        
        # 3. Aplicar configuraciones de producción
        final_profile = apply_production_settings(profile_with_material, request.production_config)
        
        # 4. Generar archivo .ini personalizado
        profile_path = generate_profile_file(request.job_id, final_profile)
        
        logger.info(f"Perfil personalizado generado: {profile_path}")
        
        return JSONResponse(content={
            "success": True,
            "job_id": request.job_id,
            "profile_path": profile_path,
            "profile_filename": f"{request.job_id}.ini",
            "configurations_applied": {
                "printer_model": request.printer_model,
                "material_type": request.material_config.get('material_type', 'PLA'),
                "production_mode": request.production_config.get('mode', 'prototype'),
                "priority": request.production_config.get('priority', 'speed')
            },
            "profile_summary": {
                "layer_height": final_profile.get('layer_height', '0.2'),
                "fill_density": final_profile.get('fill_density', '20%'),
                "temperature": final_profile.get('temperature', '210'),
                "bed_temperature": final_profile.get('bed_temperature', '60'),
                "print_speed": final_profile.get('perimeter_speed', '50')
            }
        })
        
    except Exception as e:
        logger.error(f"Error generando perfil personalizado: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error generando perfil: {str(e)}"
        )

@app.post("/slice")
async def slice_stl(
    file: UploadFile = File(...),
    layer_height: float = 0.2,
    fill_density: int = 20,
    nozzle_temp: int = 210,
    bed_temp: int = 60,
    printer_profile: str = "ender3",
    custom_profile: Optional[str] = None
):
    """
    Recibe un archivo STL y devuelve el gcode laminado.
    Puede usar un perfil personalizado si se proporciona custom_profile (job_id).
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
            profile_path = f"{CONFIG_DIR}/printer_stl_config/{custom_profile}.ini"
            if not os.path.exists(profile_path):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Perfil personalizado no encontrado: {custom_profile}.ini"
                )
            logger.info(f"Usando perfil personalizado: {profile_path}")
        else:
            # Usar perfil base tradicional
            profile_path = f"{CONFIG_DIR}/printer_configs/{printer_profile}.ini"
            logger.info(f"Usando perfil base: {profile_path}")
        
        # Comando de PrusaSlicer
        if custom_profile:
            # Usar perfil personalizado (sin parámetros adicionales)
            cmd = [
                "prusa-slicer",
                "--export-gcode",
                "--load", profile_path,
                "--output", gcode_path,
                stl_path
            ]
        else:
            # Usar perfil base con parámetros individuales (método tradicional)
            cmd = [
                "prusa-slicer",
                "--export-gcode",
                "--load", profile_path,
                "--layer-height", str(layer_height),
                "--fill-density", f"{fill_density}%",
                "--temperature", str(nozzle_temp),
                "--bed-temperature", str(bed_temp),
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