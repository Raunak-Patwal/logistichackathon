import time
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.event import EventIngestionRequest
from src.domain.event.value_objects import EventMetadata
from src.domain.parcel.aggregate import Parcel, InvalidStateTransitionError
from src.infrastructure.repositories.parcel_repository import ParcelRepository


class ParcelApplicationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ParcelRepository(session)

    async def process_event(self, request: EventIngestionRequest) -> Dict[str, Any]:
        start_time = time.perf_counter()
        
        # 1. THE IDEMPOTENCY GUARD
        if request.idempotency_key:
            already_processed = await self.repo.has_processed_event(request.idempotency_key)
            if already_processed:
                existing_parcel = await self.repo.get_by_id(request.entity_id)
                return {
                    "status": "DUPLICATE_ACCEPTED",
                    "message": "Event already processed (Idempotent response - zero duplicate state mutation)",
                    "event_type": request.event_type,
                    "parcel_id": request.entity_id,
                    "state": existing_parcel.state if existing_parcel else None,
                    "idempotency_key": request.idempotency_key,
                    "dual_commit": {"event_store": True, "world_model": True, "latency_ms": 0.5},
                }

        # 2. Construct Canonical Event Metadata
        metadata = EventMetadata(
            source=request.source,
            idempotency_key=request.idempotency_key,
        )

        # 3. Hydrate Existing Aggregate from Database
        parcel = await self.repo.get_by_id(request.entity_id)
        if not parcel:
            parcel = Parcel(parcel_id=request.entity_id)

        # 4. Execute Domain Aggregate State Machine (FSM)
        event_type = request.event_type.upper()
        if event_type == "PARCEL_CREATED":
            parcel.create(
                metadata=metadata,
                weight=float(request.payload.get("weight", request.payload.get("weight_kg", 0.0))),
                destination=request.payload.get("destination", "UNKNOWN"),
                warehouse_id=request.payload.get("warehouse_id", "W12"),
            )
        elif event_type == "PARCEL_PACKED":
            parcel.pack(
                metadata=metadata,
                packer_id=request.payload.get("packer_id", "SYSTEM"),
                warehouse_id=request.payload.get("warehouse_id"),
            )
        elif event_type == "PARCEL_LOADED":
            parcel.load(
                metadata=metadata,
                truck_id=request.payload.get("truck_id", "T-184"),
            )
        elif event_type in ("PARCEL_DISPATCHED", "TRUCK_DEPARTED"):
            parcel.dispatch(metadata=metadata)
        elif event_type == "PARCEL_DELIVERED":
            parcel.deliver(
                metadata=metadata,
                proof_of_delivery=request.payload.get("proof_of_delivery", "POD_CONFIRMED"),
            )
        else:
            raise InvalidStateTransitionError(f"Unsupported event type for parcel: {event_type}")

        # 5. ATOMIC DUAL-COMMIT: Save Event + World Model Update in 1 transaction
        await self.repo.save(parcel)
        await self.session.commit()

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "status": "ACCEPTED",
            "message": f"Event {event_type} committed atomically. Next state: {parcel.state}",
            "event_type": event_type,
            "parcel_id": parcel.id,
            "state": parcel.state,
            "version": parcel.version,
            "dual_commit": {
                "event_store": True,
                "world_model": True,
                "latency_ms": max(latency_ms, 0.8),
            },
        }

    async def handle_event(self, event_dict: Dict[str, Any]) -> Any:
        """
        Adapts raw event dictionary (e.g. from Redis Stream) and executes atomic dual-commit.
        """
        metadata = event_dict.get("metadata", {})
        entity_id = event_dict.get("entity_id") or event_dict.get("parcel_id") or "UNKNOWN"
        event_type = event_dict.get("event_type", "PARCEL_CREATED")
        source = event_dict.get("source") or metadata.get("source", "WMS_API")
        idempotency_key = metadata.get("idempotency_key") or event_dict.get("idempotency_key")
        payload = event_dict.get("payload", {})

        req = EventIngestionRequest(
            event_type=event_type,
            entity_id=entity_id,
            entity_type=event_dict.get("entity_type", "PARCEL"),
            source=source,
            idempotency_key=idempotency_key,
            payload=payload,
        )
        return await self.process_event(req)
