"""
STL Geometry Analyzer
Analiza geometría 3D de archivos STL para optimización de perfiles de impresión.
Utiliza trimesh para análisis geométrico avanzado.
"""
import trimesh
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass, asdict


@dataclass
class STLAnalysisResult:
    """Resultado estructurado del análisis de geometría STL"""
    
    # Información básica
    volume: float  # cm³
    surface_area: float  # cm²
    dimensions: Dict[str, float]  # x, y, z en mm
    face_count: int
    vertex_count: int
    
    # Complejidad
    complexity_score: float  # 0-10
    faces_per_volume: float  # faces/cm³
    surface_to_volume_ratio: float
    
    # Análisis de superficie
    bed_contact_area: float  # cm²
    bed_contact_percentage: float  # 0-100
    surface_smoothness: float  # 0-10
    
    # Overhangs
    has_severe_overhangs: bool  # >60°
    severe_overhang_area: float  # cm²
    has_moderate_overhangs: bool  # 45-60°
    moderate_overhang_area: float  # cm²
    requires_supports: bool
    
    # Detalles finos
    has_very_fine_details: bool  # <0.3mm
    has_fine_details: bool  # <0.8mm
    minimum_feature_size: float  # mm
    
    # Estabilidad
    center_of_mass_height_ratio: float  # 0-1
    base_area_ratio: float  # 0-1
    is_stable: bool
    
    # Recomendaciones básicas
    recommended_layer_height: float  # mm
    recommended_speed_multiplier: float  # 0.5-1.5
    recommended_support_type: str  # none, auto, tree
    recommended_adhesion: str  # none, brim, raft
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte a diccionario con tipos JSON serializables"""
        data = asdict(self)
        # Convertir numpy bool a Python bool para serialización JSON
        for key, value in data.items():
            if isinstance(value, np.bool_):
                data[key] = bool(value)
            elif isinstance(value, (np.int64, np.int32)):
                data[key] = int(value)
            elif isinstance(value, (np.float64, np.float32)):
                data[key] = float(value)
        return data


class STLGeometryAnalyzer:
    """
    Analizador avanzado de geometría STL para optimización de perfiles.
    Extrae características geométricas relevantes para decisiones de impresión.
    """
    
    def __init__(self):
        self.mesh: Optional[trimesh.Trimesh] = None
        self.file_path: Optional[Path] = None
        
    def analyze_stl(self, stl_path: str) -> STLAnalysisResult:
        """
        Analiza un archivo STL y retorna análisis completo.
        
        Args:
            stl_path: Ruta al archivo STL
            
        Returns:
            STLAnalysisResult con análisis completo
            
        Raises:
            FileNotFoundError: Si el archivo no existe
            ValueError: Si el archivo no es un STL válido
        """
        self.file_path = Path(stl_path)
        
        if not self.file_path.exists():
            raise FileNotFoundError(f"STL file not found: {stl_path}")
        
        # Cargar mesh
        try:
            self.mesh = trimesh.load(str(self.file_path))
        except Exception as e:
            raise ValueError(f"Failed to load STL file: {e}")
        
        # Verificar que sea un mesh válido
        if not isinstance(self.mesh, trimesh.Trimesh):
            raise ValueError("File is not a valid mesh")
        
        # Realizar todos los análisis
        basic_info = self._get_basic_info()
        complexity = self._analyze_complexity()
        surface = self._analyze_surface()
        overhangs = self._analyze_overhangs()
        details = self._analyze_fine_details()
        stability = self._analyze_stability()
        recommendations = self._generate_basic_recommendations(
            complexity, surface, overhangs, details, stability
        )
        
        # Construir resultado
        result = STLAnalysisResult(
            # Básico
            volume=basic_info['volume'],
            surface_area=basic_info['surface_area'],
            dimensions=basic_info['dimensions'],
            face_count=basic_info['face_count'],
            vertex_count=basic_info['vertex_count'],
            
            # Complejidad
            complexity_score=complexity['score'],
            faces_per_volume=complexity['faces_per_volume'],
            surface_to_volume_ratio=complexity['surface_to_volume'],
            
            # Superficie
            bed_contact_area=surface['contact_area'],
            bed_contact_percentage=surface['contact_percentage'],
            surface_smoothness=surface['smoothness'],
            
            # Overhangs
            has_severe_overhangs=overhangs['has_severe'],
            severe_overhang_area=overhangs['severe_area'],
            has_moderate_overhangs=overhangs['has_moderate'],
            moderate_overhang_area=overhangs['moderate_area'],
            requires_supports=overhangs['requires_supports'],
            
            # Detalles
            has_very_fine_details=details['has_very_fine'],
            has_fine_details=details['has_fine'],
            minimum_feature_size=details['minimum_size'],
            
            # Estabilidad
            center_of_mass_height_ratio=stability['com_height_ratio'],
            base_area_ratio=stability['base_area_ratio'],
            is_stable=stability['is_stable'],
            
            # Recomendaciones
            recommended_layer_height=recommendations['layer_height'],
            recommended_speed_multiplier=recommendations['speed_multiplier'],
            recommended_support_type=recommendations['support_type'],
            recommended_adhesion=recommendations['adhesion']
        )
        
        return result
    
    def _get_basic_info(self) -> Dict[str, Any]:
        """Extrae información básica del mesh"""
        # Volume en cm³
        volume_mm3 = self.mesh.volume
        volume_cm3 = volume_mm3 / 1000
        
        # Surface area en cm²
        area_mm2 = self.mesh.area
        area_cm2 = area_mm2 / 100
        
        # Dimensiones en mm
        bounds = self.mesh.bounds
        dimensions = {
            'x': float(bounds[1][0] - bounds[0][0]),
            'y': float(bounds[1][1] - bounds[0][1]),
            'z': float(bounds[1][2] - bounds[0][2])
        }
        
        return {
            'volume': volume_cm3,
            'surface_area': area_cm2,
            'dimensions': dimensions,
            'face_count': len(self.mesh.faces),
            'vertex_count': len(self.mesh.vertices)
        }
    
    def _analyze_complexity(self) -> Dict[str, Any]:
        """
        Analiza la complejidad geométrica.
        Mayor número de faces por volumen = más complejo.
        """
        volume_cm3 = self.mesh.volume / 1000
        faces = len(self.mesh.faces)
        
        # Faces por cm³
        faces_per_volume = faces / max(volume_cm3, 0.001)
        
        # Surface to volume ratio
        surface_area_cm2 = self.mesh.area / 100
        sv_ratio = surface_area_cm2 / max(volume_cm3, 0.001)
        
        # Score de complejidad (0-10)
        # Basado en faces/cm³: 0-1000 = simple, 1000-10000 = medio, >10000 = complejo
        complexity_score = min(10, (faces_per_volume / 10000) * 10)
        
        # Analizar longitud de edges para detectar detalles
        edges = self.mesh.edges_unique_length
        edge_variance = np.std(edges) if len(edges) > 0 else 0
        
        return {
            'score': float(complexity_score),
            'faces_per_volume': float(faces_per_volume),
            'surface_to_volume': float(sv_ratio),
            'edge_variance': float(edge_variance)
        }
    
    def _analyze_surface(self) -> Dict[str, Any]:
        """
        Analiza la superficie de contacto con la cama.
        Detecta área de contacto y características de adhesión.
        """
        # Obtener faces que miran hacia abajo (normales con Z < -0.7)
        face_normals = self.mesh.face_normals
        down_facing_mask = face_normals[:, 2] < -0.7
        
        # Calcular área de contacto
        face_areas = self.mesh.area_faces
        contact_area_mm2 = np.sum(face_areas[down_facing_mask])
        contact_area_cm2 = contact_area_mm2 / 100
        
        # Porcentaje de área de contacto vs área total
        total_area_cm2 = self.mesh.area / 100
        contact_percentage = (contact_area_cm2 / max(total_area_cm2, 0.001)) * 100
        
        # Smoothness: varianza de normales en faces de contacto
        if np.sum(down_facing_mask) > 0:
            contact_normals = face_normals[down_facing_mask]
            smoothness = 10 - min(10, np.std(contact_normals[:, 2]) * 10)
        else:
            smoothness = 5.0
        
        return {
            'contact_area': float(contact_area_cm2),
            'contact_percentage': float(contact_percentage),
            'smoothness': float(smoothness)
        }
    
    def _analyze_overhangs(self) -> Dict[str, Any]:
        """
        Detecta overhangs severos (>60°) y moderados (45-60°).
        Determina si se necesitan soportes.
        """
        face_normals = self.mesh.face_normals
        face_areas = self.mesh.area_faces
        
        # Calcular ángulo de cada face respecto al plano horizontal
        # normal.z = cos(angle), donde angle es respecto a vertical
        # Para overhang, queremos angle from horizontal
        # angle_from_horizontal = 90 - angle_from_vertical
        # Si normal.z < 0.5 (cos(60°) ≈ 0.5) → overhang > 60°
        # Si normal.z < 0.707 (cos(45°) ≈ 0.707) → overhang > 45°
        
        severe_mask = (face_normals[:, 2] > -0.5) & (face_normals[:, 2] < 0.5)
        moderate_mask = (face_normals[:, 2] >= 0.5) & (face_normals[:, 2] < 0.707)
        
        severe_area_mm2 = np.sum(face_areas[severe_mask])
        moderate_area_mm2 = np.sum(face_areas[moderate_mask])
        
        severe_area_cm2 = severe_area_mm2 / 100
        moderate_area_cm2 = moderate_area_mm2 / 100
        
        has_severe = severe_area_cm2 > 0.1  # Más de 0.1 cm² de overhang severo
        has_moderate = moderate_area_cm2 > 0.5  # Más de 0.5 cm² de overhang moderado
        
        requires_supports = has_severe or (moderate_area_cm2 > 2.0)
        
        return {
            'has_severe': has_severe,
            'severe_area': float(severe_area_cm2),
            'has_moderate': has_moderate,
            'moderate_area': float(moderate_area_cm2),
            'requires_supports': requires_supports
        }
    
    def _analyze_fine_details(self) -> Dict[str, Any]:
        """
        Detecta detalles finos analizando longitud de edges.
        Detalles muy finos (<0.3mm) requieren layer heights bajos.
        """
        edges = self.mesh.edges_unique_length
        
        if len(edges) == 0:
            return {
                'has_very_fine': False,
                'has_fine': False,
                'minimum_size': 1.0
            }
        
        # Percentil 5 para detectar los edges más pequeños
        min_edge = float(np.percentile(edges, 5))
        
        has_very_fine = min_edge < 0.3  # <0.3mm
        has_fine = min_edge < 0.8  # <0.8mm
        
        return {
            'has_very_fine': has_very_fine,
            'has_fine': has_fine,
            'minimum_size': min_edge
        }
    
    def _analyze_stability(self) -> Dict[str, Any]:
        """
        Analiza estabilidad de la pieza:
        - Centro de masa vs altura
        - Área de base vs área total
        """
        # Centro de masa
        com = self.mesh.center_mass
        bounds = self.mesh.bounds
        height = bounds[1][2] - bounds[0][2]
        
        # Ratio de altura del centro de masa (0 = base, 1 = top)
        com_height_ratio = (com[2] - bounds[0][2]) / max(height, 0.001)
        
        # Área de base (faces cercanas al Z mínimo)
        face_centers = self.mesh.triangles_center
        z_min = bounds[0][2]
        base_mask = face_centers[:, 2] < (z_min + height * 0.1)
        
        base_area_mm2 = np.sum(self.mesh.area_faces[base_mask])
        total_area_mm2 = self.mesh.area
        base_area_ratio = base_area_mm2 / max(total_area_mm2, 0.001)
        
        # Estable si CoM está bajo y tiene buena base
        is_stable = (com_height_ratio < 0.6) and (base_area_ratio > 0.2)
        
        return {
            'com_height_ratio': float(com_height_ratio),
            'base_area_ratio': float(base_area_ratio),
            'is_stable': is_stable
        }
    
    def _generate_basic_recommendations(
        self,
        complexity: Dict,
        surface: Dict,
        overhangs: Dict,
        details: Dict,
        stability: Dict
    ) -> Dict[str, Any]:
        """
        Genera recomendaciones básicas basadas en análisis.
        Estas son sugerencias iniciales, Gemini las refinará.
        """
        # Layer height basado en detalles finos
        if details['has_very_fine']:
            layer_height = 0.12
        elif details['has_fine']:
            layer_height = 0.16
        else:
            layer_height = 0.20
        
        # Speed multiplier basado en complejidad y detalles
        if complexity['score'] > 7 or details['has_very_fine']:
            speed_multiplier = 0.6
        elif complexity['score'] > 4 or details['has_fine']:
            speed_multiplier = 0.8
        else:
            speed_multiplier = 1.0
        
        # Support type
        if overhangs['has_severe']:
            support_type = "tree"
        elif overhangs['has_moderate']:
            support_type = "auto"
        else:
            support_type = "none"
        
        # Adhesion basado en estabilidad y área de contacto
        if not stability['is_stable'] or surface['contact_area'] < 2.0:
            adhesion = "brim"
        elif surface['contact_area'] < 1.0:
            adhesion = "raft"
        else:
            adhesion = "none"
        
        return {
            'layer_height': layer_height,
            'speed_multiplier': speed_multiplier,
            'support_type': support_type,
            'adhesion': adhesion
        }
