from src.models.models import AppData, Printer, Filament, PrintJob, FleetPrinter

class FleetService:
    def __init__(self):
        self._app_data = AppData(
            printers=[
                Printer(id='ender3', name='Creality Ender 3 V2', capabilities=['PLA', 'PETG']),
                Printer(id='prusamk4', name='Prusa MK4', capabilities=['PLA', 'PETG', 'ABS']),
                Printer(id='bambulab', name='Bambu Lab P1S', capabilities=['PLA', 'PETG', 'ABS', 'PAHT-CF']),
                Printer(id='voron24', name='Voron 2.4', capabilities=['PLA', 'PETG', 'ABS', 'PAHT-CF'])
            ],
            filaments=[
                Filament(id='esunpla', name='eSUN PLA+', type='PLA'),
                Filament(id='polypetg', name='Polymaker PolyLite PETG', type='PETG'),
                Filament(id='sunluabs', name='SUNLU ABS', type='ABS'),
                Filament(id='bambu_cf', name='Bambu Lab PAHT-CF', type='PAHT-CF')
            ],
            print_queue=[
                PrintJob(name='Caja_Bateria.gcode', eta='1h 15m'),
                PrintJob(name='Soporte_Tablet.gcode', eta='3h 45m'),
                PrintJob(name='Figura_Accion.gcode', eta='8h 20m')
            ],
            fleet=[
                FleetPrinter(id=1, name='Ender 3 (Taller)', status='Imprimiendo', job='Pieza_Motor_v4', progress=85, color='green'),
                FleetPrinter(id=2, name='Prusa MK4 (Oficina)', status='Inactiva', job='N/A', progress=0, color='gray'),
                FleetPrinter(id=3, name='Bambu Lab P1S', status='Requiere Mantenimiento', job='N/A', progress=0, color='yellow'),
                FleetPrinter(id=4, name='Voron 2.4', status='Inactiva', job='N/A', progress=0, color='gray')
            ]
        )

    def get_app_data(self) -> AppData:
        return self._app_data