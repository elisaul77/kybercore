from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import subprocess
import tempfile
import uuid
from pathlib import Path
import logging
from datetime import datetime
import configparser
from typing import Optional, Dict, Any, Tuple
import numpy as np
import trimesh
from scipy.spatial import ConvexHull
import math

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

class AutoRotateRequest(BaseModel):
    stl_path: str
    method: str = "auto"  # "auto", "gradient", "grid"
    rotation_step: int = 15  # Para método grid
    max_rotations: int = 24  # Para método grid
    max_iterations: int = 50  # Para método gradient
    learning_rate: float = 0.1  # Para método gradient

def calculate_contact_area(mesh: trimesh.Trimesh, rotation_matrix: np.ndarray) -> float:
    """
    Calcula el área de contacto con la cama después de aplicar una rotación.
    Encuentra los vértices que tocan la cama (cerca de Z=0) y calcula su área convexa.
    """
    # Aplicar rotación al mesh
    rotated_mesh = mesh.copy()
    rotated_mesh.apply_transform(rotation_matrix)

    # Encontrar el valor Z mínimo (punto más bajo)
    z_min = np.min(rotated_mesh.vertices[:, 2])

    # Considerar vértices que están cerca de la cama (dentro de un pequeño umbral)
    # Esto simula qué partes tocan primero la cama
    threshold = 0.1  # umbral pequeño para considerar "tocando"
    contact_vertices = rotated_mesh.vertices[rotated_mesh.vertices[:, 2] <= z_min + threshold]

    if len(contact_vertices) < 3:
        # Si hay menos de 3 vértices, calcular área basada en bounding box de los puntos de contacto
        if len(contact_vertices) == 0:
            return 0.0
        elif len(contact_vertices) == 1:
            return 0.01  # área mínima para un punto
        elif len(contact_vertices) == 2:
            # Distancia entre dos puntos
            v1, v2 = contact_vertices[0][:2], contact_vertices[1][:2]
            return np.linalg.norm(v1 - v2) * 0.1  # ancho mínimo
        else:
            # Bounding box de los puntos
            vertices_2d = contact_vertices[:, :2]
            min_coords = np.min(vertices_2d, axis=0)
            max_coords = np.max(vertices_2d, axis=0)
            return (max_coords[0] - min_coords[0]) * (max_coords[1] - min_coords[1])

    # Proyectar los vértices de contacto sobre el plano XY
    vertices_2d = contact_vertices[:, :2]

    try:
        # Calcular el convex hull de los puntos de contacto
        hull = ConvexHull(vertices_2d)
        contact_area = hull.volume  # En 2D, volume = area
        return max(contact_area, 0.01)  # área mínima
    except:
        # Si falla el convex hull, calcular bounding box como aproximación
        min_coords = np.min(vertices_2d, axis=0)
        max_coords = np.max(vertices_2d, axis=0)
        contact_area = (max_coords[0] - min_coords[0]) * (max_coords[1] - min_coords[1])
        return max(contact_area, 0.01)  # área mínima

def find_optimal_rotation_gradient(stl_path: str, max_iterations: int = 50, learning_rate: float = 0.1) -> Tuple[np.ndarray, float, Dict]:
    """
    Encuentra la rotación óptima usando descenso del gradiente con múltiples puntos de inicio aleatorios.
    Aplica 10 giros aleatorios iniciales y luego optimiza desde el mejor punto encontrado.
    """
    try:
        # Cargar el mesh STL
        mesh = trimesh.load(stl_path)

        # Función objetivo: área de contacto (a maximizar)
        def objective_function(rotation_angles):
            """Función a maximizar: área de contacto"""
            rot_x, rot_y, rot_z = rotation_angles

            # Crear matriz de rotación
            rot_x_matrix = trimesh.transformations.rotation_matrix(np.radians(rot_x), [1, 0, 0])
            rot_y_matrix = trimesh.transformations.rotation_matrix(np.radians(rot_y), [0, 1, 0])
            rot_z_matrix = trimesh.transformations.rotation_matrix(np.radians(rot_z), [0, 0, 1])

            rotation_matrix = rot_z_matrix @ rot_y_matrix @ rot_x_matrix

            return calculate_contact_area(mesh, rotation_matrix)

        # Función para calcular gradiente numérico
        def numerical_gradient(f, x, h=1e-3):
            """Calcula gradiente numérico usando diferencias finitas"""
            grad = np.zeros_like(x)
            for i in range(len(x)):
                x_plus = x.copy()
                x_minus = x.copy()
                x_plus[i] += h
                x_minus[i] -= h
                grad[i] = (f(x_plus) - f(x_minus)) / (2 * h)
            return grad

        # FASE 1: Exploración inicial con puntos aleatorios y estratégicos
        print("FASE 1: Explorando puntos de inicio aleatorios y estratégicos...")
        random_starts = []
        
        # Agregar puntos estratégicos importantes (rotaciones comunes)
        strategic_points = [
            [0, 0, 0],      # Sin rotación
            [90, 0, 0],     # 90° X
            [180, 0, 0],    # 180° X (invertir)
            [0, 90, 0],     # 90° Y  
            [0, 180, 0],    # 180° Y (invertir)
            [0, 0, 90],     # 90° Z
            [90, 90, 0],    # Combinación 90° X+Y
            [180, 90, 0],   # Combinación 180° X + 90° Y
        ]
        
        print("  Probando puntos estratégicos:")
        for i, angles in enumerate(strategic_points):
            angles_array = np.array(angles, dtype=float)
            area = objective_function(angles_array)
            random_starts.append((angles_array, area))
            print(f"    Estratégico {i+1}: [{angles[0]}, {angles[1]}, {angles[2]}] → Área: {area:.3f}")
        
        # Generar puntos aleatorios adicionales
        print("  Probando puntos aleatorios:")
        np.random.seed(42)  # Para reproducibilidad
        for i in range(7):  # 7 aleatorios + 8 estratégicos = 15 total
            random_angles = np.random.uniform(0, 360, 3)
            area = objective_function(random_angles)
            random_starts.append((random_angles.copy(), area))
            print(f"    Aleatorio {i+1}: [{random_angles[0]:.1f}, {random_angles[1]:.1f}, {random_angles[2]:.1f}] → Área: {area:.3f}")

        # Encontrar el mejor punto de inicio
        best_start = max(random_starts, key=lambda x: x[1])
        start_angles, start_area = best_start
        print(f"Mejor punto de inicio: [{start_angles[0]:.1f}, {start_angles[1]:.1f}, {start_angles[2]:.1f}] → Área: {start_area:.3f}")

        # FASE 2: Optimización por gradiente desde el mejor punto
        print("FASE 2: Optimizando por gradiente desde el mejor punto...")
        
        current_angles = start_angles.copy()
        velocity = np.zeros(3)
        beta = 0.9  # Factor de momentum

        best_angles = current_angles.copy()
        best_area = start_area

        # Calcular área original (sin rotación) para comparación
        original_area = objective_function(np.array([0.0, 0.0, 0.0]))

        # Inicializar variables de seguimiento
        iterations = 0
        converged = False
        gradient_norm_history = []

        # Algoritmo de descenso del gradiente
        for iteration in range(max_iterations):
            # Calcular gradiente
            grad = numerical_gradient(objective_function, current_angles)

            # Normalizar gradiente para evitar pasos demasiado grandes
            grad_norm = np.linalg.norm(grad)
            gradient_norm_history.append(float(grad_norm))

            if grad_norm < 1e-4:  # Convergencia
                converged = True
                print(f"  Convergencia alcanzada en iteración {iteration}")
                break

            # Actualizar velocity (momentum) - ASCENDENTE para maximizar
            velocity = beta * velocity + learning_rate * grad

            # Actualizar ángulos
            current_angles += velocity

            # Mantener ángulos en rango [0, 360)
            current_angles = np.mod(current_angles, 360)

            # Evaluar función objetivo
            current_area = objective_function(current_angles)

            # Actualizar mejor solución
            if current_area > best_area:
                best_area = current_area
                best_angles = current_angles.copy()
                print(f"  Iteración {iteration}: Nueva mejor área {best_area:.3f} en [{best_angles[0]:.1f}, {best_angles[1]:.1f}, {best_angles[2]:.1f}]")

            iterations += 1

        print(f"Optimización finalizada después de {iterations} iteraciones")
        print(f"Mejor área encontrada: {best_area:.3f}")
        print(f"Mejor rotación: [{best_angles[0]:.1f}, {best_angles[1]:.1f}, {best_angles[2]:.1f}]")

        # Crear matriz de rotación final
        best_rot_x, best_rot_y, best_rot_z = best_angles
        rot_x_matrix = trimesh.transformations.rotation_matrix(np.radians(best_rot_x), [1, 0, 0])
        rot_y_matrix = trimesh.transformations.rotation_matrix(np.radians(best_rot_y), [0, 1, 0])
        rot_z_matrix = trimesh.transformations.rotation_matrix(np.radians(best_rot_z), [0, 0, 1])

        best_rotation = rot_z_matrix @ rot_y_matrix @ rot_x_matrix
        
        improvement = ((best_area - original_area) / original_area) * 100 if original_area > 0 else 0

        rotation_info = {
            "method": "gradient_descent_multistart",
            "iterations": int(iterations),
            "converged": converged,
            "best_rotation_degrees": [float(best_rot_x), float(best_rot_y), float(best_rot_z)],
            "contact_area_improvement": float(improvement),
            "original_area": float(original_area),
            "gradient_norm_history": [float(x) for x in gradient_norm_history],
            "random_starts_tested": 15,
            "best_start_area": float(start_area)
        }

        return best_rotation, best_area, rotation_info

    except Exception as e:
        logger.error(f"Error en optimización por gradiente: {str(e)}")
        # Fallback a rotación identidad
        return np.eye(4), 0, {"error": str(e), "method": "gradient_descent"}

def find_optimal_rotation_grid(stl_path: str, rotation_step: int = 30, max_rotations: int = 24) -> Tuple[np.ndarray, float, Dict]:
    """
    Encuentra la rotación óptima usando búsqueda por grilla.
    Más robusto que gradiente para funciones no suaves.
    """
    try:
        # Cargar el mesh STL
        mesh = trimesh.load(stl_path)

        # Función objetivo: área de contacto (a maximizar)
        def objective_function(rot_x, rot_y, rot_z):
            """Función a maximizar: área de contacto"""
            rot_x_matrix = trimesh.transformations.rotation_matrix(np.radians(rot_x), [1, 0, 0])
            rot_y_matrix = trimesh.transformations.rotation_matrix(np.radians(rot_y), [0, 1, 0])
            rot_z_matrix = trimesh.transformations.rotation_matrix(np.radians(rot_z), [0, 0, 1])
            rotation_matrix = rot_z_matrix @ rot_y_matrix @ rot_x_matrix

            return calculate_contact_area(mesh, rotation_matrix)

        # Generar combinaciones de ángulos
        angles = np.arange(0, 360, rotation_step)
        
        best_area = 0
        best_angles = (0, 0, 0)
        rotations_tested = 0

        # Probar todas las combinaciones (limitado para rendimiento)
        for rot_x in angles[::2]:  # Cada 2 pasos para reducir combinaciones
            for rot_y in angles[::3]:  # Cada 3 pasos
                for rot_z in angles[::4]:  # Cada 4 pasos
                    area = objective_function(rot_x, rot_y, rot_z)
                    rotations_tested += 1
                    
                    if area > best_area:
                        best_area = area
                        best_angles = (rot_x, rot_y, rot_z)
                    
                    # Limitar para rendimiento
                    if rotations_tested >= max_rotations:
                        break
                if rotations_tested >= max_rotations:
                    break
            if rotations_tested >= max_rotations:
                break

        # Crear matriz de rotación final
        best_rot_x, best_rot_y, best_rot_z = best_angles
        rot_x_matrix = trimesh.transformations.rotation_matrix(np.radians(best_rot_x), [1, 0, 0])
        rot_y_matrix = trimesh.transformations.rotation_matrix(np.radians(best_rot_y), [0, 1, 0])
        rot_z_matrix = trimesh.transformations.rotation_matrix(np.radians(best_rot_z), [0, 0, 1])

        best_rotation = rot_z_matrix @ rot_y_matrix @ rot_x_matrix
        
        # Calcular área original
        original_area = objective_function(0, 0, 0)
        improvement = ((best_area - original_area) / original_area) * 100 if original_area > 0 else 0

        rotation_info = {
            "method": "grid_search",
            "rotations_tested": int(rotations_tested),
            "best_rotation_degrees": [float(best_rot_x), float(best_rot_y), float(best_rot_z)],
            "contact_area_improvement": float(improvement),
            "original_area": float(original_area)
        }

        return best_rotation, best_area, rotation_info

    except Exception as e:
        logger.error(f"Error en búsqueda por grilla: {str(e)}")
        return np.eye(4), 0, {"error": str(e), "method": "grid_search"}

def find_optimal_rotation_adaptive(stl_path: str, method: str = "gradient", **kwargs) -> Tuple[np.ndarray, float, Dict]:
    """
    Función adaptativa que elige el mejor método de optimización según la complejidad de la geometría.
    """
    try:
        # Cargar mesh para análisis preliminar
        mesh = trimesh.load(stl_path)

        # Estimar complejidad
        num_faces = len(mesh.faces)
        complexity = "simple" if num_faces < 10000 else "complex" if num_faces < 50000 else "very_complex"

        if method == "gradient" or (method == "auto" and complexity in ["simple", "complex"]):
            # Usar descenso del gradiente para geometrías manejables
            # Filtrar solo los parámetros válidos para gradient
            gradient_kwargs = {k: v for k, v in kwargs.items() if k in ['max_iterations', 'learning_rate']}
            result = find_optimal_rotation_gradient(stl_path, **gradient_kwargs)
            return result
        elif method == "grid" or (method == "auto" and complexity == "very_complex"):
            # Usar búsqueda por grilla para geometrías complejas
            grid_kwargs = {k: v for k, v in kwargs.items() if k in ['rotation_step', 'max_rotations']}
            return find_optimal_rotation_grid(stl_path, **grid_kwargs)
        else:
            # Fallback
            return find_optimal_rotation_grid(stl_path, rotation_step=30, max_rotations=12)

    except Exception as e:
        logger.error(f"Error en optimización adaptativa: {str(e)}")
        return np.eye(4), 0, {"error": str(e), "method": "adaptive"}

def apply_rotation_to_stl(input_path: str, output_path: str, rotation_matrix: np.ndarray) -> bool:
    """
    Aplica una rotación a un archivo STL y guarda el resultado.
    """
    try:
        # Cargar mesh
        mesh = trimesh.load(input_path)

        # Aplicar rotación
        mesh.apply_transform(rotation_matrix)

        # Guardar mesh rotado
        mesh.export(output_path)

        return True
    except Exception as e:
        logger.error(f"Error aplicando rotación: {str(e)}")
        return False

@app.post("/slice")
async def slice_stl(
    file: UploadFile = File(...),
    layer_height: float = 0.2,
    fill_density: int = 20,
    nozzle_temp: int = 210,
    bed_temp: int = 60,
    printer_profile: str = "ender3",
    custom_profile: str = None,  # job_id para perfil personalizado
    auto_rotate: bool = False  # Nueva opción para auto-rotación
):
    """
    Recibe un archivo STL y devuelve el gcode laminado.
    Si se especifica custom_profile, usa el perfil personalizado generado.
    Si auto_rotate=True, automáticamente rota el STL para maximizar área de contacto.
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
        
        # Aplicar auto-rotación si está habilitada
        final_stl_path = stl_path
        rotation_info = None
        
        if auto_rotate:
            logger.info("Iniciando auto-rotación para maximizar área de contacto...")
            
            # Encontrar la mejor rotación
            best_rotation, contact_area, rot_info = find_optimal_rotation_adaptive(stl_path, method="auto")
            rotation_info = rot_info
            
            if rot_info.get("contact_area_improvement", 0) > 5:  # Solo rotar si mejora > 5%
                # Aplicar la rotación óptima
                rotated_stl_path = f"{UPLOAD_DIR}/{job_id}_rotated.stl"
                if apply_rotation_to_stl(stl_path, rotated_stl_path, best_rotation):
                    final_stl_path = rotated_stl_path
                    logger.info(f"Auto-rotación aplicada. Mejora: {rot_info['contact_area_improvement']:.1f}%")
                else:
                    logger.warning("Falló la aplicación de rotación, usando STL original")
            else:
                logger.info(f"Auto-rotación no necesaria. Mejora: {rot_info['contact_area_improvement']:.1f}%")
        
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
            final_stl_path  # Usar STL rotado si aplica
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
        # Limpiar archivos STL temporales
        if os.path.exists(stl_path):
            os.remove(stl_path)
        if auto_rotate and 'rotated_stl_path' in locals() and os.path.exists(rotated_stl_path):
            os.remove(rotated_stl_path)

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

# Montar directorio de uploads como archivos estáticos
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/test", response_class=HTMLResponse)
async def test_page():
    """Página de prueba simple"""
    return HTMLResponse(content="<h1>Test</h1><p>Funciona!</p>")

@app.get("/test_auto_rotate.html", response_class=HTMLResponse)
async def get_test_page():
    """Sirve la página de pruebas de auto-rotación con visor 3D"""
    try:
        # Leer el archivo HTML completo desde la carpeta app (volumen mapeado)
        html_file_path = "/app/test_auto_rotate.html"
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        # Fallback si no encuentra el archivo
        return HTMLResponse(content="""
<!DOCTYPE html>
<html>
<head>
    <title>Error - Archivo no encontrado</title>
</head>
<body>
    <h1>Error: No se encontró el archivo test_auto_rotate.html</h1>
    <p>Verifica que el archivo esté en el directorio correcto (/app/app/).</p>
</body>
</html>
        """)

@app.post("/upload")
async def upload_stl(file: UploadFile = File(...)):
    """
    Sube un archivo STL y devuelve la ruta para análisis.
    """
    try:
        # Validar que sea un archivo STL
        if not file.filename.lower().endswith('.stl'):
            raise HTTPException(status_code=400, detail="El archivo debe ser .stl")

        # Generar nombre único para el archivo
        job_id = str(uuid.uuid4())
        stl_filename = f"{job_id}.stl"
        stl_path = f"{UPLOAD_DIR}/{stl_filename}"

        # Guardar el archivo
        with open(stl_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        logger.info(f"Archivo STL subido: {stl_path}")

        return {
            "success": True,
            "file_path": stl_path,
            "file_name": stl_filename,
            "job_id": job_id
        }

    except Exception as e:
        logger.error(f"Error subiendo archivo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-info/{filename}")
async def get_model_info(filename: str):
    """
    Obtiene información detallada de un modelo STL.
    """
    try:
        stl_path = f"{UPLOAD_DIR}/{filename}"
        if not os.path.exists(stl_path):
            raise HTTPException(status_code=404, detail="Archivo STL no encontrado")

        # Cargar el mesh STL
        mesh = trimesh.load(stl_path)

        # Calcular estadísticas
        num_faces = len(mesh.faces)
        num_vertices = len(mesh.vertices)
        volume = mesh.volume if hasattr(mesh, 'volume') and mesh.volume > 0 else 0

        # Estimar complejidad
        if num_faces < 10000:
            complexity = "Simple"
        elif num_faces < 50000:
            complexity = "Complejo"
        else:
            complexity = "Muy Complejo"

        # Calcular área de superficie
        surface_area = mesh.area

        # Calcular bounding box
        bounds = mesh.bounds
        dimensions = bounds[1] - bounds[0]  # [width, depth, height]

        return {
            "success": True,
            "filename": filename,
            "faces": num_faces,
            "vertices": num_vertices,
            "volume": round(volume, 2) if volume > 0 else 0,
            "surface_area": round(surface_area, 2),
            "dimensions": {
                "width": round(dimensions[0], 2),
                "depth": round(dimensions[1], 2),
                "height": round(dimensions[2], 2)
            },
            "complexity": complexity,
            "is_watertight": mesh.is_watertight,
            "is_convex": mesh.is_convex
        }

    except Exception as e:
        logger.error(f"Error obteniendo info del modelo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auto-rotate")
async def auto_rotate_stl(request: AutoRotateRequest):
    """
    Analiza un archivo STL y encuentra la rotación óptima para maximizar el área de contacto.
    Retorna información sobre la mejor rotación encontrada.
    """
    try:
        if not os.path.exists(request.stl_path):
            raise HTTPException(status_code=404, detail="Archivo STL no encontrado")

        logger.info(f"Analizando rotación óptima para: {request.stl_path}")

        # Encontrar rotación óptima
        try:
            result = find_optimal_rotation_adaptive(
                request.stl_path,
                method=request.method,
                rotation_step=request.rotation_step,
                max_rotations=request.max_rotations,
                max_iterations=request.max_iterations,
                learning_rate=request.learning_rate
            )
            logger.info(f"Resultado de optimización: {result}")
        except Exception as e:
            logger.error(f"Excepción en find_optimal_rotation_adaptive: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error en optimización: {str(e)}")
        
        if result is None:
            logger.error("find_optimal_rotation_adaptive devolvió None")
            raise HTTPException(status_code=500, detail="Error interno en optimización")
            
        best_rotation, contact_area, rotation_info = result

        # Aplicar rotación si se encontró una mejora significativa
        rotated_path = None
        if rotation_info.get("contact_area_improvement", 0) > 5:
            job_id = str(uuid.uuid4())
            rotated_path = f"{UPLOAD_DIR}/{job_id}_rotated.stl"
            if apply_rotation_to_stl(request.stl_path, rotated_path, best_rotation):
                rotation_info["rotated_file_path"] = rotated_path
            else:
                rotated_path = None

        return {
            "success": True,
            "optimal_rotation_degrees": rotation_info.get("best_rotation_degrees", [0, 0, 0]),
            "contact_area": contact_area,
            "original_area": rotation_info.get("original_area", 0),
            "improvement_percentage": rotation_info.get("contact_area_improvement", 0),
            "rotations_tested": rotation_info.get("tested_rotations", 0),
            "rotated_file_path": rotated_path,
            "applied_rotation": rotated_path is not None
        }

    except Exception as e:
        logger.error(f"Error en auto-rotación: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auto-rotate-upload")
async def auto_rotate_stl_upload(
    file: UploadFile = File(...),
    method: str = "auto",
    rotation_step: int = 15,
    max_rotations: int = 24,
    max_iterations: int = 50,
    learning_rate: float = 0.1
):
    """
    Recibe un archivo STL, lo analiza, encuentra la rotación óptima y devuelve el archivo rotado.
    
    Args:
        file: Archivo STL a rotar
        method: Método de optimización ('auto', 'gradient', 'grid')
        rotation_step: Paso de rotación para método grid
        max_rotations: Máximo de rotaciones para método grid
        max_iterations: Máximas iteraciones para método gradient
        learning_rate: Tasa de aprendizaje para método gradient
    
    Returns:
        Archivo STL rotado si la mejora es > 5%, o el original si no
    """
    temp_input_path = None
    temp_output_path = None
    
    try:
        # Guardar archivo temporal de entrada
        job_id = str(uuid.uuid4())
        temp_input_path = f"{UPLOAD_DIR}/{job_id}_input.stl"
        
        with open(temp_input_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"Archivo STL recibido: {file.filename} ({len(content)} bytes)")
        logger.info(f"Analizando rotación óptima con método: {method}")

        # Encontrar rotación óptima
        result = find_optimal_rotation_adaptive(
            temp_input_path,
            method=method,
            rotation_step=rotation_step,
            max_rotations=max_rotations,
            max_iterations=max_iterations,
            learning_rate=learning_rate
        )
        
        if result is None:
            raise HTTPException(status_code=500, detail="Error interno en optimización")
            
        best_rotation, contact_area, rotation_info = result
        improvement = rotation_info.get("contact_area_improvement", 0)

        logger.info(f"Rotación óptima encontrada: {rotation_info.get('best_rotation_degrees')} (mejora: {improvement:.2f}%)")

        # Si la mejora es significativa (>5%), aplicar rotación
        if improvement > 5:
            temp_output_path = f"{UPLOAD_DIR}/{job_id}_rotated.stl"
            
            if apply_rotation_to_stl(temp_input_path, temp_output_path, best_rotation):
                logger.info(f"Rotación aplicada exitosamente: {temp_output_path}")
                
                # Devolver el archivo rotado
                return FileResponse(
                    path=temp_output_path,
                    media_type="application/octet-stream",
                    filename=f"rotated_{file.filename}",
                    headers={
                        "X-Rotation-Applied": "true",
                        "X-Rotation-Degrees": str(rotation_info.get('best_rotation_degrees', [0, 0, 0])),
                        "X-Improvement-Percentage": str(improvement),
                        "X-Contact-Area": str(contact_area),
                        "X-Original-Area": str(rotation_info.get('original_area', 0))
                    }
                )
            else:
                raise HTTPException(status_code=500, detail="Error aplicando rotación al archivo")
        else:
            # La mejora no es significativa, devolver el archivo original
            logger.info(f"Mejora insuficiente ({improvement:.2f}%), devolviendo archivo original")
            
            return FileResponse(
                path=temp_input_path,
                media_type="application/octet-stream",
                filename=file.filename,
                headers={
                    "X-Rotation-Applied": "false",
                    "X-Rotation-Degrees": str(rotation_info.get('best_rotation_degrees', [0, 0, 0])),
                    "X-Improvement-Percentage": str(improvement),
                    "X-Reason": "Improvement below threshold (5%)"
                }
            )

    except Exception as e:
        logger.error(f"Error en auto-rotación con upload: {str(e)}")
        
        # Limpiar archivos temporales en caso de error
        if temp_input_path and os.path.exists(temp_input_path):
            try:
                os.remove(temp_input_path)
            except:
                pass
        if temp_output_path and os.path.exists(temp_output_path):
            try:
                os.remove(temp_output_path)
            except:
                pass
        
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-profile")
async def generate_profile(request: ProfileGenerationRequest):
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