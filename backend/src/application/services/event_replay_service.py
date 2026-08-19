from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.domain.event.enums import EventType
from src.domain.event.value_objects import EventId, EventMetadata, DomainEvent, EntityType
from src.domain.parcel.aggregate import Parcel
from src.domain.parcel.events import (
    ParcelCreatedEvent,
    ParcelPackedEvent,
    ParcelLoadedEvent,
    ParcelDispatchedEvent,
    ParcelDeliveredEvent,
)
from src.infrastructure.database.models.event_store import EventRecord


class EventReplayService:
    """
    Historical Event Replay & State Reconstruction Service.
    Reconstructs aggregate state purely from immutable event streams (Rule 9).
    """
    def __init__(self, session: AsyncSession):
        self.session = session

    def _deserialize_event(self, record: EventRecord) -> DomainEvent:
        metadata = EventMetadata(
            event_id=EventId(value=record.event_id),
            timestamp=record.timestamp,
            source=record.source,
            correlation_id=record.correlation_id,
            causation_id=record.causation_id,
            idempotency_key=record.idempotency_key,
        )

        event_type_str = record.event_type.upper()
        if event_type_str == "PARCEL_CREATED":
            return ParcelCreatedEvent(metadata=metadata, entity_id=record.entity_id, payload=record.payload)
        elif event_type_str == "PARCEL_PACKED":
            return ParcelPackedEvent(metadata=metadata, entity_id=record.entity_id, payload=record.payload)
        elif event_type_str == "PARCEL_LOADED":
            return ParcelLoadedEvent(metadata=metadata, entity_id=record.entity_id, payload=record.payload)
        elif event_type_str in ("PARCEL_DISPATCHED", "TRUCK_DEPARTED"):
            return ParcelDispatchedEvent(metadata=metadata, entity_id=record.entity_id, payload=record.payload)
        elif event_type_str == "PARCEL_DELIVERED":
            return ParcelDeliveredEvent(metadata=metadata, entity_id=record.entity_id, payload=record.payload)
        else:
            return DomainEvent(
                metadata=metadata,
                event_type=EventType(record.event_type),
                entity_type=EntityType(record.entity_type),
                entity_id=record.entity_id,
                payload=record.payload,
            )

    async def reconstruct_parcel(
        self,
        parcel_id: str,
        up_to_timestamp: Optional[datetime] = None,
        up_to_step: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Fetches immutable events for parcel_id and folds over them to rebuild current or historical state.
        """
        stmt = (
            select(EventRecord)
            .where(EventRecord.entity_id == parcel_id)
            .order_by(EventRecord.timestamp.asc(), EventRecord.version.asc())
        )
        if up_to_timestamp:
            stmt = stmt.where(EventRecord.timestamp <= up_to_timestamp)

        result = await self.session.execute(stmt)
        records = list(result.scalars().all())

        if up_to_step is not None and up_to_step > 0:
            records = records[:up_to_step]

        if not records:
            return {
                "parcel_id": parcel_id,
                "reconstructed": False,
                "message": f"No historical events found for parcel {parcel_id}",
                "event_count": 0,
                "state": None,
                "history": [],
            }

        domain_events = [self._deserialize_event(r) for r in records]
        reconstructed_aggregate = Parcel.from_events(domain_events)

        history_summary = [
            {
                "step": idx + 1,
                "event_id": r.event_id,
                "event_type": r.event_type,
                "timestamp": r.timestamp.isoformat(),
                "source": r.source,
                "payload": r.payload,
            }
            for idx, r in enumerate(records)
        ]

        return {
            "parcel_id": parcel_id,
            "reconstructed": True,
            "event_count": len(records),
            "current_state": reconstructed_aggregate.state.value if reconstructed_aggregate.state else None,
            "version": reconstructed_aggregate.version,
            "destination": reconstructed_aggregate.destination,
            "weight_kg": reconstructed_aggregate.weight_kg,
            "current_truck_id": reconstructed_aggregate.current_truck_id,
            "packer_id": reconstructed_aggregate.packer_id,
            "proof_of_delivery": reconstructed_aggregate.proof_of_delivery,
            "history": history_summary,
        }
