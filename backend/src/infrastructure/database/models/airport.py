from sqlalchemy import String, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class AirportRecord(Base):
    """
    Materialized view of Airport Cargo Hubs in the operational World Model.
    """
    __tablename__ = "world_model_airports"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    iata: Mapped[str] = mapped_column(String(10), nullable=False)
    cargo_throughput_tons_day: Mapped[float] = mapped_column(Float, default=1000.0, nullable=False)
    active_air_routes: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPERATIONAL", nullable=False)
    connected_warehouse_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
