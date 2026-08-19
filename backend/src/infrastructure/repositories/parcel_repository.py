from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from src.domain.parcel.aggregate import Parcel
from src.domain.parcel.events import (
    ParcelCreatedEvent,
    ParcelPackedEvent,
    ParcelLoadedEvent,
    ParcelDispatchedEvent,
    ParcelDeliveredEvent,
)
from src.infrastructure.database.models.event_store import EventRecord
from src.infrastructure.database.models.parcel import ParcelRecord


class ParcelRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def has_processed_event(self, idempotency_key: Optional[str]) -> bool:
        """Checks whether this idempotency key was already committed to the Event Store."""
        if not idempotency_key:
            return False
            
        stmt = select(EventRecord.id).where(EventRecord.idempotency_key == idempotency_key).limit(1)
        result = await self.session.execute(stmt)
        record = result.scalar_one_or_none()
        return record is not None

    async def get_by_id(self, parcel_id: str) -> Optional[Parcel]:
        """Loads materialized parcel and hydrates aggregate."""
        stmt = select(ParcelRecord).where(ParcelRecord.id == parcel_id)
        result = await self.session.execute(stmt)
        record = result.scalar_one_or_none()
        
        if not record:
            return None
            
        parcel = Parcel(parcel_id=record.id)
        parcel.state = record.state
        parcel.version = record.version
        parcel.weight_kg = record.weight or 0.0
        parcel.destination = record.destination or "UNKNOWN"
        parcel.current_truck_id = record.truck_id
        parcel.packer_id = record.packer_id
        parcel.proof_of_delivery = record.proof_of_delivery
        return parcel

    async def list_all(self) -> List[ParcelRecord]:
        """Returns all materialized parcel records."""
        stmt = select(ParcelRecord).order_by(ParcelRecord.id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_events_for_parcel(self, parcel_id: str) -> List[EventRecord]:
        """Fetches immutable event history for a parcel ordered chronologically."""
        stmt = (
            select(EventRecord)
            .where(EventRecord.entity_id == parcel_id)
            .order_by(EventRecord.timestamp.asc(), EventRecord.version.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def save(self, parcel: Parcel) -> None:
        """
        ATOMIC DUAL-COMMIT (ADR-002):
        Appends pending DomainEvents to immutable event_store AND
        updates world_model_parcels in the EXACT SAME database transaction.
        """
        if not parcel.pending_events:
            return

        # Fetch existing record if available
        stmt = select(ParcelRecord).where(ParcelRecord.id == parcel.id)
        result = await self.session.execute(stmt)
        parcel_record = result.scalar_one_or_none()

        for event in parcel.pending_events:
            # 1. Append to Event Store
            event_record = EventRecord(
                event_id=str(event.metadata.event_id.value),
                timestamp=event.metadata.timestamp,
                source=event.metadata.source,
                correlation_id=str(event.metadata.correlation_id) if event.metadata.correlation_id else None,
                causation_id=str(event.metadata.causation_id) if event.metadata.causation_id else None,
                idempotency_key=event.metadata.idempotency_key,
                event_type=event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type),
                entity_type=event.entity_type.value if hasattr(event.entity_type, "value") else str(event.entity_type),
                entity_id=event.entity_id,
                payload=event.payload,
                version=parcel.version,
            )
            self.session.add(event_record)

            # 2. Update Materialized World Model
            if isinstance(event, ParcelCreatedEvent):
                parcel_record = ParcelRecord(
                    id=parcel.id,
                    state=parcel.state.value if hasattr(parcel.state, "value") else str(parcel.state),
                    version=parcel.version,
                    weight=event.payload.get("weight"),
                    destination=event.payload.get("destination"),
                )
                self.session.add(parcel_record)
            else:
                if not parcel_record:
                    parcel_record = ParcelRecord(
                        id=parcel.id,
                        state=parcel.state.value if hasattr(parcel.state, "value") else str(parcel.state),
                        version=parcel.version,
                    )
                    self.session.add(parcel_record)
                
                parcel_record.state = parcel.state.value if hasattr(parcel.state, "value") else str(parcel.state)
                parcel_record.version = parcel.version
                
                if isinstance(event, ParcelPackedEvent):
                    parcel_record.packer_id = event.payload.get("packer_id")
                elif isinstance(event, ParcelLoadedEvent):
                    parcel_record.truck_id = event.payload.get("truck_id")
                elif isinstance(event, ParcelDispatchedEvent):
                    pass
                elif isinstance(event, ParcelDeliveredEvent):
                    parcel_record.proof_of_delivery = event.payload.get("proof_of_delivery")

        await self.session.flush()
        parcel.pending_events.clear()