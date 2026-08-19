from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class DriverRecord(Base):
    """
    Materialized view of Drivers in the operational World Model.
    """
    __tablename__ = "world_model_drivers"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    license_number: Mapped[str] = mapped_column(String(50), nullable=False)
    assigned_truck_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    shift_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ON_DUTY", nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
