import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.infrastructure.database.models.event_store import EventRecord
from src.infrastructure.database.models.warehouse import WarehouseRecord
from src.infrastructure.database.models.truck import TruckRecord
from src.infrastructure.database.models.incident import IncidentRecord, IncidentActionRecord
from src.infrastructure.repositories.incident_repository import IncidentRepository


class ActionExecutionService:
    """
    Phase 5 & 6 (Decide & Act): Closed-loop recovery action execution engine.
    Applies mitigation countermeasures, mutates World Model, appends ACTION_EXECUTED
    to EventStore, and resolves operational incidents.
    """
    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_repo = IncidentRepository(session)

    async def execute_action(
        self,
        incident_id: str,
        action_type: str,
        action_title: str,
        description: str,
        target_entity_id: str,
        cost_estimate_inr: float = 0.0,
        eta_mins: int = 10,
        executed_by: str = "OPERATOR_DISPATCH",
    ) -> Dict[str, Any]:
        action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"

        # 1. Log Action Record
        action_record = await self.incident_repo.log_action(
            action_id=action_id,
            incident_id=incident_id,
            action_type=action_type,
            title=action_title,
            description=description,
            target_entity_id=target_entity_id,
            cost_estimate_inr=cost_estimate_inr,
            eta_mins=eta_mins,
            risk_level="Low",
            executed_by=executed_by,
            result_summary=f"Countermeasure {action_type} executed successfully on {target_entity_id}.",
        )

        # 2. Append ACTION_EXECUTED Domain Event to EventStore
        event_record = EventRecord(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc),
            source="OPERATOR_COCKPIT",
            correlation_id=incident_id,
            idempotency_key=f"action-{action_id}",
            event_type="ACTION_EXECUTED",
            entity_type="INCIDENT",
            entity_id=incident_id,
            payload={
                "action_id": action_id,
                "action_type": action_type,
                "target_entity_id": target_entity_id,
                "title": action_title,
                "cost_inr": cost_estimate_inr,
                "executed_by": executed_by,
            },
            version=1,
        )
        self.session.add(event_record)

        # 3. Update Materialized World Model
        if action_type in ("ACTIVATE_BACKUP_SCANNER", "SHIFT_OPERATIONS_DOCK4"):
            wh_stmt = select(WarehouseRecord).where(WarehouseRecord.id == target_entity_id)
            res = await self.session.execute(wh_stmt)
            wh = res.scalar_one_or_none()
            if wh:
                wh.status = "OPTIMAL"

        elif action_type in ("REROUTE_TRUCK", "DIVERT_TRUCKS_TO_JAIPUR"):
            truck_stmt = select(TruckRecord).where(TruckRecord.id == target_entity_id)
            res = await self.session.execute(truck_stmt)
            trk = res.scalar_one_or_none()
            if trk:
                trk.status = "REROUTED"

        # 4. Resolve the Incident
        await self.incident_repo.resolve_incident(incident_id=incident_id, selected_action_id=action_id)

        # 5. Store Incident Resolution Memory in PgVector (Phase 4 RAG)
        try:
            from src.application.ai.rag_service import rag_service
            incident_rec = await self.incident_repo.get_by_id(incident_id)
            context_summary = f"Incident {incident_rec.incident_type if incident_rec else 'Outage'} on entity {target_entity_id}."
            resolution_notes = f"Executed {action_title} ({action_type}): {description}. Cost: INR {cost_estimate_inr}, ETA: {eta_mins}m."
            await rag_service.store_incident_memory(
                session=self.session,
                incident_id=incident_id,
                context_summary=context_summary,
                resolution_notes=resolution_notes,
            )
        except Exception as e:
            # Non-blocking RAG memory storage
            pass

        # 6. Commit Transaction
        await self.session.commit()

        return {
            "status": "EXECUTED",
            "action_id": action_id,
            "incident_id": incident_id,
            "action_type": action_type,
            "target_entity_id": target_entity_id,
            "world_model_updated": True,
            "incident_status": "RESOLVED",
            "message": f"Successfully activated countermeasure {action_title}. World model restored to OPTIMAL.",
        }
