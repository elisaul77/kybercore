from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
import os
import subprocess
import tempfile
import uuid
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="3D Slicer API", description="API para laminar archivos STL y generar gcode")

UPLOAD_DIR = "/app/uploads"
OUTPUT_DIR = "/app/output"
CONFIG_DIR = "/app/config"

# Crear directorios si no existen
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.post("/slice")
async def slice_stl(
    file: UploadFile = File(...),
    layer_height: float = 0.2,
    fill_density: int = 20,
    nozzle_temp: int = 210,
    bed_temp: int = 60,
    printer_profile: str = "ender3"
):
    """
    Recibe un archivo STL y devuelve el gcode laminado
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
        
        # Comando de PrusaSlicer
        cmd = [
            "prusa-slicer",
            "--export-gcode",
            "--load", f"{CONFIG_DIR}/printer_configs/{printer_profile}.ini",
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