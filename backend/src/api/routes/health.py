from typing import Annotated, Any
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from src.config.settings import Settings, get_settings

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str
    service: str


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check(settings: Annotated[Settings, Depends(get_settings)]) -> Any:
    """
    Liveness and health check endpoint for monitoring and container orchestration.
    """
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
        "service": settings.PROJECT_NAME,
    }
