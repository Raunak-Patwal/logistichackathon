from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DISPATCHER = "DISPATCHER"
    DRIVER = "DRIVER"
    CUSTOMER = "CUSTOMER"
    EXECUTIVE = "EXECUTIVE"
    WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER"
    READ_ONLY = "READ_ONLY"


class PersonaMode(str, Enum):
    OPERATIONS = "OPERATIONS"
    DRIVER = "DRIVER"
    CUSTOMER = "CUSTOMER"
    EXECUTIVE = "EXECUTIVE"


# Role to Frontend Persona Mapping
ROLE_TO_PERSONA: Dict[UserRole, PersonaMode] = {
    UserRole.ADMIN: PersonaMode.OPERATIONS,
    UserRole.DISPATCHER: PersonaMode.OPERATIONS,
    UserRole.WAREHOUSE_MANAGER: PersonaMode.OPERATIONS,
    UserRole.READ_ONLY: PersonaMode.OPERATIONS,
    UserRole.DRIVER: PersonaMode.DRIVER,
    UserRole.CUSTOMER: PersonaMode.CUSTOMER,
    UserRole.EXECUTIVE: PersonaMode.EXECUTIVE,
}


# Default Granular Permissions by Role
PERMISSIONS_BY_ROLE: Dict[UserRole, List[str]] = {
    UserRole.ADMIN: ["*"],
    UserRole.DISPATCHER: [
        "events:view",
        "events:inject",
        "events:replay",
        "incidents:view",
        "incidents:analyze",
        "incidents:execute_action",
        "trucks:view",
        "trucks:reroute",
        "trucks:dispatch",
        "parcels:view",
        "parcels:reassign",
        "warehouses:view",
        "network:view",
    ],
    UserRole.DRIVER: [
        "driver:hud_access",
        "driver:telemetry_push",
        "driver:accept_detour",
        "driver:report_incident",
        "driver:confirm_delivery",
        "driver:update_status",
        "trucks:view_assigned",
        "parcels:view_manifest",
    ],
    UserRole.CUSTOMER: [
        "customer:portal_access",
        "customer:track_parcel",
        "customer:chat_copilot",
        "customer:reschedule_delivery",
        "customer:confirm_otp",
        "parcels:view_own",
    ],
    UserRole.EXECUTIVE: [
        "executive:dashboard_access",
        "executive:view_financials",
        "executive:view_esg_carbon",
        "executive:demand_forecast",
        "executive:strategic_ai",
        "network:view_macro",
    ],
    UserRole.WAREHOUSE_MANAGER: [
        "warehouse:manage_dock",
        "warehouse:inventory_stage",
        "warehouse:scanner_calibrate",
        "warehouse:cold_chain_monitor",
        "incidents:view_facility",
        "incidents:execute_facility_action",
        "parcels:view",
        "events:view",
    ],
    UserRole.READ_ONLY: [
        "events:view",
        "incidents:view",
        "parcels:view",
        "trucks:view",
        "warehouses:view",
        "network:view",
    ],
}


class User(BaseModel):
    username: str
    role: UserRole
    persona: PersonaMode = PersonaMode.OPERATIONS
    full_name: str = ""
    email: str = ""
    permissions: List[str] = Field(default_factory=list)
    assigned_entity_id: Optional[str] = None
    assigned_entity_type: Optional[str] = None  # "TRUCK", "WAREHOUSE", "CUSTOMER", "REGION", "SYSTEM"
    auth_provider: str = "local"                 # "local", "google", "enterprise_sso"
    avatar_url: Optional[str] = None
    email_verified: bool = True
    google_sub: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    disabled: bool = False


class UserInDB(User):
    hashed_password: str = ""


class TokenPayload(BaseModel):
    sub: str                              # Username / Subject
    role: UserRole
    persona: PersonaMode = PersonaMode.OPERATIONS
    permissions: List[str] = Field(default_factory=list)
    full_name: Optional[str] = None
    email: Optional[str] = None
    auth_provider: str = "local"
    avatar_url: Optional[str] = None
    assigned_entity_id: Optional[str] = None
    exp: Optional[int] = None             # Expiration timestamp


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    persona: PersonaMode
    username: str
    full_name: str
    email: str = ""
    auth_provider: str = "local"
    avatar_url: Optional[str] = None
    email_verified: bool = True
    permissions: List[str] = Field(default_factory=list)
    assigned_entity_id: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    full_name: str
    role: Optional[UserRole] = UserRole.CUSTOMER
    assigned_entity_id: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    username: str
    current_password: Optional[str] = None
    new_password: str


class ChangePasswordResponse(BaseModel):
    status: str = "SUCCESS"
    message: str


class RoleSwitchRequest(BaseModel):
    username: str


class GoogleAuthRequest(BaseModel):
    id_token: str
    client_id: Optional[str] = None
    preferred_role: Optional[UserRole] = None
    name: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None


class GoogleDemoAuthRequest(BaseModel):
    preset_id: str
    preferred_role: Optional[UserRole] = None


class UserPublicProfile(BaseModel):
    username: str
    role: UserRole
    persona: PersonaMode
    full_name: str
    email: str
    description: str
    auth_provider: str = "local"
    avatar_url: Optional[str] = None
    assigned_entity_id: Optional[str] = None
    assigned_entity_type: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class SendOtpRequest(BaseModel):
    email: str
    purpose: str = "LOGIN"  # "LOGIN", "REGISTER", "PASSWORD_RESET", "VERIFY_EMAIL"
    full_name: Optional[str] = None
    role: Optional[UserRole] = None


class SendOtpResponse(BaseModel):
    success: bool = True
    message: str
    email: str
    expires_in_seconds: int = 300
    dev_otp: Optional[str] = None


class VerifyOtpRequest(BaseModel):
    email: str
    otp_code: str
    purpose: str = "LOGIN"
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None


class VerifyOtpResponse(BaseModel):
    token: Token
    is_new_user: bool = False
    message: str = "Email OTP verified successfully."


