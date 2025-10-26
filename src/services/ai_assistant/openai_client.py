"""
OpenAI Client para optimización de perfiles de impresión 3D.
Utiliza GPT-4o-mini para generar perfiles optimizados basados en análisis STL.
"""
import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI

from src.config.settings import settings
from src.services.ai_assistant.stl_analyzer import STLAnalysisResult

logger = logging.getLogger(__name__)


class OpenAIProfileOptimizer:
    """
    Cliente de OpenAI para optimización de perfiles de impresión.
    Genera perfiles contextualizados basados en geometría STL y capacidades de impresora.
    """
    
    def __init__(self):
        """Inicializa el cliente OpenAI con API key de configuración"""
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.temperature = settings.OPENAI_TEMPERATURE
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.verbosity = getattr(settings, 'OPENAI_VERBOSITY', 'medium')
        self.reasoning_effort = getattr(settings, 'OPENAI_REASONING_EFFORT', 'medium')
    
    def optimize_profile(
        self,
        stl_analysis: STLAnalysisResult,
        material: str,
        printer_capabilities: Dict[str, Any],
        base_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimiza un perfil de impresión usando OpenAI.
        
        Args:
            stl_analysis: Análisis completo de geometría STL
            material: Material a utilizar (PLA, PETG, ABS, etc.)
            printer_capabilities: Capacidades de la impresora (max speed, temps, etc.)
            base_profile: Perfil base de Orca Slicer (opcional)
            
        Returns:
            Dict con perfil optimizado y metadata:
            {
                "profile": {...},  # Configuración optimizada
                "analysis_summary": "...",  # Resumen de análisis
                "improvements": [...],  # Lista de mejoras aplicadas
                "warnings": [...],  # Advertencias importantes
                "ai_confidence": 0.95  # Confianza del modelo (0-1)
            }
        """
        try:
            # Construir prompt con todo el contexto
            prompt = self._build_optimization_prompt(
                stl_analysis, material, printer_capabilities, base_profile
            )
            
            # 📤 PASO 1: Mostrar qué parámetros pedimos a la IA
            logger.info("=" * 80)
            logger.info("📤 PASO 1: INSTRUCCIÓN ENVIADA A OPENAI")
            logger.info("=" * 80)
            logger.info("Solicitando a OpenAI que genere estos 40 parámetros:")
            logger.info("  ✅ BÁSICOS (7): layer_height, first_layer_height, perimeters, infill_density, etc.")
            logger.info("  ✅ SOPORTES (3): support_type, support_density, brim_width")
            logger.info("  ✅ VELOCIDADES (7): print_speed, external_perimeter_speed, gap_fill_speed, etc.")
            logger.info("  ✅ CALIDAD (3): gcode_resolution, seam_position, infill_overlap")
            logger.info("  ✅ FLAGS (6): extra_perimeters, gap_fill_enabled, avoid_crossing_perimeters, etc.")
            logger.info("  ✅ PUENTES (3): bridge_speed, bridge_flow_ratio, bridge_fan_speed")
            logger.info("  ✅ VENTILADOR (5): min/max_fan_speed, disable_fan_first_layers, etc.")
            logger.info("  ✅ EXTRUSIÓN (3): external_perimeter_extrusion_width, perimeter_generator, etc.")
            logger.info("  ✅ PRECISIÓN (2): resolution, thin_walls")
            logger.info("  ✅ RETRACCIÓN (3): retraction_length, retraction_speed, z_hop")
            logger.info("=" * 80)
            
            logger.info(f"🤖 Llamando a OpenAI ({self.model})...")
            
            # Detectar si es GPT-5 para usar parámetros específicos
            is_gpt5 = self.model.startswith("gpt-5")
            
            # Preparar parámetros base
            api_params = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are an expert in 3D printing optimization. "
                            "Analyze the provided STL file information and suggest optimal print settings. "
                            "Respond ONLY with valid JSON matching the schema provided."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "store": False  # No almacenar en historial
            }
            
            # GPT-5 usa parámetros específicos según playground de OpenAI
            if is_gpt5:
                api_params.update({
                    "response_format": {"type": "text"},  # GPT-5 usa "text" no "json_object"
                    "verbosity": self.verbosity,  # low, medium, high
                    "reasoning_effort": self.reasoning_effort,  # low, medium, high
                    "max_completion_tokens": self.max_tokens
                })
            else:
                # GPT-4 usa parámetros tradicionales
                api_params.update({
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens,
                    "response_format": {"type": "json_object"}
                })
            
            response = self.client.chat.completions.create(**api_params)
            
            # Extraer respuesta
            response_text = response.choices[0].message.content
            logger.info(f"✅ Respuesta recibida de OpenAI ({len(response_text)} chars)")
            
            # Parsear respuesta JSON usando el método que incluye logging detallado
            result = self._parse_openai_response(response_text)
            
            # Validar contra capacidades de impresora
            validated_profile = self._validate_profile(
                result.get("profile", {}), printer_capabilities
            )
            
            result["profile"] = validated_profile
            
            # Asegurar que ai_confidence esté presente
            if "ai_confidence" not in result:
                result["ai_confidence"] = 0.85  # Default confianza alta
            
            logger.info(f"✨ Perfil IA validado con confianza {result.get('ai_confidence', 0):.0%}")
            
            return result
            
        except Exception as e:
            # Fallback a perfil básico si OpenAI falla
            logger.warning(f"⚠️ Error en OpenAI, usando fallback: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return self._get_fallback_profile(stl_analysis, material)
    
    def _build_optimization_prompt(
        self,
        analysis: STLAnalysisResult,
        material: str,
        capabilities: Dict[str, Any],
        base_profile: Optional[Dict[str, Any]]
    ) -> str:
        """Construye prompt contextual para OpenAI"""
        
        prompt = f"""Analyze this 3D printing job and provide optimized slicing parameters.

**Part Specifications:**
- Material: {material}
- Volume: {analysis.volume:.1f} cm³
- Dimensions: {analysis.dimensions['x']:.0f} x {analysis.dimensions['y']:.0f} x {analysis.dimensions['z']:.0f} mm
- Surface complexity: {analysis.face_count} triangular faces
- Geometric complexity score: {analysis.complexity_score:.1f}/10
- Base contact area: {analysis.bed_contact_area:.1f} cm² ({analysis.bed_contact_percentage:.1f}%)
- Surface smoothness: {analysis.surface_smoothness:.1f}/10

**Part Features:**
- Severe overhangs (>60°): {'Yes' if analysis.has_severe_overhangs else 'No'}
- Moderate overhangs (45-60°): {'Yes' if analysis.has_moderate_overhangs else 'No'}
- Requires supports: {'Yes' if analysis.requires_supports else 'No'}
- Fine details (<0.8mm): {'Yes' if analysis.has_fine_details else 'No'}
- Very fine details (<0.3mm): {'Yes' if analysis.has_very_fine_details else 'No'}
- Minimum feature size: {analysis.minimum_feature_size:.2f} mm
- Stability: {'Stable' if analysis.is_stable else 'Needs attention'}

**Printer Capabilities:**
- Nozzle diameter: {capabilities.get('nozzle_diameter', 0.4)} mm
- Max speed: {capabilities.get('max_speed_x', 250)} mm/s
- Max acceleration: {capabilities.get('max_acceleration', 2500)} mm/s²

**Required Output (JSON only):**
{{
    "profile": {{
        // === BASIC PARAMETERS ===
        "layer_height": 0.2,
        "first_layer_height": 0.24,
        "perimeters": 4,
        "top_solid_layers": 5,
        "bottom_solid_layers": 5,
        "infill_density": 20,
        "infill_pattern": "honeycomb",
        
        // === SUPPORT PARAMETERS ===
        "support_type": "tree",
        "support_density": 15,
        "brim_width": 2,
        
        // === SPEED PARAMETERS ===
        "print_speed": 60,
        "first_layer_speed": 25,
        "perimeter_speed": 50,
        "external_perimeter_speed": 25,
        "infill_speed": 70,
        "travel_speed": 150,
        "gap_fill_speed": 15,
        
        // === QUALITY PARAMETERS (NEW) ===
        "gcode_resolution": 0.005,
        "seam_position": "aligned",
        "infill_overlap": 30.0,
        // NOTE: elephant_foot_compensation not supported via PrusaSlicer CLI
        
        // === BOOLEAN FLAGS (NEW) ===
        "extra_perimeters": true,
        "gap_fill_enabled": true,
        "avoid_crossing_perimeters": true,
        "thin_walls": true,
        "overhangs": true,
        "enable_dynamic_overhang_speeds": true,
        
        // === BRIDGE & OVERHANG PARAMETERS (NEW) ===
        "bridge_speed": 50,
        "bridge_flow_ratio": 0.9,
        "bridge_fan_speed": 100,
        
        // === FAN CONTROL PARAMETERS (NEW) ===
        "min_fan_speed": 70,
        "max_fan_speed": 100,
        "disable_fan_first_layers": 1,
        "cooling_fan_speed": 100,
        "first_layer_fan_speed": 0,
        
        // === ADVANCED EXTRUSION (NEW) ===
        "external_perimeter_extrusion_width": 105.0,
        "top_infill_extrusion_width": 105.0,
        "perimeter_generator": "arachne",
        
        // === PRECISION (NEW) ===
        "resolution": 0.0,
        
        // === RETRACTION ===
        "retraction_length": 1.2,
        "retraction_speed": 40,
        "z_hop": 0.4
    }},
    "analysis_summary": "Brief analysis of the part geometry and chosen parameters",
    "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
    "warnings": ["Warning 1", "Warning 2"],
    "ai_confidence": 0.92
}}

**OPTIMIZATION GUIDELINES:**
- gcode_resolution: Lower = smoother curves (0.0025-0.005mm for high quality, 0.0125mm standard)
- external_perimeter_speed: Slower = better surface finish (20-30mm/s quality, 40-50mm/s normal)
- gap_fill_speed: Slow for precision (15-20mm/s)
- seam_position: "aligned" (hide in corners), "rear" (back), "random" (scattered)
- extra_perimeters: Enable for sloped walls to eliminate gaps
- gap_fill_enabled: Enable to fill small spaces between perimeters
- avoid_crossing_perimeters: Enable to reduce travel marks
- perimeter_generator: "arachne" (modern, better detail) or "classic" (traditional)
- bridge_flow_ratio: <1.0 to tension bridges (0.85-0.95)
- overhangs: Enable to adjust flow/fan for overhangs
- enable_dynamic_overhang_speeds: Enable to slow down on steep overhangs
- min/max_fan_speed: Adjust based on material (PLA: 70-100%, ABS: 0-30%, PETG: 30-60%)
- disable_fan_first_layers: Usually 1-2 for better bed adhesion
- external_perimeter_extrusion_width: 100-110% for fine detail, 110-120% normal
- top_infill_extrusion_width: 100-110% for smooth top surface
- thin_walls: Enable to detect and handle thin features
- resolution: 0.0 = no STL simplification (preserve all detail)

Optimize for MAXIMUM QUALITY and reliability. Consider part geometry, material, and fine details."""

        return prompt
    
    def _parse_openai_response(self, response_text: str) -> Dict[str, Any]:
        """
        Extrae y valida JSON de la respuesta de OpenAI.
        """
        try:
            result = json.loads(response_text)
            
            # � PASO 2: Mostrar TODOS los parámetros que la IA generó
            if "profile" in result:
                logger.info("=" * 80)
                logger.info("📥 PASO 2: PARÁMETROS GENERADOS POR OPENAI")
                logger.info("=" * 80)
                profile = result["profile"]
                
                # Contar parámetros
                total_params = len(profile)
                logger.info(f"📊 Total de parámetros recibidos de OpenAI: {total_params}")
                logger.info("")
                
                # Organizar por categorías
                basic_params = ['layer_height', 'first_layer_height', 'perimeters', 'top_solid_layers', 
                               'bottom_solid_layers', 'infill_density', 'infill_pattern']
                speed_params = ['print_speed', 'external_perimeter_speed', 'gap_fill_speed', 'bridge_speed',
                               'first_layer_speed', 'perimeter_speed', 'infill_speed', 'travel_speed']
                quality_params = ['gcode_resolution', 'seam_position', 'infill_overlap']
                flag_params = ['extra_perimeters', 'gap_fill_enabled', 'avoid_crossing_perimeters', 
                              'thin_walls', 'overhangs', 'enable_dynamic_overhang_speeds']
                bridge_params = ['bridge_speed', 'bridge_flow_ratio', 'bridge_fan_speed']
                fan_params = ['min_fan_speed', 'max_fan_speed', 'disable_fan_first_layers', 
                             'cooling_fan_speed', 'first_layer_fan_speed']
                extrusion_params = ['external_perimeter_extrusion_width', 'top_infill_extrusion_width', 
                                   'perimeter_generator']
                support_params = ['support_type', 'support_density', 'brim_width']
                retraction_params = ['retraction_length', 'retraction_speed', 'z_hop']
                precision_params = ['resolution']
                
                # Mostrar cada categoría
                logger.info("📋 BÁSICOS:")
                for key in basic_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n⚡ VELOCIDADES:")
                for key in speed_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n🎯 CALIDAD:")
                for key in quality_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n🔘 FLAGS BOOLEANOS:")
                for key in flag_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n🌉 PUENTES:")
                for key in bridge_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n💨 VENTILADOR:")
                for key in fan_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n🔧 EXTRUSIÓN:")
                for key in extrusion_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n🏗️ SOPORTES:")
                for key in support_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n🔄 RETRACCIÓN:")
                for key in retraction_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("\n🎯 PRECISIÓN:")
                for key in precision_params:
                    if key in profile:
                        logger.info(f"  ✅ {key:30s} = {profile[key]}")
                
                logger.info("=" * 80)
            
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON inválido en respuesta de OpenAI: {e}")
        
        # Validar estructura
        required_keys = ["profile", "analysis_summary", "improvements", "warnings"]
        missing = [k for k in required_keys if k not in result]
        if missing:
            raise ValueError(f"Respuesta incompleta de OpenAI. Faltan: {missing}")
        
        # Validar que profile tenga configuraciones mínimas
        required_profile_keys = [
            "layer_height", "perimeters", "infill_density", "print_speed"
        ]
        missing_profile = [k for k in required_profile_keys if k not in result["profile"]]
        if missing_profile:
            raise ValueError(f"Profile incompleto. Faltan: {missing_profile}")
        
        return result
    
    def _validate_profile(
        self,
        profile: Dict[str, Any],
        capabilities: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Valida que los valores del perfil estén dentro de límites seguros.
        Corrige valores fuera de rango.
        """
        validated = profile.copy()
        
        # Validar layer height
        if "layer_height" in validated:
            validated["layer_height"] = max(
                settings.MIN_LAYER_HEIGHT,
                min(validated["layer_height"], settings.MAX_LAYER_HEIGHT)
            )
        
        # Validar velocidades (ahora incluye nuevos parámetros)
        max_speed = capabilities.get("max_speed_x", settings.MAX_SPEED)
        speed_keys = [
            "print_speed", "first_layer_speed", "perimeter_speed", 
            "external_perimeter_speed", "infill_speed", "travel_speed",
            "gap_fill_speed", "bridge_speed"
        ]
        for key in speed_keys:
            if key in validated:
                validated[key] = max(
                    settings.MIN_SPEED,
                    min(validated[key], max_speed)
                )
        
        # Validar densidades (porcentajes) - ahora incluye nuevos fan params
        density_keys = [
            "infill_density", "support_density", "cooling_fan_speed",
            "first_layer_fan_speed", "min_fan_speed", "max_fan_speed",
            "bridge_fan_speed"
        ]
        for key in density_keys:
            if key in validated:
                validated[key] = max(0, min(validated[key], 100))
        
        # Validar contadores (valores enteros positivos)
        count_keys = [
            "perimeters", "top_solid_layers", "bottom_solid_layers",
            "disable_fan_first_layers"
        ]
        for key in count_keys:
            if key in validated:
                validated[key] = max(1, int(validated[key]))
        
        # Validar valores flotantes positivos pequeños
        float_keys = [
            "gcode_resolution", 
            "infill_overlap", "bridge_flow_ratio", "resolution",
            "external_perimeter_extrusion_width", "top_infill_extrusion_width"
        ]
        for key in float_keys:
            if key in validated:
                if key == "gcode_resolution":
                    # gcode_resolution: 0.0025 - 0.02mm
                    validated[key] = max(0.0025, min(validated[key], 0.02))
                elif key == "bridge_flow_ratio":
                    # bridge_flow_ratio: 0.7 - 1.1
                    validated[key] = max(0.7, min(validated[key], 1.1))
                elif key in ["external_perimeter_extrusion_width", "top_infill_extrusion_width"]:
                    # extrusion width: 80% - 150%
                    validated[key] = max(80.0, min(validated[key], 150.0))
                else:
                    # Otros valores positivos
                    validated[key] = max(0.0, float(validated[key]))
        
        # Validar strings con opciones válidas
        if "seam_position" in validated:
            valid_seams = ["aligned", "rear", "nearest", "random"]
            if validated["seam_position"] not in valid_seams:
                validated["seam_position"] = "aligned"
        
        if "perimeter_generator" in validated:
            valid_gens = ["arachne", "classic"]
            if validated["perimeter_generator"] not in valid_gens:
                validated["perimeter_generator"] = "arachne"
        
        if "infill_pattern" in validated:
            valid_patterns = [
                "rectilinear", "grid", "triangles", "stars", "cubic",
                "line", "concentric", "honeycomb", "3dhoneycomb", "gyroid",
                "hilbertcurve", "archimedeanchords", "octagramspiral",
                "adaptivecubic", "supportcubic", "lightning"
            ]
            if validated["infill_pattern"] not in valid_patterns:
                validated["infill_pattern"] = "honeycomb"
        
        # Validar booleanos (asegurar que son true/false)
        bool_keys = [
            "extra_perimeters", "gap_fill_enabled", "avoid_crossing_perimeters",
            "thin_walls", "overhangs", "enable_dynamic_overhang_speeds"
        ]
        for key in bool_keys:
            if key in validated:
                validated[key] = bool(validated[key])
        
        return validated
    
    def _generate_fallback_profile(
        self,
        analysis: 'STLAnalysisResult',
        material: str
    ) -> Dict[str, Any]:
        """
        Genera un perfil básico usando heurísticas cuando OpenAI falla.
        Incluye TODOS los parámetros de calidad con valores seguros.
        """
        # Usar recomendaciones básicas del análisis STL
        layer_height = analysis.recommended_layer_height
        speed_mult = analysis.recommended_speed_multiplier
        base_speed = 60
        
        profile = {
            # === BASIC PARAMETERS ===
            "layer_height": layer_height,
            "first_layer_height": layer_height * 1.2,
            "perimeters": 4,
            "top_solid_layers": 6,  # Más capas para mejor calidad
            "bottom_solid_layers": 6,
            "infill_density": 20,
            "infill_pattern": "honeycomb",
            
            # === SUPPORT ===
            "support_type": analysis.recommended_support_type,
            "support_density": 15,
            "brim_width": 3 if analysis.recommended_adhesion == "brim" else 0,
            
            # === SPEEDS ===
            "print_speed": int(base_speed * speed_mult),
            "first_layer_speed": 25,
            "perimeter_speed": int(base_speed * speed_mult * 0.8),
            "external_perimeter_speed": 25,  # Lento para calidad
            "infill_speed": int(base_speed * speed_mult * 1.2),
            "travel_speed": 150,
            "gap_fill_speed": 15,
            
            # === QUALITY PARAMETERS ===
            "gcode_resolution": 0.005,
            "seam_position": "aligned",
            "infill_overlap": 30.0,
            
            # === BOOLEAN FLAGS ===
            "extra_perimeters": True,
            "gap_fill_enabled": True,
            "avoid_crossing_perimeters": True,
            "thin_walls": True,
            "overhangs": True,
            "enable_dynamic_overhang_speeds": True,
            
            # === BRIDGE & OVERHANG ===
            "bridge_speed": 50,
            "bridge_flow_ratio": 0.9,
            "bridge_fan_speed": 100,
            
            # === FAN CONTROL (PLA defaults) ===
            "min_fan_speed": 70,
            "max_fan_speed": 100,
            "disable_fan_first_layers": 1,
            "cooling_fan_speed": 100,
            "first_layer_fan_speed": 0,
            
            # === ADVANCED EXTRUSION ===
            "external_perimeter_extrusion_width": 105.0,
            "top_infill_extrusion_width": 105.0,
            "perimeter_generator": "arachne",
            
            # === PRECISION ===
            "resolution": 0.0,
            
            # === RETRACTION ===
            "retraction_length": 1.2,
            "retraction_speed": 40,
            "z_hop": 0.4
        }
        
        return {
            "profile": profile,
            "analysis_summary": f"Perfil de calidad generado por fallback. Complejidad: {analysis.complexity_score:.1f}/10. Todos los parámetros de calidad activados.",
            "improvements": [
                f"Layer height: {layer_height}mm basado en análisis de detalles",
                f"Velocidad ajustada a {profile['print_speed']}mm/s por complejidad",
                f"Soportes: {profile['support_type']}",
                "G-code resolution: 0.005mm para curvas suaves",
                "Extra perimeters activados para eliminar gaps",
                "Gap fill activado para espacios finos",
                "Perimeter generator: arachne para mejor detalle"
            ],
            "warnings": [
                "Perfil generado sin IA - considera revisar manualmente",
                "OpenAI no disponible - usando heurísticas básicas con parámetros de calidad"
            ],
            "ai_confidence": 0.5  # Baja confianza para fallback
        }
