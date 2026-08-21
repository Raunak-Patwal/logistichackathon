"""
Unit and Integration Tests for Trained ML Models & Inference Gateway.
Tests Scikit-Learn / XGBoost joblib loading, fallbacks, and REST API endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.application.ai.trained_models_service import trained_ml_service


@pytest.mark.asyncio
async def test_trained_ml_service_eta_prediction():
    """Tests the XGBoost ETA prediction service."""
    result = trained_ml_service.predict_eta(
        delivery_partner="Delhivery",
        package_type="Standard",
        vehicle_type="Tata Ace (1.5T)",
        delivery_mode="Express",
        region="North (Delhi NCR)",
        weather_condition="Clear",
        distance_km=150.0,
        package_weight_kg=25.0,
        expected_time_hours=3.5,
    )
    assert result["status"] == "SUCCESS"
    assert "predicted_eta_hours" in result
    assert result["predicted_eta_hours"] > 0
    assert "predicted_eta_minutes" in result
    assert result["predicted_eta_minutes"] > 0
    assert "is_delayed" in result
    assert "risk_status" in result


@pytest.mark.asyncio
async def test_trained_ml_service_demand_forecast():
    """Tests freight demand forecasting."""
    result = trained_ml_service.forecast_demand(
        hub_code="DEL-W12",
        day_of_week=2,
        festival_surge_multiplier=1.3,
        inbound_air_cargo_tons=150.0,
        active_trucks_count=40,
    )
    assert result["status"] == "SUCCESS"
    assert "predicted_parcel_volume" in result
    assert result["predicted_parcel_volume"] > 0
    assert "hourly_curve" in result
    assert len(result["hourly_curve"]) == 24


@pytest.mark.asyncio
async def test_trained_ml_service_vehicle_anomaly():
    """Tests vehicle telemetry outlier detection."""
    # Test normal vehicle telemetry
    normal_res = trained_ml_service.check_vehicle_anomaly(
        truck_id="TRK-101",
        speed_kmh=60.0,
        engine_rpm=1900.0,
        coolant_temp_celsius=90.0,
        fuel_consumption_l_hr=22.0,
        vibration_index_g=0.3,
    )
    assert normal_res["status"] == "SUCCESS"
    assert normal_res["is_anomaly"] is False

    # Test extreme anomaly (overspeeding + overheating)
    anomaly_res = trained_ml_service.check_vehicle_anomaly(
        truck_id="TRK-999",
        speed_kmh=110.0,
        engine_rpm=3800.0,
        coolant_temp_celsius=118.0,
        fuel_consumption_l_hr=45.0,
        vibration_index_g=2.1,
    )
    assert anomaly_res["status"] == "SUCCESS"
    assert anomaly_res["is_anomaly"] is True
    assert anomaly_res["risk_score"] > 0.7


@pytest.mark.asyncio
async def test_trained_ml_service_vehicle_failure():
    """Tests predictive maintenance component failure prediction."""
    res = trained_ml_service.predict_vehicle_failure(
        truck_id="TRK-505",
        odometer_km=180000.0,
        days_since_last_service=65,
        brake_wear_percent=85.0,
        oil_pressure_psi=28.0,
        battery_voltage_volts=11.6,
    )
    assert res["status"] == "SUCCESS"
    assert "failure_probability" in res
    assert 0.0 <= res["failure_probability"] <= 1.0
    assert "risk_level" in res
    assert "recommended_action" in res


@pytest.mark.asyncio
async def test_trained_ml_service_comprehensive():
    """Tests multi-objective logistics corridor evaluation."""
    res = trained_ml_service.predict_comprehensive(
        origin_hub="DEL-W12",
        destination_hub="BOM-W04",
        distance_km=1420.0,
        cargo_weight_kg=15000.0,
        driver_fatigue_shift_hrs=4.0,
        route_congestion_index=1.5,
    )
    assert res["status"] == "SUCCESS"
    assert "efficiency_score" in res
    assert "estimated_fuel_litres" in res
    assert "estimated_carbon_kg_co2" in res
    assert "estimated_cost_inr" in res


@pytest.mark.asyncio
async def test_ml_api_endpoints():
    """Tests all FastAPI REST endpoints under /api/v1/ml/*."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Categories
        cat_resp = await ac.get("/api/v1/ml/categories")
        assert cat_resp.status_code == 200
        cat_data = cat_resp.json()
        assert "categories" in cat_data
        assert "delivery_partner" in cat_data["categories"]

        # 2. Predict ETA
        eta_resp = await ac.post(
            "/api/v1/ml/predict-eta",
            json={
                "delivery_partner": "Delhivery",
                "package_type": "Cold Chain",
                "vehicle_type": "BharatBenz 24ft (10T)",
                "delivery_mode": "Same Day",
                "region": "North (Delhi NCR)",
                "weather_condition": "Clear",
                "distance_km": 180.0,
                "package_weight_kg": 50.0,
                "expected_time_hours": 4.0,
            },
        )
        assert eta_resp.status_code == 200
        eta_data = eta_resp.json()
        assert "predicted_eta_hours" in eta_data
        assert eta_data["predicted_eta_hours"] > 0

        # 3. Demand Forecast
        demand_resp = await ac.post(
            "/api/v1/ml/demand-forecast",
            json={
                "hub_code": "DEL-W12",
                "day_of_week": 2,
                "festival_surge_multiplier": 1.5,
                "inbound_air_cargo_tons": 200.0,
                "active_trucks_count": 50,
            },
        )
        assert demand_resp.status_code == 200
        assert "predicted_parcel_volume" in demand_resp.json()

        # 4. Vehicle Anomaly
        anom_resp = await ac.post(
            "/api/v1/ml/vehicle-anomaly",
            json={
                "truck_id": "TRK-202",
                "speed_kmh": 72.0,
                "engine_rpm": 2200.0,
                "coolant_temp_celsius": 91.0,
                "fuel_consumption_l_hr": 26.0,
                "vibration_index_g": 0.4,
            },
        )
        assert anom_resp.status_code == 200
        assert "is_anomaly" in anom_resp.json()

        # 5. Vehicle Failure
        fail_resp = await ac.post(
            "/api/v1/ml/vehicle-failure",
            json={
                "truck_id": "TRK-202",
                "odometer_km": 120000.0,
                "days_since_last_service": 25,
                "brake_wear_percent": 45.0,
                "oil_pressure_psi": 42.0,
                "battery_voltage_volts": 12.6,
            },
        )
        assert fail_resp.status_code == 200
        assert "failure_probability" in fail_resp.json()

        # 6. Comprehensive Predict
        comp_resp = await ac.post(
            "/api/v1/ml/comprehensive-predict",
            json={
                "origin_hub": "DEL-W12",
                "destination_hub": "BLR-W08",
                "distance_km": 2150.0,
                "cargo_weight_kg": 18000.0,
                "driver_fatigue_shift_hrs": 2.0,
                "route_congestion_index": 1.2,
            },
        )
        assert comp_resp.status_code == 200
        assert "efficiency_score" in comp_resp.json()

        # 7. Models Status Manifest
        status_resp = await ac.get("/api/v1/ml/models-status")
        assert status_resp.status_code == 200
        assert "status" in status_resp.json()

        # 8. SST-GNN Spatio-Temporal Forecast
        sst_resp = await ac.post(
            "/api/v1/ml/sst-gnn/forecast",
            json={
                "incident_hub_id": "DEL-W12",
                "incident_severity": 0.9,
                "congested_corridor": "NH-48",
            },
        )
        assert sst_resp.status_code == 200
        sst_json = sst_resp.json()
        assert sst_json["status"] == "SUCCESS"
        assert len(sst_json["hub_forecasts"]) == 10
        assert "temporal_attention_weights" in sst_json

        # 9. SST-GNN Topology
        topo_resp = await ac.get("/api/v1/ml/sst-gnn/topology")
        assert topo_resp.status_code == 200
        assert len(topo_resp.json()["nodes"]) == 10

