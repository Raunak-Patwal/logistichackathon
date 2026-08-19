import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class EventRecord(Base):
    """
    Immutable Event Store table (Append-Only).
    Stores canonical ULEO v0.1 domain events with idempotency indexing.
    """
    __tablename__ = "event_store"

    # Database internal primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # ULEO EventMetadata
    event_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    correlation_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    causation_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)

    # DomainEvent Details
    event_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    entity_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    
    # JSON Payload
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Aggregate Version
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    __table_args__ = (
        Index("ix_event_store_entity_timestamp", "entity_id", "timestamp"),
        Index("ix_event_store_type_timestamp", "event_type", "timestamp"),
    )