from enum import Enum
from typing import Optional
from pydantic import BaseModel


class UserRole(str, Enum):
    READ_ONLY = "READ_ONLY"
    DISPATCHER = "DISPATCHER"
    ADMIN = "ADMIN"


class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole
    username: str


class TokenPayload(BaseModel):
    sub: str                  # Subject (Username or User ID)
    role: UserRole
    exp: Optional[int] = None # Expiration timestamp


class User(BaseModel):
    username: str
    role: UserRole
    disabled: bool = False


class UserInDB(User):
    hashed_password: str
