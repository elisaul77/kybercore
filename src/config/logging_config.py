"""
Configuración de logging para KyberCore.
Los logs se escriben tanto a consola como a archivos en ./logs/
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_logging(service_name: str = "kybercore", log_level: str = "INFO"):
    """
    Configura el sistema de logging para escribir a consola y archivos.
    
    Args:
        service_name: Nombre del servicio (kybercore o apislicer)
        log_level: Nivel de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Crear carpeta de logs si no existe
    log_dir = Path("/app/logs")
    log_dir.mkdir(exist_ok=True)
    
    # Archivo de log con timestamp
    log_file = log_dir / f"{service_name}.log"
    
    # Configurar formato de logs
    log_format = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Handler para archivo con rotación (10MB, 3 archivos)
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=3,
        encoding='utf-8'
    )
    file_handler.setFormatter(log_format)
    file_handler.setLevel(getattr(logging, log_level))
    
    # Handler para consola (mantener output actual)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_format)
    console_handler.setLevel(getattr(logging, log_level))
    
    # Configurar root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level))
    
    # Limpiar handlers existentes para evitar duplicados
    root_logger.handlers.clear()
    
    # Agregar handlers
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Log de inicio
    root_logger.info(f"📋 Logging configurado para {service_name}")
    root_logger.info(f"📁 Logs guardándose en: {log_file}")
    root_logger.info(f"🔄 Rotación: 10MB × 3 archivos")
    
    return root_logger

def get_logger(name: str):
    """Obtiene un logger con el nombre especificado"""
    return logging.getLogger(name)
