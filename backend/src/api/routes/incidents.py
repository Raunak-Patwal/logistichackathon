from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session
from src.infrastructure.repositories.incident_repository import IncidentRepository
from src.domain.incident.models import Incident
from src.domain.reasoning.models import ReasoningResult
from src.application.services.context_builder import ContextBuilderService
from src.application.services.reasoning_engine import ReasoningEngineService
from src.application.services.action_service import ActionExecutionService

router = APIRouter(prefix="/incidents", tags=["incidents"])


class ExecuteActionRequest(BaseModel):
    action_type: str = Field(default="ACTIVATE_BACKUP_SCANNER")
    action_title: str = Field(default="Activate Redundant Scanner Bay B")
    description: str = Field(default="Switch outbound conveyor scanning to Bay B optical line.")
    target_entity_id: str = Field(default="W12")
    cost_estimate_inr: float = Field(default=1500.0)
    eta_mins: int = Field(default=6)
    executed_by: str = Field(default="OPERATOR_DISPATCH")


@router.get("", status_code=status.HTTP_200_OK)
async def list_incidents(
    status: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
):
    """Lists operational incidents."""
    repo = IncidentRepository(session)
    records = await repo.list_incidents(status=status)
    return [
        {
            "id": r.id,
            "warehouse_id": r.warehouse_id,
            "incident_type": r.incident_type,
            "severity": r.severity,
            "status": r.status,
            "duration_mins": r.duration_mins,
            "affected_parcels": r.affected_parcels,
            "affected_trucks": r.affected_trucks,
            "detected_at": r.detected_at.isoformat() if r.detected_at else None,
            "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
            "context_data": r.context_data,
        }
        for r in records
    ]


@router.get("/{incident_id}", status_code=status.HTTP_200_OK)
async def get_incident(incident_id: str, session: AsyncSession = Depends(get_db_session)):
    repo = IncidentRepository(session)
    record = await repo.get_by_id(incident_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INCIDENT_NOT_FOUND", "message": f"Incident {incident_id} not found"},
        )
    actions = await repo.get_actions_for_incident(incident_id)
    return {
        "id": record.id,
        "warehouse_id": record.warehouse_id,
        "incident_type": record.incident_type,
        "severity": record.severity,
        "status": record.status,
        "duration_mins": record.duration_mins,
        "affected_parcels": record.affected_parcels,
        "affected_trucks": record.affected_trucks,
        "detected_at": record.detected_at.isoformat() if record.detected_at else None,
        "resolved_at": record.resolved_at.isoformat() if record.resolved_at else None,
        "context_data": record.context_data,
        "actions": [
            {
                "id": a.id,
                "action_type": a.action_type,
                "title": a.title,
                "description": a.description,
                "target_entity_id": a.target_entity_id,
                "cost_estimate_inr": a.cost_estimate_inr,
                "eta_mins": a.eta_mins,
                "executed_at": a.executed_at.isoformat() if a.executed_at else None,
                "executed_by": a.executed_by,
                "result_summary": a.result_summary,
            }
            for a in actions
        ],
    }


@router.get("/{incident_id}/context", response_model=Incident, status_code=status.HTTP_200_OK)
async def get_incident_context(
    incident_id: str,
    incident_type: str = Query(default="Scanner Hardware Failure"),
    warehouse_id: str = Query(default="W12"),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Phase 2 (Understand): Assembles operational context dossier.
    """
    context_service = ContextBuilderService(session)
    return await context_service.generate_incident_context(
        incident_id=incident_id,
        incident_type=incident_type,
        warehouse_id=warehouse_id,
    )


@router.post("/{incident_id}/analyze", response_model=ReasoningResult, status_code=status.HTTP_200_OK)
async def analyze_incident(
    incident_id: str,
    warehouse_id: str = Query(default="W12"),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Phase 3 (Reason): AI Root Cause Analysis & Predictive Recovery Planning.
    """
    context_service = ContextBuilderService(session)
    incident_context = await context_service.generate_incident_context(
        incident_id=incident_id,
        warehouse_id=warehouse_id,
    )
    engine = ReasoningEngineService()
    return await engine.analyze_incident(incident_context)


from src.api.auth import RequireRole, User
from src.domain.auth_models import UserRole


@router.post("/{incident_id}/actions", status_code=status.HTTP_200_OK)
async def execute_incident_action(
    incident_id: str,
    request: ExecuteActionRequest,
    current_user: User = Depends(RequireRole([UserRole.DISPATCHER, UserRole.ADMIN])),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Phase 5 & 6 (Decide & Act): Executes operator recovery directive and mutates World Model.
    Strictly restricted to authenticated DISPATCHER and ADMIN users.
    """
    action_service = ActionExecutionService(session)
    executed_by = current_user.username if current_user else request.executed_by
    result = await action_service.execute_action(
        incident_id=incident_id,
        action_type=request.action_type,
        action_title=request.action_title,
        description=request.description,
        target_entity_id=request.target_entity_id,
        cost_estimate_inr=request.cost_estimate_inr,
        eta_mins=request.eta_mins,
        executed_by=executed_by,
    )
    result["executed_by"] = executed_by
    result["role"] = current_user.role.value if current_user else "OPERATOR"
    return result
