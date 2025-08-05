from pydantic import BaseModel
from typing import Optional

class PrinterBase(BaseModel):
    name: str
    model: str
    ip: str
    status: str = "offline"  # online, offline, printing, error
    capabilities: Optional[str] = None
    location: Optional[str] = None

class PrinterCreate(PrinterBase):
    pass

class Printer(PrinterBase):
    id: str

    class Config:
        orm_mode = True
