import os
import json
import logging
import numpy as np
import joblib

# Real Scikit-Learn Industrial Models (type: ignore for environments without host-level type stubs)
from sklearn.ensemble import (  # type: ignore
    RandomForestRegressor,
    GradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.model_selection import train_test_split  # type: ignore
from sklearn.metrics import (  # type: ignore
    mean_absolute_error,
    r2_score,
    accuracy_score,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("INDUSTRIAL_ML_TRAINER")

WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "application", "ai", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)


# =====================================================================
# 1. TRAIN SCIKIT-LEARN RANDOM FOREST REGRESSOR FOR ETA PREDICTION
# =====================================================================
def train_scikit_learn_eta_regressor(n_samples: int = 5000):
    logger.info("🌲 Fitting Scikit-Learn RandomForestRegressor for Highway ETA...")

    np.random.seed(42)
    distances = np.random.uniform(100.0, 2200.0, n_samples)
    cargo_weights = np.random.uniform(2000.0, 26000.0, n_samples)
    congestion_factors = np.random.uniform(1.0, 2.5, n_samples)
    shift_hours = np.random.uniform(0.5, 8.0, n_samples)
    weather_factors = np.random.beta(1.5, 4.0, n_samples)

    base_speed = 63.8
    base_time_mins = (distances / base_speed) * 60.0
    congestion_drag = np.power(congestion_factors, 1.18)
    weight_drag = (cargo_weights / 1000.0) * 1.85
    fatigue_drag = shift_hours * 2.75
    weather_drag = weather_factors * 50.0
    noise = np.random.normal(0.0, 6.0, n_samples)

    actual_duration_mins = (base_time_mins * congestion_drag) + weight_drag + fatigue_drag + weather_drag + 12.0 + noise
    actual_duration_mins = np.maximum(actual_duration_mins, 15.0)

    X = np.column_stack([distances, cargo_weights, congestion_factors, shift_hours, weather_factors])
    y = actual_duration_mins

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    rf_model = RandomForestRegressor(n_estimators=60, max_depth=10, random_state=42)
    rf_model.fit(X_train, y_train)

    y_pred = rf_model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"✓ RandomForestRegressor Fitted: Validation MAE = {mae:.2f} mins | R² Score = {r2:.4f}")

    rf_path = os.path.join(WEIGHTS_DIR, "eta_random_forest.joblib")
    joblib.dump(rf_model, rf_path)
    logger.info(f"✓ Saved binary Scikit-Learn model to: {rf_path}")

    return {
        "mae_mins": round(float(mae), 2),
        "r2_score": round(float(r2), 4),
        "feature_importances": {
            "distance_km": round(float(rf_model.feature_importances_[0]), 4),
            "cargo_weight_kg": round(float(rf_model.feature_importances_[1]), 4),
            "congestion_factor": round(float(rf_model.feature_importances_[2]), 4),
            "shift_hours": round(float(rf_model.feature_importances_[3]), 4),
            "weather_factor": round(float(rf_model.feature_importances_[4]), 4),
        },
        "n_estimators": len(rf_model.estimators_),
    }


# =====================================================================
# 2. TRAIN SCIKIT-LEARN GRADIENT BOOSTING INCIDENT CLASSIFIER
# =====================================================================
def train_gradient_boosting_incident_classifier(n_samples: int = 4000):
    logger.info("⚡ Fitting Scikit-Learn GradientBoostingClassifier for Incident Risk...")

    np.random.seed(42)
    dwell_times = np.random.uniform(5.0, 60.0, n_samples)
    conveyor_eps = np.random.uniform(0.05, 1.8, n_samples)
    cold_chain_counts = np.random.randint(0, 30, n_samples)
    trucks_queued = np.random.randint(1, 25, n_samples)
    voltage_dips = np.random.uniform(0.0, 70.0, n_samples)

    risk_scores = (
        (dwell_times / 30.0) * 2.2
        + (1.0 / np.maximum(conveyor_eps, 0.1)) * 1.5
        + (cold_chain_counts * 0.25)
        + (trucks_queued * 0.18)
        + (voltage_dips / 20.0) * 1.8
    )

    y = np.zeros(n_samples, dtype=int)
    y[risk_scores >= 2.5] = 1
    y[risk_scores >= 4.5] = 2
    y[risk_scores >= 7.0] = 3

    X = np.column_stack([dwell_times, conveyor_eps, cold_chain_counts, trucks_queued, voltage_dips])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    gb_model = GradientBoostingClassifier(n_estimators=40, learning_rate=0.1, max_depth=4, random_state=42)
    gb_model.fit(X_train, y_train)

    y_pred = gb_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    logger.info(f"✓ GradientBoostingClassifier Fitted: Test Accuracy = {acc * 100:.2f}%")

    gb_path = os.path.join(WEIGHTS_DIR, "incident_gb_classifier.joblib")
    joblib.dump(gb_model, gb_path)
    logger.info(f"✓ Saved binary Scikit-Learn model to: {gb_path}")

    return {
        "accuracy_pct": round(float(acc) * 100, 2),
        "classes": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "n_estimators": len(gb_model.estimators_),
    }


# =====================================================================
# 3. TRAIN SCIKIT-LEARN RANDOM FOREST OPTICAL DEFECT CLASSIFIER
# =====================================================================
def train_vision_optical_classifier(n_samples: int = 5000):
    logger.info("👁️ Fitting Scikit-Learn Multi-Class Random Forest for Automated Optical Inspection...")

    np.random.seed(42)
    X_list = []
    y_list = []
    for _ in range(n_samples):
        cls = int(np.random.choice([0, 1, 2, 3], p=[0.60, 0.18, 0.12, 0.10]))
        if cls == 0:
            feat = [float(np.random.uniform(0.8, 1.0)), float(np.random.uniform(100, 250)), float(np.random.uniform(0.35, 0.55)), float(np.random.uniform(-4, 4)), float(np.random.uniform(0.01, 0.04))]
        elif cls == 1:
            feat = [float(np.random.uniform(0.3, 0.65)), float(np.random.uniform(5, 35)), float(np.random.uniform(0.1, 0.3)), float(np.random.uniform(-20, 20)), float(np.random.uniform(0.02, 0.07))]
        elif cls == 2:
            feat = [float(np.random.uniform(0.4, 0.75)), float(np.random.uniform(40, 110)), float(np.random.uniform(0.6, 0.95)), float(np.random.uniform(-30, 30)), float(np.random.uniform(0.2, 0.5))]
        else:
            feat = [float(np.random.uniform(0.15, 0.45)), float(np.random.uniform(15, 50)), float(np.random.uniform(0.05, 0.2)), float(np.random.uniform(-8, 8)), float(np.random.uniform(0.01, 0.04))]

        X_list.append(feat)
        y_list.append(cls)

    X = np.array(X_list)
    y = np.array(y_list)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    vision_model = RandomForestClassifier(n_estimators=50, max_depth=8, random_state=42)
    vision_model.fit(X_train, y_train)

    y_pred = vision_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    logger.info(f"✓ Optical Inspection Model Fitted: Accuracy = {acc * 100:.2f}%")

    vis_path = os.path.join(WEIGHTS_DIR, "vision_rf_classifier.joblib")
    joblib.dump(vision_model, vis_path)
    logger.info(f"✓ Saved binary Scikit-Learn model to: {vis_path}")

    return {
        "accuracy_pct": round(float(acc) * 100, 2),
        "classes": ["OPTIMAL_LABEL_CLEAN", "TORN_OR_BLURRED_BARCODE", "CRUSHED_BOX_DEFECT", "THERMAL_FROST_OBSCURED"],
        "n_estimators": len(vision_model.estimators_),
    }


# =====================================================================
# 4. TRAIN COLD-CHAIN THERMAL EXCURSION REGRESSOR
# =====================================================================
def train_cold_chain_thermal_regressor(n_samples: int = 4000):
    logger.info("❄️ Fitting Scikit-Learn RandomForestRegressor for Cold-Chain Thermal Excursion...")

    np.random.seed(42)
    ambient_temps = np.random.uniform(22.0, 44.0, n_samples)
    compressor_power_kw = np.random.uniform(1.2, 5.0, n_samples)
    door_opens_per_hour = np.random.uniform(0.0, 8.0, n_samples)
    insulation_r_value = np.random.uniform(18.0, 32.0, n_samples)
    initial_cargo_temp = np.random.uniform(2.2, 4.8, n_samples)

    thermal_leakage = (ambient_temps - initial_cargo_temp) / insulation_r_value * 2.8
    door_penalty = door_opens_per_hour * 0.45
    cooling_offset = compressor_power_kw * 0.92
    temp_4h_predicted = initial_cargo_temp + thermal_leakage + door_penalty - cooling_offset

    X = np.column_stack([ambient_temps, compressor_power_kw, door_opens_per_hour, insulation_r_value, initial_cargo_temp])
    y = temp_4h_predicted

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    thermal_model = RandomForestRegressor(n_estimators=45, max_depth=8, random_state=42)
    thermal_model.fit(X_train, y_train)

    y_pred = thermal_model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"✓ Cold-Chain Thermal Model Fitted: Validation MAE = {mae:.2f}°C | R² = {r2:.4f}")

    thermal_path = os.path.join(WEIGHTS_DIR, "cold_chain_rf_regressor.joblib")
    joblib.dump(thermal_model, thermal_path)
    logger.info(f"✓ Saved binary model to: {thermal_path}")

    return {
        "mae_celsius": round(float(mae), 3),
        "r2_score": round(float(r2), 4),
        "n_estimators": len(thermal_model.estimators_),
    }


# =====================================================================
# 5. TRAIN DYNAMIC FLEET FUEL EFFICIENCY & CO2 EMISSION REGRESSOR
# =====================================================================
def train_fuel_emission_regressor(n_samples: int = 4000):
    logger.info("⛽ Fitting Scikit-Learn RandomForestRegressor for Fleet Fuel & CO2 Emissions...")

    np.random.seed(42)
    payload_tons = np.random.uniform(5.0, 32.0, n_samples)
    avg_speed_kmh = np.random.uniform(40.0, 85.0, n_samples)
    elevation_gain_m = np.random.uniform(0.0, 1200.0, n_samples)
    engine_displacement_litres = np.random.uniform(5.6, 12.8, n_samples)

    base_consumption = 22.0 + (engine_displacement_litres * 0.8)
    tonnage_drag = payload_tons * 0.45
    speed_aero_drag = np.power(avg_speed_kmh / 60.0, 1.4) * 3.2
    grade_drag = (elevation_gain_m / 100.0) * 0.65
    noise = np.random.normal(0.0, 0.8, n_samples)

    litres_per_100km = base_consumption + tonnage_drag + speed_aero_drag + grade_drag + noise
    litres_per_100km = np.maximum(litres_per_100km, 18.0)

    X = np.column_stack([payload_tons, avg_speed_kmh, elevation_gain_m, engine_displacement_litres])
    y = litres_per_100km

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    fuel_model = RandomForestRegressor(n_estimators=45, max_depth=8, random_state=42)
    fuel_model.fit(X_train, y_train)

    y_pred = fuel_model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"✓ Fuel & Emission Model Fitted: Validation MAE = {mae:.2f} L/100km | R² = {r2:.4f}")

    fuel_path = os.path.join(WEIGHTS_DIR, "fuel_emission_regressor.joblib")
    joblib.dump(fuel_model, fuel_path)
    logger.info(f"✓ Saved binary model to: {fuel_path}")

    return {
        "mae_litres_per_100km": round(float(mae), 2),
        "r2_score": round(float(r2), 4),
        "n_estimators": len(fuel_model.estimators_),
    }


def train_and_export_all():
    logger.info("=================================================================")
    logger.info("🚀 EXECUTING GENUINE SCIKIT-LEARN BINARY MODEL TRAINING SUITE")
    logger.info("=================================================================")

    rf_meta = train_scikit_learn_eta_regressor()
    gb_meta = train_gradient_boosting_incident_classifier()
    vis_meta = train_vision_optical_classifier()
    cold_meta = train_cold_chain_thermal_regressor()
    fuel_meta = train_fuel_emission_regressor()

    manifest = {
        "manifest_version": "3.1.0",
        "description": "Enterprise binary serialized ML models trained with Scikit-Learn",
        "models": {
            "eta_regressor": {
                "framework": "Scikit-Learn (RandomForestRegressor)",
                "artifact_file": "eta_random_forest.joblib",
                "metrics": rf_meta,
            },
            "incident_classifier": {
                "framework": "Scikit-Learn (GradientBoostingClassifier)",
                "artifact_file": "incident_gb_classifier.joblib",
                "metrics": gb_meta,
            },
            "vision_defect_classifier": {
                "framework": "Scikit-Learn (RandomForestClassifier)",
                "artifact_file": "vision_rf_classifier.joblib",
                "metrics": vis_meta,
            },
            "cold_chain_thermal_predictor": {
                "framework": "Scikit-Learn (RandomForestRegressor)",
                "artifact_file": "cold_chain_rf_regressor.joblib",
                "metrics": cold_meta,
            },
            "fuel_and_carbon_emission_model": {
                "framework": "Scikit-Learn (RandomForestRegressor)",
                "artifact_file": "fuel_emission_regressor.joblib",
                "metrics": fuel_meta,
            },
        },
    }

    manifest_path = os.path.join(WEIGHTS_DIR, "model_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logger.info("=================================================================")
    logger.info(f"✓ Training Complete! Manifest written to: {manifest_path}")
    logger.info("=================================================================")


if __name__ == "__main__":
    train_and_export_all()
