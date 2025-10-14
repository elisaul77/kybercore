from pydantic import BaseModel
from typing import Optional, List

class Printer(BaseModel):
    id: str
    name: str
    model: str
    ip: str  # Deprecated: mantener para compatibilidad
    local_ip: Optional[str] = None  # IP de red local (ej: 10.10.10.71:7126)
    vpn_ip: Optional[str] = None  # IP de VPN (ej: 192.168.100.50:7126)
    active_ip: Optional[str] = None  # IP actualmente activa (se detecta automáticamente)
    connection_priority: str = "local_first"  # "local_first", "vpn_first", "auto"
    status: str = "offline"
    capabilities: Optional[List[str]] = None
    location: Optional[str] = None
    realtime_data: dict = {}
    
    @property
    def ip_address(self):
        """Retorna la IP activa, o fallback a la IP original por compatibilidad"""
        return self.active_ip or self.local_ip or self.vpn_ip or self.ip
