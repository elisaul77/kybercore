"""
Detección de Colisiones 3D usando Voxel Grids

Este módulo implementa detección    try:
        resolution = bed_voxel_grid['resolution']
        
        # Voxelizar pieza en la posición de prueba
        mesh_copy = mesh.copy()
        mesh_copy.apply_translation(position)
        piece_voxel = mesh_copy.voxelized(pitch=resolution)
        
        # Convertir a coordenadas del plato
        # El origen del voxel grid es el punto mínimo del mesh trasladado
        piece_origin = mesh_copy.bounds[0]
        offset = ((piece_origin - bed_voxel_grid['origin']) / resolution).astype(int)ida de colisiones para nesting 3D usando:
- Voxelización de geometrías (trimesh)
- Operaciones vectorizadas de NumPy
- Grid 3D global del plato de impresión

Ventajas sobre trimesh.collision:
- 10-100x más rápido para probar múltiples posiciones
- Ideal para grid search y algoritmos de optimización
- Bajo consumo de memoria con resoluciones ajustables

Autor: KyberCore
Fecha: 2025-10-06
"""

import numpy as np
import trimesh
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def create_bed_voxel_grid(
    bed_size: Tuple[float, float],
    resolution: float = 2.0,
    max_height: float = 250.0
) -> Dict:
    """
    Crea un voxel grid 3D para representar el plato de impresión.
    
    Args:
        bed_size: Tupla (ancho, largo) del plato en mm
        resolution: Tamaño de cada voxel en mm (menor = más preciso, más memoria)
        max_height: Altura máxima del volumen de impresión en mm
    
    Returns:
        Dict con:
            'matrix': np.ndarray 3D de tipo bool (False = vacío, True = ocupado)
            'origin': np.array([0, 0, 0]) - origen del grid
            'resolution': float - tamaño de voxel
            'dimensions': tuple (nx, ny, nz) - dimensiones del grid
            'bed_size': tuple - tamaño original del plato
    """
    bed_x, bed_y = bed_size
    
    # Calcular dimensiones del grid
    nx = int(np.ceil(bed_x / resolution))
    ny = int(np.ceil(bed_y / resolution))
    nz = int(np.ceil(max_height / resolution))
    
    # Crear matriz 3D inicialmente vacía
    matrix = np.zeros((nx, ny, nz), dtype=bool)
    
    logger.debug(f"   📐 Voxel grid creado: {nx}x{ny}x{nz} ({matrix.nbytes / 1024:.1f} KB)")
    
    return {
        'matrix': matrix,
        'origin': np.array([0.0, 0.0, 0.0]),
        'resolution': resolution,
        'dimensions': (nx, ny, nz),
        'bed_size': bed_size
    }


def place_piece_in_grid(
    mesh: trimesh.Trimesh,
    position: np.ndarray,
    bed_voxel_grid: Dict
) -> bool:
    """
    Marca los voxels ocupados por una pieza en el grid del plato.
    
    Args:
        mesh: Mesh de la pieza a colocar
        position: Posición [x, y, z] donde colocar la pieza
        bed_voxel_grid: Grid del plato (modificado in-place)
    
    Returns:
        True si se colocó exitosamente, False si hubo error
    """
    try:
        resolution = bed_voxel_grid['resolution']
        
        # Voxelizar pieza en su nueva posición
        mesh_copy = mesh.copy()
        mesh_copy.apply_translation(position)
        piece_voxel = mesh_copy.voxelized(pitch=resolution)
        
        # Convertir a coordenadas del plato
        # El origen del voxel grid es el punto mínimo del mesh trasladado
        piece_origin = mesh_copy.bounds[0]
        offset = ((piece_origin - bed_voxel_grid['origin']) / resolution).astype(int)
        
        piece_shape = piece_voxel.matrix.shape
        bed_shape = bed_voxel_grid['matrix'].shape
        
        # Calcular región de intersección
        x_start = max(0, offset[0])
        y_start = max(0, offset[1])
        z_start = max(0, offset[2])
        
        x_end = min(bed_shape[0], offset[0] + piece_shape[0])
        y_end = min(bed_shape[1], offset[1] + piece_shape[1])
        z_end = min(bed_shape[2], offset[2] + piece_shape[2])
        
        # Verificar que hay región válida
        if x_start >= x_end or y_start >= y_end or z_start >= z_end:
            logger.warning(f"   ⚠️  Pieza fuera del plato: offset={offset}")
            return False
        
        # Extraer región de la pieza
        piece_x_start = max(0, -offset[0])
        piece_y_start = max(0, -offset[1])
        piece_z_start = max(0, -offset[2])
        
        piece_region = piece_voxel.matrix[
            piece_x_start:piece_x_start + (x_end - x_start),
            piece_y_start:piece_y_start + (y_end - y_start),
            piece_z_start:piece_z_start + (z_end - z_start)
        ]
        
        # Marcar voxels como ocupados (OR lógico)
        bed_voxel_grid['matrix'][x_start:x_end, y_start:y_end, z_start:z_end] |= piece_region
        
        return True
    
    except Exception as e:
        logger.error(f"   ❌ Error colocando pieza en grid: {str(e)}")
        return False


def has_voxel_collision(
    mesh: trimesh.Trimesh,
    position: np.ndarray,
    bed_voxel_grid: Dict
) -> bool:
    """
    Detección de colisión ultra-rápida usando voxel grids.
    
    Verifica si una pieza en una posición dada colisiona con piezas ya colocadas.
    
    Args:
        mesh: Mesh de la pieza a verificar
        position: Posición [x, y, z] donde probar la pieza
        bed_voxel_grid: Grid del plato con piezas ya colocadas
    
    Returns:
        True si hay colisión, False si puede colocarse sin colisión
    """
    try:
        resolution = bed_voxel_grid['resolution']
        
        # 1. Voxelizar la pieza en su posición de prueba
        mesh_copy = mesh.copy()
        mesh_copy.apply_translation(position)
        piece_voxel = mesh_copy.voxelized(pitch=resolution)
        
        piece_matrix = piece_voxel.matrix
        # El origen del voxel grid es el punto mínimo del mesh trasladado
        piece_origin = mesh_copy.bounds[0]
        
        # 2. Convertir coordenadas del voxel de la pieza al sistema del plato
        offset = ((piece_origin - bed_voxel_grid['origin']) / resolution).astype(int)
        
        piece_shape = piece_matrix.shape
        bed_shape = bed_voxel_grid['matrix'].shape
        
        # 3. Calcular región de intersección
        x_start = max(0, offset[0])
        y_start = max(0, offset[1])
        z_start = max(0, offset[2])
        
        x_end = min(bed_shape[0], offset[0] + piece_shape[0])
        y_end = min(bed_shape[1], offset[1] + piece_shape[1])
        z_end = min(bed_shape[2], offset[2] + piece_shape[2])
        
        # Si la pieza está completamente fuera del plato → No colisiona (pero es inválida)
        if x_start >= x_end or y_start >= y_end or z_start >= z_end:
            return True  # Considerar como colisión (fuera de límites)
        
        # 4. Extraer regiones a comparar
        bed_region = bed_voxel_grid['matrix'][x_start:x_end, y_start:y_end, z_start:z_end]
        
        piece_x_start = max(0, -offset[0])
        piece_y_start = max(0, -offset[1])
        piece_z_start = max(0, -offset[2])
        
        piece_region = piece_matrix[
            piece_x_start:piece_x_start + (x_end - x_start),
            piece_y_start:piece_y_start + (y_end - y_start),
            piece_z_start:piece_z_start + (z_end - z_start)
        ]
        
        # 5. Verificar overlap (operación vectorizada, muy rápida)
        # Si algún voxel ocupado de la pieza coincide con uno ocupado en el plato → Colisión
        collision = np.any(bed_region & piece_region)
        
        return collision
    
    except Exception as e:
        logger.error(f"   ❌ Error en detección de colisión: {str(e)}")
        return True  # En caso de error, asumir colisión por seguridad


def get_occupied_volume(bed_voxel_grid: Dict) -> float:
    """
    Calcula el volumen total ocupado en el plato.
    
    Args:
        bed_voxel_grid: Grid del plato
    
    Returns:
        Volumen ocupado en mm³
    """
    resolution = bed_voxel_grid['resolution']
    voxel_volume = resolution ** 3
    n_occupied = np.sum(bed_voxel_grid['matrix'])
    
    return n_occupied * voxel_volume


def get_utilization_percentage(bed_voxel_grid: Dict) -> float:
    """
    Calcula el porcentaje de utilización del volumen del plato.
    
    Args:
        bed_voxel_grid: Grid del plato
    
    Returns:
        Porcentaje de utilización (0-100)
    """
    matrix = bed_voxel_grid['matrix']
    total_voxels = matrix.size
    occupied_voxels = np.sum(matrix)
    
    if total_voxels == 0:
        return 0.0
    
    return (occupied_voxels / total_voxels) * 100.0


def visualize_grid_slice(bed_voxel_grid: Dict, z_level: int = 0) -> str:
    """
    Genera una visualización ASCII de una rebanada horizontal del grid.
    Útil para debugging.
    
    Args:
        bed_voxel_grid: Grid del plato
        z_level: Nivel Z a visualizar (en indices de voxel)
    
    Returns:
        String con representación ASCII
    """
    matrix = bed_voxel_grid['matrix']
    
    if z_level >= matrix.shape[2] or z_level < 0:
        return "Z level fuera de rango"
    
    slice_2d = matrix[:, :, z_level]
    
    # Convertir a ASCII
    lines = []
    for x in range(slice_2d.shape[0]):
        line = ""
        for y in range(slice_2d.shape[1]):
            line += "█" if slice_2d[x, y] else "·"
        lines.append(line)
    
    return "\n".join(lines)
