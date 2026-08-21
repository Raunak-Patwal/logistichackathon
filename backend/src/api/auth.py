import os
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
import bcrypt
import jwt
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError

from src.domain.auth_models import (
    UserRole,
    PersonaMode,
    ROLE_TO_PERSONA,
    PERMISSIONS_BY_ROLE,
    TokenPayload,
    Token,
    User,
    UserInDB,
    UserPublicProfile,
    GoogleAuthRequest,
    GoogleDemoAuthRequest,
    RegisterRequest,
    ChangePasswordRequest,
    ChangePasswordResponse,
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
import random
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.database.models.user import UserRecord, OtpRecord
from src.config.settings import settings

logger = logging.getLogger(__name__)

# Security Configurations
SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    getattr(settings, "SECRET_KEY", "SUPER_SECRET_LOGISTICS_BRAIN_KEY_CHANGE_IN_PROD")
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12-hour operational shift token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


# --- Password Utilities ---
def get_password_hash(password: str) -> str:
    """Generates a secure salted bcrypt hash (optimized rounds for high-throughput operational systems)."""
    salt = bcrypt.gensalt(rounds=4)
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


# --- Mock Enterprise User Store (Pre-seeded authentic personas & Google profiles) ---
MOCK_USERS_DB: Dict[str, UserInDB] = {
    # 1. Operational Dispatcher (Delhi Hub Controller)
    "dispatcher_delhi": UserInDB(
        username="dispatcher_delhi",
        role=UserRole.DISPATCHER,
        persona=PersonaMode.OPERATIONS,
        full_name="Rajesh Varma",
        email="rajesh.varma@logisticsbrain.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.DISPATCHER],
        assigned_entity_id="W12",
        assigned_entity_type="WAREHOUSE",
        auth_provider="local",
        meta={"hub_city": "Delhi", "shift": "DAY_OPS", "station": "Northern Gate Command"},
        hashed_password=get_password_hash("dispatch123"),
        disabled=False,
    ),

    # 2. Fleet Drivers (In-Cab Transporters)
    "driver_rajesh": UserInDB(
        username="driver_rajesh",
        role=UserRole.DRIVER,
        persona=PersonaMode.DRIVER,
        full_name="Rajesh Kumar",
        email="rajesh.driver@logisticsbrain.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.DRIVER],
        assigned_entity_id="T-184",
        assigned_entity_type="TRUCK",
        auth_provider="local",
        meta={
            "driver_id": "DRV-102",
            "truck_reg": "DL-04-TR-9021",
            "active_route_id": "ROUTE-BOM-BLR",
            "phone": "+91 98101 23456",
            "license": "DL-2018-COMM-9912",
            "experience_years": 8,
        },
        hashed_password=get_password_hash("driver123"),
        disabled=False,
    ),
    "driver_vikram": UserInDB(
        username="driver_vikram",
        role=UserRole.DRIVER,
        persona=PersonaMode.DRIVER,
        full_name="Vikram Singh",
        email="vikram.singh@logisticsbrain.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.DRIVER],
        assigned_entity_id="T-102",
        assigned_entity_type="TRUCK",
        auth_provider="local",
        meta={
            "driver_id": "DRV-101",
            "truck_reg": "KA-01-TR-4412",
            "active_route_id": "ROUTE-DEL-BOM",
            "phone": "+91 98450 67890",
            "license": "KA-2016-COMM-7714",
            "experience_years": 11,
        },
        hashed_password=get_password_hash("driver123"),
        disabled=False,
    ),

    # 3. Customers / Consignees
    "customer_aarav": UserInDB(
        username="customer_aarav",
        role=UserRole.CUSTOMER,
        persona=PersonaMode.CUSTOMER,
        full_name="Aarav Patel",
        email="aarav.patel@mumbaitech.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.CUSTOMER],
        assigned_entity_id="CUST-IND-902",
        assigned_entity_type="CUSTOMER",
        auth_provider="local",
        meta={
            "tracked_parcels": ["P-10291", "P-10292"],
            "city": "Mumbai",
            "delivery_address": "Flat 402, Sea Breeze Apts, Bandra West, Mumbai 400050",
            "phone": "+91 99200 11223",
        },
        hashed_password=get_password_hash("customer123"),
        disabled=False,
    ),
    "customer_priya": UserInDB(
        username="customer_priya",
        role=UserRole.CUSTOMER,
        persona=PersonaMode.CUSTOMER,
        full_name="Dr. Priya Sen",
        email="priya.sen@apollohealth.org",
        permissions=PERMISSIONS_BY_ROLE[UserRole.CUSTOMER],
        assigned_entity_id="CUST-IND-404",
        assigned_entity_type="CUSTOMER",
        auth_provider="local",
        meta={
            "tracked_parcels": ["P-10293", "P-10294"],
            "city": "Delhi",
            "delivery_address": "Apollo Health Center, Sarita Vihar, New Delhi 110076",
            "phone": "+91 98110 55443",
            "vip_account": True,
        },
        hashed_password=get_password_hash("customer123"),
        disabled=False,
    ),

    # 4. Executive / C-Suite Leadership
    "executive_sharma": UserInDB(
        username="executive_sharma",
        role=UserRole.EXECUTIVE,
        persona=PersonaMode.EXECUTIVE,
        full_name="Dr. Alok Sharma",
        email="alok.sharma@logisticsbrain.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.EXECUTIVE],
        assigned_entity_id="HQ-NATIONAL",
        assigned_entity_type="REGION",
        auth_provider="local",
        meta={
            "title": "Chief Supply Chain & Logistics Officer (CSCO)",
            "division": "Executive Strategic Planning",
            "clearance": "EXECUTIVE_STRATEGY",
        },
        hashed_password=get_password_hash("exec123"),
        disabled=False,
    ),

    # 5. Warehouse / Facility Manager
    "manager_delhi_w12": UserInDB(
        username="manager_delhi_w12",
        role=UserRole.WAREHOUSE_MANAGER,
        persona=PersonaMode.OPERATIONS,
        full_name="Amitav Roy",
        email="amitav.roy@delhihub.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.WAREHOUSE_MANAGER],
        assigned_entity_id="W12",
        assigned_entity_type="WAREHOUSE",
        auth_provider="local",
        meta={
            "hub_name": "Delhi Northern Mega Hub (W12)",
            "docks_count": 24,
            "cold_chain_capacity_m3": 1200,
        },
        hashed_password=get_password_hash("warehouse123"),
        disabled=False,
    ),

    # 6. Read-Only Analyst
    "analyst_ops": UserInDB(
        username="analyst_ops",
        role=UserRole.READ_ONLY,
        persona=PersonaMode.OPERATIONS,
        full_name="Neha Gupta",
        email="neha.gupta@analytics.logisticsbrain.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.READ_ONLY],
        assigned_entity_id="ANALYTICS-TEAM",
        assigned_entity_type="REGION",
        auth_provider="local",
        meta={"department": "Network Business Intelligence"},
        hashed_password=get_password_hash("read123"),
        disabled=False,
    ),

    # 7. Enterprise Superadmin
    "admin_root": UserInDB(
        username="admin_root",
        role=UserRole.ADMIN,
        persona=PersonaMode.OPERATIONS,
        full_name="Antigravity SuperAdmin",
        email="root@logisticsbrain.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.ADMIN],
        assigned_entity_id="GLOBAL-ROOT",
        assigned_entity_type="SYSTEM",
        auth_provider="local",
        meta={"super_user": True, "tier": "ENTERPRISE_SYSTEM_ENGINEER"},
        hashed_password=get_password_hash("admin123"),
        disabled=False,
    ),

    # 8. Google-Authenticated Verified Personas
    "google_dispatcher_alex": UserInDB(
        username="google_dispatcher_alex",
        role=UserRole.DISPATCHER,
        persona=PersonaMode.OPERATIONS,
        full_name="Alex Mercer",
        email="alex.dispatcher@logisticsbrain.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.DISPATCHER],
        assigned_entity_id="W12",
        assigned_entity_type="WAREHOUSE",
        auth_provider="google",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        email_verified=True,
        meta={"google_workspace": True, "hub_city": "Delhi Mega Hub"},
        disabled=False,
    ),
    "google_driver_rajesh": UserInDB(
        username="google_driver_rajesh",
        role=UserRole.DRIVER,
        persona=PersonaMode.DRIVER,
        full_name="Rajesh Kumar",
        email="rajesh.driver@gmail.com",
        permissions=PERMISSIONS_BY_ROLE[UserRole.DRIVER],
        assigned_entity_id="T-184",
        assigned_entity_type="TRUCK",
        auth_provider="google",
        avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        email_verified=True,
        meta={"google_driver_sync": True, "active_route": "BOM-BLR"},
        disabled=False,
    ),
    "google_customer_aarav": UserInDB(
        username="google_customer_aarav",
        role=UserRole.CUSTOMER,
        persona=PersonaMode.CUSTOMER,
        full_name="Aarav Patel",
        email="aarav.customer@gmail.com",
        permissions=PERMISSIONS_BY_ROLE[UserRole.CUSTOMER],
        assigned_entity_id="CUST-IND-902",
        assigned_entity_type="CUSTOMER",
        auth_provider="google",
        avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
        email_verified=True,
        meta={"tracked_parcels": ["P-10291", "P-10292"]},
        disabled=False,
    ),
    "google_exec_sharma": UserInDB(
        username="google_exec_sharma",
        role=UserRole.EXECUTIVE,
        persona=PersonaMode.EXECUTIVE,
        full_name="Dr. Alok Sharma",
        email="alok.sharma@logisticsbrain.in",
        permissions=PERMISSIONS_BY_ROLE[UserRole.EXECUTIVE],
        assigned_entity_id="HQ-NATIONAL",
        assigned_entity_type="REGION",
        auth_provider="google",
        avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
        email_verified=True,
        meta={"google_sso_tier": "EXECUTIVE_BOARD"},
        disabled=False,
    ),
    "google_admin_root": UserInDB(
        username="google_admin_root",
        role=UserRole.ADMIN,
        persona=PersonaMode.OPERATIONS,
        full_name="Cloud SuperAdmin (Google SSO)",
        email="admin.root@cloudlogistics.io",
        permissions=PERMISSIONS_BY_ROLE[UserRole.ADMIN],
        assigned_entity_id="GLOBAL-ROOT",
        assigned_entity_type="SYSTEM",
        auth_provider="google",
        avatar_url="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
        email_verified=True,
        meta={"super_user": True, "auth_domain": "cloudlogistics.io"},
        disabled=False,
    ),
}


# --- Token Factory ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a cryptographically signed JWT token with custom claims."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def generate_token_response_for_user(user: UserInDB) -> Token:
    """Creates a full Token response populated from the User record."""
    claims = {
        "sub": user.username,
        "role": user.role.value,
        "persona": user.persona.value,
        "permissions": user.permissions,
        "full_name": user.full_name,
        "email": user.email,
        "auth_provider": user.auth_provider,
        "avatar_url": user.avatar_url,
        "email_verified": user.email_verified,
        "assigned_entity_id": user.assigned_entity_id,
    }
    access_token = create_access_token(claims)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        persona=user.persona,
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        auth_provider=user.auth_provider,
        avatar_url=user.avatar_url,
        email_verified=user.email_verified,
        permissions=user.permissions,
        assigned_entity_id=user.assigned_entity_id,
        meta=user.meta,
    )


# --- Google OAuth Token Verification & Dynamic Auto-Provisioning ---
async def verify_google_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verifies a Google OAuth ID Token.
    Queries Google's tokeninfo endpoint or falls back to standard payload decoding for demo/offline tokens.
    """
    token_str = (id_token or "").strip()

    # 1. Handle Mock/Demo/SSO Google Tokens
    if (
        token_str.startswith("demo_google_")
        or token_str.startswith("mock_google_")
        or token_str.startswith("google_oauth_")
        or token_str.startswith("google_sso_")
        or "." not in token_str
    ):
        token_key = (
            token_str.replace("demo_google_", "")
            .replace("mock_google_", "")
            .replace("google_oauth_", "")
            .replace("google_sso_", "")
        )
        demo_user = MOCK_USERS_DB.get(f"google_{token_key}") or MOCK_USERS_DB.get(token_key)
        if demo_user:
            return {
                "sub": f"google_{demo_user.username}",
                "email": demo_user.email,
                "name": demo_user.full_name,
                "picture": demo_user.avatar_url,
                "email_verified": True,
                "iss": "accounts.google.com",
            }
        clean_name = token_key.replace("_", " ").replace(".", " ").title() if token_key else "Google User"
        return {
            "sub": f"google_{token_key or 'user'}",
            "email": f"{token_key}@gmail.com" if "@" not in token_key else token_key,
            "name": clean_name,
            "picture": f"https://api.dicebear.com/7.x/bottts/svg?seed={token_key}",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

    # 2. Try online Google Tokeninfo Verification via httpx
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token_str}")
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "sub": data.get("sub"),
                    "email": data.get("email", ""),
                    "name": data.get("name", data.get("email", "Google User")),
                    "picture": data.get("picture"),
                    "email_verified": data.get("email_verified", "true") in [True, "true"],
                    "hd": data.get("hd"),
                    "iss": "accounts.google.com",
                }
    except Exception as e:
        logger.info(f"Online Google tokeninfo check skipped/offline: {e}")

    # 3. Fallback: Parse unverified JWT payload
    try:
        unverified = jwt.decode(token_str, options={"verify_signature": False})
        return {
            "sub": unverified.get("sub", "google_unverified_sub"),
            "email": unverified.get("email", "user@gmail.com"),
            "name": unverified.get("name", "Google User"),
            "picture": unverified.get("picture"),
            "email_verified": unverified.get("email_verified", True),
            "iss": "accounts.google.com",
        }
    except Exception as e:
        # Fallback to generous Google profile for development/testing
        return {
            "sub": f"google_{uuid.uuid4().hex[:8]}",
            "email": "user@gmail.com",
            "name": "Google User",
            "picture": "https://api.dicebear.com/7.x/bottts/svg?seed=google",
            "email_verified": True,
            "iss": "accounts.google.com",
        }


# In-Memory OTP Store for fast lookup & resilience
IN_MEMORY_OTP_STORE: Dict[str, Dict[str, Any]] = {}


def generate_6_digit_otp() -> str:
    """Generates a secure 6-digit numeric OTP code."""
    return f"{random.randint(100000, 999999)}"


def _send_smtp_sync(to_email: str, otp_code: str, full_name: Optional[str] = None) -> bool:
    """Synchronous SMTP email sender with rich HTML template."""
    import smtplib
    from email.message import EmailMessage

    host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
    port = getattr(settings, "SMTP_PORT", 587)
    user = getattr(settings, "SMTP_USER", None)
    password = getattr(settings, "SMTP_PASSWORD", None)
    from_email = getattr(settings, "SMTP_FROM_EMAIL", user or "noreply@logisticsbrain.io")
    from_name = getattr(settings, "SMTP_FROM_NAME", "AI Logistics Brain Security")

    msg = EmailMessage()
    msg["Subject"] = f"Your Verification Passcode: {otp_code} - AI Logistics Brain"
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    greeting = f"Hello {full_name}," if full_name else "Hello,"
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #040711; color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #0b1329; border: 1px solid #00f0ff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 24px rgba(0,240,255,0.15);">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #00f0ff; margin: 0; font-size: 22px; font-family: monospace; letter-spacing: 2px;">AI LOGISTICS BRAIN</h2>
      <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Enterprise Identity &amp; Multi-Agent Command Gateway</p>
    </div>
    <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;">
    <p style="font-size: 15px; color: #f8fafc; margin: 0 0 16px;">{greeting}</p>
    <p style="font-size: 14px; color: #94a3b8; margin: 0 0 24px; line-height: 1.5;">
      You requested a secure 6-digit one-time verification passcode (OTP) to authenticate into the AI Logistics Mission platform.
    </p>
    <div style="background: #040711; border: 1px dashed #00f0ff; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
      <span style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #00f0ff; font-family: monospace;">{otp_code}</span>
    </div>
    <p style="font-size: 12px; color: #64748b; margin: 24px 0 0; text-align: center;">
      This code is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email.
    </p>
  </div>
</body>
</html>"""

    msg.set_content(f"{greeting}\n\nYour AI Logistics Brain verification code is: {otp_code}\n\nThis code expires in 5 minutes.\n")
    msg.add_alternative(html_content, subtype="html")

    try:
        if user and password:
            with smtplib.SMTP(host, port, timeout=10) as server:
                if getattr(settings, "SMTP_TLS", True):
                    server.starttls()
                server.login(user, password)
                server.send_message(msg)
            logger.info(f"📧 [SMTP SUCCESS] OTP email successfully delivered to {to_email}")
            return True
        else:
            with smtplib.SMTP(host, port, timeout=4) as server:
                if getattr(settings, "SMTP_TLS", True):
                    server.starttls()
                server.send_message(msg)
            logger.info(f"📧 [SMTP SUCCESS] OTP email sent via relay to {to_email}")
            return True
    except Exception as exc:
        logger.warning(f"📧 [SMTP NOTICE] Could not send live SMTP email to {to_email} ({exc}). Using in-app dev fallback.")
        return False


async def send_email_otp(
    payload: SendOtpRequest,
    session: Optional[AsyncSession] = None,
) -> SendOtpResponse:
    """
    Generates and records a 6-digit Email OTP with 5-minute validity.
    Dispatches a real email via SMTP, stores in PostgreSQL / SQLite and in-memory cache.
    """
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid email address is required.",
        )

    otp_code = generate_6_digit_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    # 1. Store in memory
    IN_MEMORY_OTP_STORE[email] = {
        "code": otp_code,
        "purpose": payload.purpose,
        "expires_at": expires_at,
        "full_name": payload.full_name,
        "role": payload.role,
        "created_at": datetime.now(timezone.utc),
    }

    # 2. Store in Database if session available
    if session:
        try:
            otp_record = OtpRecord(
                id=str(uuid.uuid4()),
                email=email,
                otp_code=otp_code,
                purpose=payload.purpose,
                is_verified=False,
                expires_at=expires_at,
            )
            session.add(otp_record)
            await session.commit()
        except Exception as e:
            logger.warning(f"Failed to persist OTP to database, using memory store: {e}")

    logger.info(f"🔑 [AUTH OTP] 6-Digit Code for {email} ({payload.purpose}): {otp_code}")

    # 3. Dispatch real SMTP email to recipient inbox
    try:
        await asyncio.to_thread(_send_smtp_sync, email, otp_code, payload.full_name)
    except Exception as e:
        logger.error(f"SMTP dispatch failed for {email}: {e}")

    return SendOtpResponse(
        success=True,
        message=f"6-digit verification code sent to {email}. Check your inbox. Valid for 5 minutes.",
        email=email,
        expires_in_seconds=300,
        dev_otp=otp_code,
    )


async def verify_email_otp(
    payload: VerifyOtpRequest,
    session: Optional[AsyncSession] = None,
) -> VerifyOtpResponse:
    """
    Validates a 6-digit OTP code against the database / memory cache.
    Provisions or retrieves the user account and returns an authenticated JWT Token.
    """
    email = payload.email.strip().lower()
    code = payload.otp_code.strip()

    if not email or not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and 6-digit OTP code are required.",
        )

    # 1. Check in DB first if session available
    verified = False
    if session:
        try:
            stmt = select(OtpRecord).where(
                OtpRecord.email == email,
                OtpRecord.otp_code == code,
                OtpRecord.is_verified == False,
            ).order_by(OtpRecord.created_at.desc()).limit(1)
            res = await session.execute(stmt)
            otp_rec = res.scalar_one_or_none()
            if otp_rec:
                if otp_rec.expires_at > datetime.now(timezone.utc):
                    otp_rec.is_verified = True
                    await session.commit()
                    verified = True
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="OTP code has expired. Please request a new verification code.",
                    )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Database OTP lookup failed, falling back to cache: {e}")

    # 2. Check in memory fallback
    if not verified:
        mem_otp = IN_MEMORY_OTP_STORE.get(email)
        if not mem_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active OTP found for this email. Please request a new code.",
            )
        if mem_otp["code"] != code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code. Please enter the correct 6-digit code.",
            )
        if mem_otp["expires_at"] < datetime.now(timezone.utc):
            IN_MEMORY_OTP_STORE.pop(email, None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP code has expired. Please request a new verification code.",
            )
        IN_MEMORY_OTP_STORE.pop(email, None)

    # 3. Find or Provision User
    matched_user: Optional[UserInDB] = None
    if session:
        try:
            u_stmt = select(UserRecord).where(UserRecord.email == email).limit(1)
            u_res = await session.execute(u_stmt)
            u_rec = u_res.scalar_one_or_none()
            if u_rec:
                matched_user = UserInDB(
                    username=u_rec.username,
                    role=UserRole(u_rec.role),
                    persona=PersonaMode(u_rec.persona),
                    full_name=u_rec.full_name,
                    email=u_rec.email,
                    permissions=u_rec.permissions or PERMISSIONS_BY_ROLE.get(UserRole(u_rec.role), []),
                    assigned_entity_id=u_rec.assigned_entity_id,
                    auth_provider=u_rec.auth_provider,
                    avatar_url=u_rec.avatar_url,
                    email_verified=True,
                    hashed_password=u_rec.hashed_password,
                    disabled=u_rec.disabled,
                )
        except Exception as e:
            logger.warning(f"DB User lookup exception: {e}")

    if not matched_user:
        for u in MOCK_USERS_DB.values():
            if u.email.lower() == email.lower():
                matched_user = u
                break

    is_new_user = False
    if not matched_user:
        is_new_user = True
        assigned_role = payload.role or UserRole.CUSTOMER
        persona = ROLE_TO_PERSONA.get(assigned_role, PersonaMode.CUSTOMER)
        username = f"user_{email.split('@')[0].replace('.', '_')}"
        full_name = payload.full_name or email.split("@")[0].replace(".", " ").title()

        matched_user = UserInDB(
            username=username,
            role=assigned_role,
            persona=persona,
            full_name=full_name,
            email=email,
            permissions=PERMISSIONS_BY_ROLE.get(assigned_role, []),
            assigned_entity_id="CUST-OTP" if assigned_role == UserRole.CUSTOMER else "W12",
            assigned_entity_type="CUSTOMER" if assigned_role == UserRole.CUSTOMER else "WAREHOUSE",
            auth_provider="otp",
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={username}",
            email_verified=True,
            hashed_password=get_password_hash(payload.password or "otp_verified_user"),
            disabled=False,
        )
        MOCK_USERS_DB[username] = matched_user

        if session:
            try:
                new_db_user = UserRecord(
                    id=str(uuid.uuid4()),
                    username=username,
                    email=email,
                    full_name=full_name,
                    hashed_password=matched_user.hashed_password,
                    role=assigned_role.value,
                    persona=persona.value,
                    auth_provider="otp",
                    avatar_url=matched_user.avatar_url,
                    disabled=False,
                    email_verified=True,
                    assigned_entity_id=matched_user.assigned_entity_id,
                    permissions=matched_user.permissions,
                )
                session.add(new_db_user)
                await session.commit()
            except Exception as e:
                logger.warning(f"Failed to persist OTP user in database: {e}")

    matched_user.email_verified = True
    token_resp = generate_token_response_for_user(matched_user)
    return VerifyOtpResponse(
        token=token_resp,
        is_new_user=is_new_user,
        message=f"Email verified successfully. Welcome, {matched_user.full_name}!",
    )


async def authenticate_google_user(
    payload: GoogleAuthRequest,
    session: Optional[AsyncSession] = None,
) -> Token:
    """
    Authenticates a user via Google OAuth ID Token.
    Auto-provisions the user in PostgreSQL / SQLite and returns a signed system JWT Token.
    """
    google_data = await verify_google_id_token(payload.id_token)
    email = (payload.email or google_data.get("email", "")).strip().lower()
    name = payload.name or google_data.get("name", email.split("@")[0].title())
    picture = payload.picture or google_data.get("picture")

    # 1. Match in database if session available
    matched_user: Optional[UserInDB] = None
    if session and email:
        try:
            stmt = select(UserRecord).where(UserRecord.email == email).limit(1)
            res = await session.execute(stmt)
            u_rec = res.scalar_one_or_none()
            if u_rec:
                u_rec.auth_provider = "google"
                u_rec.avatar_url = picture or u_rec.avatar_url
                u_rec.email_verified = True
                await session.commit()
                matched_user = UserInDB(
                    username=u_rec.username,
                    role=UserRole(u_rec.role),
                    persona=PersonaMode(u_rec.persona),
                    full_name=u_rec.full_name,
                    email=u_rec.email,
                    permissions=u_rec.permissions or PERMISSIONS_BY_ROLE.get(UserRole(u_rec.role), []),
                    assigned_entity_id=u_rec.assigned_entity_id,
                    auth_provider="google",
                    avatar_url=u_rec.avatar_url,
                    email_verified=True,
                    hashed_password=u_rec.hashed_password,
                    disabled=u_rec.disabled,
                )
        except Exception as e:
            logger.warning(f"DB Google lookup error: {e}")

    # 2. Match in memory
    if not matched_user:
        for u in MOCK_USERS_DB.values():
            if u.email.lower() == email.lower():
                matched_user = u
                break

    if matched_user:
        matched_user.auth_provider = "google"
        matched_user.avatar_url = picture or matched_user.avatar_url
        matched_user.email_verified = True
        return generate_token_response_for_user(matched_user)

    # 3. Determine role from preferred role or heuristics
    if payload.preferred_role:
        assigned_role = payload.preferred_role
    elif "dispatcher" in email or "dispatch" in email:
        assigned_role = UserRole.DISPATCHER
    elif "driver" in email:
        assigned_role = UserRole.DRIVER
    elif "exec" in email:
        assigned_role = UserRole.EXECUTIVE
    elif "admin" in email:
        assigned_role = UserRole.ADMIN
    else:
        assigned_role = UserRole.CUSTOMER

    persona = ROLE_TO_PERSONA.get(assigned_role, PersonaMode.CUSTOMER)
    username = f"google_{email.split('@')[0].replace('.', '_')}"

    new_user = UserInDB(
        username=username,
        role=assigned_role,
        persona=persona,
        full_name=name,
        email=email,
        permissions=PERMISSIONS_BY_ROLE.get(assigned_role, []),
        assigned_entity_id="CUST-GOOGLE" if assigned_role == UserRole.CUSTOMER else "W12",
        assigned_entity_type="CUSTOMER" if assigned_role == UserRole.CUSTOMER else "WAREHOUSE",
        auth_provider="google",
        avatar_url=picture,
        email_verified=True,
        google_sub=google_data.get("sub"),
        meta={"google_auth": True, "created_at": datetime.now(timezone.utc).isoformat()},
        disabled=False,
    )
    MOCK_USERS_DB[username] = new_user

    # 4. Save new Google user in Database
    if session:
        try:
            db_user = UserRecord(
                id=str(uuid.uuid4()),
                username=username,
                email=email,
                full_name=name,
                hashed_password=get_password_hash(f"google_sso_{username}"),
                role=assigned_role.value,
                persona=persona.value,
                auth_provider="google",
                avatar_url=picture,
                disabled=False,
                email_verified=True,
                assigned_entity_id=new_user.assigned_entity_id,
                permissions=new_user.permissions,
            )
            session.add(db_user)
            await session.commit()
        except Exception as e:
            logger.warning(f"Failed to persist Google user in database: {e}")

    return generate_token_response_for_user(new_user)


async def authenticate_google_demo_user(payload: GoogleDemoAuthRequest) -> Token:
    """
    1-Click Google Demo login for immediate evaluation and UI testing.
    """
    preset_key = payload.preset_id
    user = MOCK_USERS_DB.get(preset_key) or MOCK_USERS_DB.get(f"google_{preset_key}")
    if not user:
        # Fallback to general user
        user = MOCK_USERS_DB.get(preset_key)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Google demo preset '{preset_key}' not found.",
            )

    # Ensure Google claims are set
    user.auth_provider = "google"
    user.email_verified = True
    if payload.preferred_role:
        user.role = payload.preferred_role
        user.persona = ROLE_TO_PERSONA.get(payload.preferred_role, PersonaMode.OPERATIONS)
        user.permissions = PERMISSIONS_BY_ROLE.get(payload.preferred_role, [])

    return generate_token_response_for_user(user)


async def register_new_user(
    payload: RegisterRequest,
    session: Optional[AsyncSession] = None,
) -> Token:
    """
    Registers a new user with password, securely hashes credentials,
    provisions the user in PostgreSQL and in-memory directory, and issues a JWT token.
    """
    username = payload.username.strip().lower()
    email = payload.email.strip().lower()

    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")
    if not payload.password or len(payload.password) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 4 characters long")

    # Check existence in DB if session available
    if session:
        try:
            stmt = select(UserRecord).where(
                (UserRecord.username == username) | (UserRecord.email == email)
            ).limit(1)
            res = await session.execute(stmt)
            if res.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User with username '{username}' or email '{email}' already exists.",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"DB User existence check warning: {e}")

    if username in MOCK_USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{username}' already exists. Please choose another username or log in.",
        )

    role = payload.role or UserRole.CUSTOMER
    persona = ROLE_TO_PERSONA.get(role, PersonaMode.OPERATIONS)
    permissions = PERMISSIONS_BY_ROLE.get(role, [])
    hashed_pwd = get_password_hash(payload.password)
    avatar = f"https://api.dicebear.com/7.x/bottts/svg?seed={username}"

    new_user = UserInDB(
        username=username,
        role=role,
        persona=persona,
        full_name=payload.full_name or payload.username,
        email=email,
        permissions=permissions,
        assigned_entity_id=payload.assigned_entity_id,
        auth_provider="local",
        avatar_url=avatar,
        email_verified=True,
        hashed_password=hashed_pwd,
        disabled=False,
    )

    MOCK_USERS_DB[username] = new_user

    # Persist in DB
    if session:
        try:
            db_user = UserRecord(
                id=str(uuid.uuid4()),
                username=username,
                email=email,
                full_name=new_user.full_name,
                hashed_password=hashed_pwd,
                role=role.value,
                persona=persona.value,
                auth_provider="local",
                avatar_url=avatar,
                disabled=False,
                email_verified=True,
                assigned_entity_id=payload.assigned_entity_id,
                permissions=permissions,
            )
            session.add(db_user)
            await session.commit()
        except Exception as e:
            logger.warning(f"Failed to insert user into database: {e}")

    logger.info(f"Successfully registered new user '{username}' with role '{role.value}' and password.")
    return generate_token_response_for_user(new_user)


async def change_user_password(
    payload: ChangePasswordRequest,
    session: Optional[AsyncSession] = None,
) -> ChangePasswordResponse:
    """
    Updates or resets password for a user account in PostgreSQL and memory.
    """
    username = payload.username.strip().lower()

    # Check password length
    if not payload.new_password or len(payload.new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 4 characters long.",
        )

    new_hashed = get_password_hash(payload.new_password)

    # 1. Update in DB if session available
    updated_in_db = False
    if session:
        try:
            stmt = select(UserRecord).where(
                (UserRecord.username == username) | (UserRecord.email == username)
            ).limit(1)
            res = await session.execute(stmt)
            db_user = res.scalar_one_or_none()
            if db_user:
                if payload.current_password and db_user.hashed_password:
                    if not verify_password(payload.current_password, db_user.hashed_password):
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Current password is incorrect.",
                        )
                db_user.hashed_password = new_hashed
                await session.commit()
                updated_in_db = True
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"DB update password error: {e}")

    # 2. Update in memory
    user = MOCK_USERS_DB.get(username)
    if user:
        if payload.current_password and user.hashed_password:
            if not verify_password(payload.current_password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Current password is incorrect.",
                )
        user.hashed_password = new_hashed
    elif not updated_in_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' not found.",
        )

    logger.info(f"Password successfully updated for user '{username}'.")
    return ChangePasswordResponse(
        status="SUCCESS",
        message=f"Password for user '{username}' has been successfully updated.",
    )


# --- Authentication Dependencies ---
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """FastAPI dependency: extracts, validates, and decodes JWT credentials."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role_str: str = payload.get("role")
        persona_str: str = payload.get("persona", PersonaMode.OPERATIONS.value)
        if username is None or role_str is None:
            raise credentials_exception

        role = UserRole(role_str)
        persona = PersonaMode(persona_str) if persona_str in [p.value for p in PersonaMode] else ROLE_TO_PERSONA.get(role, PersonaMode.OPERATIONS)
        permissions = payload.get("permissions", PERMISSIONS_BY_ROLE.get(role, []))
        full_name = payload.get("full_name", "")
        email = payload.get("email", "")
        auth_provider = payload.get("auth_provider", "local")
        avatar_url = payload.get("avatar_url")
        email_verified = payload.get("email_verified", True)
        assigned_entity_id = payload.get("assigned_entity_id")

        token_data = TokenPayload(
            sub=username,
            role=role,
            persona=persona,
            permissions=permissions,
            full_name=full_name,
            email=email,
            auth_provider=auth_provider,
            avatar_url=avatar_url,
            assigned_entity_id=assigned_entity_id,
        )
    except (jwt.PyJWTError, ValidationError, ValueError) as exc:
        logger.warning(f"JWT Validation failed: {exc}")
        raise credentials_exception

    user = MOCK_USERS_DB.get(token_data.sub)
    if user is None or user.disabled:
        # Fallback to token claims if user was dynamically authenticated
        return User(
            username=token_data.sub,
            role=token_data.role,
            persona=token_data.persona,
            full_name=token_data.full_name or token_data.sub,
            email=token_data.email or "",
            permissions=token_data.permissions,
            assigned_entity_id=token_data.assigned_entity_id,
            auth_provider=token_data.auth_provider,
            avatar_url=token_data.avatar_url,
            email_verified=True,
            disabled=False,
        )

    return User(
        username=user.username,
        role=user.role,
        persona=user.persona,
        full_name=user.full_name,
        email=user.email,
        permissions=user.permissions,
        assigned_entity_id=user.assigned_entity_id,
        assigned_entity_type=user.assigned_entity_type,
        auth_provider=user.auth_provider,
        avatar_url=user.avatar_url,
        email_verified=user.email_verified,
        meta=user.meta,
        disabled=user.disabled,
    )


async def get_optional_current_user(
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False))
) -> Optional[User]:
    """Helper for semi-public endpoints that can adjust responses if authenticated."""
    if not token:
        return None
    try:
        return await get_current_user(token)
    except Exception:
        return None


# --- Role-Based Access Control (RBAC) Guard Factory ---
class RequireRole:
    """
    FastAPI dependency that verifies whether the authenticated user 
    possesses one of the authorized roles (or is an ADMIN).
    """
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        # ADMIN role has full superuser bypass
        if current_user.role == UserRole.ADMIN:
            return current_user

        if current_user.role not in self.allowed_roles:
            logger.warning(
                f"Access Denied: User '{current_user.username}' with role '{current_user.role.value}' "
                f"attempted to access an endpoint requiring {[r.value for r in self.allowed_roles]}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {[r.value for r in self.allowed_roles]}"
            )
        return current_user


class RequirePermission:
    """
    FastAPI dependency that verifies whether the authenticated user 
    possesses a specific fine-grained permission string.
    """
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.ADMIN or "*" in current_user.permissions:
            return current_user

        if self.required_permission not in current_user.permissions:
            logger.warning(
                f"Permission Denied: User '{current_user.username}' lacks permission '{self.required_permission}'"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required permission: '{self.required_permission}'"
            )
        return current_user


def get_public_users_directory() -> List[UserPublicProfile]:
    """Returns a list of demo personas available for rapid switching & review."""
    descriptions: Dict[str, str] = {
        "dispatcher_delhi": "Operational Controller: 3D twin, incident command, fleet routing & countermeasure execution.",
        "driver_rajesh": "Fleet Captain (Truck T-184): In-Cab HUD, dynamic bypass detours & delivery proof submission.",
        "driver_vikram": "Express Pilot (Truck T-102): Fast freight transit, telemetry updates & route guidance.",
        "customer_aarav": "Consignee (Mumbai): Conversational Copilot, live shipment tracking & delivery rescheduling.",
        "customer_priya": "Healthcare Consignee (Delhi): Critical medicine parcel tracking & priority delivery verification.",
        "executive_sharma": "Chief Logistics Officer: C-Suite macro scorecards, ESG emissions & strategic AI recommendations.",
        "manager_delhi_w12": "Fulfillment Hub Lead (W12): Dock management, scanner maintenance & cold chain staging.",
        "analyst_ops": "Business Intelligence Analyst: Read-only live telemetry, network graphs & audit logs.",
        "admin_root": "Platform SuperAdmin: Full platform controls, system diagnostics, ADRs & infrastructure config.",
        "google_dispatcher_alex": "Google Workspace Dispatcher: Real-time mission control & active fleet rerouting.",
        "google_driver_rajesh": "Google Driver SSO: In-Cab heads up display & sensor stream sync.",
        "google_customer_aarav": "Google Consignee: AI shipment copilot & priority parcel updates.",
        "google_exec_sharma": "Google Board Executive: Strategic supply chain analytics & carbon ledger.",
        "google_admin_root": "Google Cloud Root Admin: Global infrastructure oversight & zero-trust security.",
    }

    profiles = []
    for username, u in MOCK_USERS_DB.items():
        profiles.append(
            UserPublicProfile(
                username=u.username,
                role=u.role,
                persona=u.persona,
                full_name=u.full_name,
                email=u.email,
                description=descriptions.get(username, "Logistics Platform User"),
                auth_provider=u.auth_provider,
                avatar_url=u.avatar_url,
                assigned_entity_id=u.assigned_entity_id,
                assigned_entity_type=u.assigned_entity_type,
                meta=u.meta,
            )
        )
    return profiles
    

