import uuid
import json
import os
from src.models.printer import Printer
from src.schemas.printer import PrinterCreate
from src.services.moonraker_client import MoonrakerClient
import logging

# Configuración del logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            # Excluimos realtime_data al guardar para no persistir datos volátiles
            printers_to_save = {p_id: p.model_dump(exclude={'realtime_data'}) for p_id, p in self.printers.items()}
            json.dump(printers_to_save, f, indent=4)

    def list_printers(self):
        """Lista las impresoras y enriquece sus datos con el estado de Moonraker."""
        printers_list = list(self.printers.values())
        for printer in printers_list:
            ip, port = self._parse_ip_port(printer.ip)
            logger.info(f"Conectando a la impresora {printer.name} en {ip}:{port}")
            client = MoonrakerClient(ip, port)
            printer_info = client.get_printer_info()
            if printer_info and 'result' in printer_info:
                logger.info(f"Estado de la impresora {printer.name}: {printer_info['result'].get('state', 'unknown')}")
                printer.status = printer_info['result'].get('state', 'unknown')
                printer.realtime_data = printer_info['result']
            else:
                logger.warning(f"No se pudo conectar a la impresora {printer.name} en {ip}:{port}")
                printer.status = "unreachable"
                printer.realtime_data = None
        return printers_list

    def _parse_ip_port(self, ip_field):
        """Extrae IP y puerto del campo ip. Si no hay puerto, usa 7125 por defecto."""
        if ':' in ip_field:
            ip, port = ip_field.split(':')
            return ip, int(port)
        return ip_field, 7125

    def get_printer(self, printer_id):
        printer = self.printers.get(printer_id)
        if printer:
            ip, port = self._parse_ip_port(printer.ip)
            client = MoonrakerClient(ip, port)
            printer_info = client.get_printer_info()
            if printer_info and 'result' in printer_info:
                printer.status = printer_info['result'].get('state', 'unknown')
                printer.realtime_data = printer_info['result']
            else:
                printer.status = "unreachable"
                printer.realtime_data = None
        return printer


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