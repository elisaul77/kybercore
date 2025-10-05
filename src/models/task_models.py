"""
Modelos de datos para tracking de tareas asíncronas
Utilizado por el RotationWorker para reportar progreso
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TaskStatusEnum(str, Enum):
    """Estados posibles de una tarea"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FileProcessingResult(BaseModel):
    """Resultado del procesamiento de un archivo individual"""
    filename: str
    success: bool
    rotated: bool = False
    rotation_info: Optional[Dict[str, Any]] = None
    gcode_path: Optional[str] = None
    gcode_size: Optional[int] = None
    error: Optional[str] = None
    processing_time_seconds: Optional[float] = None


class TaskProgress(BaseModel):
    """Progreso actual de una tarea"""
    total_files: int
    completed: int
    failed: int
    in_progress: int
    percentage: float
    
    @property
    def is_complete(self) -> bool:
        return self.completed + self.failed == self.total_files


class TaskStatus(BaseModel):
    """Estado completo de una tarea asíncrona"""
    task_id: str
    session_id: str
    status: TaskStatusEnum
    progress: TaskProgress
    results: List[FileProcessingResult] = []
    errors: List[str] = []
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    @property
    def elapsed_seconds(self) -> Optional[float]:
        """Calcula tiempo transcurrido desde inicio"""
        if self.started_at:
            end_time = self.completed_at or datetime.now()
            return (end_time - self.started_at).total_seconds()
        return None
    
    def to_dict(self) -> dict:
        """Convierte a diccionario para JSON response"""
        return {
            "task_id": self.task_id,
            "session_id": self.session_id,
            "status": self.status.value,
            "progress": {
                "total": self.progress.total_files,
                "completed": self.progress.completed,
                "failed": self.progress.failed,
                "in_progress": self.progress.in_progress,
                "percentage": round(self.progress.percentage, 2)
            },
            "results": [r.dict() for r in self.results] if self.status == TaskStatusEnum.COMPLETED else None,
            "errors": self.errors if self.errors else None,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "elapsed_seconds": self.elapsed_seconds,
            "error_message": self.error_message
        }


class ProcessWithRotationRequest(BaseModel):
    """Request para el endpoint unificado de procesamiento"""
    session_id: str
    rotation_config: Dict[str, Any]
    profile_config: Dict[str, Any]
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "wizard_1234567890_abc123",
                "rotation_config": {
                    "enabled": True,
                    "method": "auto",
                    "improvement_threshold": 3.0,
                    "max_iterations": 50,
                    "learning_rate": 0.1
                },
                "profile_config": {
                    "job_id": "job_1234567890_xyz789",
                    "printer_model": "ender3",
                    "material": "PLA",
                    "production_mode": "prototype_speed"
                }
            }
        }
