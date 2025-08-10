"""
Modelos de datos para consumibles (filamentos y materiales de impresión 3D)
Parte del sistema KyberCore - Orquestador inteligente de impresoras 3D
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

class FilamentType(Enum):
    """Tipos de filamento disponibles"""
    PLA = "PLA"
    ABS = "ABS"
    PETG = "PETG"
    TPU = "TPU"
    WOOD = "WOOD"
    METAL = "METAL"
    CARBON = "CARBON"
    NYLON = "NYLON"
    PC = "PC"
    PVA = "PVA"
    HIPS = "HIPS"

class FilamentBrand(Enum):
    """Marcas de filamento populares"""
    PRUSAMENT = "Prusament"
    HATCHBOX = "Hatchbox"
    OVERTURE = "Overture"
    SUNLU = "SUNLU"
    ESUN = "eSUN"
    POLYMAKER = "Polymaker"
    PROTOPASTA = "Proto-pasta"
    GENERIC = "Genérico"
    CUSTOM = "Personalizado"

class StockStatus(Enum):
    """Estados del stock de consumibles"""
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    ON_ORDER = "on_order"

class Consumable:
    """Modelo base para consumibles"""
    
    def __init__(self, consumable_id: str, name: str, consumable_type: str, 
                 quantity: float, unit: str, cost_per_unit: float = 0.0):
        self.id = consumable_id
        self.name = name
        self.type = consumable_type
        self.quantity = quantity
        self.unit = unit  # kg, g, m, etc.
        self.cost_per_unit = cost_per_unit
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        
    def to_dict(self) -> Dict[str, Any]:
        """Convierte el objeto a diccionario"""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "quantity": self.quantity,
            "unit": self.unit,
            "cost_per_unit": self.cost_per_unit,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class Filament(Consumable):
    """Modelo específico para filamentos"""
    
    def __init__(self, filament_id: str, name: str, filament_type: FilamentType,
                 color: str, brand: FilamentBrand, diameter: float = 1.75,
                 weight_kg: float = 1.0, remaining_weight: float = None,
                 cost_per_kg: float = 0.0, temperature_nozzle: int = 200,
                 temperature_bed: int = 60):
        
        super().__init__(filament_id, name, "filament", weight_kg, "kg", cost_per_kg)
        
        self.filament_type = filament_type
        self.color = color
        self.brand = brand
        self.diameter = diameter  # mm (1.75 o 3.0)
        self.weight_kg = weight_kg
        self.remaining_weight = remaining_weight if remaining_weight is not None else weight_kg
        self.temperature_nozzle = temperature_nozzle
        self.temperature_bed = temperature_bed
        
        # Metadatos adicionales
        self.spool_id = None
        self.purchase_date = None
        self.supplier = None
        self.storage_location = None
        self.notes = ""
        
    @property
    def usage_percentage(self) -> float:
        """Calcula el porcentaje usado del filamento"""
        if self.weight_kg <= 0:
            return 100.0
        used = self.weight_kg - self.remaining_weight
        return (used / self.weight_kg) * 100
    
    @property
    def remaining_percentage(self) -> float:
        """Calcula el porcentaje restante del filamento"""
        return 100.0 - self.usage_percentage
    
    @property
    def stock_status(self) -> StockStatus:
        """Determina el estado del stock basado en el peso restante"""
        if self.remaining_weight <= 0:
            return StockStatus.OUT_OF_STOCK
        elif self.remaining_percentage < 20:
            return StockStatus.LOW_STOCK
        else:
            return StockStatus.IN_STOCK
    
    @property
    def estimated_print_time(self) -> float:
        """Estima las horas de impresión restantes (aproximado)"""
        # Estimación: ~15g por hora de impresión promedio
        grams_remaining = self.remaining_weight * 1000
        return grams_remaining / 15
    
    def consume(self, amount_kg: float) -> bool:
        """Consume una cantidad de filamento"""
        if amount_kg <= self.remaining_weight:
            self.remaining_weight -= amount_kg
            self.updated_at = datetime.now()
            return True
        return False
    
    def add_stock(self, amount_kg: float):
        """Añade stock de filamento"""
        self.remaining_weight += amount_kg
        self.weight_kg = max(self.weight_kg, self.remaining_weight)
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte el objeto a diccionario con información específica de filamento"""
        base_dict = super().to_dict()
        base_dict.update({
            "filament_type": self.filament_type.value if isinstance(self.filament_type, FilamentType) else self.filament_type,
            "color": self.color,
            "brand": self.brand.value if isinstance(self.brand, FilamentBrand) else self.brand,
            "diameter": self.diameter,
            "weight_kg": self.weight_kg,
            "remaining_weight": self.remaining_weight,
            "temperature_nozzle": self.temperature_nozzle,
            "temperature_bed": self.temperature_bed,
            "usage_percentage": self.usage_percentage,
            "remaining_percentage": self.remaining_percentage,
            "stock_status": self.stock_status.value,
            "estimated_print_time": self.estimated_print_time,
            "spool_id": self.spool_id,
            "purchase_date": self.purchase_date.isoformat() if self.purchase_date else None,
            "supplier": self.supplier,
            "storage_location": self.storage_location,
            "notes": self.notes
        })
        return base_dict

# Datos de ejemplo para testing
SAMPLE_FILAMENTS = [
    Filament(
        "fil_001", "PLA Negro Premium", FilamentType.PLA, "Negro", 
        FilamentBrand.PRUSAMENT, remaining_weight=0.8, cost_per_kg=25.99
    ),
    Filament(
        "fil_002", "ABS Blanco Industrial", FilamentType.ABS, "Blanco", 
        FilamentBrand.HATCHBOX, remaining_weight=0.3, cost_per_kg=22.50
    ),
    Filament(
        "fil_003", "PETG Transparente", FilamentType.PETG, "Transparente", 
        FilamentBrand.OVERTURE, remaining_weight=0.9, cost_per_kg=28.99
    ),
    Filament(
        "fil_004", "TPU Flexible Rojo", FilamentType.TPU, "Rojo", 
        FilamentBrand.SUNLU, remaining_weight=0.15, cost_per_kg=35.00
    ),
    Filament(
        "fil_005", "PLA Azul Metálico", FilamentType.PLA, "Azul", 
        FilamentBrand.ESUN, remaining_weight=0.95, cost_per_kg=24.99
    ),
    Filament(
        "fil_006", "Wood Fill Natural", FilamentType.WOOD, "Madera", 
        FilamentBrand.PROTOPASTA, remaining_weight=0.0, cost_per_kg=45.00
    )
]
