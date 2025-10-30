"""
Support Analyzer Service
Analiza archivos STL para detectar voladizos y recomendar soportes de forma inteligente
"""

import numpy as np
import trimesh
import json
from typing import Dict, List, Tuple, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class SupportAnalyzer:
    """
    Analiza geometría 3D para determinar dónde se necesitan soportes.
    Usa análisis de ángulos de superficie, detección de islas y áreas críticas.
    """
    
    def __init__(self, critical_angle: float = 45.0, min_area: float = 5.0):
        """
        Args:
            critical_angle: Ángulo crítico en grados (por defecto 45°)
                           Superficies con ángulo > critical_angle necesitan soporte
            min_area: Área mínima en mm² para considerar una región de soporte
        """
        self.critical_angle = critical_angle
        self.min_area = min_area
        
    def analyze_stl(self, stl_path: str) -> Dict[str, Any]:
        """
        Analiza un archivo STL completo para determinar necesidades de soporte.
        
        Args:
            stl_path: Ruta al archivo STL
            
        Returns:
            Dict con análisis completo de soportes necesarios
        """
        try:
            logger.info(f"📐 Analizando geometría de: {stl_path}")
            
            # Cargar mesh
            mesh = trimesh.load(stl_path)
            
            # Si es una escena con múltiples objetos, combinar
            if isinstance(mesh, trimesh.Scene):
                meshes = [geom for geom in mesh.geometry.values()]
                if len(meshes) > 1:
                    mesh = trimesh.util.concatenate(meshes)
                elif len(meshes) == 1:
                    mesh = meshes[0]
                else:
                    raise ValueError("No se encontraron geometrías en el archivo")
            
            # Análisis principal
            result = {
                "needs_support": False,
                "support_type": "none",
                "support_density": 0,
                "critical_regions": [],
                "overhang_analysis": {},
                "statistics": {},
                "recommendations": []
            }
            
            # 1. Análisis de voladizos (overhangs)
            overhang_info = self._analyze_overhangs(mesh)
            result["overhang_analysis"] = overhang_info
            
            # 2. Detectar islas flotantes (áreas sin contacto con la base)
            islands = self._detect_floating_islands(mesh)
            
            # 3. Determinar si se necesitan soportes
            needs_support = (
                overhang_info["overhang_percentage"] > 5.0 or  # >5% de superficie con voladizo
                len(islands) > 0 or  # Hay islas flotantes
                overhang_info["max_angle"] > self.critical_angle + 20  # Ángulos muy extremos
            )
            
            result["needs_support"] = needs_support
            
            if needs_support:
                # 4. Determinar tipo de soporte óptimo y si usar buildplate_only
                support_type, density, buildplate_only = self._determine_support_type(overhang_info, islands)
                result["support_type"] = support_type
                result["support_density"] = density
                result["buildplate_only"] = buildplate_only  # 🔥 NUEVO campo
                
                # 5. Identificar regiones críticas específicas
                critical_regions = self._identify_critical_regions(mesh, overhang_info)
                result["critical_regions"] = critical_regions
                
                # 6. Generar recomendaciones
                recommendations = self._generate_recommendations(
                    overhang_info, 
                    islands, 
                    support_type,
                    density
                )
                result["recommendations"] = recommendations
            else:
                result["recommendations"] = [
                    "✅ No se detectaron voladizos críticos",
                    "✅ El modelo puede imprimirse sin soportes",
                    "💡 Considera rotar el modelo para optimizar aún más"
                ]
            
            # 7. Estadísticas generales
            result["statistics"] = {
                "total_faces": len(mesh.faces),
                "total_area_mm2": float(mesh.area),
                "volume_mm3": float(mesh.volume),
                "bounding_box": mesh.bounds.tolist(),
                "overhang_faces": overhang_info.get("overhang_face_count", 0),
                "floating_islands": len(islands)
            }
            
            logger.info(f"✅ Análisis completado - Soportes: {result['support_type']}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error analizando STL: {str(e)}")
            return {
                "needs_support": False,
                "support_type": "none",
                "error": str(e),
                "recommendations": ["⚠️ Error en análisis, usar configuración manual"]
            }
    
    def _analyze_overhangs(self, mesh: trimesh.Trimesh) -> Dict[str, Any]:
        """
        Analiza las normales de las caras para detectar voladizos.
        Un voladizo es una superficie que apunta hacia abajo (normal Z negativa).
        """
        try:
            # Obtener normales de todas las caras
            face_normals = mesh.face_normals
            
            # Vector hacia arriba (dirección de construcción)
            up_vector = np.array([0, 0, 1])
            
            # Calcular ángulo entre cada normal y el vector hacia arriba
            # dot product da el coseno del ángulo
            dot_products = np.dot(face_normals, up_vector)
            
            # Convertir a ángulos (en grados)
            # arccos da el ángulo, 0° = apunta arriba, 90° = vertical, 180° = apunta abajo
            angles = np.degrees(np.arccos(np.clip(dot_products, -1.0, 1.0)))
            
            # Clasificar caras según ángulo
            # 0-45°: No necesita soporte
            # 45-90°: Voladizo moderado
            # 90-180°: Voladizo crítico (apunta hacia abajo)
            critical_angle_rad = self.critical_angle
            
            safe_faces = angles <= critical_angle_rad
            moderate_overhang = (angles > critical_angle_rad) & (angles <= 90)
            critical_overhang = angles > 90
            
            # Calcular áreas de cada categoría
            face_areas = mesh.area_faces
            
            safe_area = float(np.sum(face_areas[safe_faces]))
            moderate_area = float(np.sum(face_areas[moderate_overhang]))
            critical_area = float(np.sum(face_areas[critical_overhang]))
            total_area = float(mesh.area)
            
            overhang_area = moderate_area + critical_area
            overhang_percentage = (overhang_area / total_area * 100) if total_area > 0 else 0
            
            # Encontrar ángulo máximo de voladizo
            max_angle = float(np.max(angles))
            min_angle = float(np.min(angles))
            avg_angle = float(np.mean(angles))
            
            return {
                "overhang_percentage": overhang_percentage,
                "overhang_area_mm2": overhang_area,
                "critical_area_mm2": critical_area,
                "moderate_area_mm2": moderate_area,
                "safe_area_mm2": safe_area,
                "max_angle": max_angle,
                "min_angle": min_angle,
                "avg_angle": avg_angle,
                "overhang_face_count": int(np.sum(moderate_overhang) + np.sum(critical_overhang)),
                "critical_face_count": int(np.sum(critical_overhang)),
                "total_faces": len(face_normals)
            }
            
        except Exception as e:
            logger.error(f"Error en análisis de voladizos: {str(e)}")
            return {
                "overhang_percentage": 0,
                "max_angle": 0,
                "error": str(e)
            }
    
    def _detect_floating_islands(self, mesh: trimesh.Trimesh) -> List[Dict[str, Any]]:
        """
        Detecta regiones del modelo que no tienen contacto directo con la base.
        Estas "islas flotantes" siempre necesitan soportes.
        """
        try:
            # Obtener componentes conectados
            components = mesh.split(only_watertight=False)
            
            if len(components) <= 1:
                return []  # No hay islas separadas
            
            islands = []
            
            # Encontrar la altura mínima (base) del modelo
            min_z = mesh.bounds[0][2]  # Z mínimo
            base_threshold = min_z + 0.5  # 0.5mm de tolerancia
            
            for i, component in enumerate(components):
                # Verificar si este componente toca la base
                component_min_z = component.bounds[0][2]
                
                if component_min_z > base_threshold:
                    # Esta es una isla flotante
                    island_info = {
                        "index": i,
                        "height_from_base": float(component_min_z - min_z),
                        "volume_mm3": float(component.volume),
                        "area_mm2": float(component.area),
                        "bounding_box": component.bounds.tolist(),
                        "requires_support": True
                    }
                    islands.append(island_info)
            
            return islands
            
        except Exception as e:
            logger.error(f"Error detectando islas: {str(e)}")
            return []
    
    def _determine_support_type(
        self, 
        overhang_info: Dict[str, Any], 
        islands: List[Dict[str, Any]]
    ) -> Tuple[str, int, bool]:
        """
        Determina el tipo de soporte óptimo, su densidad y si usar buildplate_only.
        
        Returns:
            Tupla (tipo, densidad, buildplate_only) donde:
            - tipo: "none", "tree", "linear", "grid"
            - densidad: 0-100 (porcentaje)
            - buildplate_only: True si solo soportes desde la base, False si en todas partes
        """
        overhang_pct = overhang_info.get("overhang_percentage", 0)
        critical_area = overhang_info.get("critical_area_mm2", 0)
        max_angle = overhang_info.get("max_angle", 0)
        
        # 🔥 DETECCIÓN INTELIGENTE ULTRA-CONSERVADORA
        # REGLA: Casi SIEMPRE usar buildplate-only
        # Solo desactivar en casos EXTREMADAMENTE específicos que el usuario confirme manualmente
        # 
        # REALIDAD: Los soportes dentro de piezas son CASI SIEMPRE un problema
        # Es mejor tener un segmento flotante ocasional que soportes irremovibles
        
        has_floating_islands = len(islands) > 0
        very_high_overhang = overhang_pct > 70  # Aumentado de 50 a 70
        extreme_angles = max_angle > 170  # Aumentado de 135 a 170 (casi completamente invertido)
        massive_critical_area = critical_area > 1000  # Aumentado de 150 a 1000 (área masiva)
        
        # ⚠️ CRITERIO EXTREMADAMENTE ESTRICTO para soportes en todas partes:
        # Solo si la pieza es MASIVA y está casi completamente invertida
        # En la práctica, esto será MUY raro - mejor pedir al usuario rotar el modelo
        needs_internal_supports = (
            extreme_angles and 
            massive_critical_area and 
            very_high_overhang and
            has_floating_islands  # Y además tiene islas flotantes
        )
        
        # 🚫 REGLA DE ORO: Por defecto SIEMPRE buildplate_only = True
        # Solo casos extremos excepcionales usan False
        buildplate_only = True  # 🔥 Por defecto SIEMPRE True
        
        # Decisión de tipo de soporte
        if needs_internal_supports:
            # 🔺 Caso EXTREMADAMENTE raro: pieza masiva, invertida, con islas
            # Solo aquí usamos soportes en todas partes
            support_type = "tree"
            density = 20
            buildplate_only = False  # ⚠️ ÚNICO caso donde es False
            logger.info(f"   ⚠️ CASO EXCEPCIONAL: Geometría masiva invertida con islas flotantes")
            logger.info(f"      (voladizos: {overhang_pct:.1f}%, ángulo: {max_angle:.1f}°, área: {critical_area:.1f}mm², islas: {len(islands)})")
            logger.info(f"      → Tree supports SIN buildplate-only (considere rotar el modelo)")
            
        elif has_floating_islands:
            # 🏝️ Islas flotantes pero geometría normal
            # Usar tree desde la base (alcanzará las islas)
            support_type = "tree"
            density = 20
            buildplate_only = True  # ✅ Solo desde la base
            logger.info(f"   🏝️ Detectadas {len(islands)} islas flotantes → Tree supports desde base")
            
        elif overhang_pct > 30 or critical_area > 500:
            # 🌳 Alta complejidad: muchos voladizos O área crítica grande
            # Usar tree que es mejor para geometría compleja y más fácil de remover
            support_type = "tree"
            density = 25 if critical_area > 500 else 20
            buildplate_only = True  # ✅ Solo desde la base
            logger.info(f"   🌳 Geometría compleja (voladizos: {overhang_pct:.1f}%, área: {critical_area:.1f}mm²) → Tree supports")
            
        elif overhang_pct > 20:
            # Voladizos moderados
            support_type = "tree"
            density = 18
            buildplate_only = True  # Solo desde la base
            
        elif overhang_pct > 10 or critical_area > 100:
            # Voladizos o área moderada
            support_type = "linear"
            density = 15
            buildplate_only = True  # Solo desde la base
            
        elif overhang_pct > 5:
            # Pocos voladizos
            support_type = "tree"
            density = 10
            buildplate_only = True  # Solo desde la base
            
        else:
            # No se necesitan soportes
            support_type = "none"
            density = 0
            buildplate_only = True  # No aplica
        
        # Ajustar densidad según ángulo máximo
        if max_angle > 120:
            density = min(density + 10, 30)
        
        return support_type, density, buildplate_only
    
    def _identify_critical_regions(
        self, 
        mesh: trimesh.Trimesh, 
        overhang_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Identifica regiones específicas del modelo que necesitan soportes.
        Devuelve coordenadas aproximadas para visualización.
        """
        critical_regions = []
        
        try:
            face_normals = mesh.face_normals
            up_vector = np.array([0, 0, 1])
            dot_products = np.dot(face_normals, up_vector)
            angles = np.degrees(np.arccos(np.clip(dot_products, -1.0, 1.0)))
            
            # Identificar caras críticas (ángulo > crítico)
            critical_mask = angles > self.critical_angle
            
            if np.any(critical_mask):
                # Obtener centros de caras críticas
                critical_faces = mesh.faces[critical_mask]
                vertices = mesh.vertices
                
                # Agrupar regiones cercanas (simplificado)
                for i, face_indices in enumerate(critical_faces[:10]):  # Limitar a 10 regiones principales
                    face_vertices = vertices[face_indices]
                    center = np.mean(face_vertices, axis=0)
                    
                    region = {
                        "id": i,
                        "center": center.tolist(),
                        "approximate_size": float(mesh.area_faces[np.where(critical_mask)[0][i]]),
                        "support_recommended": True
                    }
                    critical_regions.append(region)
            
        except Exception as e:
            logger.error(f"Error identificando regiones críticas: {str(e)}")
        
        return critical_regions
    
    def _generate_recommendations(
        self,
        overhang_info: Dict[str, Any],
        islands: List[Dict[str, Any]],
        support_type: str,
        density: int
    ) -> List[str]:
        """
        Genera recomendaciones inteligentes basadas en el análisis.
        """
        recommendations = []
        
        overhang_pct = overhang_info.get("overhang_percentage", 0)
        max_angle = overhang_info.get("max_angle", 0)
        
        # Recomendación principal de soportes
        if support_type == "tree":
            recommendations.append(
                f"🌳 Usar soportes tipo ÁRBOL (tree) con densidad {density}%"
            )
            recommendations.append(
                "   Ventaja: Más fáciles de remover, menos marcas en la pieza"
            )
        elif support_type == "linear":
            recommendations.append(
                f"📏 Usar soportes LINEALES con densidad {density}%"
            )
            recommendations.append(
                "   Ventaja: Mayor estabilidad para áreas grandes"
            )
        
        # Recomendaciones según análisis
        if len(islands) > 0:
            recommendations.append(
                f"⚠️  Se detectaron {len(islands)} isla(s) flotante(s) - Soportes OBLIGATORIOS"
            )
        
        if overhang_pct > 25:
            recommendations.append(
                f"⚠️  {overhang_pct:.1f}% del modelo son voladizos - Considerar rotar el modelo"
            )
        
        if max_angle > 135:
            recommendations.append(
                "⚠️  Voladizos extremos detectados (>135°) - Aumentar densidad de soportes"
            )
        
        # Recomendaciones de orientación
        if overhang_pct > 15:
            recommendations.append(
                "💡 Sugerencia: Probar auto-rotación para reducir área de voladizos"
            )
        
        # Recomendaciones de configuración
        recommendations.append(
            f"🔧 Interface Z: 0.2mm (facilita remoción de soportes)"
        )
        
        if support_type == "tree":
            recommendations.append(
                f"🔧 Branch angle: 45° (óptimo para estabilidad)"
            )
        
        return recommendations


# Instancia global del analizador
support_analyzer = SupportAnalyzer(critical_angle=45.0, min_area=5.0)


def analyze_support_needs(stl_path: str) -> Dict[str, Any]:
    """
    Función helper para analizar necesidades de soporte de un archivo STL.
    
    Args:
        stl_path: Ruta al archivo STL
        
    Returns:
        Análisis completo de soportes
    """
    return support_analyzer.analyze_stl(stl_path)


if __name__ == "__main__":
    # Test con un archivo STL
    import sys
    if len(sys.argv) > 1:
        result = analyze_support_needs(sys.argv[1])
        print(json.dumps(result, indent=2))
