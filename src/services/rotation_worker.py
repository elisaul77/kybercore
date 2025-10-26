"""
Rotation Worker Service
Procesa archivos STL en batch: rotación + laminado de forma asíncrona y paralela
Implementa retry logic, manejo de errores robusto y observabilidad
"""

import asyncio
import aiohttp
import json
import time
import uuid
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from src.models.task_models import (
    TaskStatus, TaskStatusEnum, TaskProgress, FileProcessingResult
)
from src.controllers.print_flow_controller import (
    load_wizard_session, save_wizard_session, find_stl_file_path
)
from src.services.plating_service import plating_service
import logging

logger = logging.getLogger(__name__)


class RotationWorker:
    """
    Worker que maneja el procesamiento batch de archivos STL.
    Implementa paralelización, retry logic y manejo de errores robusto.
    """
    
    def __init__(self, max_concurrent: int = 3, max_retries: int = 3, retry_delay: int = 2):
        """
        Args:
            max_concurrent: Número máximo de archivos a procesar simultáneamente
            max_retries: Número de reintentos para operaciones fallidas
            retry_delay: Segundos de espera entre reintentos
        """
        self.max_concurrent = max_concurrent
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent)
        self.tasks: Dict[str, TaskStatus] = {}
        
        logger.info(f"RotationWorker inicializado: max_concurrent={max_concurrent}, max_retries={max_retries}")
    
    async def process_batch(
        self, 
        task_id: str,
        session_id: str,
        files: List[str],
        rotation_config: Dict[str, Any],
        profile_config: Dict[str, Any],
        plating_config: Optional[Dict[str, Any]] = None,
        enable_gcode_generation: bool = True  # 🆕 Nuevo parámetro
    ) -> None:
        """
        Procesa múltiples archivos en paralelo con control de concurrencia.
        Soporta auto-plating para combinar múltiples piezas en un solo plato.
        
        Args:
            task_id: ID único de la tarea
            session_id: ID de sesión del wizard
            files: Lista de nombres de archivos a procesar
            rotation_config: Configuración de auto-rotación
            profile_config: Configuración del perfil de laminado
            plating_config: (Opcional) Configuración de auto-plating para combinar piezas
        """
        start_time = time.time()
        
        try:
            logger.info(f"📦 Iniciando procesamiento batch: task_id={task_id}, archivos={len(files)}")
            
            # Normalizar lista de archivos (puede venir como strings o dicts)
            normalized_files = []
            for f in files:
                if isinstance(f, str):
                    normalized_files.append(f)
                elif isinstance(f, dict):
                    # Si viene como dict, extraer el nombre del archivo
                    normalized_files.append(f.get('nombre', f.get('filename', f.get('name', str(f)))))
                else:
                    logger.warning(f"⚠️  Tipo de archivo no reconocido: {type(f)}, usando str()")
                    normalized_files.append(str(f))
            
            logger.info(f"📋 Archivos normalizados: {normalized_files}")
            
            # Crear TaskStatus inicial
            self.tasks[task_id] = TaskStatus(
                task_id=task_id,
                session_id=session_id,
                status=TaskStatusEnum.PROCESSING,
                progress=TaskProgress(
                    total_files=len(normalized_files),
                    completed=0,
                    failed=0,
                    in_progress=0,
                    percentage=0.0
                ),
                created_at=datetime.now(),
                started_at=datetime.now()
            )
            
            # Crear directorio temporal para la sesión
            session_dir = Path(f"/tmp/kybercore_processing/{session_id}")
            session_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"📁 Directorio temporal creado: {session_dir}")
            
            # 🎨 FLUJO OPTIMIZADO: Auto-Rotación + Auto-Plating
            # 1. Si rotation y plating están habilitados → rotar cada pieza ANTES de combinar
            # 2. Si solo rotation → rotar y procesar individualmente  
            # 3. Si solo plating → combinar originales directamente
            
            files_to_process = normalized_files  # Por defecto, procesar todos los archivos individualmente
            plating_enabled = plating_config and plating_config.get('enabled', False)
            rotation_enabled = rotation_config.get('enabled', False)
            combined_stl_path = None
            
            # 🔄 PRE-PROCESAMIENTO: Aplicar auto-rotación a cada pieza si está habilitado (ANTES del plating)
            if rotation_enabled and len(normalized_files) >= 1:
                logger.info(f"🔄 Auto-Rotación HABILITADA: Pre-procesando {len(normalized_files)} piezas")
                
                for filename in normalized_files:
                    try:
                        # Leer archivo original
                        stl_path = find_stl_file_path(filename, session_id)
                        if not stl_path or not Path(stl_path).exists():
                            logger.warning(f"⚠️  No se encontró: {filename}")
                            continue
                        
                        with open(stl_path, 'rb') as f:
                            file_bytes = f.read()
                        
                        logger.info(f"   🔄 Rotando {filename}...")
                        logger.info(f"   🎯 Config de rotación: threshold={rotation_config.get('improvement_threshold', 'NO DEFINIDO')}")
                        
                        # Aplicar rotación
                        rotated_bytes, rotation_info = await self._rotate_file_with_retry(
                            file_bytes=file_bytes,
                            filename=filename,
                            config=rotation_config
                        )
                        
                        if rotation_info and rotation_info.get("applied"):
                            # Guardar pieza rotada en session_dir
                            rotated_path = session_dir / f"rotated_{filename}"
                            with open(rotated_path, 'wb') as f:
                                f.write(rotated_bytes)
                            
                            logger.info(
                                f"   ✅ Rotada: {rotation_info['degrees']}, "
                                f"mejora: {rotation_info['improvement']:.2f}%"
                            )
                        else:
                            # Si no se aplicó rotación, copiar el original
                            rotated_path = session_dir / f"rotated_{filename}"
                            with open(rotated_path, 'wb') as f:
                                f.write(file_bytes)
                            logger.info(f"   ○ Sin mejora, usando original")
                    
                    except Exception as e:
                        logger.error(f"   ❌ Error rotando {filename}: {str(e)}")
                        # Copiar original si falla la rotación
                        try:
                            rotated_path = session_dir / f"rotated_{filename}"
                            with open(stl_path, 'rb') as f:
                                with open(rotated_path, 'wb') as f_out:
                                    f_out.write(f.read())
                        except:
                            pass
            
            # 🎨 AUTO-PLATING: Combinar múltiples piezas (rotadas o originales)
            if plating_enabled and len(normalized_files) > 1:
                logger.info(f"🎨 Auto-Plating HABILITADO: Combinando {len(normalized_files)} piezas")
                
                # Si se aplicó rotación, usar archivos rotados; sino, usar originales
                stl_paths = []
                for filename in normalized_files:
                    if rotation_enabled:
                        # Usar archivo rotado
                        rotated_path = session_dir / f"rotated_{filename}"
                        if rotated_path.exists():
                            stl_paths.append(str(rotated_path))
                            logger.info(f"   📦 Usando rotado: {filename}")
                        else:
                            # Fallback al original
                            stl_path = find_stl_file_path(filename, session_id)
                            if stl_path and Path(stl_path).exists():
                                stl_paths.append(stl_path)
                                logger.warning(f"   ⚠️  Usando original: {filename}")
                    else:
                        # Usar archivo original
                        stl_path = find_stl_file_path(filename, session_id)
                        if stl_path and Path(stl_path).exists():
                            stl_paths.append(stl_path)
                        else:
                            logger.warning(f"⚠️  No se encontró: {filename}")
                
                if len(stl_paths) >= 2:
                    # Configuración de plating
                    bed_size = profile_config.get('bed_size', [220.0, 220.0])
                    algorithm = plating_config.get('algorithm', 'bin-packing')
                    spacing = plating_config.get('spacing', 3.0)
                    enable_nesting = plating_config.get('enable_nesting', False)  # 🔬 Nesting 3D
                    
                    logger.info(f"🎨 Configuración: bed={bed_size}, algoritmo={algorithm}, spacing={spacing}mm, nesting={enable_nesting}")
                    
                    # Combinar archivos (ya rotados si rotation_enabled=True)
                    success, message, metadata = plating_service.combine_stl_files(
                        stl_files=stl_paths,
                        output_path=str(session_dir / "combined_plating.stl"),
                        bed_size=tuple(bed_size),
                        spacing=spacing,
                        algorithm=algorithm,
                        enable_nesting=enable_nesting
                    )
                    
                    if success:
                        combined_stl_path = str(session_dir / "combined_plating.stl")
                        files_to_process = ["combined_plating.stl"]  # Procesar solo el combinado
                        
                        # Actualizar TaskStatus
                        self.tasks[task_id].progress.total_files = 1
                        
                        logger.info(f"✅ Plating exitoso: {message}")
                        logger.info(f"📊 Metadata: {metadata}")
                        
                        # Guardar info en sesión
                        session_data = load_wizard_session(session_id)
                        if session_data:
                            session_data["plating_info"] = {
                                "enabled": True,
                                "rotation_applied_first": rotation_enabled,
                                "original_files": normalized_files,
                                "combined_file": "combined_plating.stl",
                                "algorithm": algorithm,
                                "metadata": metadata,
                                "message": message
                            }
                            save_wizard_session(session_id, session_data)
                    else:
                        logger.error(f"❌ Error en plating: {message}")
                        logger.warning(f"⚠️  Continuando con procesamiento individual")
                else:
                    logger.warning(f"⚠️  No hay suficientes archivos válidos para plating")
            elif plating_enabled and len(normalized_files) == 1:
                logger.info(f"ℹ️  Plating habilitado pero solo hay 1 archivo")
            
            # Procesar archivos en paralelo con semáforo para limitar concurrencia
            semaphore = asyncio.Semaphore(self.max_concurrent)
            
            async def process_with_semaphore(filename: str) -> FileProcessingResult:
                """Wrapper para controlar concurrencia"""
                async with semaphore:
                    # Actualizar contador de archivos en progreso
                    self.tasks[task_id].progress.in_progress += 1
                    
                    try:
                        result = await self._process_single_file(
                            filename=filename,
                            session_id=session_id,
                            session_dir=session_dir,
                            rotation_config=rotation_config,
                            profile_config=profile_config,
                            task_id=task_id,
                            enable_gcode_generation=enable_gcode_generation  # 🆕 Pasar parámetro
                        )
                        return result
                    finally:
                        # Decrementar contador al finalizar
                        self.tasks[task_id].progress.in_progress -= 1
            
            # Ejecutar en paralelo todas las tareas
            logger.info(f"🚀 Procesando {len(files_to_process)} archivos en paralelo (máx {self.max_concurrent} simultáneos)")
            results = await asyncio.gather(
                *[process_with_semaphore(f) for f in files_to_process],
                return_exceptions=True
            )
            
            # Procesar resultados
            successful_results = []
            failed_results = []
            
            for filename, result in zip(files_to_process, results):
                if isinstance(result, Exception):
                    # Excepción no capturada
                    error_msg = f"Error inesperado procesando {filename}: {str(result)}"
                    logger.error(error_msg)
                    failed_results.append(FileProcessingResult(
                        filename=filename,
                        success=False,
                        error=error_msg
                    ))
                    self.tasks[task_id].errors.append(error_msg)
                elif result.success:
                    successful_results.append(result)
                else:
                    failed_results.append(result)
                    if result.error:
                        self.tasks[task_id].errors.append(f"{filename}: {result.error}")
                
                # Actualizar progreso
                self.tasks[task_id].progress.completed = len(successful_results)
                self.tasks[task_id].progress.failed = len(failed_results)
                self.tasks[task_id].progress.percentage = (
                    (len(successful_results) + len(failed_results)) / len(files_to_process) * 100
                )
            
            # Actualizar sesión con resultados
            session_data = load_wizard_session(session_id)
            if session_data:
                # Construir resumen de procesamiento
                processing_summary = {
                    "total_files": len(files_to_process),
                    "successful": len(successful_results),
                    "failed": len(failed_results)
                }
                
                # Si se usó plating, agregar info adicional
                if plating_enabled and combined_stl_path:
                    processing_summary["plating_used"] = True
                    processing_summary["original_files_count"] = len(normalized_files)
                    processing_summary["combined_file"] = "combined_plating.stl"
                
                session_data["stl_processing"] = {
                    "task_id": task_id,
                    "successful": [r.dict() for r in successful_results],
                    "failed": [r.dict() for r in failed_results],
                    "processing_summary": processing_summary,
                    "completed_at": datetime.now().isoformat()
                }
                # ✅ IMPORTANTE: Marcar el paso como completado
                completed_steps = session_data.get("completed_steps", [])
                if "stl_processing" not in completed_steps:
                    session_data["completed_steps"] = completed_steps + ["stl_processing"]
                session_data["current_step"] = "validation"
                save_wizard_session(session_id, session_data)
            
            # Actualizar estado de la tarea
            self.tasks[task_id].status = TaskStatusEnum.COMPLETED
            self.tasks[task_id].results = successful_results + failed_results
            self.tasks[task_id].completed_at = datetime.now()
            
            elapsed = time.time() - start_time
            logger.info(
                f"✅ Procesamiento batch completado: "
                f"task_id={task_id}, "
                f"exitosos={len(successful_results)}, "
                f"fallidos={len(failed_results)}, "
                f"tiempo={elapsed:.2f}s"
            )
            
        except Exception as e:
            error_msg = f"Error crítico en procesamiento batch: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            self.tasks[task_id].status = TaskStatusEnum.FAILED
            self.tasks[task_id].error_message = error_msg
            self.tasks[task_id].completed_at = datetime.now()
    
    async def _process_single_file(
        self,
        filename: str,
        session_id: str,
        session_dir: Path,
        rotation_config: Dict[str, Any],
        profile_config: Dict[str, Any],
        task_id: str,
        enable_gcode_generation: bool = True  # Nuevo parámetro
    ) -> FileProcessingResult:
        """
        Procesa un archivo individual: rotar → laminar → guardar.
        
        Args:
            filename: Nombre del archivo STL
            session_id: ID de sesión
            session_dir: Directorio temporal para guardar archivos
            rotation_config: Configuración de rotación
            profile_config: Configuración de perfil
            task_id: ID de la tarea (para logging)
            
        Returns:
            FileProcessingResult con el resultado del procesamiento
        """
        file_start_time = time.time()
        
        try:
            logger.info(f"📄 Procesando archivo: {filename} (task: {task_id})")
            
            # Normalizar configuraciones (pueden venir como string, dict, o BaseModel)
            if isinstance(rotation_config, str):
                try:
                    import json
                    rotation_config = json.loads(rotation_config)
                except:
                    rotation_config = {"enabled": False}
            elif not isinstance(rotation_config, dict):
                # Si es un modelo Pydantic, convertir a dict
                rotation_config = dict(rotation_config) if hasattr(rotation_config, '__dict__') else {"enabled": False}
            
            if isinstance(profile_config, str):
                try:
                    import json
                    profile_config = json.loads(profile_config)
                except:
                    profile_config = {}
            elif not isinstance(profile_config, dict):
                profile_config = dict(profile_config) if hasattr(profile_config, '__dict__') else {}
            
            logger.info(f"   ✓ Configuraciones normalizadas: rotation_enabled={rotation_config.get('enabled', False)}")
            
            # 1. Leer archivo original
            try:
                # Cargar sesión para obtener información del proyecto
                session_data = load_wizard_session(session_id)
                if not session_data:
                    raise ValueError(f"Sesión no encontrada: {session_id}")
                
                # **Caso especial: Archivo combinado de plating**
                if filename == "combined_plating.stl":
                    # El archivo está en session_dir, no en el proyecto
                    combined_path = session_dir / "combined_plating.stl"
                    if not combined_path.exists():
                        raise FileNotFoundError(f"Archivo combinado no encontrado: {combined_path}")
                    
                    with open(combined_path, 'rb') as f:
                        file_bytes = f.read()
                    
                    logger.info(f"   ✓ Archivo combinado leído: {len(file_bytes)} bytes")
                
                else:
                    # **Caso normal: Archivo original del proyecto**
                    # Obtener project_id y cargar proyecto
                    project_id = session_data.get("project_id")
                    if not project_id:
                        raise ValueError(f"project_id no encontrado en sesión {session_id}")
                    
                    logger.info(f"   📋 Buscando proyecto con ID: {project_id} (tipo: {type(project_id)})")
                    
                    # Cargar información del proyecto
                    from src.controllers.gallery_controller import load_projects_data
                    projects_data = load_projects_data()
                    projects = projects_data.get("proyectos", [])  # Usar "proyectos" (español)
                    
                    logger.info(f"   📊 Total proyectos disponibles: {len(projects)}")
                    if len(projects) > 0:
                        logger.info(f"   📊 IDs disponibles: {[p.get('id') for p in projects[:5]]}")
                    
                    project = next((p for p in projects if p.get("id") == int(project_id)), None)
                    
                    if not project:
                        raise ValueError(f"Proyecto {project_id} no encontrado")
                    
                    # Ahora sí buscar el archivo (puede ser STL, 3MF, etc.)
                    original_path = find_stl_file_path(project, filename)
                    if not original_path or not Path(original_path).exists():
                        raise FileNotFoundError(f"Archivo 3D no encontrado: {filename}")
                    
                    with open(original_path, 'rb') as f:
                        file_bytes = f.read()
                    
                    logger.info(f"   ✓ Archivo leído: {len(file_bytes)} bytes")
                    
                    # 🔄 Si es archivo 3MF, convertirlo a STL para el slicer
                    if filename.lower().endswith('.3mf'):
                        logger.info(f"   🔄 Convirtiendo 3MF a STL...")
                        try:
                            import trimesh
                            import io
                            
                            # Cargar el archivo 3MF
                            mesh = trimesh.load(io.BytesIO(file_bytes), file_type='3mf')
                            
                            # Si es una escena con múltiples objetos, combinarlos
                            if isinstance(mesh, trimesh.Scene):
                                meshes = [geom for geom in mesh.geometry.values()]
                                if len(meshes) > 1:
                                    mesh = trimesh.util.concatenate(meshes)
                                elif len(meshes) == 1:
                                    mesh = meshes[0]
                                else:
                                    raise ValueError("No se encontraron geometrías en el archivo 3MF")
                            
                            # Convertir a STL
                            stl_bytes = trimesh.exchange.stl.export_stl(mesh)
                            file_bytes = stl_bytes
                            
                            # Actualizar el nombre del archivo para el slicer
                            filename = filename.replace('.3mf', '.stl')
                            
                            logger.info(f"   ✅ Conversión 3MF→STL exitosa: {len(file_bytes)} bytes")
                        except Exception as conv_error:
                            logger.error(f"   ❌ Error convirtiendo 3MF a STL: {conv_error}")
                            raise ValueError(f"No se pudo convertir el archivo 3MF: {conv_error}")
            except Exception as e:
                error_msg = f"Error leyendo archivo: {str(e)}"
                logger.error(f"   ✗ {error_msg}")
                return FileProcessingResult(
                    filename=filename,
                    success=False,
                    error=error_msg
                )
            
            # 2. Aplicar auto-rotación si está habilitada
            # ⚠️ IMPORTANTE: Si el archivo es combined_plating.stl, NO rotar
            # (las piezas individuales ya fueron rotadas antes de combinarse)
            rotation_info = None
            skip_rotation = (filename == "combined_plating.stl")
            
            if rotation_config.get("enabled", False) and not skip_rotation:
                try:
                    logger.info(f"   🔄 Aplicando auto-rotación (umbral: {rotation_config.get('improvement_threshold', 5)}%)")
                    
                    rotated_bytes, rotation_info = await self._rotate_file_with_retry(
                        file_bytes=file_bytes,
                        filename=filename,
                        config=rotation_config
                    )
                    
                    if rotation_info and rotation_info.get("applied"):
                        # Guardar archivo rotado
                        rotated_path = session_dir / f"rotated_{filename}"
                        with open(rotated_path, 'wb') as f:
                            f.write(rotated_bytes)
                        
                        file_to_slice = rotated_bytes
                        logger.info(
                            f"   ✓ Rotación aplicada: {rotation_info['degrees']}, "
                            f"mejora: {rotation_info['improvement']:.2f}%"
                        )
                    else:
                        file_to_slice = file_bytes
                        logger.info(f"   ○ Rotación no aplicada (mejora insuficiente)")
                        
                except Exception as e:
                    error_msg = f"Error en rotación: {str(e)}"
                    logger.warning(f"   ⚠ {error_msg}, usando archivo original")
                    file_to_slice = file_bytes
                    rotation_info = {"applied": False, "error": error_msg}
            else:
                file_to_slice = file_bytes
                if skip_rotation:
                    logger.info(f"   ○ Archivo combinado (piezas ya rotadas individualmente)")
                else:
                    logger.info(f"   ○ Auto-rotación deshabilitada")
            
            # 3. Laminar archivo (rotado o original) - OPCIONAL
            gcode_path = None
            gcode_size = 0
            
            if enable_gcode_generation:
                try:
                    logger.info(f"   ⚙️  Laminando archivo...")
                    
                    gcode_bytes = await self._slice_file_with_retry(
                        file_bytes=file_to_slice,
                        filename=filename,
                        profile_config=profile_config
                    )
                    
                    # Guardar G-code
                    gcode_filename = filename.replace('.stl', '.gcode')
                    gcode_path = session_dir / f"gcode_{session_id}_{gcode_filename}"
                    
                    with open(gcode_path, 'wb') as f:
                        f.write(gcode_bytes)
                    
                    gcode_size = len(gcode_bytes)
                    logger.info(f"   ✓ G-code generado: {gcode_size} bytes")
                    
                except Exception as e:
                    error_msg = f"Error laminando archivo: {str(e)}"
                    logger.error(f"   ✗ {error_msg}")
                    return FileProcessingResult(
                        filename=filename,
                        success=False,
                        rotated=rotation_info is not None and rotation_info.get("applied", False),
                        rotation_info=rotation_info,
                        error=error_msg
                    )
            else:
                logger.info(f"   ⏸️  Laminación omitida (enable_gcode_generation=False)")
            
            # Calcular tiempo de procesamiento
            processing_time = time.time() - file_start_time
            
            logger.info(f"   ✅ Archivo completado en {processing_time:.2f}s")
            
            return FileProcessingResult(
                filename=filename,
                success=True,
                rotated=rotation_info is not None and rotation_info.get("applied", False),
                rotation_info=rotation_info,
                gcode_path=str(gcode_path) if gcode_path else None,
                gcode_size=gcode_size,
                processing_time_seconds=processing_time
            )
            
        except Exception as e:
            error_msg = f"Error inesperado: {str(e)}"
            logger.error(f"   ✗ {error_msg}", exc_info=True)
            return FileProcessingResult(
                filename=filename,
                success=False,
                error=error_msg
            )
    
    async def _rotate_file_with_retry(
        self, 
        file_bytes: bytes, 
        filename: str, 
        config: Dict[str, Any]
    ) -> Tuple[bytes, Optional[Dict[str, Any]]]:
        """
        Llama a APISLICER para rotar el archivo con retry logic.
        
        Args:
            file_bytes: Contenido del archivo STL
            filename: Nombre del archivo
            config: Configuración de rotación
            
        Returns:
            Tupla (bytes del archivo rotado, info de rotación)
        """
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    # Preparar FormData
                    data = aiohttp.FormData()
                    data.add_field('file', file_bytes, filename=filename, content_type='application/octet-stream')
                    
                    # Agregar parámetros de configuración
                    # IMPORTANTE: Usar 'in' para detectar si la clave existe, no confiar solo en .get()
                    # porque improvement_threshold=0 es un valor válido y debe respetarse
                    threshold = config.get('improvement_threshold', 5.0) if 'improvement_threshold' in config else 5.0
                    
                    data.add_field('method', config.get('method', 'auto'))
                    data.add_field('improvement_threshold', str(threshold))
                    data.add_field('max_iterations', str(config.get('max_iterations', 50)))
                    data.add_field('learning_rate', str(config.get('learning_rate', 0.1)))
                    data.add_field('rotation_step', str(config.get('rotation_step', 15)))
                    data.add_field('max_rotations', str(config.get('max_rotations', 24)))
                    
                    logger.debug(f"🎯 Enviando threshold a APISLICER: {threshold}")
                    
                    # Llamar a APISLICER con timeout
                    timeout = aiohttp.ClientTimeout(total=120)
                    async with session.post(
                        'http://apislicer:8000/auto-rotate-upload',
                        data=data,
                        timeout=timeout
                    ) as response:
                        if response.status == 200:
                            rotated_bytes = await response.read()
                            
                            # Extraer metadata de headers
                            rotation_info = {
                                "applied": response.headers.get('X-Rotation-Applied', 'false').lower() == 'true',
                                "degrees": json.loads(response.headers.get('X-Rotation-Degrees', '[0,0,0]')),
                                "improvement": float(response.headers.get('X-Improvement-Percentage', '0')),
                                "contact_area": float(response.headers.get('X-Contact-Area', '0')),
                                "original_area": float(response.headers.get('X-Original-Area', '0'))
                            }
                            
                            return rotated_bytes, rotation_info
                        else:
                            error_text = await response.text()
                            raise Exception(f"APISLICER HTTP {response.status}: {error_text}")
            
            except asyncio.TimeoutError as e:
                last_exception = e
                logger.warning(
                    f"      ⏱️  Timeout rotando {filename}, "
                    f"intento {attempt+1}/{self.max_retries}"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
            
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"      ⚠️  Error rotando {filename}: {str(e)}, "
                    f"intento {attempt+1}/{self.max_retries}"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
        
        # Si todos los intentos fallaron, lanzar excepción
        raise Exception(f"Falló después de {self.max_retries} intentos: {str(last_exception)}")
    
    async def _slice_file_with_retry(
        self, 
        file_bytes: bytes, 
        filename: str, 
        profile_config: Dict[str, Any]
    ) -> bytes:
        """
        Llama a APISLICER para laminar el archivo con retry logic.
        
        Args:
            file_bytes: Contenido del archivo STL (rotado o original)
            filename: Nombre del archivo
            profile_config: Configuración del perfil de laminado con parámetros de IA
            
        Returns:
            Bytes del archivo G-code generado
        """
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    data = aiohttp.FormData()
                    data.add_field('file', file_bytes, filename=filename, content_type='application/octet-stream')
                    
                    # 🔥 ENVIAR TODOS LOS PARÁMETROS DE CALIDAD
                    # Extraer parámetros del perfil de IA o usar defaults optimizados
                    
                    # === PARÁMETROS BÁSICOS ===
                    layer_height = profile_config.get('layer_height', 0.2)
                    fill_density = profile_config.get('fill_density', 20)
                    nozzle_temp = profile_config.get('nozzle_temperature', 210)
                    bed_temp = profile_config.get('bed_temperature', 60)
                    
                    # === PARÁMETROS DE IA ===
                    infill_pattern = profile_config.get('infill_pattern', 'honeycomb')
                    support_type = profile_config.get('support_type', 'none')
                    support_density = profile_config.get('support_density', 15)
                    brim_width = profile_config.get('brim_width', 0)
                    perimeters = profile_config.get('perimeters', 3)
                    first_layer_height = profile_config.get('first_layer_height', layer_height * 1.2)
                    print_speed = profile_config.get('print_speed', 60)
                    
                    # === PARÁMETROS DE CALIDAD - FASE 1 ===
                    gcode_resolution = profile_config.get('gcode_resolution', 0.005)
                    external_perimeter_speed = profile_config.get('external_perimeter_speed', 25)
                    top_solid_layers = profile_config.get('top_solid_layers', 6)
                    bottom_solid_layers = profile_config.get('bottom_solid_layers', 6)
                    extra_perimeters = profile_config.get('extra_perimeters', True)
                    gap_fill_enabled = profile_config.get('gap_fill_enabled', True)
                    gap_fill_speed = profile_config.get('gap_fill_speed', 15)
                    seam_position = profile_config.get('seam_position', 'aligned')
                    
                    # === PARÁMETROS DE CALIDAD - FASE 2 ===
                    # NOTA: elephant_foot_compensation removido - no soportado en PrusaSlicer CLI
                    avoid_crossing_perimeters = profile_config.get('avoid_crossing_perimeters', True)
                    perimeter_generator = profile_config.get('perimeter_generator', 'arachne')
                    infill_overlap = profile_config.get('infill_overlap', 30.0)
                    
                    # === PUENTES Y VOLADIZOS ===
                    bridge_speed = profile_config.get('bridge_speed', 50)
                    bridge_flow_ratio = profile_config.get('bridge_flow_ratio', 0.9)
                    bridge_fan_speed = profile_config.get('bridge_fan_speed', 100)
                    overhangs = profile_config.get('overhangs', True)
                    enable_dynamic_overhang_speeds = profile_config.get('enable_dynamic_overhang_speeds', True)
                    
                    # === VENTILADOR ===
                    min_fan_speed = profile_config.get('min_fan_speed', 70)
                    max_fan_speed = profile_config.get('max_fan_speed', 100)
                    disable_fan_first_layers = profile_config.get('disable_fan_first_layers', 1)
                    
                    # === EXTRUSIÓN AVANZADA ===
                    external_perimeter_extrusion_width = profile_config.get('external_perimeter_extrusion_width', 105.0)
                    top_infill_extrusion_width = profile_config.get('top_infill_extrusion_width', 105.0)
                    
                    # === PRECISIÓN ===
                    thin_walls = profile_config.get('thin_walls', True)
                    resolution = profile_config.get('resolution', 0.0)
                    
                    # === ENVIAR PARÁMETROS BÁSICOS ===
                    data.add_field('layer_height', str(layer_height))
                    data.add_field('fill_density', str(int(fill_density)))
                    data.add_field('nozzle_temp', str(int(nozzle_temp)))
                    data.add_field('bed_temp', str(int(bed_temp)))
                    
                    # === ENVIAR PARÁMETROS DE IA ===
                    data.add_field('infill_pattern', infill_pattern)
                    data.add_field('support_type', support_type)
                    data.add_field('support_density', str(int(support_density)))
                    data.add_field('brim_width', str(float(brim_width)))
                    data.add_field('perimeters', str(int(perimeters)))
                    data.add_field('first_layer_height', str(first_layer_height))
                    data.add_field('print_speed', str(int(print_speed)))
                    
                    # === ENVIAR PARÁMETROS DE CALIDAD FASE 1 ===
                    data.add_field('gcode_resolution', str(gcode_resolution))
                    data.add_field('external_perimeter_speed', str(int(external_perimeter_speed)))
                    data.add_field('top_solid_layers', str(int(top_solid_layers)))
                    data.add_field('bottom_solid_layers', str(int(bottom_solid_layers)))
                    data.add_field('extra_perimeters', str(extra_perimeters).lower())
                    data.add_field('gap_fill_enabled', str(gap_fill_enabled).lower())
                    data.add_field('gap_fill_speed', str(int(gap_fill_speed)))
                    data.add_field('seam_position', seam_position)
                    
                    # === ENVIAR PARÁMETROS DE CALIDAD FASE 2 ===
                    # elephant_foot_compensation removido - no soportado
                    data.add_field('avoid_crossing_perimeters', str(avoid_crossing_perimeters).lower())
                    data.add_field('perimeter_generator', perimeter_generator)
                    data.add_field('infill_overlap', str(infill_overlap))
                    
                    # === ENVIAR PUENTES Y VOLADIZOS ===
                    data.add_field('bridge_speed', str(int(bridge_speed)))
                    data.add_field('bridge_flow_ratio', str(bridge_flow_ratio))
                    data.add_field('bridge_fan_speed', str(int(bridge_fan_speed)))
                    data.add_field('overhangs', str(overhangs).lower())
                    data.add_field('enable_dynamic_overhang_speeds', str(enable_dynamic_overhang_speeds).lower())
                    
                    # === ENVIAR VENTILADOR ===
                    data.add_field('min_fan_speed', str(int(min_fan_speed)))
                    data.add_field('max_fan_speed', str(int(max_fan_speed)))
                    data.add_field('disable_fan_first_layers', str(int(disable_fan_first_layers)))
                    
                    # === ENVIAR EXTRUSIÓN AVANZADA ===
                    data.add_field('external_perimeter_extrusion_width', str(external_perimeter_extrusion_width))
                    data.add_field('top_infill_extrusion_width', str(top_infill_extrusion_width))
                    
                    # === ENVIAR PRECISIÓN ===
                    data.add_field('thin_walls', str(thin_walls).lower())
                    data.add_field('resolution', str(resolution))
                    
                    # Log detallado de parámetros
                    logger.info(f"   📤 Enviando TODOS los parámetros a APISLICER:")
                    logger.info(f"      � Capas: {layer_height}mm / {first_layer_height}mm")
                    logger.info(f"      🔹 Perímetros: {perimeters} + Top: {top_solid_layers} + Bottom: {bottom_solid_layers}")
                    logger.info(f"      � Infill: {fill_density}% ({infill_pattern}) + Overlap: {infill_overlap}%")
                    logger.info(f"      � Velocidades: ext={external_perimeter_speed}, print={print_speed}")
                    logger.info(f"      🎯 Calidad: gcode_res={gcode_resolution}, seam={seam_position}")
                    logger.info(f"      🌉 Puentes: speed={bridge_speed}, flow={bridge_flow_ratio}")
                    logger.info(f"      💨 Ventilador: {min_fan_speed}-{max_fan_speed}%")
                    logger.info(f"      🔹 brim={brim_width}mm, perimeters={perimeters}")
                    logger.info(f"      🔹 speed={print_speed}mm/s, nozzle={nozzle_temp}°C, bed={bed_temp}°C")
                    
                    timeout = aiohttp.ClientTimeout(total=180)
                    
                    # Log adicional antes de enviar
                    logger.info("=" * 80)
                    logger.info("PASO 3: ENVIANDO PARAMETROS A APISLICER")
                    logger.info(f"layer_height={layer_height}, perimeters={perimeters}, infill={fill_density}%")
                    logger.info(f"gcode_resolution={gcode_resolution}, bridge_speed={bridge_speed}")
                    logger.info("=" * 80)
                    
                    async with session.post(
                        'http://apislicer:8000/slice',
                        data=data,
                        timeout=timeout
                    ) as response:
                        if response.status == 200:
                            return await response.read()
                        else:
                            error_text = await response.text()
                            raise Exception(f"APISLICER HTTP {response.status}: {error_text}")
            
            except asyncio.TimeoutError as e:
                last_exception = e
                logger.warning(
                    f"      ⏱️  Timeout laminando {filename}, "
                    f"intento {attempt+1}/{self.max_retries}"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
            
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"      ⚠️  Error laminando {filename}: {str(e)}, "
                    f"intento {attempt+1}/{self.max_retries}"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
        
        # Si todos los intentos fallaron, lanzar excepción
        raise Exception(f"Laminado falló después de {self.max_retries} intentos: {str(last_exception)}")
    
    def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        """
        Obtiene el estado actual de una tarea.
        
        Args:
            task_id: ID de la tarea
            
        Returns:
            TaskStatus si existe, None si no
        """
        return self.tasks.get(task_id)
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """
        Limpia tareas antiguas del registro para liberar memoria.
        
        Args:
            max_age_hours: Edad máxima en horas para mantener tareas
        """
        now = datetime.now()
        tasks_to_remove = []
        
        for task_id, task in self.tasks.items():
            if task.completed_at:
                age_hours = (now - task.completed_at).total_seconds() / 3600
                if age_hours > max_age_hours:
                    tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self.tasks[task_id]
        
        if tasks_to_remove:
            logger.info(f"🧹 Limpiadas {len(tasks_to_remove)} tareas antiguas")


# Instancia global del worker
# Se inicializa con configuración desde variables de entorno o valores por defecto
rotation_worker = RotationWorker(
    max_concurrent=int(os.getenv('ROTATION_WORKER_POOL_SIZE', '3')),
    max_retries=int(os.getenv('ROTATION_MAX_RETRIES', '3')),
    retry_delay=int(os.getenv('ROTATION_RETRY_DELAY', '2'))
)

logger.info("✅ RotationWorker global inicializado")
