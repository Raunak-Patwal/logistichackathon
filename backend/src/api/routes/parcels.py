from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session
from src.infrastructure.repositories.parcel_repository import ParcelRepository
from src.application.services.event_replay_service import EventReplayService

router = APIRouter(prefix="/parcels", tags=["parcels"])


@router.get("", status_code=status.HTTP_200_OK)
async def list_parcels(session: AsyncSession = Depends(get_db_session)):
    """Lists all parcels from the materialized World Model."""
    repo = ParcelRepository(session)
    records = await repo.list_all()
    return [
        {
            "id": r.id,
            "state": r.state,
            "version": r.version,
            "weight_kg": r.weight,
            "destination": r.destination,
            "packer_id": r.packer_id,
            "truck_id": r.truck_id,
            "proof_of_delivery": r.proof_of_delivery,
        }
        for r in records
    ]


@router.get("/{parcel_id}", status_code=status.HTTP_200_OK)
async def get_parcel(parcel_id: str, session: AsyncSession = Depends(get_db_session)):
    """Hydrates parcel aggregate from database."""
    repo = ParcelRepository(session)
    parcel = await repo.get_by_id(parcel_id)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PARCEL_NOT_FOUND", "message": f"Parcel {parcel_id} not found"},
        )
    return parcel.to_dict()


@router.get("/{parcel_id}/events", status_code=status.HTTP_200_OK)
async def get_parcel_events(parcel_id: str, session: AsyncSession = Depends(get_db_session)):
    """Fetches the immutable event log for this parcel."""
    repo = ParcelRepository(session)
    records = await repo.get_events_for_parcel(parcel_id)
    return [
        {
            "event_id": r.event_id,
            "event_type": r.event_type,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "source": r.source,
            "payload": r.payload,
            "version": r.version,
        }
        for r in records
    ]


@router.get("/{parcel_id}/replay", status_code=status.HTTP_200_OK)
async def replay_parcel_state(
    parcel_id: str,
    up_to_step: Optional[int] = Query(default=None, ge=1),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Historical Event Replay (Rule 9).
    Reconstructs parcel state deterministically by replaying immutable events.
    """
    replay_service = EventReplayService(session)
    result = await replay_service.reconstruct_parcel(parcel_id=parcel_id, up_to_step=up_to_step)
    if not result.get("reconstructed"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PARCEL_HISTORY_NOT_FOUND", "message": result.get("message")},
        )
    return result
