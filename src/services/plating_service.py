"""
Servicio para organizar múltiples archivos STL en un solo plato de impresión.
Utiliza algoritmos de bin-packing 2D para optimizar el espacio.

NUEVO: Soporte para Nesting 3D Avanzado
- Detección de huecos internos en piezas (marcos, anillos, tubos)
- Anidamiento de piezas pequeñas dentro de huecos grandes
- Análisis topológico con voxelización
- Detección de colisiones ultra-rápida
"""

import os
import logging
from typing import List, Dict, Tuple, Optional
from pathlib import Path

try:
    import trimesh
    import numpy as np
    from stl import mesh as stl_mesh
    from rectpack import newPacker, SORT_AREA, PackingMode, PackingBin, MaxRectsBlsf
    PLATING_AVAILABLE = True
except ImportError:
    PLATING_AVAILABLE = False
    logging.warning("⚠️ Librerías de plating no disponibles. Instala: pip install trimesh numpy-stl rectpack")

# Importar módulos de nesting 3D
try:
    from src.services.topology_analyzer import (
        analyze_piece_topology,
        can_fit_in_hollow_bounds,
        get_hollow_center
    )
    from src.services.voxel_collision import (
        create_bed_voxel_grid,
        has_voxel_collision,
        place_piece_in_grid,
        get_utilization_percentage
    )
    NESTING_3D_AVAILABLE = True
except ImportError:
    NESTING_3D_AVAILABLE = False
    logging.warning("⚠️ Módulos de nesting 3D no disponibles")

logger = logging.getLogger(__name__)


class PlatingService:
    """
    Servicio para combinar múltiples archivos STL en un solo archivo organizado.
    
    Soporta tres algoritmos:
    - bin-packing: Optimización con First-Fit Decreasing (recomendado)
    - grid: Organización en cuadrícula regular
    - spiral: Colocación en espiral desde el centro
    """
    
    def __init__(self):
        if not PLATING_AVAILABLE:
            logger.error("❌ PlatingService no disponible - faltan dependencias")
        else:
            logger.info("✅ PlatingService inicializado correctamente")
    
    def is_available(self) -> bool:
        """Verifica si el servicio está disponible"""
        return PLATING_AVAILABLE
    
    def combine_stl_files(
        self,
        stl_files: List[str],
        output_path: str,
        bed_size: Tuple[float, float] = (220, 220),
        spacing: float = 3.0,
        algorithm: str = 'bin-packing',
        enable_nesting: bool = False
    ) -> Tuple[bool, str, Dict]:
        """
        Combina múltiples archivos STL en uno solo organizándolos en el plato.
        
        Args:
            stl_files: Lista de rutas absolutas a archivos STL
            output_path: Ruta donde guardar el STL combinado
            bed_size: Dimensiones del plato (ancho, profundidad) en mm
            spacing: Separación mínima entre piezas en mm
            algorithm: 'bin-packing', 'grid', o 'spiral'
            enable_nesting: Si True, intenta anidar piezas pequeñas dentro de huecos (EXPERIMENTAL)
            
        Returns:
            Tupla (success, message, metadata)
            metadata contiene: positions, total_area, utilization, nested_info, etc.
        """
        if not PLATING_AVAILABLE:
            return False, "Librerías de plating no disponibles", {}
        
        try:
            logger.info(f"🎨 Iniciando plating de {len(stl_files)} archivos")
            logger.info(f"   Algoritmo: {algorithm}, Plato: {bed_size}mm, Espaciado: {spacing}mm")
            
            if enable_nesting and NESTING_3D_AVAILABLE:
                logger.info(f"   🔬 Nesting 3D ACTIVADO (experimental)")
                return self._combine_with_nesting_3d(
                    stl_files, output_path, bed_size, spacing, algorithm
                )
            
            # Flujo tradicional 2D (sin nesting)
            return self._combine_traditional_2d(
                stl_files, output_path, bed_size, spacing, algorithm
            )
            
            # Flujo tradicional 2D (sin nesting)
            return self._combine_traditional_2d(
                stl_files, output_path, bed_size, spacing, algorithm
            )
        
        except Exception as e:
            error_msg = f"Error en plating: {str(e)}"
            logger.error(f"❌ {error_msg}", exc_info=True)
            return False, error_msg, {}
    
    def verify_fit(
        self,
        pieces_info: List[Dict],
        bed_size: Tuple[float, float],
        spacing: float = 3.0
    ) -> Tuple[bool, str]:
        """
        Verifica si todas las piezas pueden caber en el plato.
        
        Returns:
            Tupla (can_fit: bool, message: str)
        """
        bed_width, bed_depth = bed_size
        
        # Verificar cada pieza individualmente
        for piece in pieces_info:
            dims = piece['dimensions']
            if dims['x'] + spacing > bed_width or dims['y'] + spacing > bed_depth:
                msg = (
                    f"❌ La pieza '{piece['filename']}' es demasiado grande: "
                    f"{dims['x']:.1f}x{dims['y']:.1f}mm (plato: {bed_width}x{bed_depth}mm)"
                )
                return False, msg
        
        # Verificar área total (estimación simple)
        total_area = sum((p['dimensions']['x'] + spacing) * (p['dimensions']['y'] + spacing) 
                        for p in pieces_info)
        bed_area = bed_width * bed_depth
        
        if total_area > bed_area * 1.5:  # Margen para ineficiencias del algoritmo
            msg = (
                f"⚠️ Las piezas podrían no caber en el plato. "
                f"Área requerida: {total_area:.0f}mm², Área disponible: {bed_area:.0f}mm²"
            )
            logger.warning(msg)
            # No retornamos False aquí, dejamos que el algoritmo intente
        
        return True, "✅ Las piezas deberían caber en el plato"
    
    def _calculate_positions_binpacking(
        self,
        pieces_info: List[Dict],
        bed_size: Tuple[float, float],
        spacing: float
    ) -> List[Dict]:
        """
        Calcula posiciones usando algoritmo de bin-packing 2D.
        Usa First-Fit Decreasing con rectpack.
        """
        bed_width, bed_depth = bed_size
        
        # Crear packer con configuración correcta
        packer = newPacker(
            mode=PackingMode.Offline,  # Procesar todos los rectángulos a la vez
            bin_algo=PackingBin.BNF,  # Best Fit (BNF = 0)
            pack_algo=MaxRectsBlsf,  # Best Long Side Fit
            sort_algo=SORT_AREA,  # Ordenar por área
            rotation=False  # No rotar piezas (las rotaciones ya se hicieron en auto-rotation)
        )
        
        # Añadir rectángulos (con espaciado)
        for i, piece in enumerate(pieces_info):
            width = piece['dimensions']['x'] + spacing
            height = piece['dimensions']['y'] + spacing
            packer.add_rect(width, height, rid=i)
        
        # Añadir el "bin" (plato)
        packer.add_bin(bed_width, bed_depth)
        
        # Ejecutar algoritmo
        packer.pack()
        
        # Extraer posiciones de los rectángulos colocados
        positions = [None] * len(pieces_info)
        
        if len(packer) > 0 and len(packer[0]) > 0:
            for rect in packer[0]:
                # rect es un objeto Rectangle con atributos x, y, width, height, rid
                positions[rect.rid] = {
                    'x': float(rect.x + spacing / 2),  # Centrar en el espaciado
                    'y': float(rect.y + spacing / 2),
                    'rotation': 0.0
                }
        
        # Verificar si todas las piezas se colocaron
        if None in positions:
            logger.warning("⚠️ No todas las piezas cupieron con bin-packing, intentando grid...")
            return self._calculate_positions_grid(pieces_info, bed_size, spacing)
        
        return positions
    
    def _calculate_positions_grid(
        self,
        pieces_info: List[Dict],
        bed_size: Tuple[float, float],
        spacing: float
    ) -> List[Dict]:
        """
        Organiza piezas en una cuadrícula regular.
        Más simple pero puede desperdiciar espacio.
        """
        bed_width, bed_depth = bed_size
        positions = []
        
        # Calcular cuántas columnas necesitamos
        cols = int(np.sqrt(len(pieces_info))) + 1
        
        current_x = spacing
        current_y = spacing
        current_row_height = 0
        col_count = 0
        
        for piece in pieces_info:
            width = piece['dimensions']['x']
            height = piece['dimensions']['y']
            
            # Si no cabe en esta fila, ir a la siguiente
            if current_x + width + spacing > bed_width:
                current_x = spacing
                current_y += current_row_height + spacing
                current_row_height = 0
                col_count = 0
            
            # Si no cabe verticalmente, error
            if current_y + height + spacing > bed_depth:
                logger.error("❌ Las piezas no caben en el plato con grid")
                return []
            
            positions.append({
                'x': float(current_x),
                'y': float(current_y),
                'rotation': 0.0
            })
            
            current_x += width + spacing
            current_row_height = max(current_row_height, height)
            col_count += 1
        
        return positions
    
    def _calculate_positions_spiral(
        self,
        pieces_info: List[Dict],
        bed_size: Tuple[float, float],
        spacing: float
    ) -> List[Dict]:
        """
        Coloca piezas en espiral desde el centro.
        Estético pero no siempre óptimo.
        """
        bed_width, bed_depth = bed_size
        center_x = bed_width / 2
        center_y = bed_depth / 2
        
        positions = []
        angle = 0
        radius = 20  # Empezar cerca del centro
        
        for piece in pieces_info:
            placed = False
            attempts = 0
            max_attempts = 360  # Una vuelta completa
            
            while not placed and attempts < max_attempts:
                # Calcular posición en espiral
                x = center_x + radius * np.cos(np.radians(angle))
                y = center_y + radius * np.sin(np.radians(angle))
                
                # Verificar que cabe en el plato
                width = piece['dimensions']['x']
                height = piece['dimensions']['y']
                
                if (x + width + spacing <= bed_width and 
                    y + height + spacing <= bed_depth and
                    x >= spacing and y >= spacing):
                    
                    positions.append({
                        'x': float(x),
                        'y': float(y),
                        'rotation': 0.0
                    })
                    placed = True
                else:
                    # Avanzar en la espiral
                    angle += 30
                    if angle >= 360:
                        angle = 0
                        radius += 15  # Expandir radio
                    attempts += 1
            
            if not placed:
                logger.error(f"❌ No se pudo colocar pieza en espiral: {piece['filename']}")
                return []
        
        return positions
    
    def _combine_traditional_2d(
        self,
        stl_files: List[str],
        output_path: str,
        bed_size: Tuple[float, float],
        spacing: float,
        algorithm: str
    ) -> Tuple[bool, str, Dict]:
        """
        Flujo tradicional de plating 2D (sin nesting 3D).
        Idéntico al método combine_stl_files original.
        """
        try:
            # 1. Cargar todos los meshes
            meshes = []
            mesh_info = []
            
            for stl_file in stl_files:
                if not os.path.exists(stl_file):
                    logger.warning(f"⚠️ Archivo no encontrado: {stl_file}")
                    continue
                
                try:
                    mesh = trimesh.load(stl_file)
                    bounds = mesh.bounds
                    dims = bounds[1] - bounds[0]
                    
                    meshes.append(mesh)
                    mesh_info.append({
                        'filename': os.path.basename(stl_file),
                        'path': stl_file,
                        'dimensions': {
                            'x': float(dims[0]),
                            'y': float(dims[1]),
                            'z': float(dims[2])
                        },
                        'bounds': bounds.tolist(),
                        'volume': float(mesh.volume)
                    })
                    logger.info(f"   ✅ Cargado: {os.path.basename(stl_file)} ({dims[0]:.1f}x{dims[1]:.1f}x{dims[2]:.1f}mm)")
                    
                except Exception as e:
                    logger.error(f"   ❌ Error cargando {stl_file}: {str(e)}")
                    continue
            
            if not meshes:
                return False, "No se pudo cargar ningún archivo STL", {}
            
            # 2. Verificar que las piezas caben en el plato
            can_fit, fit_message = self.verify_fit(mesh_info, bed_size, spacing)
            if not can_fit:
                return False, fit_message, {}
            
            # 3. Calcular posiciones según el algoritmo seleccionado
            if algorithm == 'bin-packing':
                positions = self._calculate_positions_binpacking(mesh_info, bed_size, spacing)
            elif algorithm == 'grid':
                positions = self._calculate_positions_grid(mesh_info, bed_size, spacing)
            elif algorithm == 'spiral':
                positions = self._calculate_positions_spiral(mesh_info, bed_size, spacing)
            else:
                return False, f"Algoritmo desconocido: {algorithm}", {}
            
            if not positions:
                return False, "No se pudieron calcular posiciones válidas", {}
            
            # 4. Aplicar transformaciones y combinar meshes
            combined_mesh = None
            for i, (mesh, pos) in enumerate(zip(meshes, positions)):
                # Centrar la pieza en su origen
                mesh_centered = mesh.copy()
                mesh_centered.apply_translation(-mesh_centered.bounds[0])
                
                # Aplicar posición calculada
                translation = [pos['x'], pos['y'], 0]
                mesh_centered.apply_translation(translation)
                
                # Combinar con el mesh acumulado
                if combined_mesh is None:
                    combined_mesh = mesh_centered
                else:
                    combined_mesh = trimesh.util.concatenate([combined_mesh, mesh_centered])
                
                logger.info(f"   📍 Pieza {i+1}: posición ({pos['x']:.1f}, {pos['y']:.1f})")
            
            # 5. Guardar el archivo combinado
            combined_mesh.export(output_path)
            file_size = os.path.getsize(output_path)
            
            # 6. Calcular métricas
            total_area_used = sum(info['dimensions']['x'] * info['dimensions']['y'] for info in mesh_info)
            bed_area = bed_size[0] * bed_size[1]
            utilization = (total_area_used / bed_area) * 100
            
            metadata = {
                'pieces_count': len(meshes),
                'positions': positions,
                'mesh_info': mesh_info,
                'bed_size': bed_size,
                'spacing': spacing,
                'algorithm': algorithm,
                'total_area_used': float(total_area_used),
                'bed_area': float(bed_area),
                'utilization_percent': float(utilization),
                'combined_file_size': file_size,
                'combined_file_path': output_path,
                'nesting_used': False
            }
            
            logger.info(f"✅ Plating completado: {len(meshes)} piezas, {utilization:.1f}% de utilización")
            return True, f"Plating exitoso: {len(meshes)} piezas combinadas", metadata
            
        except Exception as e:
            error_msg = f"Error en plating: {str(e)}"
            logger.error(f"❌ {error_msg}", exc_info=True)
            return False, error_msg, {}
    
    def _combine_with_nesting_3d(
        self,
        stl_files: List[str],
        output_path: str,
        bed_size: Tuple[float, float],
        spacing: float,
        algorithm: str
    ) -> Tuple[bool, str, Dict]:
        """
        Flujo avanzado con nesting 3D (anidamiento de piezas).
        
        Algoritmo:
        1. Cargar meshes y analizar topología (detectar huecos)
        2. Ordenar: piezas con huecos primero, pequeñas al final
        3. Crear voxel grid global del plato
        4. Para cada pieza pequeña, intentar anidarla en huecos existentes
        5. Si no se puede anidar, colocar normalmente (2D)
        """
        try:
            logger.info("🔬 Modo Nesting 3D Activado")
            
            # 1. Cargar meshes y analizar topología
            pieces_data = []
            
            for stl_file in stl_files:
                if not os.path.exists(stl_file):
                    logger.warning(f"⚠️ Archivo no encontrado: {stl_file}")
                    continue
                
                try:
                    mesh = trimesh.load(stl_file)
                    
                    # IMPORTANTE: Normalizar mesh al origen (0,0,0) ANTES de cualquier análisis
                    # Esto asegura que hollow_bounds y todas las coordenadas sean consistentes
                    original_bounds = mesh.bounds.copy()
                    mesh.apply_translation(-mesh.bounds[0])  # Mover a origen
                    
                    bounds = mesh.bounds
                    dims = bounds[1] - bounds[0]
                    
                    logger.info(f"   📦 Analizando: {os.path.basename(stl_file)} ({dims[0]:.1f}x{dims[1]:.1f}x{dims[2]:.1f}mm)")
                    logger.debug(f"   📍 Mesh normalizado al origen, original bounds min: {original_bounds[0]}")
                    
                    # Analizar topología para detectar huecos (con try-catch defensivo)
                    # NOTA: voxel_resolution=3.0 para reducir consumo de memoria (3mm por voxel)
                    topology = {}
                    try:
                        topology = analyze_piece_topology(mesh, voxel_resolution=3.0)
                        logger.debug(f"   🔍 Topología analizada: has_hollow={topology.get('has_hollow', False)}")
                    except Exception as topo_error:
                        logger.warning(f"   ⚠️  Error en análisis topológico de {os.path.basename(stl_file)}: {str(topo_error)}")
                        # Si falla el análisis, asumir que es sólido
                        topology = {
                            'has_hollow': False,
                            'density': 1.0,
                            'hollow_volume': 0.0,
                            'n_hollow_regions': 0
                        }
                    
                    pieces_data.append({
                        'mesh': mesh,
                        'filename': os.path.basename(stl_file),
                        'path': stl_file,
                        'dimensions': {
                            'x': float(dims[0]),
                            'y': float(dims[1]),
                            'z': float(dims[2])
                        },
                        'bounds': bounds.tolist(),
                        'volume': float(mesh.volume),
                        'topology': topology
                    })
                    
                    hollow_status = "🕳️ HUECO" if topology.get('has_hollow', False) else "solid"
                    logger.info(f"   ✅ Cargado: {os.path.basename(stl_file)} ({dims[0]:.1f}x{dims[1]:.1f}x{dims[2]:.1f}mm) {hollow_status}")
                    
                except Exception as e:
                    logger.error(f"   ❌ Error cargando {stl_file}: {str(e)}")
                    import traceback
                    logger.error(f"   📍 Traceback: {traceback.format_exc()}")
                    continue
            
            if not pieces_data:
                return False, "No se pudo cargar ningún archivo STL", {}
            
            # 2. Ordenar: piezas con huecos primero, luego por tamaño
            def sort_key(p):
                has_hollow = p['topology'].get('has_hollow', False)
                volume = p['volume']
                return (not has_hollow, -volume)  # Huecos primero, grandes primero
            
            pieces_sorted = sorted(pieces_data, key=sort_key)
            
            # 3. Crear voxel grid global (resolución 3.0mm para reducir memoria)
            bed_voxel_grid = create_bed_voxel_grid(bed_size, resolution=3.0, max_height=250.0)
            
            # 4. Colocación con nesting
            placed_pieces = []
            nested_count = 0
            
            for piece in pieces_sorted:
                mesh = piece['mesh']
                topology = piece['topology']
                nested = False
                
                # Si la pieza es pequeña, intentar anidarla
                if mesh.volume < 10000:  # mm³ (ajustable)
                    for existing in placed_pieces:
                        if existing['topology'].get('has_hollow', False):
                            # Intentar anidar
                            nest_pos = self._find_nesting_position(
                                small_mesh=mesh,
                                hollow_piece=existing,
                                bed_voxel_grid=bed_voxel_grid,
                                spacing=spacing
                            )
                            
                            if nest_pos is not None:
                                # ¡Éxito! Colocar la pieza anidada
                                place_piece_in_grid(mesh, nest_pos, bed_voxel_grid)
                                placed_pieces.append({
                                    **piece,
                                    'position': nest_pos,
                                    'nested_in': existing['filename']
                                })
                                nested = True
                                nested_count += 1
                                logger.info(f"   🎯 ANIDADA: {piece['filename']} dentro de {existing['filename']}")
                                break
                
                # Si no se pudo anidar, colocar normalmente
                if not nested:
                    position = self._find_2d_position_simple(mesh, placed_pieces, bed_size, spacing)
                    if position is not None:
                        place_piece_in_grid(mesh, position, bed_voxel_grid)
                        placed_pieces.append({
                            **piece,
                            'position': position,
                            'nested_in': None
                        })
                        logger.info(f"   📍 Colocada: {piece['filename']} en ({position[0]:.1f}, {position[1]:.1f})")
                    else:
                        logger.error(f"   ❌ No se pudo colocar: {piece['filename']}")
                        return False, f"No se pudo colocar la pieza {piece['filename']}", {}
            
            # 5. Combinar meshes en sus posiciones finales
            combined_mesh = None
            positions_metadata = []
            
            for placed in placed_pieces:
                mesh = placed['mesh'].copy()
                pos = placed['position']
                
                # Los meshes ya están normalizados al origen (0,0,0)
                # Solo necesitamos trasladarlos a su posición final
                mesh.apply_translation(pos)
                
                # Combinar
                if combined_mesh is None:
                    combined_mesh = mesh
                else:
                    combined_mesh = trimesh.util.concatenate([combined_mesh, mesh])
                
                positions_metadata.append({
                    'filename': placed['filename'],
                    'x': float(pos[0]),
                    'y': float(pos[1]),
                    'z': float(pos[2]),
                    'nested_in': placed.get('nested_in', None)
                })
            
            # 6. Guardar archivo combinado
            combined_mesh.export(output_path)
            file_size = os.path.getsize(output_path)
            
            # 7. Calcular métricas
            utilization_3d = get_utilization_percentage(bed_voxel_grid)
            
            metadata = {
                'pieces_count': len(placed_pieces),
                'nested_count': nested_count,
                'positions': positions_metadata,
                'bed_size': bed_size,
                'spacing': spacing,
                'algorithm': algorithm,
                'utilization_3d_percent': float(utilization_3d),
                'combined_file_size': file_size,
                'combined_file_path': output_path,
                'nesting_used': True,
                'nesting_success_rate': (nested_count / len(placed_pieces)) * 100 if placed_pieces else 0
            }
            
            logger.info(f"✅ Nesting 3D completado: {len(placed_pieces)} piezas, {nested_count} anidadas ({utilization_3d:.1f}% utilización)")
            return True, f"Nesting exitoso: {nested_count}/{len(placed_pieces)} piezas anidadas", metadata
            
        except Exception as e:
            error_msg = f"Error en nesting 3D: {str(e)}"
            logger.error(f"❌ {error_msg}", exc_info=True)
            # Fallback a modo tradicional
            logger.warning("⚠️  Fallback a modo tradicional 2D")
            return self._combine_traditional_2d(stl_files, output_path, bed_size, spacing, algorithm)
    
    def _find_nesting_position(
        self,
        small_mesh: trimesh.Trimesh,
        hollow_piece: Dict,
        bed_voxel_grid: Dict,
        spacing: float
    ) -> Optional[np.ndarray]:
        """
        Encuentra una posición válida para anidar una pieza pequeña
        dentro del hueco de una pieza grande.
        
        Returns:
            np.array([x, y, z]) con la posición, o None si no cabe
        """
        topology = hollow_piece['topology']
        
        if not topology.get('has_hollow', False):
            return None
        
        hollow_bounds = topology.get('hollow_bounds')
        if not hollow_bounds:
            return None
        
        # IMPORTANTE: Los hollow_bounds están en coordenadas LOCALES del mesh original
        # Necesitamos transformarlos a coordenadas GLOBALES del plato
        hollow_piece_position = hollow_piece['position']  # Posición donde se colocó el marco
        
        # Transformar hollow_bounds al sistema de coordenadas del plato
        hollow_min_local = np.array(hollow_bounds[0])
        hollow_max_local = np.array(hollow_bounds[1])
        
        # Ajustar por la posición donde se colocó la pieza hueca
        hollow_min_global = hollow_min_local + hollow_piece_position
        hollow_max_global = hollow_max_local + hollow_piece_position
        
        # 1. Verificar viabilidad básica (bounding box)
        # Convertir bounds globales de vuelta a formato local para can_fit_in_hollow_bounds
        hollow_bounds_global = [hollow_min_global.tolist(), hollow_max_global.tolist()]
        if not can_fit_in_hollow_bounds(small_mesh, hollow_bounds_global, margin=spacing):
            logger.debug(f"   ⚠️  Pieza pequeña no cabe en hueco (bounding box check)")
            return None
        
        # 2. Grid search dentro del hueco (en coordenadas globales)
        small_size = small_mesh.bounds[1] - small_mesh.bounds[0]
        
        step = 5.0  # Probar cada 5mm
        best_position = None
        hollow_center_global = (hollow_min_global + hollow_max_global) / 2
        
        logger.debug(f"   🔍 Buscando posición en hueco global: [{hollow_min_global[0]:.1f}, {hollow_min_global[1]:.1f}] a [{hollow_max_global[0]:.1f}, {hollow_max_global[1]:.1f}]")
        
        for x in np.arange(hollow_min_global[0], hollow_max_global[0] - small_size[0], step):
            for y in np.arange(hollow_min_global[1], hollow_max_global[1] - small_size[1], step):
                test_pos = np.array([x, y, 0])
                
                # Verificar colisión
                if not has_voxel_collision(small_mesh, test_pos, bed_voxel_grid):
                    # Preferir posiciones cercanas al centro del hueco
                    if best_position is None:
                        best_position = test_pos
                        logger.debug(f"   ✓ Primera posición válida encontrada: ({x:.1f}, {y:.1f})")
                    else:
                        dist_current = np.linalg.norm(test_pos[:2] - hollow_center_global[:2])
                        dist_best = np.linalg.norm(best_position[:2] - hollow_center_global[:2])
                        if dist_current < dist_best:
                            best_position = test_pos
        
        if best_position is not None:
            logger.debug(f"   🎯 Mejor posición de nesting: ({best_position[0]:.1f}, {best_position[1]:.1f})")
        
        return best_position
    
    def _find_2d_position_simple(
        self,
        mesh: trimesh.Trimesh,
        placed_pieces: List[Dict],
        bed_size: Tuple[float, float],
        spacing: float
    ) -> Optional[np.ndarray]:
        """
        Encuentra una posición 2D simple para una pieza (sin nesting).
        Grid search básico.
        """
        dims = mesh.bounds[1] - mesh.bounds[0]
        step = 10.0
        
        for x in np.arange(spacing, bed_size[0] - dims[0] - spacing, step):
            for y in np.arange(spacing, bed_size[1] - dims[1] - spacing, step):
                test_pos = np.array([x, y, 0])
                
                # Verificar que no se sale del plato
                if x + dims[0] > bed_size[0] or y + dims[1] > bed_size[1]:
                    continue
                
                # Verificar colisión con piezas ya colocadas
                collision = False
                for placed in placed_pieces:
                    placed_pos = placed['position']
                    placed_dims = np.array([
                        placed['dimensions']['x'],
                        placed['dimensions']['y']
                    ])
                    
                    # Bounding box 2D simple
                    if (abs(test_pos[0] - placed_pos[0]) < (dims[0] + placed_dims[0]) / 2 + spacing and
                        abs(test_pos[1] - placed_pos[1]) < (dims[1] + placed_dims[1]) / 2 + spacing):
                        collision = True
                        break
                
                if not collision:
                    return test_pos
        
        return None


# Instancia global del servicio
plating_service = PlatingService()
