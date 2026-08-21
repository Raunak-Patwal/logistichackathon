import os
import json
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


from src.application.ai.ml_service import ml_service
from src.application.ai.deep_models import deep_ml_service


@router.get("/ml/predict-eta", status_code=status.HTTP_200_OK)
async def predict_trip_eta(
    distance_km: float,
    cargo_weight_kg: float = 8000.0,
    congestion_factor: float = 1.0,
    shift_hours: float = 2.0,
    weather_factor: float = 0.0,
):
    """
    Predicts realistic transit duration using the calibrated ML model.
    """
    return ml_service.predict_eta(
        distance_km=distance_km,
        cargo_weight_kg=cargo_weight_kg,
        congestion_factor=congestion_factor,
        shift_hours=shift_hours,
        weather_factor=weather_factor,
    )


@router.get("/ml/vision-inspect", status_code=status.HTTP_200_OK)
async def inspect_vision_package(
    contrast_score: float = 0.85,
    blur_variance: float = 120.0,
    edge_gradient_density: float = 0.42,
    skew_angle_deg: float = 1.8,
    aspect_ratio_error: float = 0.04,
    is_cold_chain: bool = False,
):
    """
    ConveyorVision CNN Classifier: Automated Optical Inspection (AOI) for packaging defect classification.
    """
    return deep_ml_service.inspect_vision_package(
        contrast_score=contrast_score,
        blur_variance=blur_variance,
        edge_gradient_density=edge_gradient_density,
        skew_angle_deg=skew_angle_deg,
        aspect_ratio_error=aspect_ratio_error,
        is_cold_chain=is_cold_chain,
    )


@router.get("/ml/demand-forecast", status_code=status.HTTP_200_OK)
async def get_demand_forecast(
    hub_code: str = "DEL-W12",
    day_of_week: int = 2,
    festival_surge_factor: float = 1.25,
    air_cargo_inbound_tons: float = 145.0,
):
    """
    Deep Freight Demand MLP Forecaster: 24-hour predictive throughput curve and dock congestion risk.
    """
    return deep_ml_service.forecast_hub_demand(
        hub_code=hub_code,
        day_of_week=day_of_week,
        festival_surge_factor=festival_surge_factor,
        air_cargo_inbound_tons=air_cargo_inbound_tons,
    )


@router.get("/ml/classify-incident", status_code=status.HTTP_200_OK)
async def classify_incident_telemetry(
    dwell_time_mins: float = 35.0,
    conveyor_eps: float = 0.2,
    cold_chain_count: int = 14,
    trucks_queued: int = 12,
    voltage_dip_volts: float = 45.0,
):
    """
    Multi-Class Incident Severity & Failure Category Classifier.
    """
    return deep_ml_service.classify_incident_telemetry(
        dwell_time_mins=dwell_time_mins,
        conveyor_eps=conveyor_eps,
        cold_chain_count=cold_chain_count,
        trucks_queued=trucks_queued,
        voltage_dip_volts=voltage_dip_volts,
    )


@router.get("/ml/cold-chain-predict", status_code=status.HTTP_200_OK)
async def predict_cold_chain_thermal(
    ambient_temp_celsius: float = 35.0,
    compressor_power_kw: float = 2.8,
    door_opens_per_hour: float = 2.0,
    insulation_r_value: float = 24.0,
    initial_cargo_temp: float = 3.5,
):
    """
    Predicts 4-hour internal reefer temperature trajectory and cold-chain compliance status.
    """
    return deep_ml_service.predict_cold_chain(
        ambient_temp_celsius=ambient_temp_celsius,
        compressor_power_kw=compressor_power_kw,
        door_opens_per_hour=door_opens_per_hour,
        insulation_r_value=insulation_r_value,
        initial_cargo_temp=initial_cargo_temp,
    )


@router.get("/ml/fuel-emission-predict", status_code=status.HTTP_200_OK)
async def predict_fuel_and_emissions(
    distance_km: float = 850.0,
    payload_tons: float = 18.5,
    avg_speed_kmh: float = 58.0,
    elevation_gain_m: float = 350.0,
    engine_displacement_litres: float = 8.9,
):
    """
    Predicts diesel fuel consumption (L/100km) and carbon footprint (kg CO2).
    """
    return deep_ml_service.predict_fuel_and_emissions(
        distance_km=distance_km,
        payload_tons=payload_tons,
        avg_speed_kmh=avg_speed_kmh,
        elevation_gain_m=elevation_gain_m,
        engine_displacement_litres=engine_displacement_litres,
    )


@router.get("/ml/models/manifest", status_code=status.HTTP_200_OK)
async def get_ml_models_manifest():
    """
    Returns audit manifest of all trained binary Scikit-Learn joblib models, R² metrics, and feature importances.
    """
    manifest_path = os.path.join(os.path.dirname(__file__), "..", "..", "application", "ai", "weights", "model_manifest.json")
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"status": "ACTIVE", "framework": "Scikit-Learn (Joblib Serialized)"}




