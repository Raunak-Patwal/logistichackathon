from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.database.session import get_db_session

from src.application.services.context_builder import ContextBuilderService
from src.application.services.reasoning_engine import ReasoningEngineService
from src.domain.reasoning.models import ReasoningResult

router = APIRouter()

@router.post("/incidents/{incident_id}/analyze", response_model=ReasoningResult)
async def analyze_and_plan_recovery(
    incident_id: str,
    session: AsyncSession = Depends(get_db_session)
):
    """
    Phase 2 aur Phase 3 ko ek sath chalata hai:
    1. Incident ka context DB se nikalta hai.
    2. AI se Root Cause aur Solutions nikalwata hai.
    """
    # 1. Phase 2: Context Build Karo
    context_service = ContextBuilderService(session)
    incident_data = await context_service.generate_incident_context(
        incident_id=incident_id,
        incident_type="Scanner Offline", # Mocking for this endpoint
        warehouse_id="Delhi W12"
    )
    
    # 2. Phase 3: AI Reasoning Engine
    reasoning_engine = ReasoningEngineService()
    result = await reasoning_engine.analyze_incident(incident=incident_data)
    
    return result