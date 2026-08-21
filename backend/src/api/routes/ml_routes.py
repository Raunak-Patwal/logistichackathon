"""
AI Logistics Brain - Machine Learning & Trained Model API Routes
Provides REST endpoints for trained XGBoost, Scikit-Learn, and Preprocessor models.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from src.application.ai.trained_models_service import trained_ml_service

router = APIRouter(prefix="/ml", tags=["Machine Learning Models"])


# =========================================================================
# Request & Response Schemas
# =========================================================================
class ETAPredictionRequest(BaseModel):
    delivery_partner: str = Field(default="Delhivery", description="Carrier name (e.g., Delhivery, BlueDart, DTDC)")
    package_type: str = Field(default="Standard", description="Package type (e.g., Standard, Cold Chain, Express, Fragile)")
    vehicle_type: str = Field(default="Tata Ace (1.5T)", description="Vehicle type (e.g., Tata Ace, Eicher 14ft, BharatBenz 24ft)")
    delivery_mode: str = Field(default="Standard", description="Delivery SLA tier (e.g., Standard, Express, Same Day)")
    region: str = Field(default="North (Delhi NCR)", description="Operational region (e.g., North, West, South, East, Central)")
    weather_condition: str = Field(default="Clear", description="Weather condition (e.g., Clear, Light Rain, Heavy Monsoon, Dense Fog)")
    distance_km: float = Field(default=120.0, ge=0.1, description="Route distance in kilometers")
    package_weight_kg: float = Field(default=15.0, ge=0.0, description="Package weight in kilograms")
    expected_time_hours: float = Field(default=4.0, ge=0.1, description="Promised SLA duration in hours")


class DemandForecastRequest(BaseModel):
    hub_code: str = Field(default="DEL-W12", description="Warehouse hub code")
    day_of_week: int = Field(default=2, ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    festival_surge_multiplier: float = Field(default=1.25, ge=0.5, le=4.0, description="Surge multiplier during festive periods")
    inbound_air_cargo_tons: float = Field(default=120.0, ge=0.0, description="Inbound air freight tonnage")
    active_trucks_count: int = Field(default=35, ge=1, description="Active fleet operating in hub")


class VehicleAnomalyRequest(BaseModel):
    truck_id: str = Field(default="TRK-901", description="Vehicle identifier")
    speed_kmh: float = Field(default=65.0, ge=0.0, description="Current speed in km/h")
    engine_rpm: float = Field(default=2100.0, ge=0.0, description="Engine RPM")
    coolant_temp_celsius: float = Field(default=92.0, description="Engine coolant temperature (°C)")
    fuel_consumption_l_hr: float = Field(default=24.5, ge=0.0, description="Fuel consumption rate (L/hour)")
    vibration_index_g: float = Field(default=0.35, ge=0.0, description="Chassis accelerometer vibration (g)")


class VehicleFailureRequest(BaseModel):
    truck_id: str = Field(default="TRK-901", description="Vehicle identifier")
    odometer_km: float = Field(default=145000.0, ge=0.0, description="Cumulative odometer mileage (km)")
    days_since_last_service: int = Field(default=42, ge=0, description="Days since last depot inspection")
    brake_wear_percent: float = Field(default=68.0, ge=0.0, le=100.0, description="Brake pad wear percentage")
    oil_pressure_psi: float = Field(default=38.0, ge=0.0, description="Engine oil pressure (PSI)")
    battery_voltage_volts: float = Field(default=12.4, ge=0.0, description="Battery terminal voltage (V)")


class ComprehensiveLogisticsRequest(BaseModel):
    origin_hub: str = Field(default="DEL-W12", description="Origin hub code")
    destination_hub: str = Field(default="BOM-W04", description="Destination hub code")
    distance_km: float = Field(default=1420.0, ge=1.0, description="Transit corridor distance (km)")
    cargo_weight_kg: float = Field(default=12500.0, ge=0.0, description="Total payload mass (kg)")
    driver_fatigue_shift_hrs: float = Field(default=3.5, ge=0.0, description="Driver continuous shift hours")
    route_congestion_index: float = Field(default=1.4, ge=0.5, le=4.0, description="Corridor congestion factor")


# =========================================================================
# Route Endpoints
# =========================================================================
@router.post("/predict-eta", status_code=status.HTTP_200_OK)
async def predict_eta_endpoint(request: ETAPredictionRequest):
    """
    Predicts delivery duration (hours & minutes) and SLA delay risk
    using the trained XGBoost model and Scikit-Learn ColumnTransformer preprocessor.
    """
    return trained_ml_service.predict_eta(
        delivery_partner=request.delivery_partner,
        package_type=request.package_type,
        vehicle_type=request.vehicle_type,
        delivery_mode=request.delivery_mode,
        region=request.region,
        weather_condition=request.weather_condition,
        distance_km=request.distance_km,
        package_weight_kg=request.package_weight_kg,
        expected_time_hours=request.expected_time_hours,
    )


@router.get("/categories", status_code=status.HTTP_200_OK)
async def get_ml_categories_endpoint():
    """
    Returns valid categorical dropdown choices extracted directly from the trained preprocessor.
    """
    return {
        "status": "SUCCESS",
        "categories": trained_ml_service.categories,
    }


@router.post("/demand-forecast", status_code=status.HTTP_200_OK)
async def forecast_demand_endpoint(request: DemandForecastRequest):
    """
    Predicts 24-hour parcel throughput surge, dock congestion index, and required dock capacity.
    """
    return trained_ml_service.forecast_demand(
        hub_code=request.hub_code,
        day_of_week=request.day_of_week,
        festival_surge_multiplier=request.festival_surge_multiplier,
        inbound_air_cargo_tons=request.inbound_air_cargo_tons,
        active_trucks_count=request.active_trucks_count,
    )


@router.post("/vehicle-anomaly", status_code=status.HTTP_200_OK)
async def check_vehicle_anomaly_endpoint(request: VehicleAnomalyRequest):
    """
    Evaluates high-frequency vehicle telemetry for mechanical and operational anomalies.
    """
    return trained_ml_service.check_vehicle_anomaly(
        truck_id=request.truck_id,
        speed_kmh=request.speed_kmh,
        engine_rpm=request.engine_rpm,
        coolant_temp_celsius=request.coolant_temp_celsius,
        fuel_consumption_l_hr=request.fuel_consumption_l_hr,
        vibration_index_g=request.vibration_index_g,
    )


@router.post("/vehicle-failure", status_code=status.HTTP_200_OK)
async def predict_vehicle_failure_endpoint(request: VehicleFailureRequest):
    """
    Predicts vehicle breakdown probability, remaining operational range, and preventive maintenance action.
    """
    return trained_ml_service.predict_vehicle_failure(
        truck_id=request.truck_id,
        odometer_km=request.odometer_km,
        days_since_last_service=request.days_since_last_service,
        brake_wear_percent=request.brake_wear_percent,
        oil_pressure_psi=request.oil_pressure_psi,
        battery_voltage_volts=request.battery_voltage_volts,
    )



class SSTGNNForecastRequest(BaseModel):
    incident_hub_id: Optional[str] = Field(default="DEL-W12", description="Hub experiencing operational anomaly")
    incident_severity: float = Field(default=0.95, ge=0.0, le=1.0, description="Anomaly severity index (0.0 to 1.0)")
    congested_corridor: Optional[str] = Field(default="NH-48", description="Primary corridor (e.g. NH-48 Golden Quadrilateral)")


@router.post("/comprehensive-predict", status_code=status.HTTP_200_OK)
async def predict_comprehensive_endpoint(request: ComprehensiveLogisticsRequest):
    """
    Multi-objective corridor optimization: calculates overall efficiency score, fuel consumption, carbon emissions, and total cost.
    """
    return trained_ml_service.predict_comprehensive(
        origin_hub=request.origin_hub,
        destination_hub=request.destination_hub,
        distance_km=request.distance_km,
        cargo_weight_kg=request.cargo_weight_kg,
        driver_fatigue_shift_hrs=request.driver_fatigue_shift_hrs,
        route_congestion_index=request.route_congestion_index,
    )


@router.get("/models-status", status_code=status.HTTP_200_OK)
async def get_models_status_endpoint():
    """
    Returns the live operational status and manifest of all loaded .joblib models.
    """
    manifest = trained_ml_service.get_models_manifest()
    manifest["sst_gnn_model"] = {
        "status": "OPERATIONAL",
        "architecture": "SST-GNN (Simplified Spatio-Temporal Graph Neural Network)",
        "framework": "PyTorch 2.x",
        "reference": "PAKDD 2021 (Amit Roy et al.)",
        "spatial_hops": 3,
        "prediction_horizons_mins": [15, 30, 45, 60],
    }
    return manifest


# =========================================================================
# SST-GNN Spatio-Temporal Traffic Forecasting Endpoints (PAKDD 2021)
# =========================================================================
@router.post("/sst-gnn/forecast", status_code=status.HTTP_200_OK)
async def sst_gnn_forecast_endpoint(request: SSTGNNForecastRequest):
    """
    Executes PyTorch SST-GNN (PAKDD 2021) inference:
    1. Multi-hop spatial neighborhood aggregation across Indian national corridors
    2. Weighted temporal attention aggregation over historical and current sequences
    3. Multi-horizon speed, congestion, and SLA delay projections for all 10 hubs
    """
    try:
        from src.application.ai.sst_gnn import sst_gnn_service
        return sst_gnn_service.forecast_network_traffic(
            incident_hub_id=request.incident_hub_id,
            incident_severity=request.incident_severity,
            congested_corridor=request.congested_corridor,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SST-GNN inference failed: {str(e)}",
        )


@router.get("/sst-gnn/topology", status_code=status.HTTP_200_OK)
async def sst_gnn_topology_endpoint():
    """
    Returns the Indian logistics road network graph topology, node locations, and 1/2/3-hop transition matrices.
    """
    try:
        from src.application.ai.sst_gnn import sst_gnn_service
        return sst_gnn_service.get_topology()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch graph topology: {str(e)}",
        )

