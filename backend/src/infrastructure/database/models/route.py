from sqlalchemy import String, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class RouteRecord(Base):
    """
    Materialized view of Highway / Air corridors in the operational World Model.
    """
    __tablename__ = "world_model_routes"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    origin_id: Mapped[str] = mapped_column(String(50), nullable=False)
    destination_id: Mapped[str] = mapped_column(String(50), nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_time_mins: Mapped[int] = mapped_column(Integer, nullable=False)
    congestion_factor: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)
    active_truck_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
