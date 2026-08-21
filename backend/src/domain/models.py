"""
Convenience domain model aggregation module.
Re-exports canonical domain models across incidents, reasoning, and context.
"""
from src.domain.incident.models import (
    IncidentSeverity,
    IncidentStatus,
    LogisticsContext,
    IncidentAction,
    Incident,
)
from src.domain.reasoning.models import (
    RootCauseAnalysis,
    RecoveryOption,
    ReasoningResult,
)
from src.domain.auth_models import (
    UserRole,
    PersonaMode,
    ROLE_TO_PERSONA,
    PERMISSIONS_BY_ROLE,
    Token,
    TokenPayload,
    User,
    UserInDB,
    LoginRequest,
    RoleSwitchRequest,
    UserPublicProfile,
)

__all__ = [
    "IncidentSeverity",
    "IncidentStatus",
    "LogisticsContext",
    "IncidentAction",
    "Incident",
    "RootCauseAnalysis",
    "RecoveryOption",
    "ReasoningResult",
    "UserRole",
    "PersonaMode",
    "ROLE_TO_PERSONA",
    "PERMISSIONS_BY_ROLE",
    "Token",
    "TokenPayload",
    "User",
    "UserInDB",
    "LoginRequest",
    "RoleSwitchRequest",
    "UserPublicProfile",
]

