from pydantic import BaseModel
from typing import List, Optional

class Printer(BaseModel):
    id: str
    name: str
    capabilities: List[str]

class Filament(BaseModel):
    id: str
    name: str
    type: str

class PrintJob(BaseModel):
    name: str
    eta: str

class FleetPrinter(BaseModel):
    id: int
    name: str
    status: str
    job: Optional[str] = None
    progress: int = 0
    color: str

class AppData(BaseModel):
    printers: List[Printer]
    filaments: List[Filament]
    print_queue: List[PrintJob]
    fleet: List[FleetPrinter]