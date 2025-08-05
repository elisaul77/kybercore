import uuid
from src.models.printer import Printer
from src.schemas.printer import PrinterCreate

class FleetService:
    def __init__(self):
        self.printers = {}

    def list_printers(self):
        return list(self.printers.values())

    def get_printer(self, printer_id):
        return self.printers.get(printer_id)

    def add_printer(self, printer_data: PrinterCreate):
        printer_id = str(uuid.uuid4())
        printer = Printer(
            id=printer_id,
            name=printer_data.name,
            model=printer_data.model,
            ip=printer_data.ip,
            status=printer_data.status,
            capabilities=printer_data.capabilities,
            location=printer_data.location
        )
        self.printers[printer_id] = printer
        return printer

    def update_printer(self, printer_id, printer_data: PrinterCreate):
        if printer_id in self.printers:
            printer = self.printers[printer_id]
            printer.name = printer_data.name
            printer.model = printer_data.model
            printer.ip = printer_data.ip
            printer.status = printer_data.status
            printer.capabilities = printer_data.capabilities
            printer.location = printer_data.location
            return printer
        return None

    def delete_printer(self, printer_id):
        return self.printers.pop(printer_id, None)

fleet_service = FleetService()