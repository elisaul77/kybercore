"""
Modelos de datos para el Sistema de Gestión de Pedidos
Incluye: Customer, Order, OrderLine, ProductionBatch, PrintItem
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ===============================
# ENUMS
# ===============================

class OrderType(str, Enum):
    """Tipos de pedido"""
    DESIGN_AND_PRINT = "design_and_print"  # Requiere diseño previo + impresión
    PRINT_ONLY = "print_only"              # Solo impresión de archivos existentes


class OrderStatus(str, Enum):
    """Estados posibles de un pedido"""
    PENDING = "pending"                  # Creado, sin iniciar producción
    PENDING_DESIGN = "pending_design"    # Esperando diseño (solo para design_and_print)
    DESIGN_IN_PROGRESS = "design_in_progress"  # Diseñando
    DESIGN_REVIEW = "design_review"      # Diseño listo para revisión del cliente
    DESIGN_APPROVED = "design_approved"  # Diseño aprobado, listo para imprimir
    IN_PROGRESS = "in_progress"          # Al menos una pieza iniciada
    PAUSED = "paused"                    # Pausado temporalmente
    COMPLETED = "completed"              # Todas las piezas completadas
    CANCELLED = "cancelled"              # Cancelado por usuario
    FAILED = "failed"                    # Falló irrecuperablemente


class OrderPriority(str, Enum):
    """Niveles de prioridad de pedido"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class OrderLineStatus(str, Enum):
    """Estados de una línea de pedido"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class BatchStatus(str, Enum):
    """Estados de un lote de producción"""
    PENDING = "pending"
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    PROCESSING = "processing"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class PrintItemStatus(str, Enum):
    """Estados de un item individual de impresión"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ===============================
# CUSTOMER (Cliente)
# ===============================

class Customer(BaseModel):
    """
    Representa un cliente que realiza pedidos.
    Mantiene información de contacto e historial.
    """
    id: str = Field(default_factory=lambda: f"cust_{uuid.uuid4().hex[:12]}")
    name: str = Field(..., description="Nombre completo del cliente")
    email: Optional[str] = Field(None, description="Email de contacto")
    phone: Optional[str] = Field(None, description="Teléfono de contacto")
    company: Optional[str] = Field(None, description="Empresa (opcional)")
    address: Optional[str] = Field(None, description="Dirección de envío")
    created_at: datetime = Field(default_factory=datetime.now)
    last_order_at: Optional[datetime] = None
    total_orders: int = Field(default=0, description="Total de pedidos históricos")
    notes: Optional[str] = Field(None, description="Notas sobre el cliente")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "cust_abc123def456",
                "name": "Juan Pérez",
                "email": "juan@example.com",
                "phone": "+34 600 123 456",
                "company": "SpaceX Demo",
                "address": "Calle Mayor 123, Madrid",
                "created_at": "2025-01-15T10:30:00",
                "last_order_at": "2025-10-07T14:20:00",
                "total_orders": 5,
                "notes": "Cliente VIP - entregas prioritarias"
            }
        }


class CustomerCreate(BaseModel):
    """DTO para crear un cliente nuevo"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    """DTO para actualizar un cliente existente"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


# ===============================
# DESIGN INFO
# ===============================

class DesignInfo(BaseModel):
    """
    Información de diseño para pedidos tipo design_and_print.
    Contiene referencias a fotos, archivos y especificaciones del cliente.
    """
    # Descripción general del proyecto
    description: str = Field(..., description="Descripción detallada del diseño requerido")
    purpose: Optional[str] = Field(default=None, description="Para qué se usará el diseño")
    
    # Referencias a archivos
    reference_photos: List[str] = Field(default_factory=list, description="URLs o paths de fotos de referencia")
    technical_drawings: List[str] = Field(default_factory=list, description="URLs o paths de planos técnicos")
    reference_files: List[str] = Field(default_factory=list, description="Otros archivos de referencia (PDFs, CAD, etc)")
    
    # Especificaciones técnicas
    dimensions: Optional[str] = Field(default=None, description="Dimensiones requeridas (ej: '100x50x30mm')")
    material_preference: Optional[str] = Field(default=None, description="Preferencia de material")
    color_preference: Optional[str] = Field(default=None, description="Preferencia de color")
    finishing_requirements: Optional[str] = Field(default=None, description="Requisitos de acabado")
    special_requirements: Optional[str] = Field(default=None, description="Requisitos especiales")
    
    # Estado del diseño
    design_status: str = Field(default="pending", description="Estado del diseño: pending, in_progress, review, approved")
    design_notes: Optional[str] = Field(default=None, description="Notas del diseñador")
    designed_files: List[str] = Field(default_factory=list, description="Archivos STL generados del diseño")
    
    # Fechas
    design_started_at: Optional[datetime] = None
    design_completed_at: Optional[datetime] = None
    design_approved_at: Optional[datetime] = None


# ===============================
# ORDER LINE (Línea de Pedido)
# ===============================

class OrderLine(BaseModel):
    """
    Representa una línea dentro de un pedido.
    Vincula un proyecto con una cantidad específica.
    Puede ser un proyecto completo o un archivo específico dentro de un proyecto.
    """
    id: str = Field(default_factory=lambda: f"line_{uuid.uuid4().hex[:12]}")
    order_id: str = Field(..., description="ID del pedido padre")
    project_id: Optional[int] = Field(default=None, description="ID del proyecto (proyectos.json)")
    project_name: str = Field(..., description="Nombre del proyecto")
    
    # Información del archivo (para piezas específicas)
    file_id: Optional[str] = Field(default=None, description="ID único del archivo dentro del proyecto")
    file_name: Optional[str] = Field(default=None, description="Nombre del archivo STL/3MF específico")
    is_full_project: bool = Field(default=True, description="True = proyecto completo, False = archivo específico")
    
    # Cantidades
    quantity: int = Field(..., gt=0, description="Cantidad solicitada")
    completed: int = Field(default=0, ge=0, description="Unidades completadas")
    in_progress: int = Field(default=0, ge=0, description="Unidades en proceso")
    pending: int = Field(default=0, ge=0, description="Unidades pendientes")
    failed: int = Field(default=0, ge=0, description="Unidades fallidas")
    
    # Estado
    status: OrderLineStatus = Field(default=OrderLineStatus.PENDING)
    
    # Fechas
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Estimaciones por unidad
    estimated_time_per_unit_hours: float = Field(default=0.0, ge=0)
    estimated_filament_per_unit_grams: float = Field(default=0.0, ge=0)
    estimated_cost_per_unit: float = Field(default=0.0, ge=0)
    
    # Precio unitario (puede ser diferente del costo estimado)
    unit_price: float = Field(default=0.0, ge=0, description="Precio unitario para el cliente")
    
    # Información adicional del item
    material: Optional[str] = Field(default=None, description="Material de impresión")
    color: Optional[str] = Field(default=None, description="Color del material")
    file_path: Optional[str] = Field(default=None, description="Ruta al archivo STL/G-code")
    notes: Optional[str] = Field(default=None, description="Notas específicas del item")
    
    @validator('pending', always=True)
    def calculate_pending(cls, v, values):
        """Calcula automáticamente los items pendientes"""
        quantity = values.get('quantity', 0)
        completed = values.get('completed', 0)
        in_progress = values.get('in_progress', 0)
        failed = values.get('failed', 0)
        return quantity - completed - in_progress - failed
    
    @property
    def completion_percentage(self) -> float:
        """Calcula el porcentaje de completitud de la línea"""
        if self.quantity == 0:
            return 0.0
        return (self.completed / self.quantity) * 100.0
    
    @property
    def total_estimated_time_hours(self) -> float:
        """Tiempo estimado total para esta línea"""
        return self.estimated_time_per_unit_hours * self.quantity
    
    @property
    def total_estimated_filament_grams(self) -> float:
        """Filamento estimado total para esta línea"""
        return self.estimated_filament_per_unit_grams * self.quantity
    
    @property
    def total_estimated_cost(self) -> float:
        """Costo estimado total para esta línea"""
        return self.estimated_cost_per_unit * self.quantity
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "line_abc123def456",
                "order_id": "ord_1728234567_xyz",
                "project_id": 1,
                "project_name": "Starship Model",
                "quantity": 5,
                "completed": 3,
                "in_progress": 1,
                "pending": 1,
                "failed": 0,
                "status": "in_progress",
                "started_at": "2025-10-07T10:00:00",
                "estimated_time_per_unit_hours": 3.0,
                "estimated_filament_per_unit_grams": 50.0,
                "estimated_cost_per_unit": 5.50
            }
        }


class OrderLineCreate(BaseModel):
    """DTO para crear una línea de pedido"""
    project_id: int
    quantity: int = Field(..., gt=0)
    estimated_time_per_unit_hours: Optional[float] = 0.0
    estimated_filament_per_unit_grams: Optional[float] = 0.0
    estimated_cost_per_unit: Optional[float] = 0.0


# ===============================
# ORDER (Pedido)
# ===============================

class Order(BaseModel):
    """
    Representa un pedido completo de un cliente.
    Contiene múltiples líneas de pedido (proyectos + cantidades).
    Soporta dos tipos: design_and_print (requiere diseño previo) y print_only (archivos existentes).
    """
    id: str = Field(default_factory=lambda: f"ord_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}")
    order_number: str = Field(..., description="Número de pedido legible (ORD-2025-001)")
    customer_id: str = Field(..., description="ID del cliente")
    
    # Tipo de pedido
    order_type: OrderType = Field(default=OrderType.PRINT_ONLY, description="Tipo de pedido")
    
    # Información de diseño (solo para design_and_print)
    design_info: Optional[DesignInfo] = Field(default=None, description="Información de diseño si order_type es design_and_print")
    
    # Líneas de pedido
    order_lines: List[OrderLine] = Field(default_factory=list)
    
    # Estado
    status: OrderStatus = Field(default=OrderStatus.PENDING)
    priority: OrderPriority = Field(default=OrderPriority.NORMAL)
    
    # Fechas
    created_at: datetime = Field(default_factory=datetime.now)
    due_date: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Métricas agregadas (calculadas desde order_lines)
    total_estimated_time_hours: float = Field(default=0.0, ge=0)
    total_estimated_cost: float = Field(default=0.0, ge=0)
    total_amount: float = Field(default=0.0, ge=0, description="Total a pagar por el pedido")
    total_filament_grams: float = Field(default=0.0, ge=0)
    total_items: int = Field(default=0, ge=0)
    completed_items: int = Field(default=0, ge=0)
    completion_percentage: float = Field(default=0.0, ge=0, le=100)
    
    # Otros
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    def recalculate_totals(self):
        """
        Recalcula las métricas agregadas desde las order_lines.
        Debe llamarse después de actualizar cualquier línea.
        """
        self.total_items = sum(line.quantity for line in self.order_lines)
        self.completed_items = sum(line.completed for line in self.order_lines)
        self.total_estimated_time_hours = sum(line.total_estimated_time_hours for line in self.order_lines)
        self.total_filament_grams = sum(line.total_estimated_filament_grams for line in self.order_lines)
        self.total_estimated_cost = sum(line.total_estimated_cost for line in self.order_lines)
        
        # Calcular total_amount desde unit_price * quantity de cada línea
        self.total_amount = sum(line.unit_price * line.quantity for line in self.order_lines)
        
        if self.total_items > 0:
            self.completion_percentage = (self.completed_items / self.total_items) * 100.0
        else:
            self.completion_percentage = 0.0
    
    def update_status(self, new_status: Optional[OrderStatus] = None):
        """
        Actualiza el estado del pedido.
        
        Args:
            new_status: Si se proporciona, establece este estado directamente.
                       Si no, calcula el estado basándose en el progreso y tipo de pedido.
        """
        # Si se proporciona un nuevo estado explícitamente, usarlo
        if new_status is not None:
            self.status = new_status
            
            # Actualizar timestamps según el nuevo estado
            if new_status == OrderStatus.IN_PROGRESS and not self.started_at:
                self.started_at = datetime.now()
            elif new_status == OrderStatus.COMPLETED and not self.completed_at:
                self.completed_at = datetime.now()
            
            return
        
        # Lógica automática: calcular estado basándose en progreso
        # Para pedidos con diseño, verificar estado del diseño primero
        if self.order_type == OrderType.DESIGN_AND_PRINT:
            if self.design_info:
                if self.design_info.design_status == "pending":
                    self.status = OrderStatus.PENDING_DESIGN
                    return
                elif self.design_info.design_status == "in_progress":
                    self.status = OrderStatus.DESIGN_IN_PROGRESS
                    return
                elif self.design_info.design_status == "review":
                    self.status = OrderStatus.DESIGN_REVIEW
                    return
                elif self.design_info.design_status != "approved":
                    # Si no está aprobado, no puede estar en producción
                    return
        
        # Lógica normal de producción (para print_only o después de diseño aprobado)
        if self.completion_percentage == 0:
            if self.order_type == OrderType.DESIGN_AND_PRINT and self.design_info and self.design_info.design_status == "approved":
                self.status = OrderStatus.DESIGN_APPROVED
            else:
                self.status = OrderStatus.PENDING
        elif self.completion_percentage == 100:
            self.status = OrderStatus.COMPLETED
            if not self.completed_at:
                self.completed_at = datetime.now()
        elif self.completion_percentage > 0:
            self.status = OrderStatus.IN_PROGRESS
            if not self.started_at:
                self.started_at = datetime.now()
    
    @property
    def days_until_due(self) -> Optional[int]:
        """Días restantes hasta la fecha de entrega"""
        if not self.due_date:
            return None
        delta = self.due_date - datetime.now()
        return delta.days
    
    @property
    def is_overdue(self) -> bool:
        """Indica si el pedido está atrasado"""
        if not self.due_date:
            return False
        return datetime.now() > self.due_date and self.status != OrderStatus.COMPLETED
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "ord_1728234567_xyz",
                "order_number": "ORD-2025-015",
                "customer_id": "cust_abc123",
                "status": "in_progress",
                "priority": "high",
                "created_at": "2025-10-07T09:00:00",
                "due_date": "2025-10-15T00:00:00",
                "started_at": "2025-10-07T10:30:00",
                "total_estimated_time_hours": 22.5,
                "total_estimated_cost": 40.10,
                "total_filament_grams": 355.0,
                "total_items": 8,
                "completed_items": 5,
                "completion_percentage": 62.5,
                "notes": "Cliente VIP - urgente",
                "tags": ["urgent", "vip"],
                "order_lines": []
            }
        }


class OrderCreate(BaseModel):
    """DTO para crear un pedido nuevo"""
    customer_id: str
    order_lines: List[OrderLineCreate]
    priority: OrderPriority = OrderPriority.NORMAL
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class OrderUpdate(BaseModel):
    """DTO para actualizar un pedido existente"""
    priority: Optional[OrderPriority] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[OrderStatus] = None


# ===============================
# PRINT ITEM (Item de Impresión)
# ===============================

class PrintItem(BaseModel):
    """
    Representa un archivo individual procesado en un lote.
    Corresponde a un archivo STL/3MF que fue rotado y laminado.
    """
    id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    batch_id: str = Field(..., description="ID del batch padre")
    filename: str = Field(..., description="Nombre del archivo STL/3MF")
    gcode_path: Optional[str] = Field(None, description="Ruta del G-code generado")
    
    # Estado
    status: PrintItemStatus = Field(default=PrintItemStatus.PENDING)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Error tracking
    failure_reason: Optional[str] = None
    retry_count: int = Field(default=0, ge=0)
    
    # Métricas
    processing_time_seconds: float = Field(default=0.0, ge=0)
    gcode_size_bytes: int = Field(default=0, ge=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "item_abc123def456",
                "batch_id": "batch_xyz789",
                "filename": "starship_complete.stl",
                "gcode_path": "/tmp/kybercore/gcode_starship_complete.gcode",
                "status": "completed",
                "started_at": "2025-10-07T10:30:00",
                "completed_at": "2025-10-07T10:35:30",
                "processing_time_seconds": 330.5,
                "gcode_size_bytes": 12458900,
                "retry_count": 0
            }
        }


# ===============================
# PRODUCTION BATCH (Lote de Producción)
# ===============================

class ProductionBatch(BaseModel):
    """
    Representa un lote de producción asociado a una línea de pedido.
    Agrupa múltiples items (archivos) procesados juntos en una sesión.
    """
    id: str = Field(default_factory=lambda: f"batch_{uuid.uuid4().hex[:12]}")
    order_id: str = Field(..., description="ID del pedido")
    order_line_id: str = Field(..., description="ID de la línea de pedido")
    batch_number: int = Field(..., ge=1, description="Número secuencial dentro de la línea")
    
    # Datos de impresión
    session_id: str = Field(..., description="ID de sesión del wizard")
    printer_id: str = Field(..., description="Impresora asignada")
    material_type: str = Field(..., description="Tipo de material (PLA, PETG, etc)")
    material_color: str = Field(..., description="Color del material")
    
    # Estado
    status: BatchStatus = Field(default=BatchStatus.PENDING)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Métricas reales (se llenan al completar)
    actual_filament_used_grams: float = Field(default=0.0, ge=0)
    actual_print_time_hours: float = Field(default=0.0, ge=0)
    
    # Items individuales
    print_items: List[PrintItem] = Field(default_factory=list)
    items_count: int = Field(default=0, ge=0)
    items_completed: int = Field(default=0, ge=0)
    items_failed: int = Field(default=0, ge=0)
    
    @property
    def completion_percentage(self) -> float:
        """Porcentaje de completitud del batch"""
        if self.items_count == 0:
            return 0.0
        return (self.items_completed / self.items_count) * 100.0
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "batch_xyz789abc123",
                "order_id": "ord_1728234567_xyz",
                "order_line_id": "line_abc123",
                "batch_number": 1,
                "session_id": "temp_1_20251007_103000",
                "printer_id": "ender3_001",
                "material_type": "PLA",
                "material_color": "Negro",
                "status": "completed",
                "started_at": "2025-10-07T10:30:00",
                "completed_at": "2025-10-07T13:45:30",
                "actual_filament_used_grams": 242.5,
                "actual_print_time_hours": 14.8,
                "items_count": 5,
                "items_completed": 5,
                "items_failed": 0,
                "print_items": []
            }
        }


class ProductionBatchCreate(BaseModel):
    """DTO para crear un lote de producción"""
    order_id: str
    order_line_id: str
    batch_number: int
    session_id: str
    printer_id: str
    material_type: str
    material_color: str
    items_count: int = Field(..., gt=0)


# ===============================
# RESUMEN DE ESTADÍSTICAS
# ===============================

class OrderStatistics(BaseModel):
    """Estadísticas agregadas de pedidos"""
    total_orders: int = 0
    pending_orders: int = 0
    in_progress_orders: int = 0
    completed_orders: int = 0
    cancelled_orders: int = 0
    failed_orders: int = 0
    total_items_produced: int = 0
    average_completion_time_hours: float = 0.0
    success_rate_percentage: float = 0.0
    total_filament_used_kg: float = 0.0


class CustomerStatistics(BaseModel):
    """Estadísticas de un cliente específico"""
    customer_id: str
    total_orders: int = 0
    total_spent: float = 0.0
    total_items_produced: int = 0
    average_order_size: float = 0.0
    last_order_date: Optional[datetime] = None
