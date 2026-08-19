from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session
from src.api.schemas.event import EventIngestionRequest
from src.application.services.parcel_service import ParcelApplicationService
from src.domain.parcel.aggregate import InvalidStateTransitionError
from src.infrastructure.repositories.event_repository import EventRepository

router = APIRouter(prefix="/events", tags=["events"])


from src.infrastructure.queue.redis_queue import redis_queue


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def ingest_event(
    request: EventIngestionRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Primary Ingestion Gateway (Phase 1 Observe).
    Ingests canonical ULEO v0.1 domain events with Redis Stream queuing,
    atomic dual-commit to PostgreSQL, and real-time WebSocket broadcasting.
    """
    try:
        # 1. Enqueue to Redis Event Stream
        event_dict = request.model_dump()
        stream_id = await redis_queue.enqueue_event(event_dict)

        # 2. Atomic Dual-Commit in PostgreSQL
        service = ParcelApplicationService(session)
        result = await service.process_event(request)

        # 3. Broadcast committed state change to WebSockets
        await redis_queue.publish_broadcast({
            "type": "DOMAIN_EVENT_PROCESSED",
            "event_type": request.event_type,
            "entity_id": request.entity_id,
            "state": result.get("state", "ACCEPTED"),
            "queue_id": stream_id,
        })

        result["queue_id"] = stream_id
        return result
    except InvalidStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_STATE_TRANSITION", "message": str(e)},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "VALIDATION_ERROR", "message": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_SERVER_ERROR", "message": str(e)},
        )


@router.get("", status_code=status.HTTP_200_OK)
async def list_events(
    limit: int = Query(default=50, ge=1, le=500),
    event_type: Optional[str] = Query(default=None),
    entity_id: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Fetches the immutable event stream from the Event Store with optional filters.
    """
    repo = EventRepository(session)
    records = await repo.list_events(limit=limit, event_type=event_type, entity_id=entity_id)
    return [
        {
            "id": r.id,
            "event_id": r.event_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "source": r.source,
            "correlation_id": r.correlation_id,
            "causation_id": r.causation_id,
            "idempotency_key": r.idempotency_key,
            "event_type": r.event_type,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "payload": r.payload,
            "version": r.version,
        }
        for r in records
    ]


@router.get("/correlation/{correlation_id}", status_code=status.HTTP_200_OK)
async def get_correlation_chain(
    correlation_id: str,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Traces the entire causal event chain for a distributed transaction.
    """
    repo = EventRepository(session)
    records = await repo.get_correlation_chain(correlation_id)
    return [
        {
            "event_id": r.event_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "source": r.source,
            "event_type": r.event_type,
            "entity_id": r.entity_id,
            "payload": r.payload,
        }
        for r in records
    ]