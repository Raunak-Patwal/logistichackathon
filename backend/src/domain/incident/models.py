from enum import StrEnum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class IncidentSeverity(StrEnum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(StrEnum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    MITIGATING = "MITIGATING"
    RESOLVED = "RESOLVED"


class LogisticsContext(BaseModel):
    """
    Assembled operational context dossier surrounding an incident (Phase 2 Understand).
    """
    warehouse_capacity_percent: float = Field(default=85.0, description="Current facility storage utilization %")
    cold_storage_parcels: int = Field(default=0, description="Count of temperature-sensitive units at risk")
    medicine_shipments: int = Field(default=0, description="Count of critical pharmaceutical/vaccine manifests")
    next_truck_eta_mins: int = Field(default=15, description="Estimated arrival time of next scheduled vehicle")
    nearest_backup_scanner: str = Field(default="Bay B (Operational)", description="Availability of redundant hardware")
    weather: str = Field(default="Clear 28°C", description="Ambient environmental conditions")
    dock_congestion_percent: float = Field(default=75.0, description="Dock saturation percentage")
    queue_backlog_parcels: int = Field(default=120, description="Parcels buffered awaiting processing")
    estimated_throughput_loss_percent: float = Field(default=45.0, description="Throughput degradation estimate")


class IncidentAction(BaseModel):
    """
    Executable recovery directive or countermeasure.
    """
    action_id: str
    incident_id: str
    action_type: str  # e.g., ACTIVATE_BACKUP_SCANNER, REROUTE_TRUCK, DIVERT_SHIPMENT
    title: str
    description: str
    target_entity_id: str
    cost_estimate_inr: float = 0.0
    eta_mins: int = 10
    risk_level: str = "Low"  # Low, Medium, High
    executed_at: Optional[datetime] = None
    executed_by: str = "OPERATOR_DISPATCH"
    result_summary: Optional[str] = None


class Incident(BaseModel):
    """
    Operational incident representation across the Logistics Brain.
    """
    incident_id: str
    warehouse_id: str
    incident_type: str
    severity: IncidentSeverity = IncidentSeverity.HIGH
    status: IncidentStatus = IncidentStatus.OPEN
    duration_mins: int = 0
    affected_parcels: int = 0
    affected_trucks: int = 0
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    context: LogisticsContext = Field(default_factory=LogisticsContext)
    selected_action: Optional[IncidentAction] = None
    action_history: List[IncidentAction] = Field(default_factory=list)
