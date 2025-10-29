from fastapi import FastAPI, File, UploadFile, HTTPException, Form
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
from logging.handlers import RotatingFileHandler
from datetime import datetime
import configparser
from typing import Optional, Dict, Any, Tuple
import numpy as np
import trimesh
from scipy.spatial import ConvexHull
import math
import sys

# Configurar logging a archivos y consola
log_dir = Path("/app/logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "apislicer.log"

# Formato de logs
log_format = logging.Formatter(
    fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Handler para archivo con rotación (10MB, 3 archivos)
file_handler = RotatingFileHandler(
    log_file,
    maxBytes=10 * 1024 * 1024,  # 10 MB
    backupCount=3,
    encoding='utf-8'
)
file_handler.setFormatter(log_format)
file_handler.setLevel(logging.INFO)

# Handler para consola
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(log_format)
console_handler.setLevel(logging.INFO)

# Configurar root logger
logging.basicConfig(level=logging.INFO, handlers=[file_handler, console_handler])
logger = logging.getLogger(__name__)

logger.info("📋 Logging configurado para APISLICER")
logger.info(f"📁 Logs guardándose en: {log_file}")
logger.info("🔄 Rotación: 10MB × 3 archivos")

app = FastAPI(title="3D Slicer API", description="API para laminar archivos STL y generar gcode")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Rotation-Applied",
        "X-Rotation-Degrees",
        "X-Improvement-Percentage",
        "X-Contact-Area",
        "X-Original-Area",
        "X-Improvement-Threshold"
    ]
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
    Calcula el área REAL de contacto con la cama sumando las áreas de las caras (triángulos)
    que están en contacto o muy cerca del plato.
    
    OPTIMIZADO: Usa operaciones vectorizadas de NumPy para calcular todas las caras en paralelo.
    
    Este método es más preciso que ConvexHull porque:
    - ConvexHull crea un "envoltorio convexo" que rellena huecos
    - Este método suma solo las caras reales del mesh que tocan
    
    Ejemplo: Una pieza en forma de "H" tendrá 2 áreas separadas, no un rectángulo completo.
    """
    # Aplicar rotación al mesh
    rotated_mesh = mesh.copy()
    rotated_mesh.apply_transform(rotation_matrix)

    # Encontrar el valor Z mínimo (punto más bajo del mesh)
    z_min = np.min(rotated_mesh.vertices[:, 2])

    # Umbral para considerar una cara "en contacto" con la cama
    z_threshold = 0.5  # mm - ajustable según precisión deseada

    # OPTIMIZACIÓN 1: Operaciones vectorizadas en lugar de loops
    # Obtener todos los vértices de todas las caras de una vez
    face_vertices = rotated_mesh.vertices[rotated_mesh.faces]  # Shape: (n_faces, 3, 3)
    
    # Calcular centroides de todas las caras a la vez
    face_centers_z = np.mean(face_vertices[:, :, 2], axis=1)  # Shape: (n_faces,)
    
    # Filtrar caras en contacto (operación vectorizada)
    contact_mask = face_centers_z <= (z_min + z_threshold)
    contact_faces = face_vertices[contact_mask]  # Solo caras en contacto
    
    # Si no hay caras en contacto, usar fallback
    if len(contact_faces) == 0:
        logger.warning("⚠️  No se encontraron caras en contacto, usando ConvexHull como fallback")
        return calculate_contact_area_convexhull_fallback(rotated_mesh, z_min)
    
    # OPTIMIZACIÓN 2: Calcular áreas de todos los triángulos de una vez
    # Para cada triángulo: área = 0.5 * ||edge1 × edge2||
    v0 = contact_faces[:, 0, :]  # Primer vértice de cada cara
    v1 = contact_faces[:, 1, :]  # Segundo vértice
    v2 = contact_faces[:, 2, :]  # Tercer vértice
    
    edge1 = v1 - v0  # Shape: (n_contact_faces, 3)
    edge2 = v2 - v0
    
    # Producto cruz vectorizado
    cross_products = np.cross(edge1, edge2)  # Shape: (n_contact_faces, 3)
    
    # Normas (longitudes) de todos los productos cruz
    face_areas = 0.5 * np.linalg.norm(cross_products, axis=1)  # Shape: (n_contact_faces,)
    
    # Sumar todas las áreas
    total_contact_area = np.sum(face_areas)
    contact_faces_count = len(contact_faces)
    
    # Validación mínima
    if total_contact_area < 0.01:
        logger.warning("⚠️  Área de contacto muy pequeña, usando ConvexHull como fallback")
        return calculate_contact_area_convexhull_fallback(rotated_mesh, z_min)
    
    logger.debug(f"   📐 Área real de contacto: {total_contact_area:.2f} mm² ({contact_faces_count} caras)")
    return total_contact_area


def calculate_contact_area_convexhull_fallback(rotated_mesh: trimesh.Trimesh, z_min: float) -> float:
    """
    Método alternativo usando ConvexHull (menos preciso pero más robusto).
    Solo se usa si el método principal falla.
    """
    threshold = 0.1
    contact_vertices = rotated_mesh.vertices[rotated_mesh.vertices[:, 2] <= z_min + threshold]

    if len(contact_vertices) < 3:
        if len(contact_vertices) == 0:
            return 0.0
        elif len(contact_vertices) == 1:
            return 0.01
        elif len(contact_vertices) == 2:
            v1, v2 = contact_vertices[0][:2], contact_vertices[1][:2]
            return np.linalg.norm(v1 - v2) * 0.1
        else:
            vertices_2d = contact_vertices[:, :2]
            min_coords = np.min(vertices_2d, axis=0)
            max_coords = np.max(vertices_2d, axis=0)
            return (max_coords[0] - min_coords[0]) * (max_coords[1] - min_coords[1])

    vertices_2d = contact_vertices[:, :2]

    try:
        hull = ConvexHull(vertices_2d)
        contact_area = hull.volume  # En 2D, volume = area
        return max(contact_area, 0.01)
    except:
        min_coords = np.min(vertices_2d, axis=0)
        max_coords = np.max(vertices_2d, axis=0)
        contact_area = (max_coords[0] - min_coords[0]) * (max_coords[1] - min_coords[1])
        return max(contact_area, 0.01)

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
    layer_height: float = Form(0.2),
    fill_density: int = Form(20),
    nozzle_temp: int = Form(210),
    bed_temp: int = Form(60),
    printer_profile: str = Form("ender3"),
    custom_profile: str = Form(None),  # job_id para perfil personalizado
    auto_rotate: bool = Form(False),  # Nueva opción para auto-rotación
    
    # 🖨️ PARÁMETROS ESPECÍFICOS DE IMPRESORA (RETRACCIÓN)
    retract_length: float = Form(6.0),               # Longitud de retracción (mm)
    retract_speed: int = Form(40),                   # Velocidad de retracción (mm/s)
    retract_lift: float = Form(0.3),                 # Z-hop al retraer (mm)

    
    # ✨ PARÁMETROS BÁSICOS DE IA
    infill_pattern: str = Form("honeycomb"),
    support_type: str = Form("none"),
    support_density: int = Form(15),
    brim_width: float = Form(0.0),
    perimeters: int = Form(3),
    first_layer_height: float = Form(None),
    print_speed: int = Form(60),
    
    # 🔥 PARÁMETROS DE CALIDAD - FASE 1 (CRÍTICOS)
    gcode_resolution: float = Form(0.005),           # Resolución de curvas (más bajo = más suave)
    external_perimeter_speed: int = Form(25),        # Velocidad perímetros externos (más lento = mejor acabado)
    top_solid_layers: int = Form(6),                 # Capas sólidas superiores (más = sin huecos)
    bottom_solid_layers: int = Form(6),              # Capas sólidas inferiores (más = sin huecos)
    extra_perimeters: bool = Form(True),             # Añadir perímetros en paredes inclinadas
    gap_fill_enabled: bool = Form(True),             # Rellenar espacios entre perímetros
    gap_fill_speed: int = Form(15),                  # Velocidad de relleno de gaps (lento = preciso)
    seam_position: str = Form("aligned"),            # Posición de costura (aligned/rear/nearest/random)
    
    # 🔶 PARÁMETROS DE CALIDAD - FASE 2 (IMPORTANTES)
    avoid_crossing_perimeters: bool = Form(True),    # Evitar cruzar perímetros en viajes
    perimeter_generator: str = Form("arachne"),      # Generador de perímetros (arachne/classic)
    infill_overlap: float = Form(30.0),              # Solapamiento relleno-perímetros (%)
    
    # 🌉 PARÁMETROS DE PUENTES Y VOLADIZOS
    bridge_speed: int = Form(50),                    # Velocidad de puentes
    bridge_flow_ratio: float = Form(0.9),            # Ratio de flujo en puentes (< 1 = tensar)
    bridge_fan_speed: int = Form(100),               # Velocidad ventilador en puentes (%)
    overhangs: bool = Form(True),                    # Habilitar ajuste de voladizos
    enable_dynamic_overhang_speeds: bool = Form(True), # Velocidad dinámica en voladizos
    
    # 💨 PARÁMETROS DE VENTILADOR (PLA por defecto)
    min_fan_speed: int = Form(70),                   # Velocidad mínima ventilador (%)
    max_fan_speed: int = Form(100),                  # Velocidad máxima ventilador (%)
    disable_fan_first_layers: int = Form(1),         # Desactivar ventilador en primeras N capas
    
    # 📏 PARÁMETROS AVANZADOS DE EXTRUSIÓN
    external_perimeter_extrusion_width: float = Form(105.0),  # Ancho extrusión perímetros externos (%)
    top_infill_extrusion_width: float = Form(105.0),          # Ancho extrusión capas superiores (%)
    
    # 🎯 PARÁMETROS DE PRECISIÓN
    thin_walls: bool = Form(True),                   # Detectar y manejar paredes delgadas
    resolution: float = Form(0.0)                    # Simplificación STL (0 = sin simplificar)
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
    
    # 🔍 DEBUG: Log temperaturas recibidas
    logger.info(f"🔍 TEMPERATURAS RECIBIDAS en /slice: nozzle={nozzle_temp}°C, bed={bed_temp}°C")
    
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
        
        # Determinar qué perfil usar y extraer parámetros
        if custom_profile:
            # Usar perfil personalizado
            profile_path = f"{PRINTER_STL_CONFIG_DIR}/{custom_profile}.ini"
            if not os.path.exists(profile_path):
                raise HTTPException(
                    status_code=404, 
                    detail=f"Perfil personalizado no encontrado: {custom_profile}"
                )
            logger.info(f"Usando perfil personalizado: {profile_path}")
            
            # 🔥 NUEVO: Leer parámetros del perfil personalizado SOLO si no vienen como parámetros explícitos
            profile_config = configparser.ConfigParser()
            profile_config.read(profile_path)
            
            # Extraer valores del perfil personalizado
            if profile_config.has_section("print"):
                # IMPORTANTE: Los parámetros recibidos del endpoint (rotation_worker) tienen PRIORIDAD
                # Solo usar los del perfil como fallback si vienen con valores por defecto
                
                # Para temperaturas: SIEMPRE usar las recibidas (rotation_worker ya aplicó material_temps)
                # NO sobrescribir nozzle_temp y bed_temp del parámetro
                
                # Para layer_height y fill_density: usar del perfil solo si son valores por defecto
                profile_layer_height = profile_config.getfloat("print", "layer_height", fallback=layer_height)
                profile_fill_density = profile_config.getint("print", "fill_density", fallback=fill_density)
                
                logger.info(f"📋 Parámetros combinados (endpoint + perfil):")
                logger.info(f"   🌡️  Temperaturas del endpoint: Nozzle: {nozzle_temp}°C | Bed: {bed_temp}°C")
                logger.info(f"   📏 Geometría del perfil: Layer: {profile_layer_height}mm | Infill: {profile_fill_density}%")
                
                # Usar geometría del perfil, pero mantener temperaturas del endpoint
                layer_height = profile_layer_height
                fill_density = profile_fill_density
                # ❌ NO sobrescribir: nozzle_temp y bed_temp (mantener los del endpoint)
            else:
                logger.warning("⚠️  Perfil personalizado no tiene sección [print], usando valores del endpoint")
        else:
            # Usar perfil base
            profile_path = f"{PRINTER_CONFIG_DIR}/{printer_profile}.ini"
            if not os.path.exists(profile_path):
                raise HTTPException(
                    status_code=404, 
                    detail=f"Perfil base no encontrado: {printer_profile}"
                )
            logger.info(f"Usando perfil base: {profile_path}")
        
        # Comando de PrusaSlicer con parámetros explícitos
        # 🔥 TODOS LOS PARÁMETROS DE CALIDAD IMPLEMENTADOS
        
        # Calcular first_layer_height si no se especificó
        if first_layer_height is None:
            first_layer_height = layer_height * 1.2
        
        # Construir comando base
        cmd = [
            "prusa-slicer",
            "--export-gcode",
            "--load", profile_path,
            "--output", gcode_path,
            
            # ===== PARÁMETROS BÁSICOS =====
            "--layer-height", str(layer_height),
            "--first-layer-height", str(first_layer_height),
            "--fill-density", f"{fill_density}%",
            "--fill-pattern", infill_pattern,
            "--temperature", str(nozzle_temp),
            "--bed-temperature", str(bed_temp),
            "--first-layer-temperature", str(nozzle_temp + 5),  # 🔥 +5°C para mejor adherencia
            "--first-layer-bed-temperature", str(bed_temp + 5),  # 🔥 +5°C para mejor adherencia
            
            # ===== RETRACCIÓN (ESPECÍFICO DE IMPRESORA) =====
            "--retract-length", str(retract_length),
            "--retract-speed", str(retract_speed),
            "--retract-lift", str(retract_lift),

            
            # ===== PERÍMETROS Y PAREDES =====
            "--perimeters", str(perimeters),
            "--top-solid-layers", str(top_solid_layers),
            "--bottom-solid-layers", str(bottom_solid_layers),
            
            # ===== SOPORTES =====
            # Mapear tipos de soporte a nombres válidos de PrusaSlicer
            # "linear" -> "rectilinear", "grid" -> "rectilinear-grid", "tree" -> "organic"
        ]
        
        # Agregar parámetros de soporte si están habilitados
        if support_type != "none":
            # Mapeo de tipos
            support_pattern_map = {
                "linear": "rectilinear",
                "grid": "rectilinear-grid", 
                "tree": "organic",
                "honeycomb": "honeycomb"
            }
            prusaslicer_pattern = support_pattern_map.get(support_type, "rectilinear")
            
            # Agregar parámetros de soporte
            # IMPORTANTE: --support-material es un FLAG (no acepta valor)
            cmd.append("--support-material")
            cmd.append("--support-material-buildplate-only")  # 🔥 Solo soportes desde la base (no entre piezas)
            cmd.extend([
                "--support-material-pattern", prusaslicer_pattern,
                "--support-material-spacing", str(2.5),  # mm entre líneas de soporte
                "--support-material-threshold", "45",  # Ángulo crítico 45°
                "--support-material-interface-layers", "3",  # 3 capas de interface
                "--support-material-interface-spacing", "0.2",  # Espaciado de interface
                "--support-material-contact-distance", "0.2",  # Distancia de contacto (facilita remoción)
            ])
            
            logger.info(f"      🔥 Soportes mapeados: '{support_type}' -> '{prusaslicer_pattern}'")
        # Si support_type == "none", simplemente no agregamos --support-material (está deshabilitado por defecto)
        
        # Continuar con velocidades
        cmd.extend([
            "--perimeter-speed", str(int(print_speed * 0.8)),
            "--external-perimeter-speed", str(external_perimeter_speed),
            "--infill-speed", str(print_speed),
            "--travel-speed", str(int(print_speed * 2.5)),
            "--first-layer-speed", str(int(print_speed * 0.3)),  # 30% para primera capa
            "--gap-fill-speed", str(gap_fill_speed),
            
            # ===== CALIDAD Y PRECISIÓN =====
            "--gcode-resolution", str(gcode_resolution),
            "--seam-position", seam_position,
            "--brim-width", str(brim_width),
            "--infill-overlap", f"{infill_overlap}%",
            # NOTA: elephant-foot-compensation no es válido en PrusaSlicer 2.8.1
            # Usar elefant_foot_compensation (sin guión) en el perfil .ini en su lugar
            
            # ===== PUENTES Y VOLADIZOS =====
            "--bridge-speed", str(bridge_speed),
            "--bridge-flow-ratio", str(bridge_flow_ratio),
            "--bridge-fan-speed", str(bridge_fan_speed),
            
            # ===== VENTILADOR =====
            "--min-fan-speed", str(min_fan_speed),
            "--max-fan-speed", str(max_fan_speed),
            "--disable-fan-first-layers", str(disable_fan_first_layers),
            
            # ===== EXTRUSIÓN AVANZADA =====
            "--external-perimeter-extrusion-width", f"{external_perimeter_extrusion_width}%",
            "--top-infill-extrusion-width", f"{top_infill_extrusion_width}%",
            
            # ===== PRECISIÓN AVANZADA =====
            "--resolution", str(resolution),
        ])
        
        # ===== PARÁMETROS BOOLEANOS (FLAGS) =====
        if extra_perimeters:
            cmd.append("--extra-perimeters")
        
        if gap_fill_enabled:
            cmd.append("--gap-fill-enabled")
        
        if avoid_crossing_perimeters:
            cmd.append("--avoid-crossing-perimeters")
        
        if overhangs:
            cmd.append("--overhangs")
        
        if enable_dynamic_overhang_speeds:
            cmd.append("--enable-dynamic-overhang-speeds")
        
        if thin_walls:
            cmd.append("--thin-walls")
        
        # ===== GENERADOR DE PERÍMETROS =====
        if perimeter_generator:
            cmd.extend(["--perimeter-generator", perimeter_generator])
        
        # Agregar archivo STL al final
        cmd.append(final_stl_path)
        
        logger.info(f"✨ TODOS los parámetros de calidad aplicados:")
        logger.info(f"   � Capas: {layer_height}mm / {first_layer_height}mm (primera)")
        logger.info(f"   🔹 Perímetros: {perimeters} + Top: {top_solid_layers} + Bottom: {bottom_solid_layers}")
        logger.info(f"   🔹 Extra perímetros: {'✅' if extra_perimeters else '❌'}")
        logger.info(f"   📦 Infill: {fill_density}% ({infill_pattern}) + Overlap: {infill_overlap}%")
        logger.info(f"   🎨 Brim: {brim_width}mm + Costura: {seam_position}")
        
        logger.info(f"   � Velocidades:")
        logger.info(f"      • Externa: {external_perimeter_speed}mm/s (perímetro visible)")
        logger.info(f"      • Interna: {int(print_speed * 0.8)}mm/s (perímetro interno)")
        logger.info(f"      • Infill: {print_speed}mm/s")
        logger.info(f"      • Viaje: {int(print_speed * 2.5)}mm/s")
        logger.info(f"      • Primera capa: {int(print_speed * 0.3)}mm/s")
        logger.info(f"      • Gap fill: {gap_fill_speed}mm/s")
        
        logger.info(f"   🎯 Calidad:")
        logger.info(f"      • G-code resolution: {gcode_resolution}mm (curvas)")
        logger.info(f"      • Gap fill: {'✅' if gap_fill_enabled else '❌'}")
        logger.info(f"      • Avoid crossing: {'✅' if avoid_crossing_perimeters else '❌'}")
        logger.info(f"      • Thin walls: {'✅' if thin_walls else '❌'}")
        logger.info(f"      • Perimeter gen: {perimeter_generator}")
        logger.info(f"      • Infill overlap: {infill_overlap}%")
        
        logger.info(f"   🌉 Puentes:")
        logger.info(f"      • Velocidad: {bridge_speed}mm/s")
        logger.info(f"      • Flow ratio: {bridge_flow_ratio}")
        logger.info(f"      • Ventilador: {bridge_fan_speed}%")
        
        logger.info(f"   � Voladizos:")
        logger.info(f"      • Overhangs: {'✅' if overhangs else '❌'}")
        logger.info(f"      • Dynamic speeds: {'✅' if enable_dynamic_overhang_speeds else '❌'}")
        
        logger.info(f"   💨 Ventilador:")
        logger.info(f"      • Min/Max: {min_fan_speed}% / {max_fan_speed}%")
        logger.info(f"      • Desactivar primeras {disable_fan_first_layers} capas")
        
        logger.info(f"   🔧 Extrusión:")
        logger.info(f"      • Externa: {external_perimeter_extrusion_width}%")
        logger.info(f"      • Top: {top_infill_extrusion_width}%")
        
        logger.info(f"   🌡️  Temperaturas:")
        logger.info(f"      • Normal: {nozzle_temp}°C / {bed_temp}°C")
        logger.info(f"      • Primera capa: {nozzle_temp + 5}°C / {bed_temp + 5}°C 🔥")
        
        logger.info(f"   🔧 Retracción:")
        logger.info(f"      • Length: {retract_length}mm")
        logger.info(f"      • Speed: {retract_speed}mm/s")
        logger.info(f"      • Z-hop: {retract_lift}mm")
        
        logger.info(f"   🏗️  SOPORTES:")
        logger.info(f"      • Tipo: {support_type}")
        logger.info(f"      • Densidad: {support_density}%")
        logger.info(f"      • Habilitado: {'✅ SÍ' if support_type != 'none' else '❌ NO'}")
        if support_type != 'none':
            logger.info(f"      • Modo: Solo desde la base (buildplate-only)")
        
        logger.info(f"Ejecutando: {' '.join(cmd[:10])}... ({len(cmd)} parámetros)")
        logger.info(f"   🔍 DEBUG: Últimos 5 parámetros: {cmd[-5:]}")

        
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
    method: str = Form("auto"),
    rotation_step: int = Form(15),
    max_rotations: int = Form(24),
    max_iterations: int = Form(50),
    learning_rate: float = Form(0.1),
    improvement_threshold: float = Form(5.0)
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
        improvement_threshold: Umbral mínimo de mejora (%) para aplicar rotación
    
    Returns:
        Archivo STL rotado si la mejora es > improvement_threshold%, o el original si no
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

        logger.info(f"Rotación óptima encontrada: {rotation_info.get('best_rotation_degrees')} (mejora: {improvement:.2f}%, umbral: {improvement_threshold}%)")

        # Si la mejora es significativa (> improvement_threshold%), aplicar rotación
        if improvement > improvement_threshold:
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
                        "X-Original-Area": str(rotation_info.get('original_area', 0)),
                        "X-Improvement-Threshold": str(improvement_threshold)
                    }
                )
            else:
                raise HTTPException(status_code=500, detail="Error aplicando rotación al archivo")
        else:
            # La mejora no es significativa, devolver el archivo original
            logger.info(f"Mejora insuficiente ({improvement:.2f}% < {improvement_threshold}%), devolviendo archivo original")
            
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
                "first_layer_temperature": 215,  # 🔥 MÁS CALOR para primera capa
                "first_layer_bed_temperature": 65,  # 🔥 MÁS CALOR para primera capa
                "retract_length": 5,
                "retract_speed": 40
            },
            "PETG": {
                "temperature": 235,
                "bed_temperature": 85,
                "first_layer_temperature": 240,  # 🔥 MÁS CALOR para primera capa
                "first_layer_bed_temperature": 90,  # 🔥 MÁS CALOR para primera capa
                "retract_length": 6,
                "retract_speed": 45
            },
            "ABS": {
                "temperature": 245,
                "bed_temperature": 100,
                "first_layer_temperature": 250,  # 🔥 MÁS CALOR para primera capa
                "first_layer_bed_temperature": 105,  # 🔥 MÁS CALOR para primera capa
                "retract_length": 7,
                "retract_speed": 50
            },
            "TPU": {
                "temperature": 220,
                "bed_temperature": 50,
                "first_layer_temperature": 225,  # 🔥 MÁS CALOR para primera capa
                "first_layer_bed_temperature": 55,  # 🔥 MÁS CALOR para primera capa
                "retract_length": 2,
                "retract_speed": 25
            },
            "NYLON": {
                "temperature": 260,
                "bed_temperature": 85,
                "first_layer_temperature": 265,  # 🔥 MÁS CALOR para primera capa
                "first_layer_bed_temperature": 90,  # 🔥 MÁS CALOR para primera capa
                "retract_length": 6,
                "retract_speed": 40
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