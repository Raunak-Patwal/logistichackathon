from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class TruckRecord(Base):
    """
    Materialized view of Truck entities in the operational World Model.
    """
    __tablename__ = "world_model_trucks"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="IDLE", nullable=False)
    license_plate: Mapped[str] = mapped_column(String(30), nullable=False)
    current_route_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    origin_id: Mapped[str] = mapped_column(String(50), nullable=False)
    destination_id: Mapped[str] = mapped_column(String(50), nullable=False)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    capacity_kg: Mapped[float] = mapped_column(Float, default=20000.0, nullable=False)
    current_load_kg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    parcel_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    driver_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fuel_level_percent: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    telemetry_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
