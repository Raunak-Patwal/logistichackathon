from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.domain.auth_models import (
    Token,
    User,
    LoginRequest,
    RegisterRequest,
    ChangePasswordRequest,
    ChangePasswordResponse,
    RoleSwitchRequest,
    UserPublicProfile,
    GoogleAuthRequest,
    GoogleDemoAuthRequest,
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from src.api.auth import (
    verify_password,
    get_current_user,
    generate_token_response_for_user,
    get_public_users_directory,
    authenticate_google_user,
    authenticate_google_demo_user,
    register_new_user,
    change_user_password,
    send_email_otp,
    verify_email_otp,
    MOCK_USERS_DB,
)
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.user import UserRecord

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_db_session),
):
    """
    OAuth2 Password Flow token issuer.
    Authenticates username/password against Database / Directory and issues a signed JWT token.
    """
    # 1. Look in DB first
    try:
        stmt = select(UserRecord).where(
            (UserRecord.username == form_data.username) | (UserRecord.email == form_data.username)
        ).limit(1)
        res = await session.execute(stmt)
        db_user = res.scalar_one_or_none()
        if db_user:
            if not verify_password(form_data.password, db_user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            if db_user.disabled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is disabled",
                )
            from src.domain.auth_models import UserRole, PersonaMode, PERMISSIONS_BY_ROLE, UserInDB
            user_in_db = UserInDB(
                username=db_user.username,
                role=UserRole(db_user.role),
                persona=PersonaMode(db_user.persona),
                full_name=db_user.full_name,
                email=db_user.email,
                permissions=db_user.permissions or PERMISSIONS_BY_ROLE.get(UserRole(db_user.role), []),
                assigned_entity_id=db_user.assigned_entity_id,
                auth_provider=db_user.auth_provider,
                avatar_url=db_user.avatar_url,
                email_verified=db_user.email_verified,
                hashed_password=db_user.hashed_password,
                disabled=db_user.disabled,
            )
            return generate_token_response_for_user(user_in_db)
    except HTTPException:
        raise
    except Exception:
        pass

    # 2. In-memory directory check
    user = MOCK_USERS_DB.get(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return generate_token_response_for_user(user)


@router.post("/login", response_model=Token)
async def login_with_json(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    JSON-based login endpoint for modern Single-Page Applications with DB validation.
    """
    # 1. Look in DB
    try:
        stmt = select(UserRecord).where(
            (UserRecord.username == payload.username) | (UserRecord.email == payload.username)
        ).limit(1)
        res = await session.execute(stmt)
        db_user = res.scalar_one_or_none()
        if db_user:
            if not verify_password(payload.password, db_user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            if db_user.disabled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is disabled",
                )
            from src.domain.auth_models import UserRole, PersonaMode, PERMISSIONS_BY_ROLE, UserInDB
            user_in_db = UserInDB(
                username=db_user.username,
                role=UserRole(db_user.role),
                persona=PersonaMode(db_user.persona),
                full_name=db_user.full_name,
                email=db_user.email,
                permissions=db_user.permissions or PERMISSIONS_BY_ROLE.get(UserRole(db_user.role), []),
                assigned_entity_id=db_user.assigned_entity_id,
                auth_provider=db_user.auth_provider,
                avatar_url=db_user.avatar_url,
                email_verified=db_user.email_verified,
                hashed_password=db_user.hashed_password,
                disabled=db_user.disabled,
            )
            return generate_token_response_for_user(user_in_db)
    except HTTPException:
        raise
    except Exception:
        pass

    # 2. In-memory check
    user = MOCK_USERS_DB.get(payload.username)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return generate_token_response_for_user(user)


@router.post("/register", response_model=Token)
async def register_account(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Register a new user account with a secure password, role selection, and immediate DB session generation.
    """
    return await register_new_user(payload, session)


@router.post("/change-password", response_model=ChangePasswordResponse)
async def update_password(
    payload: ChangePasswordRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Set or update password for any user account with DB persistence.
    """
    return await change_user_password(payload, session)


@router.post("/otp/send", response_model=SendOtpResponse)
async def send_otp_code(
    payload: SendOtpRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Generate and dispatch a 6-digit Email Verification OTP code (5-minute TTL).
    """
    return await send_email_otp(payload, session)


@router.post("/otp/verify", response_model=VerifyOtpResponse)
async def verify_otp_code(
    payload: VerifyOtpRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Validate 6-digit Email OTP, verify user email, provision account in PostgreSQL DB, and return JWT Bearer Token.
    """
    return await verify_email_otp(payload, session)


@router.post("/google", response_model=Token)
async def login_with_google(
    payload: GoogleAuthRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Google OAuth 2.0 Token Exchange Endpoint.
    Validates Google ID Token, verifies email and profile, and issues a signed JWT Bearer Token.
    """
    return await authenticate_google_user(payload, session)


@router.post("/google/demo", response_model=Token)
async def login_with_google_demo(payload: GoogleDemoAuthRequest):
    """
    Convenience endpoint for 1-click Google Single Sign-On demo testing.
    """
    return await authenticate_google_demo_user(payload)


@router.post("/switch-role", response_model=Token)
async def switch_user_role(payload: RoleSwitchRequest):
    """
    Convenience endpoint for instantaneous persona / role switching during demonstration.
    Generates a valid signed JWT token for the requested persona.
    """
    user = MOCK_USERS_DB.get(payload.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User persona '{payload.username}' not found in directory.",
        )
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return generate_token_response_for_user(user)


@router.get("/me", response_model=User)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's complete profile, active role, persona, and permissions."""
    return current_user


@router.get("/users", response_model=List[UserPublicProfile])
async def list_available_personas():
    """
    Returns the public directory of available demo personas for 1-click switching in the UI.
    """
    return get_public_users_directory()

