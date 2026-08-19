from sqlalchemy import String, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class ParcelRecord(Base):
    __tablename__ = "world_model_parcels"

    # Tracking Number
    id: Mapped[str] = mapped_column(String, primary_key=True)
    
    # Current State (CREATED, PACKED, DELIVERED, etc.)
    state: Mapped[str] = mapped_column(String, nullable=False)
    
    # Tracking current version
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # --- Materialized Data (Jo events me payload aayega wo yahan extract hoke aayega) ---
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    destination: Mapped[str | None] = mapped_column(String, nullable=True)
    packer_id: Mapped[str | None] = mapped_column(String, nullable=True)
    truck_id: Mapped[str | None] = mapped_column(String, nullable=True)
    proof_of_delivery: Mapped[str | None] = mapped_column(String, nullable=True)    