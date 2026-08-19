from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from src.infrastructure.database.models.event_store import EventRecord


class EventRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_events(
        self,
        limit: int = 100,
        event_type: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> List[EventRecord]:
        """Lists events ordered by timestamp descending with optional filters."""
        stmt = select(EventRecord).order_by(desc(EventRecord.timestamp)).limit(limit)
        if event_type and event_type != "ALL":
            stmt = stmt.where(EventRecord.event_type == event_type)
        if entity_id:
            stmt = stmt.where(EventRecord.entity_id == entity_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_event_id(self, event_id: str) -> Optional[EventRecord]:
        stmt = select(EventRecord).where(EventRecord.event_id == event_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_correlation_chain(self, correlation_id: str) -> List[EventRecord]:
        stmt = (
            select(EventRecord)
            .where(EventRecord.correlation_id == correlation_id)
            .order_by(EventRecord.timestamp.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
