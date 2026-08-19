from sqlalchemy import String, Integer, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class WarehouseRecord(Base):
    """
    Materialized view of Warehouse facilities in the operational World Model.
    """
    __tablename__ = "world_model_warehouses"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    region: Mapped[str] = mapped_column(String(50), nullable=False)
    capacity_parcels: Mapped[int] = mapped_column(Integer, default=10000, nullable=False)
    current_parcels_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dock_count: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    active_docks_occupied: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPTIMAL", nullable=False)
    has_cold_storage: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    staging_parcels: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    active_truck_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
