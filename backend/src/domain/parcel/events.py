from dataclasses import dataclass
from src.domain.event.enums import EventType
from src.domain.event.value_objects import DomainEvent, EntityType


@dataclass(frozen=True, slots=True, kw_only=True)
class ParcelCreatedEvent(DomainEvent):
    event_type: EventType = EventType.PARCEL_CREATED
    entity_type: EntityType = EntityType.PARCEL


@dataclass(frozen=True, slots=True, kw_only=True)
class ParcelPackedEvent(DomainEvent):
    event_type: EventType = EventType.PARCEL_PACKED
    entity_type: EntityType = EntityType.PARCEL


@dataclass(frozen=True, slots=True, kw_only=True)
class ParcelLoadedEvent(DomainEvent):
    event_type: EventType = EventType.PARCEL_LOADED
    entity_type: EntityType = EntityType.PARCEL


@dataclass(frozen=True, slots=True, kw_only=True)
class ParcelDispatchedEvent(DomainEvent):
    event_type: EventType = EventType.PARCEL_DISPATCHED
    entity_type: EntityType = EntityType.PARCEL


@dataclass(frozen=True, slots=True, kw_only=True)
class ParcelDeliveredEvent(DomainEvent):
    event_type: EventType = EventType.PARCEL_DELIVERED
    entity_type: EntityType = EntityType.PARCEL