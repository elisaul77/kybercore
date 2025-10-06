"""
Análisis Topológico de Geometrías 3D para Nesting Avanzado

Este módulo implementa detección de huecos internos en piezas 3D usando:
- Voxelización (trimesh)
- Análisis de densidad volumétrica
- Detección de huecos con binary_fill_holes (scipy)
- Clustering de regiones huecas con DBSCAN (sklearn)
- Clasificación de formas con PCA (sklearn)

Autor: KyberCore
Fecha: 2025-10-06
"""

import numpy as np
from scipy.ndimage import binary_fill_holes
from sklearn.cluster import DBSCAN
from sklearn.decomposition import PCA
import trimesh
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def analyze_piece_topology(
    mesh: trimesh.Trimesh,
    voxel_resolution: float = 1.0,
    density_threshold: float = 0.85
) -> Dict:
    """
    Analiza la topología de una pieza usando voxelización.
    
    Detecta:
    - Si tiene huecos internos (es un marco/anillo)
    - Volumen del hueco
    - Forma del hueco (cilíndrico, rectangular, irregular)
    - Número de regiones huecas
    
    Args:
        mesh: Mesh de trimesh a analizar
        voxel_resolution: Tamaño de cada voxel en mm (menor = más preciso pero más lento)
        density_threshold: Umbral para considerar que hay hueco (0.85 = si densidad < 85%)
    
    Returns:
        {
            'has_hollow': bool,
            'hollow_volume': float,
            'hollow_bounds': [[x_min, y_min, z_min], [x_max, y_max, z_max]],
            'hollow_type': 'cylindrical'|'rectangular'|'spherical'|'irregular',
            'density': float,  # 0.0 = completamente hueco, 1.0 = sólido
            'n_hollow_regions': int,
            'mesh_volume': float,
            'convex_volume': float
        }
    """
    
    try:
        logger.debug(f"   🔍 Analizando topología (resolución: {voxel_resolution}mm)")
        
        # 1. VOXELIZAR el mesh (convertir a grid 3D de cubos)
        pitch = voxel_resolution
        voxel_grid = mesh.voxelized(pitch=pitch)
        voxel_matrix = voxel_grid.matrix  # Shape: (nx, ny, nz), dtype: bool
        
        # 2. Crear voxel grid de la envolvente convexa (exterior esperado)
        convex_hull = mesh.convex_hull
        convex_voxel = convex_hull.voxelized(pitch=pitch)
        convex_matrix = convex_voxel.matrix
        
        # 3. Rellenar huecos internos en la envolvente (identifica el "interior esperado")
        filled_convex = binary_fill_holes(convex_matrix)
        
        # 4. Detectar voxels huecos: dentro de la envolvente pero NO en el mesh
        hollow_voxels = filled_convex & (~voxel_matrix)
        
        # 5. Calcular métricas volumétricas
        voxel_volume = pitch ** 3
        total_volume_convex = np.sum(filled_convex) * voxel_volume
        mesh_volume = np.sum(voxel_matrix) * voxel_volume
        hollow_volume = np.sum(hollow_voxels) * voxel_volume
        
        density = mesh_volume / total_volume_convex if total_volume_convex > 0 else 1.0
        has_hollow = density < density_threshold
        
        logger.debug(f"   📊 Densidad: {density:.2f}, Hueco: {hollow_volume:.2f} mm³")
        
        # Si no hay hueco significativo, retornar temprano
        if not has_hollow:
            return {
                'has_hollow': False,
                'density': density,
                'hollow_volume': 0.0,
                'mesh_volume': mesh_volume,
                'convex_volume': total_volume_convex,
                'n_hollow_regions': 0
            }
        
        # 6. Analizar la forma del hueco usando clustering
        hollow_coords = np.argwhere(hollow_voxels)
        
        if len(hollow_coords) < 10:
            logger.debug(f"   ⚠️  Muy pocos voxels huecos ({len(hollow_coords)}), ignorando")
            return {
                'has_hollow': False,
                'density': density,
                'hollow_volume': hollow_volume,
                'mesh_volume': mesh_volume,
                'convex_volume': total_volume_convex,
                'n_hollow_regions': 0
            }
        
        # 7. Clustering para identificar huecos separados (si hay múltiples)
        clustering = DBSCAN(eps=2, min_samples=5).fit(hollow_coords)
        n_clusters = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)
        
        if n_clusters == 0:
            logger.debug(f"   ⚠️  No se encontraron clusters de huecos")
            return {
                'has_hollow': False,
                'density': density,
                'hollow_volume': hollow_volume,
                'mesh_volume': mesh_volume,
                'convex_volume': total_volume_convex,
                'n_hollow_regions': 0
            }
        
        # 8. Calcular bounding box del hueco más grande (cluster principal)
        main_cluster_label = 0
        if -1 in clustering.labels_:
            # Si hay ruido (-1), el cluster principal es el siguiente
            unique_labels = [l for l in set(clustering.labels_) if l != -1]
            if len(unique_labels) > 0:
                main_cluster_label = unique_labels[0]
        
        main_cluster_mask = clustering.labels_ == main_cluster_label
        main_hollow_coords = hollow_coords[main_cluster_mask]
        
        # Convertir de indices de voxel a coordenadas reales
        # El origen del voxel grid es el punto mínimo del mesh
        mesh_bounds = mesh.bounds  # [[x_min, y_min, z_min], [x_max, y_max, z_max]]
        origin = mesh_bounds[0]  # Punto mínimo del mesh
        hollow_coords_real = main_hollow_coords * pitch + origin
        
        hollow_bounds = [
            hollow_coords_real.min(axis=0).tolist(),
            hollow_coords_real.max(axis=0).tolist()
        ]
        
        # 9. Clasificar tipo de hueco
        hollow_type = classify_hollow_shape(main_hollow_coords)
        
        logger.debug(f"   ✅ Hueco detectado: tipo={hollow_type}, regiones={n_clusters}")
        
        return {
            'has_hollow': True,
            'hollow_volume': hollow_volume,
            'hollow_bounds': hollow_bounds,
            'hollow_type': hollow_type,
            'density': density,
            'n_hollow_regions': n_clusters,
            'mesh_volume': mesh_volume,
            'convex_volume': total_volume_convex
        }
    
    except Exception as e:
        logger.error(f"   ❌ Error en análisis topológico: {str(e)}")
        import traceback
        logger.error(f"   📍 Traceback completo:\n{traceback.format_exc()}")
        return {
            'has_hollow': False,
            'density': 1.0,
            'hollow_volume': 0.0,
            'error': str(e)
        }


def classify_hollow_shape(hollow_coords: np.ndarray) -> str:
    """
    Clasifica la forma del hueco usando PCA (análisis de componentes principales).
    
    Args:
        hollow_coords: Array de coordenadas de voxels huecos (shape: [n, 3])
    
    Returns:
        'cylindrical' | 'spherical' | 'rectangular' | 'irregular'
    """
    
    if len(hollow_coords) < 3:
        return 'irregular'
    
    try:
        # PCA para encontrar ejes principales del hueco
        pca = PCA(n_components=3)
        pca.fit(hollow_coords)
        
        # Varianza explicada en cada eje principal
        variance_ratio = pca.explained_variance_ratio_
        
        # Clasificación basada en distribución de varianza:
        
        # Si la varianza está concentrada en 2 ejes → Cilindro/Tubo
        # (el tercer eje tiene muy poca varianza = hueco alargado)
        if variance_ratio[2] < 0.1:
            return 'cylindrical'
        
        # Si está distribuida uniformemente en los 3 ejes → Esfera
        # (desviación estándar baja = todos los ejes similares)
        if np.std(variance_ratio) < 0.1:
            return 'spherical'
        
        # Si hay un eje dominante seguido de otros 2 similares → Rectangular/Cúbico
        if variance_ratio[0] > 0.5 and abs(variance_ratio[1] - variance_ratio[2]) < 0.1:
            return 'rectangular'
        
        # Casos que no encajan en las categorías anteriores
        return 'irregular'
    
    except Exception as e:
        logger.debug(f"   ⚠️  Error en clasificación de forma: {str(e)}")
        return 'irregular'


def get_hollow_center(hollow_bounds: list) -> np.ndarray:
    """
    Calcula el centro geométrico del hueco.
    
    Args:
        hollow_bounds: [[x_min, y_min, z_min], [x_max, y_max, z_max]]
    
    Returns:
        Array [x, y, z] con las coordenadas del centro
    """
    hollow_min = np.array(hollow_bounds[0])
    hollow_max = np.array(hollow_bounds[1])
    return (hollow_min + hollow_max) / 2.0


def can_fit_in_hollow_bounds(small_mesh: trimesh.Trimesh, hollow_bounds: list, margin: float = 2.0) -> bool:
    """
    Verifica rápidamente si una pieza pequeña puede caber en el bounding box de un hueco.
    
    Args:
        small_mesh: Mesh de la pieza pequeña
        hollow_bounds: Bounding box del hueco [[x_min, y_min, z_min], [x_max, y_max, z_max]]
        margin: Margen de seguridad en mm
    
    Returns:
        True si la pieza cabe en el bounding box, False si no
    """
    small_bounds = small_mesh.bounds
    small_size = small_bounds[1] - small_bounds[0]
    
    hollow_min = np.array(hollow_bounds[0])
    hollow_max = np.array(hollow_bounds[1])
    hollow_size = hollow_max - hollow_min
    
    # Verificar en XY (el plano del plato)
    fits_x = small_size[0] <= (hollow_size[0] - 2 * margin)
    fits_y = small_size[1] <= (hollow_size[1] - 2 * margin)
    
    # Verificar Z (altura) - opcional, puede sobresalir
    # fits_z = small_size[2] <= hollow_size[2]
    
    return fits_x and fits_y
