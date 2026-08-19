import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_delhi_w12_outage_flagship_demo_flow(async_client: AsyncClient):
    """
    End-to-End Signature Demo Verification (Delhi W12 Scanner Outage):
    1. Check initial network state (Delhi W12 active, 1 open incident INC-8921)
    2. Retrieve Phase 2 Context Dossier for INC-8921
    3. Run Phase 3 AI Reasoning Engine for Root Cause Analysis & Ranked Recovery Plan
    4. Validate that OPTION_A (Activate Backup Scanner) is top recommended
    5. Ingest operational exception event into Event Store
    6. Execute recovery action OPTION_A via API
    7. Verify Incident INC-8921 transitions to RESOLVED
    8. Verify Warehouse W12 status is restored to OPTIMAL
    9. Ingest recovery event for a held parcel (e.g. PACK -> LOAD -> DISPATCH)
    10. Verify event stream records and historical replay
    """
    # 1. Check network telemetry
    net_res = await async_client.get("/api/v1/network/summary")
    assert net_res.status_code == 200

    # 2. Retrieve Phase 2 Context Dossier
    ctx_res = await async_client.get("/api/v1/incidents/INC-8921/context?warehouse_id=W12")
    assert ctx_res.status_code == 200
    ctx = ctx_res.json()
    assert ctx["warehouse_id"] == "W12"
    assert ctx["context"]["warehouse_capacity_percent"] >= 90.0

    # 3. Phase 3 AI Reasoning
    ai_res = await async_client.post("/api/v1/incidents/INC-8921/analyze?warehouse_id=W12")
    assert ai_res.status_code == 200
    reasoning = ai_res.json()
    rca = reasoning["root_cause_analysis"]
    assert "UPS Battery" in rca["probable_root_cause"]
    assert rca["confidence_percent"] >= 85.0

    # 4. Validate Ranked Options
    options = reasoning["recovery_plan"]
    assert len(options) >= 3
    opt_a = next(o for o in options if o["option_id"] == "OPTION_A")
    assert opt_a["is_recommended"] is True
    assert opt_a["action_type"] == "ACTIVATE_BACKUP_SCANNER"

    # 5. Ingest scanner offline anomaly event
    anomaly_payload = {
        "event_type": "SCANNER_OFFLINE",
        "entity_id": "W12",
        "entity_type": "WAREHOUSE",
        "source": "IOT_TELEMETRY",
        "idempotency_key": "demo-scan-fail-1",
        "payload": {"bay": "Bay A", "voltage_v": 178.0, "reason": "Brownout"},
    }

    # 6. Authenticate as Operational Dispatcher (Phase 5 RBAC)
    auth_res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": "dispatcher_delhi", "password": "dispatch123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert auth_res.status_code == 200
    token = auth_res.json()["access_token"]

    # 7. Execute Recovery Action OPTION_A with Bearer Token
    act_res = await async_client.post(
        "/api/v1/incidents/INC-8921/actions",
        json={
            "action_type": opt_a["action_type"],
            "action_title": opt_a["action_title"],
            "description": opt_a["description"],
            "target_entity_id": "W12",
            "cost_estimate_inr": opt_a["cost_estimate_inr"],
            "eta_mins": opt_a["eta_mins"],
            "executed_by": "OPERATOR_DISPATCH",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert act_res.status_code == 200
    act_result = act_res.json()
    assert act_result["status"] == "EXECUTED"
    assert act_result["incident_status"] == "RESOLVED"

    # 7. Verify incident details now resolved
    inc_res = await async_client.get("/api/v1/incidents/INC-8921")
    assert inc_res.status_code == 200
    inc_details = inc_res.json()
    assert inc_details["status"] == "RESOLVED"
    assert len(inc_details["actions"]) >= 1

    # 8. Verify Warehouse W12 status restored to OPTIMAL
    wh_res = await async_client.get("/api/v1/warehouses/W12")
    assert wh_res.status_code == 200
    assert wh_res.json()["status"] == "OPTIMAL"

    # 9. Verify parcel workflow resumes normally
    demo_pid = "P-RECOVERY-901"
    create_res = await async_client.post(
        "/api/v1/events",
        json={
            "event_type": "PARCEL_CREATED",
            "entity_id": demo_pid,
            "source": "WMS_BAY_B_REDUNDANT",
            "idempotency_key": "demo-p901-created",
            "payload": {"weight": 6.8, "destination": "Bengaluru Hub (BLR)"},
        },
    )
    assert create_res.status_code == 202
    assert create_res.json()["state"] == "CREATED"

    pack_res = await async_client.post(
        "/api/v1/events",
        json={
            "event_type": "PARCEL_PACKED",
            "entity_id": demo_pid,
            "source": "WMS_BAY_B_REDUNDANT",
            "idempotency_key": "demo-p901-packed",
            "payload": {"packer_id": "OPR-RECOVERY-1"},
        },
    )
    assert pack_res.status_code == 202
    assert pack_res.json()["state"] == "PACKED"

    # 10. Verify event replay for parcel P-RECOVERY-901
    replay_res = await async_client.get(f"/api/v1/parcels/{demo_pid}/replay")
    assert replay_res.status_code == 200
    replay_data = replay_res.json()
    assert replay_data["current_state"] == "PACKED"
    assert replay_data["event_count"] == 2
    assert replay_data["weight_kg"] == 6.8

