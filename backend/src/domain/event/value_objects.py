from enum import StrEnum
from uuid import UUID, uuid4
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from .enums import EventType


class EntityType(StrEnum):
    PARCEL = "PARCEL"
    TRUCK = "TRUCK"
    WAREHOUSE = "WAREHOUSE"
    AIRPORT = "AIRPORT"
    ROUTE = "ROUTE"
    DRIVER = "DRIVER"
    INCIDENT = "INCIDENT"


@dataclass(frozen=True, slots=True, kw_only=True)
class EventId:
    value: UUID = field(default_factory=uuid4)

    def __post_init__(self) -> None:
        if isinstance(self.value, str):
            object.__setattr__(self, "value", UUID(self.value))
        elif not isinstance(self.value, UUID):
            raise TypeError(f"EventId must be a UUID or valid UUID string, got {type(self.value).__name__}")

    def __str__(self) -> str:
        return str(self.value)


@dataclass(frozen=True, slots=True, kw_only=True)
class EventMetadata:
    """
    ULEO Standard Metadata for tracking, tracing, and idempotency.
    """
    event_id: EventId = field(default_factory=EventId)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "core_logistics_system"
    correlation_id: Optional[UUID | str] = None
    causation_id: Optional[UUID | str] = None
    idempotency_key: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.source.strip():
            raise ValueError("Event source cannot be empty")
        if isinstance(self.correlation_id, str):
            try:
                object.__setattr__(self, "correlation_id", UUID(self.correlation_id))
            except ValueError:
                pass
        if isinstance(self.causation_id, str):
            try:
                object.__setattr__(self, "causation_id", UUID(self.causation_id))
            except ValueError:
                pass


@dataclass(frozen=True, slots=True, kw_only=True)
class DomainEvent:
    """
    Base class for all ULEO Domain Events.
    Strictly immutable.
    """
    metadata: EventMetadata = field(default_factory=EventMetadata)
    event_type: EventType
    entity_type: EntityType
    entity_id: str
    payload: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.entity_id.strip():
            raise ValueError("entity_id must be provided")
        if not isinstance(self.payload, dict):
            raise TypeError("payload must be a dictionary")
