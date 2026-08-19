import pytest
from sqlalchemy import select
from src.api.schemas.event import EventIngestionRequest
from src.application.services.parcel_service import ParcelApplicationService
from src.infrastructure.database.models.event_store import EventRecord
from src.infrastructure.database.models.parcel import ParcelRecord
from src.domain.parcel.aggregate import InvalidStateTransitionError


@pytest.mark.asyncio
async def test_atomic_dual_commit_success(test_session):
    """
    Verifies that a valid event writes both event_store row AND world_model_parcels
    in the exact same database transaction.
    """
    service = ParcelApplicationService(test_session)
    req = EventIngestionRequest(
        event_type="PARCEL_CREATED",
        entity_id="PKG-TEST-DUAL",
        source="TEST_SCANNER",
        idempotency_key="idemp-key-dual-1",
        payload={"weight": 3.4, "destination": "Bengaluru W08"},
    )
    res = await service.process_event(req)
    assert res["status"] == "ACCEPTED"
    assert res["state"] == "CREATED"
    assert res["version"] == 1

    # Verify event_store has the event
    evt_stmt = select(EventRecord).where(EventRecord.idempotency_key == "idemp-key-dual-1")
    evt_res = await test_session.execute(evt_stmt)
    evt_record = evt_res.scalar_one_or_none()
    assert evt_record is not None
    assert evt_record.entity_id == "PKG-TEST-DUAL"
    assert evt_record.event_type == "PARCEL_CREATED"

    # Verify world_model_parcels has the materialized row
    wm_stmt = select(ParcelRecord).where(ParcelRecord.id == "PKG-TEST-DUAL")
    wm_res = await test_session.execute(wm_stmt)
    wm_record = wm_res.scalar_one_or_none()
    assert wm_record is not None
    assert wm_record.state == "CREATED"
    assert wm_record.weight == 3.4
    assert wm_record.destination == "Bengaluru W08"


@pytest.mark.asyncio
async def test_idempotency_guard_prevents_duplicate_mutation(test_session):
    """
    Verifies that re-submitting an identical event with the same idempotency_key
    returns DUPLICATE_ACCEPTED without creating duplicate records or mutating state.
    """
    service = ParcelApplicationService(test_session)
    req = EventIngestionRequest(
        event_type="PARCEL_CREATED",
        entity_id="PKG-IDEMP-TEST",
        source="TEST_SCANNER",
        idempotency_key="idemp-key-same-99",
        payload={"weight": 5.0, "destination": "Mumbai W04"},
    )
    # First submission
    res1 = await service.process_event(req)
    assert res1["status"] == "ACCEPTED"

    # Second submission with same idempotency key
    res2 = await service.process_event(req)
    assert res2["status"] == "DUPLICATE_ACCEPTED"

    # Verify only ONE event record exists in event_store
    evt_stmt = select(EventRecord).where(EventRecord.idempotency_key == "idemp-key-same-99")
    evt_res = await test_session.execute(evt_stmt)
    evt_records = list(evt_res.scalars().all())
    assert len(evt_records) == 1


@pytest.mark.asyncio
async def test_invalid_state_transition_rolls_back_everything(test_session):
    """
    Verifies that attempting an illegal state transition (e.g. DELIVER on CREATED parcel)
    raises an InvalidStateTransitionError and writes NOTHING to event_store.
    """
    service = ParcelApplicationService(test_session)
    # 1. Create parcel
    create_req = EventIngestionRequest(
        event_type="PARCEL_CREATED",
        entity_id="PKG-ROLLBACK-TEST",
        source="TEST_SCANNER",
        idempotency_key="idemp-create-roll",
        payload={"weight": 1.2, "destination": "Delhi W12"},
    )
    await service.process_event(create_req)

    # 2. Try to deliver directly without PACK, LOAD, DISPATCH
    illegal_req = EventIngestionRequest(
        event_type="PARCEL_DELIVERED",
        entity_id="PKG-ROLLBACK-TEST",
        source="TEST_SCANNER",
        idempotency_key="idemp-illegal-roll",
        payload={"proof_of_delivery": "FAKE"},
    )

    with pytest.raises(InvalidStateTransitionError):
        await service.process_event(illegal_req)

    # Verify illegal event was NOT written to event_store
    evt_stmt = select(EventRecord).where(EventRecord.idempotency_key == "idemp-illegal-roll")
    evt_res = await test_session.execute(evt_stmt)
    assert evt_res.scalar_one_or_none() is None

    # Verify parcel state is still CREATED
    wm_stmt = select(ParcelRecord).where(ParcelRecord.id == "PKG-ROLLBACK-TEST")
    wm_res = await test_session.execute(wm_stmt)
    wm_record = wm_res.scalar_one_or_none()
    assert wm_record.state == "CREATED"
