from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session
from src.infrastructure.repositories.world_model_repository import WorldModelRepository

router = APIRouter(tags=["world_model"])


@router.get("/trucks", status_code=status.HTTP_200_OK)
async def list_trucks(session: AsyncSession = Depends(get_db_session)):
    repo = WorldModelRepository(session)
    records = await repo.list_trucks()
    return [
        {
            "id": r.id,
            "name": r.name,
            "status": r.status,
            "license_plate": r.license_plate,
            "current_route_id": r.current_route_id,
            "origin_id": r.origin_id,
            "destination_id": r.destination_id,
            "progress": r.progress,
            "speed_kmh": r.speed_kmh,
            "capacity_kg": r.capacity_kg,
            "current_load_kg": r.current_load_kg,
            "parcel_ids": r.parcel_ids,
            "driver_id": r.driver_id,
            "fuel_level_percent": r.fuel_level_percent,
        }
        for r in records
    ]


@router.get("/trucks/{truck_id}", status_code=status.HTTP_200_OK)
async def get_truck(truck_id: str, session: AsyncSession = Depends(get_db_session)):
    repo = WorldModelRepository(session)
    r = await repo.get_truck_by_id(truck_id)
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TRUCK_NOT_FOUND", "message": f"Truck {truck_id} not found"},
        )
    return {
        "id": r.id,
        "name": r.name,
        "status": r.status,
        "license_plate": r.license_plate,
        "current_route_id": r.current_route_id,
        "origin_id": r.origin_id,
        "destination_id": r.destination_id,
        "progress": r.progress,
        "speed_kmh": r.speed_kmh,
        "capacity_kg": r.capacity_kg,
        "current_load_kg": r.current_load_kg,
        "parcel_ids": r.parcel_ids,
        "driver_id": r.driver_id,
        "fuel_level_percent": r.fuel_level_percent,
    }


@router.get("/warehouses", status_code=status.HTTP_200_OK)
async def list_warehouses(session: AsyncSession = Depends(get_db_session)):
    repo = WorldModelRepository(session)
    records = await repo.list_warehouses()
    return [
        {
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "region": r.region,
            "capacity_parcels": r.capacity_parcels,
            "current_parcels_count": r.current_parcels_count,
            "dock_count": r.dock_count,
            "active_docks_occupied": r.active_docks_occupied,
            "status": r.status,
            "has_cold_storage": r.has_cold_storage,
            "staging_parcels": r.staging_parcels,
            "active_truck_ids": r.active_truck_ids,
        }
        for r in records
    ]


@router.get("/warehouses/{warehouse_id}", status_code=status.HTTP_200_OK)
async def get_warehouse(warehouse_id: str, session: AsyncSession = Depends(get_db_session)):
    repo = WorldModelRepository(session)
    r = await repo.get_warehouse_by_id(warehouse_id)
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WAREHOUSE_NOT_FOUND", "message": f"Warehouse {warehouse_id} not found"},
        )
    return {
        "id": r.id,
        "name": r.name,
        "code": r.code,
        "region": r.region,
        "capacity_parcels": r.capacity_parcels,
        "current_parcels_count": r.current_parcels_count,
        "dock_count": r.dock_count,
        "active_docks_occupied": r.active_docks_occupied,
        "status": r.status,
        "has_cold_storage": r.has_cold_storage,
        "staging_parcels": r.staging_parcels,
        "active_truck_ids": r.active_truck_ids,
    }


@router.get("/airports", status_code=status.HTTP_200_OK)
async def list_airports(session: AsyncSession = Depends(get_db_session)):
    repo = WorldModelRepository(session)
    records = await repo.list_airports()
    return [
        {
            "id": r.id,
            "name": r.name,
            "iata": r.iata,
            "cargo_throughput_tons_day": r.cargo_throughput_tons_day,
            "active_air_routes": r.active_air_routes,
            "status": r.status,
            "connected_warehouse_ids": r.connected_warehouse_ids,
        }
        for r in records
    ]


@router.get("/routes", status_code=status.HTTP_200_OK)
async def list_routes(session: AsyncSession = Depends(get_db_session)):
    repo = WorldModelRepository(session)
    records = await repo.list_routes()
    return [
        {
            "id": r.id,
            "name": r.name,
            "origin_id": r.origin_id,
            "destination_id": r.destination_id,
            "distance_km": r.distance_km,
            "estimated_time_mins": r.estimated_time_mins,
            "congestion_factor": r.congestion_factor,
            "risk_level": r.risk_level,
            "active_truck_ids": r.active_truck_ids,
        }
        for r in records
    ]


@router.get("/drivers", status_code=status.HTTP_200_OK)
async def list_drivers(session: AsyncSession = Depends(get_db_session)):
    repo = WorldModelRepository(session)
    records = await repo.list_drivers()
    return [
        {
            "id": r.id,
            "name": r.name,
            "license_number": r.license_number,
            "assigned_truck_id": r.assigned_truck_id,
            "shift_hours": r.shift_hours,
            "status": r.status,
            "rating": r.rating,
        }
        for r in records
    ]


from src.api.auth import RequireRole, User, get_optional_current_user
from src.domain.auth_models import UserRole


@router.get("/network/summary", status_code=status.HTTP_200_OK)
async def get_network_summary(
    session: AsyncSession = Depends(get_db_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Flight Control Telemetry Summary (Header status bar).
    """
    repo = WorldModelRepository(session)
    return await repo.get_network_summary()
