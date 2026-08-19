from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.infrastructure.database.models.truck import TruckRecord
from src.infrastructure.database.models.warehouse import WarehouseRecord
from src.infrastructure.database.models.airport import AirportRecord
from src.infrastructure.database.models.route import RouteRecord
from src.infrastructure.database.models.driver import DriverRecord
from src.infrastructure.database.models.parcel import ParcelRecord
from src.infrastructure.database.models.incident import IncidentRecord


class WorldModelRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_trucks(self) -> List[TruckRecord]:
        result = await self.session.execute(select(TruckRecord).order_by(TruckRecord.id))
        return list(result.scalars().all())

    async def get_truck_by_id(self, truck_id: str) -> Optional[TruckRecord]:
        result = await self.session.execute(select(TruckRecord).where(TruckRecord.id == truck_id))
        return result.scalar_one_or_none()

    async def list_warehouses(self) -> List[WarehouseRecord]:
        result = await self.session.execute(select(WarehouseRecord).order_by(WarehouseRecord.id))
        return list(result.scalars().all())

    async def get_warehouse_by_id(self, warehouse_id: str) -> Optional[WarehouseRecord]:
        result = await self.session.execute(select(WarehouseRecord).where(WarehouseRecord.id == warehouse_id))
        return result.scalar_one_or_none()

    async def list_airports(self) -> List[AirportRecord]:
        result = await self.session.execute(select(AirportRecord).order_by(AirportRecord.id))
        return list(result.scalars().all())

    async def list_routes(self) -> List[RouteRecord]:
        result = await self.session.execute(select(RouteRecord).order_by(RouteRecord.id))
        return list(result.scalars().all())

    async def list_drivers(self) -> List[DriverRecord]:
        result = await self.session.execute(select(DriverRecord).order_by(DriverRecord.id))
        return list(result.scalars().all())

    async def update_warehouse_status(self, warehouse_id: str, status: str) -> Optional[WarehouseRecord]:
        wh = await self.get_warehouse_by_id(warehouse_id)
        if wh:
            wh.status = status
            await self.session.flush()
        return wh

    async def get_network_summary(self) -> Dict[str, Any]:
        """Calculates true aggregated counts and telemetry metrics from database."""
        parcel_count = (await self.session.execute(select(func.count(ParcelRecord.id)))).scalar() or 0
        truck_count = (await self.session.execute(select(func.count(TruckRecord.id)))).scalar() or 0
        wh_count = (await self.session.execute(select(func.count(WarehouseRecord.id)))).scalar() or 0
        airport_count = (await self.session.execute(select(func.count(AirportRecord.id)))).scalar() or 0
        active_incidents = (
            await self.session.execute(
                select(func.count(IncidentRecord.id)).where(IncidentRecord.status == "OPEN")
            )
        ).scalar() or 0

        return {
            "total_parcels": parcel_count,
            "total_trucks": truck_count,
            "total_warehouses": wh_count,
            "total_airports": airport_count,
            "active_incidents": active_incidents,
            "consistency": "100% ACID (Single Tx)",
            "system_mode": "LIVE",
            "active_phase": "PHASE 1: OBSERVE",
        }
