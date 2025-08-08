from src.models.models import Printer, Filament

class RecommenderService:
    def get_ai_profile(self, printer: Printer, filament: Filament) -> dict:
        # Lógica de recomendación simple (basada en reglas)
        # Esto será reemplazado por un modelo de ML en el futuro.
        if filament.material == "PLA":
            return {
                "layer_height": "0.2mm",
                "nozzle_temp": "215°C",
                "bed_temp": "60°C",
                "print_speed": "80 mm/s",
                "retraction_speed": "45 mm/s",
                "retraction_distance": "5 mm",
                "fan_speed": "100%",
                "pressure_advance": "0.045",
                "success_rate": "96%",
                "reason": f"Perfil optimizado para PLA en la {printer.name}."
            }
        elif filament.material == "PETG":
            return {
                "layer_height": "0.2mm",
                "nozzle_temp": "240°C",
                "bed_temp": "70°C",
                "print_speed": "60 mm/s",
                "retraction_speed": "40 mm/s",
                "retraction_distance": "4 mm",
                "fan_speed": "50%",
                "pressure_advance": "0.05",
                "success_rate": "92%",
                "reason": f"Perfil optimizado para PETG en la {printer.name}, con más calor y menos ventilador."
            }
        elif filament.material == "ABS":
            return {
                "layer_height": "0.2mm",
                "nozzle_temp": "255°C",
                "bed_temp": "100°C",
                "print_speed": "50 mm/s",
                "retraction_speed": "35 mm/s",
                "retraction_distance": "3 mm",
                "fan_speed": "30%",
                "pressure_advance": "0.06",
                "success_rate": "88%",
                "reason": f"Perfil optimizado para ABS en la {printer.name}, con alta temperatura y poca ventilación."
            }
        else:
            return {
                "layer_height": "0.2mm",
                "nozzle_temp": "255°C",
                "bed_temp": "100°C",
                "print_speed": "50 mm/s",
                "retraction_speed": "35 mm/s",
                "retraction_distance": "3 mm",
                "fan_speed": "30%",
                "pressure_advance": "0.06",
                "success_rate": "88%",
                "reason": f"Perfil conservador para materiales avanzados como {filament.material} en la {printer.name}."
            }