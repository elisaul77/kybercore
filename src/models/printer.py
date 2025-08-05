from pydantic import BaseModel
from typing import Optional, List

class Printer(BaseModel):
    id: str
    name: str
    model: str
    ip: str
    status: str = "offline"
    capabilities: Optional[List[str]] = None
    location: Optional[str] = None
    realtime_data: dict = {}
