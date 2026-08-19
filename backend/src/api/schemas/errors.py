from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, Any, Dict


class APIErrorResponse(BaseModel):
    """
    Standardized Error Contract across all Logistics Brain endpoints.
    """
    code: str = Field(..., description="Machine-readable error classification code")
    message: str = Field(..., description="Human-readable error description")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Diagnostic contextual metadata")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
