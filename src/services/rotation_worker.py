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
        plating_config: Optional[Dict[str, Any]] = None
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
            
            # 🎨 AUTO-PLATING: Combinar múltiples piezas en un solo plato si está habilitado
            files_to_process = normalized_files  # Por defecto, procesar todos los archivos individualmente
            plating_enabled = plating_config and plating_config.get('enabled', False)
            combined_stl_path = None
            
            if plating_enabled and len(normalized_files) > 1:
                logger.info(f"🎨 Auto-Plating HABILITADO: Intentando combinar {len(normalized_files)} piezas")
                
                # Buscar las rutas absolutas de los archivos STL
                stl_paths = []
                for filename in normalized_files:
                    stl_path = find_stl_file_path(filename, session_id)
                    if stl_path and Path(stl_path).exists():
                        stl_paths.append(stl_path)
                    else:
                        logger.warning(f"⚠️  No se encontró el archivo STL: {filename}")
                
                if len(stl_paths) >= 2:
                    # Extraer configuración de plating
                    bed_size = profile_config.get('bed_size', [220.0, 220.0])
                    algorithm = plating_config.get('algorithm', 'bin-packing')
                    spacing = plating_config.get('spacing', 3.0)
                    # optimize_rotation se podría implementar en el futuro
                    
                    logger.info(f"🎨 Configuración: bed={bed_size}, algoritmo={algorithm}, spacing={spacing}mm")
                    
                    # Llamar al servicio de plating (sin optimize_rotation por ahora)
                    success, message, metadata = plating_service.combine_stl_files(
                        stl_files=stl_paths,
                        output_path=str(session_dir / "combined_plating.stl"),
                        bed_size=tuple(bed_size),
                        spacing=spacing,
                        algorithm=algorithm
                    )
                    
                    if success:
                        combined_stl_path = str(session_dir / "combined_plating.stl")
                        files_to_process = ["combined_plating.stl"]  # Procesar solo el archivo combinado
                        
                        # Actualizar el TaskStatus para reflejar que es 1 archivo combinado
                        self.tasks[task_id].progress.total_files = 1
                        
                        logger.info(f"✅ Plating exitoso: {message}")
                        logger.info(f"📊 Metadata: {metadata}")
                        
                        # Guardar info de plating en la sesión
                        session_data = load_wizard_session(session_id)
                        if session_data:
                            session_data["plating_info"] = {
                                "enabled": True,
                                "original_files": normalized_files,
                                "combined_file": "combined_plating.stl",
                                "algorithm": algorithm,
                                "metadata": metadata,
                                "message": message
                            }
                            save_wizard_session(session_id, session_data)
                    else:
                        logger.error(f"❌ Error en plating: {message}")
                        logger.warning(f"⚠️  Continuando con procesamiento individual de archivos")
                        # Si falla el plating, continuar con procesamiento individual
                else:
                    logger.warning(f"⚠️  No se encontraron suficientes archivos STL válidos para plating")
            elif plating_enabled and len(normalized_files) == 1:
                logger.info(f"ℹ️  Plating habilitado pero solo hay 1 archivo, procesando individualmente")
            
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
                            task_id=task_id
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
        task_id: str
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
                    
                    # Ahora sí buscar el archivo STL
                    original_path = find_stl_file_path(project, filename)
                    if not original_path or not Path(original_path).exists():
                        raise FileNotFoundError(f"Archivo STL no encontrado: {filename}")
                    
                    with open(original_path, 'rb') as f:
                        file_bytes = f.read()
                    
                    logger.info(f"   ✓ Archivo leído: {len(file_bytes)} bytes")
            except Exception as e:
                error_msg = f"Error leyendo archivo: {str(e)}"
                logger.error(f"   ✗ {error_msg}")
                return FileProcessingResult(
                    filename=filename,
                    success=False,
                    error=error_msg
                )
            
            # 2. Aplicar auto-rotación si está habilitada
            rotation_info = None
            if rotation_config.get("enabled", False):
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
                logger.info(f"   ○ Auto-rotación deshabilitada")
            
            # 3. Laminar archivo (rotado o original)
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
                
                logger.info(f"   ✓ G-code generado: {len(gcode_bytes)} bytes")
                
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
            
            # Calcular tiempo de procesamiento
            processing_time = time.time() - file_start_time
            
            logger.info(f"   ✅ Archivo completado en {processing_time:.2f}s")
            
            return FileProcessingResult(
                filename=filename,
                success=True,
                rotated=rotation_info is not None and rotation_info.get("applied", False),
                rotation_info=rotation_info,
                gcode_path=str(gcode_path),
                gcode_size=len(gcode_bytes),
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
                    data.add_field('method', config.get('method', 'auto'))
                    data.add_field('improvement_threshold', str(config.get('improvement_threshold', 5.0)))
                    data.add_field('max_iterations', str(config.get('max_iterations', 50)))
                    data.add_field('learning_rate', str(config.get('learning_rate', 0.1)))
                    data.add_field('rotation_step', str(config.get('rotation_step', 15)))
                    data.add_field('max_rotations', str(config.get('max_rotations', 24)))
                    
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
            profile_config: Configuración del perfil de laminado
            
        Returns:
            Bytes del archivo G-code generado
        """
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    data = aiohttp.FormData()
                    data.add_field('file', file_bytes, filename=filename, content_type='application/octet-stream')
                    data.add_field('custom_profile', profile_config.get('job_id', ''))
                    
                    timeout = aiohttp.ClientTimeout(total=180)
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
