import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_network_summary(async_client: AsyncClient):
    response = await async_client.get("/api/v1/network/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_warehouses"] >= 1
    assert data["consistency"] == "100% ACID (Single Tx)"


@pytest.mark.asyncio
async def test_ingest_event_and_query(async_client: AsyncClient):
    # Ingest event
    payload = {
        "event_type": "PARCEL_CREATED",
        "entity_id": "PKG-API-TEST",
        "entity_type": "PARCEL",
        "source": "WMS_API",
        "idempotency_key": "idemp-api-1",
        "payload": {"weight": 7.2, "destination": "Kolkata W19"},
    }
    res = await async_client.post("/api/v1/events", json=payload)
    assert res.status_code == 202
    res_data = res.json()
    assert res_data["status"] == "ACCEPTED"
    assert res_data["state"] == "CREATED"

    # Query events
    events_res = await async_client.get("/api/v1/events?entity_id=PKG-API-TEST")
    assert events_res.status_code == 200
    events_list = events_res.json()
    assert len(events_list) >= 1
    assert events_list[0]["entity_id"] == "PKG-API-TEST"

    # Query parcel
    parcel_res = await async_client.get("/api/v1/parcels/PKG-API-TEST")
    assert parcel_res.status_code == 200
    p_data = parcel_res.json()
    assert p_data["id"] == "PKG-API-TEST"
    assert p_data["state"] == "CREATED"


@pytest.mark.asyncio
async def test_invalid_state_transition_api_error(async_client: AsyncClient):
    payload = {
        "event_type": "PARCEL_DELIVERED",
        "entity_id": "PKG-ILLEGAL-API",
        "source": "WMS_API",
        "payload": {"proof": "NONE"},
    }
    res = await async_client.post("/api/v1/events", json=payload)
    assert res.status_code == 400
    err_data = res.json()
    assert err_data["detail"]["code"] == "INVALID_STATE_TRANSITION"


@pytest.mark.asyncio
async def test_trucks_and_warehouses_api(async_client: AsyncClient):
    # List warehouses
    wh_res = await async_client.get("/api/v1/warehouses")
    assert wh_res.status_code == 200
    wh_data = wh_res.json()
    assert len(wh_data) >= 1

    # List trucks
    truck_res = await async_client.get("/api/v1/trucks")
    assert truck_res.status_code == 200
    truck_data = truck_res.json()
    assert len(truck_data) >= 1


@pytest.mark.asyncio
async def test_incidents_lifecycle_api(async_client: AsyncClient):
    # 1. List incidents
    inc_res = await async_client.get("/api/v1/incidents")
    assert inc_res.status_code == 200
    inc_data = inc_res.json()
    assert len(inc_data) >= 1

    # 2. Get context dossier
    ctx_res = await async_client.get("/api/v1/incidents/INC-8921/context")
    assert ctx_res.status_code == 200
    ctx_data = ctx_res.json()
    assert ctx_data["incident_id"] == "INC-8921"
    assert ctx_data["context"]["warehouse_capacity_percent"] >= 90.0

    # 3. AI Analyze
    ai_res = await async_client.post("/api/v1/incidents/INC-8921/analyze")
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert ai_data["root_cause_analysis"]["confidence_percent"] > 80.0
    assert len(ai_data["recovery_plan"]) >= 1

    # 4. OAuth2 Token Acquisition
    auth_res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": "dispatcher_delhi", "password": "dispatch123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert auth_res.status_code == 200
    token = auth_res.json()["access_token"]

    # 5. Execute Action with Bearer Token
    action_payload = {
        "action_type": "ACTIVATE_BACKUP_SCANNER",
        "action_title": "Activate Redundant Scanner Bay B",
        "description": "Switch outbound conveyor scanning to Bay B optical line.",
        "target_entity_id": "W12",
        "cost_estimate_inr": 1500.0,
        "eta_mins": 6,
        "executed_by": "OPERATOR_DISPATCH",
    }
    act_res = await async_client.post(
        "/api/v1/incidents/INC-8921/actions",
        json=action_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert act_res.status_code == 200
    act_data = act_res.json()
    assert act_data["status"] == "EXECUTED"
    assert act_data["incident_status"] == "RESOLVED"
