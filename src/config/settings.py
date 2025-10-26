"""
KyberCore Configuration Settings
Maneja la configuración centralizada de la aplicación.
"""
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

# Base directory del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Configuración centralizada de KyberCore"""
    
    # === API Keys ===
    OPENAI_API_KEY: str
    
    # === OpenAI Configuration ===
    OPENAI_MODEL: str = "gpt-3.5-turbo-0125"  # GPT-3.5 Turbo: estable y probado
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 2048
    OPENAI_VERBOSITY: str = "medium"  # GPT-5 specific: low, medium, high
    OPENAI_REASONING_EFFORT: str = "medium"  # GPT-5 specific: low, medium, high
    
    # === STL Analysis Thresholds ===
    STL_COMPLEXITY_THRESHOLD_FACES: int = 50000  # Faces per cm³
    STL_FINE_DETAIL_THRESHOLD: float = 0.3  # mm
    STL_MODERATE_DETAIL_THRESHOLD: float = 0.8  # mm
    STL_SEVERE_OVERHANG_ANGLE: float = 60.0  # degrees
    STL_MODERATE_OVERHANG_ANGLE: float = 45.0  # degrees
    
    # === Profile Optimization ===
    MIN_LAYER_HEIGHT: float = 0.08  # mm
    MAX_LAYER_HEIGHT: float = 0.32  # mm
    MIN_SPEED: int = 20  # mm/s
    MAX_SPEED: int = 250  # mm/s
    MIN_TEMPERATURE: int = 180  # °C
    MAX_TEMPERATURE: int = 280  # °C
    
    # === Orca Slicer Base Profiles ===
    ORCA_PROFILES_DIR: Path = BASE_DIR / "APISLICER" / "config"
    ORCA_PRODUCTION_PROFILE: str = "perfil produccion/0.20mm Standard @Creality Ender3V3SE 0.4 - PLA.json"
    ORCA_QUALITY_PROFILES_DIR: str = "perfiles adicionales"
    
    # === Printer Defaults ===
    DEFAULT_NOZZLE_DIAMETER: float = 0.4  # mm
    DEFAULT_BED_SIZE_X: int = 220  # mm
    DEFAULT_BED_SIZE_Y: int = 220  # mm
    DEFAULT_MAX_Z: int = 250  # mm
    
    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "allow"  # Permite variables extra del .env sin fallar


# Singleton instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Obtiene la instancia singleton de Settings"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# Convenience exports
settings = get_settings()
