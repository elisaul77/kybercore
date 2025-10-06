"""
Servicio para organizar múltiples archivos STL en un solo plato de impresión.
Utiliza algoritmos de bin-packing 2D para optimizar el espacio.
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
        algorithm: str = 'bin-packing'
    ) -> Tuple[bool, str, Dict]:
        """
        Combina múltiples archivos STL en uno solo organizándolos en el plato.
        
        Args:
            stl_files: Lista de rutas absolutas a archivos STL
            output_path: Ruta donde guardar el STL combinado
            bed_size: Dimensiones del plato (ancho, profundidad) en mm
            spacing: Separación mínima entre piezas en mm
            algorithm: 'bin-packing', 'grid', o 'spiral'
            
        Returns:
            Tupla (success, message, metadata)
            metadata contiene: positions, total_area, utilization, etc.
        """
        if not PLATING_AVAILABLE:
            return False, "Librerías de plating no disponibles", {}
        
        try:
            logger.info(f"🎨 Iniciando plating de {len(stl_files)} archivos")
            logger.info(f"   Algoritmo: {algorithm}, Plato: {bed_size}mm, Espaciado: {spacing}mm")
            
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
                'combined_file_path': output_path
            }
            
            logger.info(f"✅ Plating completado: {len(meshes)} piezas, {utilization:.1f}% de utilización")
            return True, f"Plating exitoso: {len(meshes)} piezas combinadas", metadata
            
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


# Instancia global del servicio
plating_service = PlatingService()
