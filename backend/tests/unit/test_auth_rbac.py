import pytest
from httpx import AsyncClient
from src.domain.auth_models import UserRole
from src.api.auth import create_access_token, verify_password, get_password_hash


@pytest.mark.asyncio
async def test_password_hashing_and_verification():
    """Verifies that bcrypt hashing and verification works properly."""
    raw_pass = "dispatch123"
    hashed = get_password_hash(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("wrongpass", hashed) is False


@pytest.mark.asyncio
async def test_oauth2_token_issuance_success(async_client: AsyncClient):
    """Verifies successful OAuth2 login returns valid JWT token."""
    res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": "dispatcher_delhi", "password": "dispatch123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == UserRole.DISPATCHER.value
    assert data["username"] == "dispatcher_delhi"


@pytest.mark.asyncio
async def test_oauth2_token_issuance_failure(async_client: AsyncClient):
    """Verifies incorrect password returns 401 Unauthorized."""
    res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": "dispatcher_delhi", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_rbac_unauthenticated_access_denied(async_client: AsyncClient):
    """Verifies that accessing protected incident action execution without token returns 401."""
    action_payload = {
        "action_type": "ACTIVATE_BACKUP_SCANNER",
        "action_title": "Activate Redundant Scanner Bay B",
        "description": "Switch conveyor to Bay B",
        "target_entity_id": "W12",
    }
    res = await async_client.post("/api/v1/incidents/INC-8921/actions", json=action_payload)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_rbac_read_only_role_forbidden(async_client: AsyncClient):
    """Verifies that READ_ONLY user is forbidden (403) from executing recovery actions."""
    # Obtain token for analyst_ops (READ_ONLY)
    auth_res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": "analyst_ops", "password": "read123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert auth_res.status_code == 200
    token = auth_res.json()["access_token"]

    action_payload = {
        "action_type": "ACTIVATE_BACKUP_SCANNER",
        "action_title": "Activate Redundant Scanner Bay B",
        "description": "Switch conveyor to Bay B",
        "target_entity_id": "W12",
    }
    res = await async_client.post(
        "/api/v1/incidents/INC-8921/actions",
        json=action_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "Operation not permitted" in res.json()["detail"]


@pytest.mark.asyncio
async def test_rbac_admin_role_authorized(async_client: AsyncClient):
    """Verifies that ADMIN user is authorized (200) to execute recovery actions."""
    auth_res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": "admin_root", "password": "admin123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert auth_res.status_code == 200
    token = auth_res.json()["access_token"]

    action_payload = {
        "action_type": "ACTIVATE_BACKUP_SCANNER",
        "action_title": "Admin Override Scanner Bay B",
        "description": "Admin override activation",
        "target_entity_id": "W12",
        "cost_estimate_inr": 1500.0,
        "eta_mins": 5,
    }
    res = await async_client.post(
        "/api/v1/incidents/INC-8921/actions",
        json=action_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "EXECUTED"
    assert data["executed_by"] == "admin_root"
