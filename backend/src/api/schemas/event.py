from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class EventIngestionRequest(BaseModel):
    """
    Canonical ULEO v0.1 event ingestion payload (API Transport).
    """
    event_type: str = Field(..., description="e.g. PARCEL_CREATED, PARCEL_PACKED, PARCEL_LOADED, SCAN_EXCEPTION")
    entity_id: str = Field(..., description="e.g. PKG-1001, T-184, W12")
    entity_type: str = Field(default="PARCEL", description="e.g. PARCEL, TRUCK, WAREHOUSE, INCIDENT")
    source: str = Field(default="WMS_SCANNER_GATEWAY", description="Originating sensor or subsystem")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Domain event payload details")
    idempotency_key: Optional[str] = Field(default=None, description="Unique client UUID to guarantee exactly-once semantics")
    correlation_id: Optional[str] = Field(default=None, description="Distributed trace correlation ID")
    causation_id: Optional[str] = Field(default=None, description="Causal triggering event ID")