from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from src.infrastructure.database.models.incident import IncidentRecord, IncidentActionRecord


class IncidentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_incidents(self, status: Optional[str] = None) -> List[IncidentRecord]:
        stmt = select(IncidentRecord).order_by(desc(IncidentRecord.detected_at))
        if status:
            stmt = stmt.where(IncidentRecord.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, incident_id: str) -> Optional[IncidentRecord]:
        stmt = select(IncidentRecord).where(IncidentRecord.id == incident_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_incident(
        self,
        incident_id: str,
        warehouse_id: str,
        incident_type: str,
        severity: str = "HIGH",
        affected_parcels: int = 0,
        affected_trucks: int = 0,
        context_data: Optional[dict] = None,
    ) -> IncidentRecord:
        record = IncidentRecord(
            id=incident_id,
            warehouse_id=warehouse_id,
            incident_type=incident_type,
            severity=severity,
            status="OPEN",
            duration_mins=0,
            affected_parcels=affected_parcels,
            affected_trucks=affected_trucks,
            context_data=context_data or {},
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def resolve_incident(self, incident_id: str, selected_action_id: Optional[str] = None) -> Optional[IncidentRecord]:
        record = await self.get_by_id(incident_id)
        if record:
            record.status = "RESOLVED"
            record.resolved_at = datetime.now(timezone.utc)
            if selected_action_id:
                record.selected_action_id = selected_action_id
            await self.session.flush()
        return record

    async def log_action(
        self,
        action_id: str,
        incident_id: str,
        action_type: str,
        title: str,
        description: str,
        target_entity_id: str,
        cost_estimate_inr: float = 0.0,
        eta_mins: int = 10,
        risk_level: str = "Low",
        executed_by: str = "OPERATOR_DISPATCH",
        result_summary: Optional[str] = None,
    ) -> IncidentActionRecord:
        action_record = IncidentActionRecord(
            id=action_id,
            incident_id=incident_id,
            action_type=action_type,
            title=title,
            description=description,
            target_entity_id=target_entity_id,
            cost_estimate_inr=cost_estimate_inr,
            eta_mins=eta_mins,
            risk_level=risk_level,
            executed_by=executed_by,
            result_summary=result_summary,
        )
        self.session.add(action_record)
        await self.session.flush()
        return action_record

    async def get_actions_for_incident(self, incident_id: str) -> List[IncidentActionRecord]:
        stmt = (
            select(IncidentActionRecord)
            .where(IncidentActionRecord.incident_id == incident_id)
            .order_by(IncidentActionRecord.executed_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
