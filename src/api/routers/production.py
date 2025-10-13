"""Router de producción.

Endpoints para gestión de lotes de producción y seguimiento.
Usa el controlador de producción para lógica completa.
"""

from src.controllers.production_controller import router as production_controller_router

# Re-exportar el router del controlador
router = production_controller_router
