import pytest
from src.api.schemas.event import EventIngestionRequest
from src.application.services.parcel_service import ParcelApplicationService
from src.application.services.event_replay_service import EventReplayService


@pytest.mark.asyncio
async def test_full_lifecycle_event_replay(test_session):
    """
    Simulates a full 5-stage parcel lifecycle, then uses EventReplayService
    to reconstruct the state step-by-step from the immutable event log.
    """
    parcel_service = ParcelApplicationService(test_session)
    replay_service = EventReplayService(test_session)
    pid = "PKG-LIFECYCLE-99"

    # Step 1: CREATE
    await parcel_service.process_event(
        EventIngestionRequest(
            event_type="PARCEL_CREATED",
            entity_id=pid,
            source="WMS_DELHI",
            idempotency_key=f"{pid}-1",
            payload={"weight": 14.5, "destination": "Chennai Port Node (MAA)"},
        )
    )

    # Step 2: PACK
    await parcel_service.process_event(
        EventIngestionRequest(
            event_type="PARCEL_PACKED",
            entity_id=pid,
            source="WMS_DELHI",
            idempotency_key=f"{pid}-2",
            payload={"packer_id": "OPERATOR-88"},
        )
    )

    # Step 3: LOAD
    await parcel_service.process_event(
        EventIngestionRequest(
            event_type="PARCEL_LOADED",
            entity_id=pid,
            source="DOCK_SCANNER",
            idempotency_key=f"{pid}-3",
            payload={"truck_id": "T-184"},
        )
    )

    # Step 4: DISPATCH
    await parcel_service.process_event(
        EventIngestionRequest(
            event_type="PARCEL_DISPATCHED",
            entity_id=pid,
            source="TELEMATICS",
            idempotency_key=f"{pid}-4",
            payload={"truck_id": "T-184"},
        )
    )

    # Step 5: DELIVER
    await parcel_service.process_event(
        EventIngestionRequest(
            event_type="PARCEL_DELIVERED",
            entity_id=pid,
            source="DRIVER_APP",
            idempotency_key=f"{pid}-5",
            payload={"proof_of_delivery": "OTP_VERIFIED_9182"},
        )
    )

    # Now verify Replay at each point in time
    # Step 1 replay
    r1 = await replay_service.reconstruct_parcel(parcel_id=pid, up_to_step=1)
    assert r1["current_state"] == "CREATED"
    assert r1["weight_kg"] == 14.5

    # Step 2 replay
    r2 = await replay_service.reconstruct_parcel(parcel_id=pid, up_to_step=2)
    assert r2["current_state"] == "PACKED"
    assert r2["packer_id"] == "OPERATOR-88"

    # Step 3 replay
    r3 = await replay_service.reconstruct_parcel(parcel_id=pid, up_to_step=3)
    assert r3["current_state"] == "LOADED"
    assert r3["current_truck_id"] == "T-184"

    # Step 4 replay
    r4 = await replay_service.reconstruct_parcel(parcel_id=pid, up_to_step=4)
    assert r4["current_state"] == "DISPATCHED"

    # Full Step 5 replay
    r5 = await replay_service.reconstruct_parcel(parcel_id=pid)
    assert r5["current_state"] == "DELIVERED"
    assert r5["proof_of_delivery"] == "OTP_VERIFIED_9182"
    assert r5["event_count"] == 5
