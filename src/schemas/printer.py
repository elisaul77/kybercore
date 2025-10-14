from pydantic import BaseModel
from typing import Optional, List

class PrinterBase(BaseModel):
    name: str
    model: str
    ip: str = ""  # Deprecated: mantener para compatibilidad
    local_ip: Optional[str] = None  # IP de red local
    vpn_ip: Optional[str] = None  # IP de VPN
    connection_priority: str = "local_first"  # "local_first", "vpn_first", "auto"
    status: str = "offline"  # online, offline, printing, error
    capabilities: Optional[List[str]] = None
    location: Optional[str] = None

class PrinterCreate(PrinterBase):
    pass

class PrinterUpdate(BaseModel):
    """Schema para actualizar impresora (todos los campos opcionales)"""
    name: Optional[str] = None
    model: Optional[str] = None
    local_ip: Optional[str] = None
    vpn_ip: Optional[str] = None
    connection_priority: Optional[str] = None
    status: Optional[str] = None
    capabilities: Optional[List[str]] = None
    location: Optional[str] = None

class Printer(PrinterBase):
    id: str
    active_ip: Optional[str] = None

    class Config:
        orm_mode = True
