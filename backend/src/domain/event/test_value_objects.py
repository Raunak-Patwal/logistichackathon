import pytest
from uuid import UUID, uuid4
from src.domain.event.enums import EventType
from src.domain.event.value_objects import EventId, EventMetadata, DomainEvent, EntityType
from src.domain.parcel.events import ParcelCreatedEvent, ParcelPackedEvent


def test_event_id_generation():
    eid = EventId()
    assert isinstance(eid.value, UUID)
    assert len(str(eid)) == 36


def test_event_id_from_string():
    raw_uuid = "12345678-1234-5678-1234-567812345678"
    eid = EventId(value=raw_uuid)
    assert eid.value == UUID(raw_uuid)


def test_event_metadata_idempotency_and_correlation():
    corr_id = uuid4()
    meta = EventMetadata(
        source="WMS_TEST",
        correlation_id=corr_id,
        idempotency_key="test-key-100",
    )
    assert meta.source == "WMS_TEST"
    assert meta.correlation_id == corr_id
    assert meta.idempotency_key == "test-key-100"


def test_event_metadata_empty_source_rejected():
    with pytest.raises(ValueError):
        EventMetadata(source="")


def test_domain_event_immutability():
    meta = EventMetadata(source="CORE")
    event = ParcelCreatedEvent(
        metadata=meta,
        entity_id="PKG-501",
        payload={"weight": 5.2, "destination": "Delhi W12"},
    )
    assert event.event_type == EventType.PARCEL_CREATED
    assert event.entity_type == EntityType.PARCEL
    assert event.entity_id == "PKG-501"
    assert event.payload["weight"] == 5.2

    # Dataclass is frozen, mutation must fail
    with pytest.raises(Exception):
        event.entity_id = "PKG-999"  # type: ignore[misc]
