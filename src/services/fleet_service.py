import uuid
import json
import os
from src.models.printer import Printer
from src.schemas.printer import PrinterCreate

class FleetService:
    def __init__(self, printers_file='printers.json'):
        self.printers_file = printers_file
        self.printers = self._load_printers()

    def _load_printers(self):
        if os.path.exists(self.printers_file):
            with open(self.printers_file, 'r') as f:
                printers_data = json.load(f)
                return {p_id: Printer(**p_data) for p_id, p_data in printers_data.items()}
        return {}

    def _save_printers(self):
        with open(self.printers_file, 'w') as f:
            json.dump({p_id: p.model_dump() for p_id, p in self.printers.items()}, f, indent=4)

    def list_printers(self):
        return list(self.printers.values())

    def get_printer(self, printer_id):
        return self.printers.get(printer_id)

    def add_printer(self, printer_data: PrinterCreate):
        printer_id = str(uuid.uuid4())
        printer = Printer(id=printer_id, **printer_data.model_dump())
        self.printers[printer_id] = printer
        self._save_printers()
        return printer

    def update_printer(self, printer_id, printer_data: PrinterCreate):
        if printer_id in self.printers:
            printer = self.printers[printer_id]
            update_data = printer_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(printer, key, value)
            self._save_printers()
            return printer
        return None

    def delete_printer(self, printer_id):
        if printer_id in self.printers:
            deleted_printer = self.printers.pop(printer_id)
            self._save_printers()
            return deleted_printer
        return None

fleet_service = FleetService()