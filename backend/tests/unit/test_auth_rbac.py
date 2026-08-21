import pytest
from httpx import AsyncClient
from src.domain.auth_models import UserRole, PersonaMode
from src.api.auth import (
    create_access_token,
    verify_password,
    get_password_hash,
    RequireRole,
    RequirePermission,
)


@pytest.mark.asyncio
async def test_password_hashing_and_verification():
    """Verifies that bcrypt hashing and verification works properly."""
    raw_pass = "dispatch123"
    hashed = get_password_hash(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("wrongpass", hashed) is False


@pytest.mark.asyncio
async def test_oauth2_token_issuance_dispatcher(async_client: AsyncClient):
    """Verifies successful OAuth2 login for Dispatcher returns valid JWT and persona claims."""
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
    assert data["persona"] == PersonaMode.OPERATIONS.value
    assert data["username"] == "dispatcher_delhi"
    assert data["full_name"] == "Rajesh Varma"
    assert data["assigned_entity_id"] == "W12"
    assert len(data["permissions"]) > 0


@pytest.mark.asyncio
async def test_oauth2_token_issuance_driver(async_client: AsyncClient):
    """Verifies successful OAuth2 login for Fleet Driver."""
    res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": "driver_rajesh", "password": "driver123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == UserRole.DRIVER.value
    assert data["persona"] == PersonaMode.DRIVER.value
    assert data["username"] == "driver_rajesh"
    assert data["assigned_entity_id"] == "T-184"
    assert "driver:hud_access" in data["permissions"]


@pytest.mark.asyncio
async def test_oauth2_token_issuance_customer(async_client: AsyncClient):
    """Verifies successful OAuth2 login for Customer."""
    res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": "customer_aarav", "password": "customer123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == UserRole.CUSTOMER.value
    assert data["persona"] == PersonaMode.CUSTOMER.value
    assert data["assigned_entity_id"] == "CUST-IND-902"
    assert "customer:track_parcel" in data["permissions"]


@pytest.mark.asyncio
async def test_json_login_endpoint(async_client: AsyncClient):
    """Verifies JSON POST /api/v1/auth/login endpoint for SPA clients."""
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "executive_sharma", "password": "exec123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == UserRole.EXECUTIVE.value
    assert data["persona"] == PersonaMode.EXECUTIVE.value
    assert data["full_name"] == "Dr. Alok Sharma"
    assert "executive:dashboard_access" in data["permissions"]


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
async def test_public_users_directory(async_client: AsyncClient):
    """Verifies GET /api/v1/auth/users returns all demo personas."""
    res = await async_client.get("/api/v1/auth/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 7
    usernames = [u["username"] for u in users]
    assert "dispatcher_delhi" in usernames
    assert "driver_rajesh" in usernames
    assert "customer_aarav" in usernames
    assert "executive_sharma" in usernames
    assert "admin_root" in usernames


@pytest.mark.asyncio
async def test_switch_role_endpoint(async_client: AsyncClient):
    """Verifies POST /api/v1/auth/switch-role enables rapid demo switching."""
    res = await async_client.post(
        "/api/v1/auth/switch-role",
        json={"username": "driver_vikram"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "driver_vikram"
    assert data["role"] == UserRole.DRIVER.value
    assert data["persona"] == PersonaMode.DRIVER.value


@pytest.mark.asyncio
async def test_authenticated_me_endpoint(async_client: AsyncClient):
    """Verifies GET /api/v1/auth/me returns current user profile."""
    # Obtain token
    auth_res = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "driver_rajesh", "password": "driver123"},
    )
    token = auth_res.json()["access_token"]

    res = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["username"] == "driver_rajesh"
    assert user_data["role"] == UserRole.DRIVER.value
    assert user_data["assigned_entity_id"] == "T-184"


@pytest.mark.asyncio
async def test_rbac_unauthenticated_access_denied(async_client: AsyncClient):
    """Verifies accessing protected incident action without token returns 401."""
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
    """Verifies READ_ONLY user is forbidden (403) from executing recovery actions."""
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
    """Verifies ADMIN user is authorized (200) to execute recovery actions via superuser bypass."""
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


@pytest.mark.asyncio
async def test_google_oauth_token_exchange(async_client: AsyncClient):
    """Verifies POST /api/v1/auth/google issues signed JWT with Google provider claims."""
    res = await async_client.post(
        "/api/v1/auth/google",
        json={
            "id_token": "demo_google_dispatcher_alex",
            "email": "alex.dispatcher@logisticsbrain.in",
            "name": "Alex Mercer",
            "picture": "https://example.com/avatar.jpg",
            "preferred_role": "DISPATCHER",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["auth_provider"] == "google"
    assert data["role"] == UserRole.DISPATCHER.value
    assert data["persona"] == PersonaMode.OPERATIONS.value
    assert data["email_verified"] is True
    assert data["email"] == "alex.dispatcher@logisticsbrain.in"


@pytest.mark.asyncio
async def test_google_demo_login(async_client: AsyncClient):
    """Verifies POST /api/v1/auth/google/demo authenticates Google preset identities."""
    res = await async_client.post(
        "/api/v1/auth/google/demo",
        json={"preset_id": "google_driver_rajesh"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["auth_provider"] == "google"
    assert data["role"] == UserRole.DRIVER.value
    assert data["persona"] == PersonaMode.DRIVER.value
    assert "driver:hud_access" in data["permissions"]


@pytest.mark.asyncio
async def test_user_registration_with_password(async_client: AsyncClient):
    """Verifies POST /api/v1/auth/register creates user with hashed password and issues JWT."""
    res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "new_driver_singh",
            "password": "strongpassword123",
            "email": "singh@logistics.com",
            "full_name": "Harpreet Singh",
            "role": "DRIVER",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "new_driver_singh"
    assert data["role"] == "DRIVER"
    assert data["persona"] == "DRIVER"
    assert "access_token" in data

    # Verify logging in with the newly registered password works
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "new_driver_singh", "password": "strongpassword123"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


@pytest.mark.asyncio
async def test_user_password_change(async_client: AsyncClient):
    """Verifies POST /api/v1/auth/change-password updates encrypted credentials."""
    # Change password for dispatcher_delhi
    res = await async_client.post(
        "/api/v1/auth/change-password",
        json={
            "username": "dispatcher_delhi",
            "current_password": "dispatch123",
            "new_password": "new_dispatch_secret_2026",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SUCCESS"

    # Verify old password is now rejected
    old_login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "dispatcher_delhi", "password": "dispatch123"},
    )
    assert old_login.status_code == 401

    # Verify new password is accepted
    new_login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "dispatcher_delhi", "password": "new_dispatch_secret_2026"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_email_otp_send_and_verify_flow(async_client: AsyncClient):
    """Verifies complete 6-digit Email OTP generation, dispatch, and verification flow."""
    test_email = "operations.lead@logisticsenterprise.com"

    # 1. Dispatch 6-digit OTP
    send_res = await async_client.post(
        "/api/v1/auth/otp/send",
        json={
            "email": test_email,
            "purpose": "LOGIN",
            "full_name": "Operations Lead",
            "role": "DISPATCHER",
        },
    )
    assert send_res.status_code == 200
    send_data = send_res.json()
    assert send_data["success"] is True
    assert send_data["email"] == test_email
    assert len(send_data["dev_otp"]) == 6
    otp_code = send_data["dev_otp"]

    # 2. Test Invalid OTP Code Rejection
    bad_verify = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={
            "email": test_email,
            "otp_code": "000000",
            "purpose": "LOGIN",
        },
    )
    assert bad_verify.status_code == 400

    # 3. Test Valid OTP Verification & Immediate JWT Issuance
    verify_res = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={
            "email": test_email,
            "otp_code": otp_code,
            "purpose": "LOGIN",
            "full_name": "Operations Lead",
            "role": "DISPATCHER",
        },
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert "token" in verify_data
    token = verify_data["token"]
    assert token["role"] == "DISPATCHER"
    assert token["auth_provider"] == "otp"
    assert token["email_verified"] is True
    assert "access_token" in token


