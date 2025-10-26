"""
AI Assistant Module for KyberCore
Proporciona análisis geométrico STL y optimización de perfiles con OpenAI.
"""
from src.services.ai_assistant.stl_analyzer import STLGeometryAnalyzer, STLAnalysisResult
from src.services.ai_assistant.openai_client import OpenAIProfileOptimizer

__all__ = [
    'STLGeometryAnalyzer',
    'STLAnalysisResult',
    'OpenAIProfileOptimizer'
]
