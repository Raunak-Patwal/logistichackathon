import os
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import ValidationError

from src.domain.auth_models import UserRole, TokenPayload, User, UserInDB
from src.config.settings import settings

logger = logging.getLogger(__name__)

# Security Configurations
SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    getattr(settings, "SECRET_KEY", "SUPER_SECRET_LOGISTICS_BRAIN_KEY_CHANGE_IN_PROD")
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8-hour operational shift token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

import bcrypt

# --- Password Utilities ---
def get_password_hash(password: str) -> str:
    """Generates a secure salted bcrypt hash."""
    salt = bcrypt.gensalt()
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


# Mock User Store (Pre-seeded with operational credentials)
MOCK_USERS_DB = {
    "dispatcher_delhi": UserInDB(
        username="dispatcher_delhi",
        role=UserRole.DISPATCHER,
        hashed_password=get_password_hash("dispatch123"),
        disabled=False,
    ),
    "analyst_ops": UserInDB(
        username="analyst_ops",
        role=UserRole.READ_ONLY,
        hashed_password=get_password_hash("read123"),
        disabled=False,
    ),
    "admin_root": UserInDB(
        username="admin_root",
        role=UserRole.ADMIN,
        hashed_password=get_password_hash("admin123"),
        disabled=False,
    ),
}


# --- Token Factory ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# --- Authentication Dependency ---
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise credentials_exception
        token_data = TokenPayload(sub=username, role=UserRole(role))
    except (jwt.PyJWTError, ValidationError, ValueError):
        raise credentials_exception

    user = MOCK_USERS_DB.get(token_data.sub)
    if user is None or user.disabled:
        raise credentials_exception

    return User(username=user.username, role=user.role, disabled=user.disabled)


# --- Optional Auth Helper for Public/Semi-protected Routes ---
async def get_optional_current_user(token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False))) -> Optional[User]:
    if not token:
        return None
    try:
        return await get_current_user(token)
    except Exception:
        return None


# --- RBAC Guard Factory ---
class RequireRole:
    """
    FastAPI dependency that verifies whether the authenticated user 
    possesses one of the authorized roles for the target route.
    """
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
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
