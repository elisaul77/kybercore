"""
Servicio para la gestión de consumibles (filamentos y materiales)
Parte del sistema KyberCore - Orquestador inteligente de impresoras 3D
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os
from ..models.consumable import (
    Filament, FilamentType, FilamentBrand, StockStatus, SAMPLE_FILAMENTS
)

class ConsumableService:
    """Servicio para gestionar consumibles de impresión 3D"""
    
    def __init__(self):
        self.filaments = {}
        self.data_file = "data/consumables.json"
        self._load_sample_data()
    
    def _load_sample_data(self):
        """Carga datos de ejemplo para testing"""
        for filament in SAMPLE_FILAMENTS:
            self.filaments[filament.id] = filament
    
    def _save_to_file(self):
        """Guarda los datos a archivo JSON (placeholder para persistencia)"""
        # En una implementación real, aquí se guardaría en base de datos
        try:
            os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
            data = {fid: filament.to_dict() for fid, filament in self.filaments.items()}
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error al guardar datos: {e}")
    
    def get_all_filaments(self, status: Optional[StockStatus] = None, 
                         filament_type: Optional[FilamentType] = None,
                         brand: Optional[FilamentBrand] = None) -> List[Filament]:
        """Obtiene todos los filamentos con filtros opcionales"""
        filaments = list(self.filaments.values())
        
        # Aplicar filtros
        if status:
            filaments = [f for f in filaments if f.stock_status == status]
        
        if filament_type:
            filaments = [f for f in filaments if f.filament_type == filament_type]
        
        if brand:
            filaments = [f for f in filaments if f.brand == brand]
        
        return filaments
    
    def get_filament_by_id(self, filament_id: str) -> Optional[Filament]:
        """Obtiene un filamento por ID"""
        return self.filaments.get(filament_id)
    
    def create_filament(self, filament_data: Dict[str, Any]) -> Filament:
        """Crea un nuevo filamento"""
        # Convertir strings a enums si es necesario
        filament_type = FilamentType(filament_data.get("filament_type", "PLA"))
        brand = FilamentBrand(filament_data.get("brand", "GENERIC"))
        
        filament = Filament(
            filament_id=filament_data.get("id", f"fil_{len(self.filaments) + 1:03d}"),
            name=filament_data.get("name", "Nuevo Filamento"),
            filament_type=filament_type,
            color=filament_data.get("color", "Sin especificar"),
            brand=brand,
            diameter=filament_data.get("diameter", 1.75),
            weight_kg=filament_data.get("weight_kg", 1.0),
            remaining_weight=filament_data.get("remaining_weight"),
            cost_per_kg=filament_data.get("cost_per_kg", 0.0),
            temperature_nozzle=filament_data.get("temperature_nozzle", 200),
            temperature_bed=filament_data.get("temperature_bed", 60)
        )
        
        # Metadatos opcionales
        filament.supplier = filament_data.get("supplier")
        filament.storage_location = filament_data.get("storage_location")
        filament.notes = filament_data.get("notes", "")
        
        self.filaments[filament.id] = filament
        self._save_to_file()
        return filament
    
    def update_filament(self, filament_id: str, filament_data: Dict[str, Any]) -> Optional[Filament]:
        """Actualiza un filamento existente"""
        filament = self.filaments.get(filament_id)
        if not filament:
            return None
        
        # Actualizar campos
        for field, value in filament_data.items():
            if hasattr(filament, field):
                if field == "filament_type":
                    value = FilamentType(value)
                elif field == "brand":
                    value = FilamentBrand(value)
                setattr(filament, field, value)
        
        filament.updated_at = datetime.now()
        self._save_to_file()
        return filament
    
    def delete_filament(self, filament_id: str) -> bool:
        """Elimina un filamento"""
        if filament_id in self.filaments:
            del self.filaments[filament_id]
            self._save_to_file()
            return True
        return False
    
    def consume_filament(self, filament_id: str, amount_kg: float) -> bool:
        """Consume una cantidad de filamento"""
        filament = self.filaments.get(filament_id)
        if filament:
            success = filament.consume(amount_kg)
            if success:
                self._save_to_file()
            return success
        return False
    
    def restock_filament(self, filament_id: str, amount_kg: float) -> bool:
        """Añade stock a un filamento"""
        filament = self.filaments.get(filament_id)
        if filament:
            filament.add_stock(amount_kg)
            self._save_to_file()
            return True
        return False
    
    def get_consumable_statistics(self) -> Dict[str, Any]:
        """Obtiene estadísticas para KPIs del dashboard"""
        filaments = list(self.filaments.values())
        
        # Contar por estado
        total_filaments = len(filaments)
        in_stock = len([f for f in filaments if f.stock_status == StockStatus.IN_STOCK])
        low_stock = len([f for f in filaments if f.stock_status == StockStatus.LOW_STOCK])
        out_of_stock = len([f for f in filaments if f.stock_status == StockStatus.OUT_OF_STOCK])
        
        # Colores únicos en stock
        colors_in_stock = set()
        for f in filaments:
            if f.stock_status != StockStatus.OUT_OF_STOCK:
                colors_in_stock.add(f.color)
        
        # Tipos de filamento disponibles
        types_available = set()
        for f in filaments:
            if f.stock_status != StockStatus.OUT_OF_STOCK:
                types_available.add(f.filament_type.value)
        
        # Valor total del inventario
        total_value = sum(f.remaining_weight * f.cost_per_unit for f in filaments)
        
        # Peso total disponible
        total_weight = sum(f.remaining_weight for f in filaments)
        
        # Tiempo de impresión estimado total
        total_print_time = sum(f.estimated_print_time for f in filaments)
        
        return {
            "total_filaments": total_filaments,
            "in_stock": in_stock,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
            "colors_available": len(colors_in_stock),
            "colors_list": sorted(list(colors_in_stock)),
            "types_available": len(types_available),
            "types_list": sorted(list(types_available)),
            "total_value": round(total_value, 2),
            "total_weight_kg": round(total_weight, 3),
            "estimated_print_hours": round(total_print_time, 1),
            "stock_percentage": round((in_stock / total_filaments * 100) if total_filaments > 0 else 0, 1)
        }
    
    def get_low_stock_items(self) -> List[Filament]:
        """Obtiene items con stock bajo"""
        return [f for f in self.filaments.values() 
                if f.stock_status in [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK]]
    
    def get_available_colors(self) -> List[Dict[str, Any]]:
        """Obtiene colores disponibles con información de stock"""
        color_info = {}
        
        for filament in self.filaments.values():
            if filament.stock_status != StockStatus.OUT_OF_STOCK:
                color = filament.color
                if color not in color_info:
                    color_info[color] = {
                        "color": color,
                        "count": 0,
                        "total_weight": 0,
                        "types": set(),
                        "brands": set()
                    }
                
                color_info[color]["count"] += 1
                color_info[color]["total_weight"] += filament.remaining_weight
                color_info[color]["types"].add(filament.filament_type.value)
                color_info[color]["brands"].add(filament.brand.value)
        
        # Convertir sets a listas para serialización JSON
        result = []
        for color_data in color_info.values():
            color_data["types"] = list(color_data["types"])
            color_data["brands"] = list(color_data["brands"])
            color_data["total_weight"] = round(color_data["total_weight"], 3)
            result.append(color_data)
        
        return sorted(result, key=lambda x: x["color"])
    
    def get_filament_types(self) -> List[Dict[str, Any]]:
        """Obtiene tipos de filamento disponibles con información"""
        type_info = {}
        
        for filament in self.filaments.values():
            if filament.stock_status != StockStatus.OUT_OF_STOCK:
                ftype = filament.filament_type.value
                if ftype not in type_info:
                    type_info[ftype] = {
                        "type": ftype,
                        "count": 0,
                        "total_weight": 0,
                        "colors": set(),
                        "avg_nozzle_temp": []
                    }
                
                type_info[ftype]["count"] += 1
                type_info[ftype]["total_weight"] += filament.remaining_weight
                type_info[ftype]["colors"].add(filament.color)
                type_info[ftype]["avg_nozzle_temp"].append(filament.temperature_nozzle)
        
        # Procesar datos
        result = []
        for type_data in type_info.values():
            type_data["colors"] = list(type_data["colors"])
            type_data["total_weight"] = round(type_data["total_weight"], 3)
            type_data["avg_nozzle_temp"] = round(
                sum(type_data["avg_nozzle_temp"]) / len(type_data["avg_nozzle_temp"])
            )
            result.append(type_data)
        
        return sorted(result, key=lambda x: x["type"])
    
    def get_filament_brands(self) -> List[Dict[str, Any]]:
        """Obtiene marcas de filamento disponibles con información"""
        brand_info = {}
        
        for filament in self.filaments.values():
            if filament.stock_status != StockStatus.OUT_OF_STOCK:
                brand = filament.brand.value
                if brand not in brand_info:
                    brand_info[brand] = {
                        "brand": brand,
                        "count": 0,
                        "total_weight": 0,
                        "types": set(),
                        "avg_cost": []
                    }
                
                brand_info[brand]["count"] += 1
                brand_info[brand]["total_weight"] += filament.remaining_weight
                brand_info[brand]["types"].add(filament.filament_type.value)
                brand_info[brand]["avg_cost"].append(filament.cost_per_unit)
        
        # Procesar datos
        result = []
        for brand_data in brand_info.values():
            brand_data["types"] = list(brand_data["types"])
            brand_data["total_weight"] = round(brand_data["total_weight"], 3)
            brand_data["avg_cost"] = round(
                sum(brand_data["avg_cost"]) / len(brand_data["avg_cost"]), 2
            ) if brand_data["avg_cost"] else 0
            result.append(brand_data)
        
        return sorted(result, key=lambda x: x["brand"])
