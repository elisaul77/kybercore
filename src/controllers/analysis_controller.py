from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from pathlib import Path
import logging
import tempfile
from src.services.support_analyzer import support_analyzer

router = APIRouter()
templates = Jinja2Templates(directory="src/web/templates")
logger = logging.getLogger(__name__)

@router.get("/analysis", response_class=HTMLResponse)
def analysis_view(request: Request):
    """Renderiza el módulo de análisis inteligente de fallos."""
    return templates.TemplateResponse("modules/analysis.html", {"request": request})


@router.post("/api/analyze-support")
async def analyze_support_requirements(file: UploadFile = File(...)):
    """
    Analiza un archivo STL para determinar necesidades de soporte de forma inteligente.
    
    Este endpoint utiliza análisis geométrico avanzado para:
    - Detectar voladizos (overhangs) y calcular ángulos críticos
    - Identificar islas flotantes que requieren soportes obligatorios
    - Recomendar tipo de soporte óptimo (tree, linear, grid)
    - Sugerir densidad de soporte apropiada
    - Identificar regiones críticas específicas
    
    Args:
        file: Archivo STL a analizar (multipart/form-data)
    
    Returns:
        JSON con análisis completo:
        {
            "needs_support": bool,
            "support_type": "none" | "tree" | "linear" | "grid",
            "support_density": int (0-100),
            "overhang_analysis": {
                "overhang_percentage": float,
                "max_angle": float,
                "critical_area_mm2": float,
                ...
            },
            "critical_regions": [...],
            "recommendations": [str],
            "statistics": {...}
        }
    """
    try:
        # Validar que es un archivo STL
        if not file.filename.lower().endswith('.stl'):
            raise HTTPException(
                status_code=400, 
                detail="Solo se aceptan archivos STL"
            )
        
        logger.info(f"📐 Iniciando análisis de soportes para: {file.filename}")
        
        # Guardar archivo temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix='.stl') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Ejecutar análisis
            result = support_analyzer.analyze_stl(temp_path)
            
            # Agregar información del archivo
            result['filename'] = file.filename
            result['file_size_bytes'] = len(content)
            
            logger.info(
                f"✅ Análisis completado - Soportes: {result.get('support_type', 'none')} "
                f"@ {result.get('support_density', 0)}%"
            )
            
            return JSONResponse(content=result)
            
        finally:
            # Limpiar archivo temporal
            Path(temp_path).unlink(missing_ok=True)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error analizando soportes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error en análisis de soportes: {str(e)}"
        )

