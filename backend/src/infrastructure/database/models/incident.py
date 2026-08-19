from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


class IncidentRecord(Base):
    """
    Persisted operational incidents in the Logistics Brain.
    """
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    warehouse_id: Mapped[str] = mapped_column(String(50), nullable=False)
    incident_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False)
    duration_mins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    affected_parcels: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    affected_trucks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    context_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    selected_action_id: Mapped[str | None] = mapped_column(String(50), nullable=True)


class IncidentActionRecord(Base):
    """
    Audit log of executed recovery directives and operator countermeasures.
    """
    __tablename__ = "incident_actions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    incident_id: Mapped[str] = mapped_column(String(50), ForeignKey("incidents.id"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    target_entity_id: Mapped[str] = mapped_column(String(50), nullable=False)
    cost_estimate_inr: Mapped[float] = mapped_column(default=0.0)
    eta_mins: Mapped[int] = mapped_column(Integer, default=10)
    risk_level: Mapped[str] = mapped_column(String(20), default="Low")
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    executed_by: Mapped[str] = mapped_column(String(100), default="OPERATOR_DISPATCH")
    result_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
