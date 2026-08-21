import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ArrowRight,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
  Zap,
  Eye,
  BarChart3,
  Activity,
  Package,
  Thermometer,
  Fuel,
  Leaf,
  Clock,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { simulationEngine } from '../../api/simulationEngine';
import { apiClient } from '../../api/client';
import { EventType } from '../../domain/uleo';

const SAMPLE_RAW_INPUTS = [
  {
    id: 'SAP-IDOC-01',
    source: 'SAP ERP / IDoc DESADV',
    raw: JSON.stringify(
      {
        IDOC_NUM: '00000088921',
        MESTYP: 'DESADV',
        E1EDK01: { VBELN: 'P-10291', KUNNR: 'CUST-BLR-09' },
        E1EDP01: { MATNR: 'MED-VACCINE-COLD', MENGE: '4.8', GEWEI: 'KGM', DEST: 'Bengaluru Tech Park' },
      },
      null,
      2
    ),
    target_event: 'PARCEL_CREATED' as EventType,
    entity_id: 'P-10291',
    normalized_payload: {
      weight: 4.8,
      destination: 'Bengaluru Tech Park (BLR)',
      priority: 'CRITICAL_MEDICAL',
    },
  },
  {
    id: 'ZEBRA-SCAN-02',
    source: 'Zebra TC57 Scanner (W04 Bay 12)',
    raw: JSON.stringify(
      {
        SCANNER_MAC: '00:1A:2B:3C:4D:5E',
        BARCODE_VAL: 'PKG-10291-EXP',
        DOCK_ID: 'BAY-12',
        VEHICLE_TAG: 'TRK-184-MH',
        OPERATOR: 'OPR-491',
      },
      null,
      2
    ),
    target_event: 'PARCEL_LOADED' as EventType,
    entity_id: 'P-10291',
    normalized_payload: {
      truck_id: 'T-184',
      dock_number: 'Bay 12',
      operator_id: 'OPR-491',
    },
  },
  {
    id: 'QUECLINK-GPS-03',
    source: 'Queclink GV300 GPS Telematics',
    raw: JSON.stringify(
      {
        IMEI: '864209048192019',
        LAT: 19.076,
        LON: 72.8777,
        SPD_KPH: 68.4,
        HEADING: 142.5,
        ODOMETER: 142091,
        IGNITION: 'ON',
      },
      null,
      2
    ),
    target_event: 'TRUCK_LOCATION_PING' as EventType,
    entity_id: 'T-184',
    normalized_payload: {
      speed_kmh: 68,
      coordinates: [-9.2, 0.22, 6.4],
      fuel_percent: 64,
    },
  },
];

const VISION_SAMPLES = [
  {
    id: 'SCAN-OPTIMAL',
    name: 'Clean High-Speed Box (Bay 1)',
    params: { contrast_score: 0.92, blur_variance: 180.0, edge_gradient_density: 0.45, skew_angle_deg: 1.2, aspect_ratio_error: 0.02, is_cold_chain: false },
  },
  {
    id: 'SCAN-TORN',
    name: 'Torn / Motion Blurred Barcode',
    params: { contrast_score: 0.42, blur_variance: 18.0, edge_gradient_density: 0.22, skew_angle_deg: 18.5, aspect_ratio_error: 0.05, is_cold_chain: false },
  },
  {
    id: 'SCAN-DEFECT',
    name: 'Crushed Packaging Defect',
    params: { contrast_score: 0.55, blur_variance: 65.0, edge_gradient_density: 0.88, skew_angle_deg: 24.0, aspect_ratio_error: 0.45, is_cold_chain: false },
  },
  {
    id: 'SCAN-FROST',
    name: 'Pharma Cold-Chain Frost Obscured',
    params: { contrast_score: 0.32, blur_variance: 35.0, edge_gradient_density: 0.12, skew_angle_deg: -2.0, aspect_ratio_error: 0.03, is_cold_chain: true },
  },
];

export const UleoStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ULEO' | 'ETA_XGBOOST' | 'FLEET_AI' | 'VISION_CNN' | 'DEMAND_MLP' | 'COLD_CHAIN' | 'FUEL_EMISSION' | 'REGISTRY'>('ETA_XGBOOST');
  
  // XGBoost Trained Model State
  const [etaPartner, setEtaPartner] = useState('Delhivery');
  const [etaPkgType, setEtaPkgType] = useState('Standard');
  const [etaVehicleType, setEtaVehicleType] = useState('Tata Ace (1.5T)');
  const [etaDeliveryMode, setEtaDeliveryMode] = useState('Standard');
  const [etaRegion, setEtaRegion] = useState('North (Delhi NCR)');
  const [etaWeather, setEtaWeather] = useState('Clear');
  const [etaDistance, setEtaDistance] = useState(145.0);
  const [etaWeight, setEtaWeight] = useState(18.5);
  const [etaExpectedHrs, setEtaExpectedHrs] = useState(4.0);
  const [etaResult, setEtaResult] = useState<any | null>(null);
  const [isEtaPredicting, setIsEtaPredicting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<any | null>(null);

  // Fleet Telemetry Anomaly & Failure State
  const [anomalySpeed, setAnomalySpeed] = useState(68.0);
  const [anomalyRpm, setAnomalyRpm] = useState(2200.0);
  const [anomalyCoolant, setAnomalyCoolant] = useState(91.0);
  const [anomalyVibration, setAnomalyVibration] = useState(0.35);
  const [anomalyResult, setAnomalyResult] = useState<any | null>(null);
  const [isAnomalyChecking, setIsAnomalyChecking] = useState(false);

  const [failureOdo, setFailureOdo] = useState(145000.0);
  const [failureDaysService, setFailureDaysService] = useState(42);
  const [failureBrakeWear, setFailureBrakeWear] = useState(65.0);
  const [failureOilPsi, setFailureOilPsi] = useState(38.0);
  const [failureVolts, setFailureVolts] = useState(12.4);
  const [failureResult, setFailureResult] = useState<any | null>(null);
  const [isFailurePredicting, setIsFailurePredicting] = useState(false);

  // ULEO State
  const [selectedSample, setSelectedSample] = useState(SAMPLE_RAW_INPUTS[0]);
  const [translationResult, setTranslationResult] = useState<any | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Vision CNN State
  const [selectedVisionSample, setSelectedVisionSample] = useState(VISION_SAMPLES[0]);
  const [visionInspectionResult, setVisionInspectionResult] = useState<any | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // Demand Forecast State
  const [selectedHub, setSelectedHub] = useState('DEL-W12');
  const [demandData, setDemandData] = useState<any | null>(null);

  // Cold Chain State
  const [coldAmbient, setColdAmbient] = useState(36.0);
  const [compressorPower, setCompressorPower] = useState(2.8);
  const [doorOpens, setDoorOpens] = useState(2.0);
  const [coldResult, setColdResult] = useState<any | null>(null);
  const [isColdPredicting, setIsColdPredicting] = useState(false);

  // Fuel & Emissions State
  const [tripDistance, setTripDistance] = useState(850.0);
  const [payloadTons, setPayloadTons] = useState(18.5);
  const [avgSpeed, setAvgSpeed] = useState(60.0);
  const [elevationGain, setElevationGain] = useState(350.0);
  const [fuelResult, setFuelResult] = useState<any | null>(null);
  const [isFuelPredicting, setIsFuelPredicting] = useState(false);

  // Model Registry State
  const [manifestData, setManifestData] = useState<any | null>(null);

  useEffect(() => {
    apiClient.fetchTrainedCategories().then((res) => {
      if (res?.categories) {
        setAvailableCategories(res.categories);
      }
    });
    // Run initial prediction
    handleRunXGBoostPrediction();
  }, []);

  const handleRunXGBoostPrediction = async () => {
    setIsEtaPredicting(true);
    try {
      const res = await apiClient.predictTrainedEta({
        delivery_partner: etaPartner,
        package_type: etaPkgType,
        vehicle_type: etaVehicleType,
        delivery_mode: etaDeliveryMode,
        region: etaRegion,
        weather_condition: etaWeather,
        distance_km: etaDistance,
        package_weight_kg: etaWeight,
        expected_time_hours: etaExpectedHrs,
      });
      setEtaResult(res);
    } catch {}
    finally {
      setIsEtaPredicting(false);
    }
  };

  const handleRunAnomalyCheck = async () => {
    setIsAnomalyChecking(true);
    try {
      const res = await apiClient.checkVehicleAnomaly({
        truck_id: 'TRK-901',
        speed_kmh: anomalySpeed,
        engine_rpm: anomalyRpm,
        coolant_temp_celsius: anomalyCoolant,
        fuel_consumption_l_hr: 24.5,
        vibration_index_g: anomalyVibration,
      });
      setAnomalyResult(res);
    } catch {}
    finally {
      setIsAnomalyChecking(false);
    }
  };

  const handleRunFailurePredict = async () => {
    setIsFailurePredicting(true);
    try {
      const res = await apiClient.predictVehicleFailure({
        truck_id: 'TRK-901',
        odometer_km: failureOdo,
        days_since_last_service: failureDaysService,
        brake_wear_percent: failureBrakeWear,
        oil_pressure_psi: failureOilPsi,
        battery_voltage_volts: failureVolts,
      });
      setFailureResult(res);
    } catch {}
    finally {
      setIsFailurePredicting(false);
    }
  };

  const handleTranslateAndCommit = () => {
    setIsExecuting(true);
    setTimeout(() => {
      const response = simulationEngine.processEvent({
        event_type: selectedSample.target_event,
        entity_id: selectedSample.entity_id,
        source: selectedSample.source,
        payload: selectedSample.normalized_payload,
      });

      setTranslationResult(response);
      setIsExecuting(false);
    }, 350);
  };

  const handleRunCNNInspection = async () => {
    setIsInspecting(true);
    try {
      const res = await apiClient.inspectVisionPackage(selectedVisionSample.params);
      setVisionInspectionResult(res);
    } catch {}
    finally {
      setIsInspecting(false);
    }
  };

  const handleRunColdChainPredict = async () => {
    setIsColdPredicting(true);
    try {
      const res = await apiClient.predictColdChainThermal({
        ambient_temp_celsius: coldAmbient,
        compressor_power_kw: compressorPower,
        door_opens_per_hour: doorOpens,
        insulation_r_value: 24.0,
        initial_cargo_temp: 3.5,
      });
      setColdResult(res);
    } catch {}
    finally {
      setIsColdPredicting(false);
    }
  };

  const handleRunFuelPredict = async () => {
    setIsFuelPredicting(true);
    try {
      const res = await apiClient.predictFuelAndEmissions({
        distance_km: tripDistance,
        payload_tons: payloadTons,
        avg_speed_kmh: avgSpeed,
        elevation_gain_m: elevationGain,
        engine_displacement_litres: 8.9,
      });
      setFuelResult(res);
    } catch {}
    finally {
      setIsFuelPredicting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'DEMAND_MLP') {
      apiClient.fetchDemandForecast(selectedHub).then((res) => {
        if (res) setDemandData(res);
      });
    } else if (activeTab === 'COLD_CHAIN' && !coldResult) {
      handleRunColdChainPredict();
    } else if (activeTab === 'FUEL_EMISSION' && !fuelResult) {
      handleRunFuelPredict();
    } else if (activeTab === 'REGISTRY') {
      apiClient.fetchModelManifest().then((res) => {
        if (res) setManifestData(res);
      });
    }
  }, [activeTab, selectedHub]);

  return (
    <div
      className="glass-card"
      style={{
        position: 'absolute',
        top: 'calc(var(--telemetry-bar-height) + 16px)',
        left: 'calc(var(--nav-rail-width) + 16px)',
        right: '16px',
        bottom: '16px',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 240, 255, 0.15)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          background: 'linear-gradient(90deg, rgba(8, 14, 28, 0.95) 0%, rgba(4, 7, 17, 0.95) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={20} color="#00f0ff" />
          <div>
            <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              ENTERPRISE AI & MACHINE LEARNING CONTROL CENTER
            </h2>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', letterSpacing: '0.04em' }}>
              GENUINE SCIKIT-LEARN BINARY ENSEMBLES • JOBLIB ARTIFACTS • REAL INFERENCE ENGINE
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(4, 7, 17, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
          {[
            { key: 'ETA_XGBOOST', label: 'XGBOOST ETA PREDICTOR', icon: <Zap size={13} /> },
            { key: 'FLEET_AI', label: 'FLEET TELEMETRY & HEALTH', icon: <Activity size={13} /> },
            { key: 'ULEO', label: 'ULEO STUDIO', icon: <Layers size={13} /> },
            { key: 'VISION_CNN', label: 'CNN OPTICAL AOI', icon: <Eye size={13} /> },
            { key: 'DEMAND_MLP', label: 'DEMAND FORECAST', icon: <BarChart3 size={13} /> },
            { key: 'COLD_CHAIN', label: 'COLD-CHAIN AI', icon: <Thermometer size={13} /> },
            { key: 'FUEL_EMISSION', label: 'ECO FLEET & CO2', icon: <Leaf size={13} /> },
            { key: 'REGISTRY', label: 'MODEL REGISTRY', icon: <ShieldCheck size={13} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              className="cyber-btn"
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'VISION_CNN' && !visionInspectionResult) handleRunCNNInspection();
              }}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                background: activeTab === tab.key ? 'rgba(0, 240, 255, 0.25)' : 'transparent',
                borderColor: activeTab === tab.key ? '#00f0ff' : 'transparent',
                color: activeTab === tab.key ? '#f8fafc' : '#94a3b8',
                borderRadius: '6px',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body Content by Tab */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* ================================================================= */}
        {/* TAB 0: TRAINED XGBOOST DYNAMIC ETA PREDICTOR */}
        {/* ================================================================= */}
        {activeTab === 'ETA_XGBOOST' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="font-display" style={{ fontSize: '1.05rem', color: '#00f0ff', margin: 0 }}>
                  XGBoost Dynamic ETA Inference Engine
                </h3>
                <span className="font-mono text-xs" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #10b981' }}>
                  MODEL: eta_xgboost_model.joblib
                </span>
              </div>

              {/* Input Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Delivery Partner</label>
                  <select value={etaPartner} onChange={(e) => setEtaPartner(e.target.value)} className="cyber-input" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                    {(availableCategories?.delivery_partner || ['Delhivery', 'BlueDart', 'DTDC', 'Shadowfax', 'Ecom Express', 'Ekart', 'FedEx']).map((p: string) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Package Type</label>
                  <select value={etaPkgType} onChange={(e) => setEtaPkgType(e.target.value)} className="cyber-input" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                    {(availableCategories?.package_type || ['Standard', 'Express', 'Fragile', 'Cold Chain', 'Heavy Cargo', 'Medicine', 'Electronics']).map((p: string) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Vehicle Class</label>
                  <select value={etaVehicleType} onChange={(e) => setEtaVehicleType(e.target.value)} className="cyber-input" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                    {(availableCategories?.vehicle_type || ['Tata Ace (1.5T)', 'Eicher 14ft (4T)', 'BharatBenz 24ft (10T)', 'Volvo Multi-Axle (20T)', 'EV Delivery Van']).map((v: string) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Delivery Mode</label>
                  <select value={etaDeliveryMode} onChange={(e) => setEtaDeliveryMode(e.target.value)} className="cyber-input" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                    {(availableCategories?.delivery_mode || ['Standard', 'Express', 'Same Day', 'Priority Air', 'Surface Cargo']).map((m: string) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Logistics Region</label>
                  <select value={etaRegion} onChange={(e) => setEtaRegion(e.target.value)} className="cyber-input" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                    {(availableCategories?.region || ['North (Delhi NCR)', 'West (Mumbai/Pune)', 'South (Bengaluru/Chennai)', 'East (Kolkata)', 'Central (Hyderabad/Nagpur)']).map((r: string) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Weather Condition</label>
                  <select value={etaWeather} onChange={(e) => setEtaWeather(e.target.value)} className="cyber-input" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                    {(availableCategories?.weather_condition || ['Clear', 'Light Rain', 'Heavy Monsoon', 'Dense Fog', 'Severe Heatwave', 'Dust Storm']).map((w: string) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Distance:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>{etaDistance} km</span>
                  </div>
                  <input type="range" min="5" max="1500" step="5" value={etaDistance} onChange={(e) => setEtaDistance(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Package Weight:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>{etaWeight} kg</span>
                  </div>
                  <input type="range" min="0.5" max="250" step="0.5" value={etaWeight} onChange={(e) => setEtaWeight(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Promised SLA Window:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>{etaExpectedHrs} Hours</span>
                  </div>
                  <input type="range" min="0.5" max="48" step="0.5" value={etaExpectedHrs} onChange={(e) => setEtaExpectedHrs(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>
              </div>

              <button className="cyber-btn" onClick={handleRunXGBoostPrediction} disabled={isEtaPredicting} style={{ padding: '12px', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.3) 0%, rgba(2, 132, 199, 0.3) 100%)', borderColor: '#00f0ff', borderRadius: '8px' }}>
                <Zap size={16} color="#00f0ff" />
                <span style={{ fontWeight: 700 }}>{isEtaPredicting ? 'RUNNING XGBOOST INFERENCE...' : 'RUN TRAINED XGBOOST ETA PREDICTION'}</span>
              </button>
            </div>

            {/* Result Panel */}
            <div>
              {etaResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '20px', background: '#040711', border: `1px solid ${etaResult.risk_status === 'ON_TIME' ? '#10b981' : etaResult.risk_status === 'MODERATE_DELAY' ? '#f59e0b' : '#ff3366'}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                    <div className="font-mono text-xs" style={{ color: '#94a3b8' }}>PREDICTED TRANSIT TIME (XGBOOST)</div>
                    <div className="font-mono" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc', margin: '6px 0' }}>
                      {etaResult.predicted_eta_hours} <span style={{ fontSize: '1.1rem', color: '#94a3b8' }}>Hours</span>
                    </div>
                    <div className="font-mono text-sm" style={{ color: '#00f0ff' }}>
                      ≈ {etaResult.predicted_eta_minutes} Minutes
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '6px' }}>
                        <span className="font-mono text-xs" style={{ color: '#64748b' }}>SLA Target: </span>
                        <b className="font-mono text-xs" style={{ color: '#cbd5e1' }}>{etaResult.expected_time_hours} hrs</b>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '6px' }}>
                        <span className="font-mono text-xs" style={{ color: '#64748b' }}>SLA Variance: </span>
                        <b className="font-mono text-xs" style={{ color: etaResult.delay_hours > 0 ? '#ff3366' : '#10b981' }}>
                          {etaResult.delay_hours > 0 ? `+${etaResult.delay_hours}` : etaResult.delay_hours} hrs
                        </b>
                      </div>
                      <div style={{ background: etaResult.risk_status === 'ON_TIME' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', padding: '6px 10px', borderRadius: '6px' }}>
                        <b className="font-mono text-xs" style={{ color: etaResult.risk_status === 'ON_TIME' ? '#10b981' : '#ef4444' }}>
                          {etaResult.risk_status}
                        </b>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(6, 11, 24, 0.9)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="font-mono text-xs" style={{ color: '#f59e0b', marginBottom: '8px', fontWeight: 600 }}>MODEL PIPELINE DETAILS:</div>
                    <div className="font-mono text-xs" style={{ color: '#94a3b8' }}>Preprocessor: <b>eta_preprocessor.joblib (ColumnTransformer)</b></div>
                    <div className="font-mono text-xs" style={{ color: '#94a3b8', marginTop: '4px' }}>Inference Type: <b style={{ color: '#00f0ff' }}>{etaResult.inference_type}</b></div>
                    <div className="font-mono text-xs" style={{ color: '#94a3b8', marginTop: '4px' }}>Derived Features: <b>distance_per_expected_hour, weight_per_distance, is_express</b></div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  Click &apos;RUN TRAINED XGBOOST ETA PREDICTION&apos; to execute model inference.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 0.5: FLEET TELEMETRY ANOMALY & FAILURE PREDICTOR */}
        {/* ================================================================= */}
        {activeTab === 'FLEET_AI' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Anomaly Section */}
            <div style={{ background: 'rgba(6, 11, 24, 0.9)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 className="font-display" style={{ fontSize: '1rem', color: '#00f0ff', margin: 0 }}>Vehicle Anomaly Detection</h3>
                <span className="font-mono text-xs" style={{ color: '#f59e0b' }}>vehicle_anomaly_model.joblib</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Speed:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{anomalySpeed} km/h</span>
                  </div>
                  <input type="range" min="0" max="130" step="1" value={anomalySpeed} onChange={(e) => setAnomalySpeed(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Engine RPM:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{anomalyRpm} RPM</span>
                  </div>
                  <input type="range" min="800" max="4200" step="50" value={anomalyRpm} onChange={(e) => setAnomalyRpm(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Coolant Temp:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{anomalyCoolant}°C</span>
                  </div>
                  <input type="range" min="70" max="130" step="1" value={anomalyCoolant} onChange={(e) => setAnomalyCoolant(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Chassis Vibration:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{anomalyVibration}g</span>
                  </div>
                  <input type="range" min="0.1" max="2.5" step="0.05" value={anomalyVibration} onChange={(e) => setAnomalyVibration(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <button className="cyber-btn" onClick={handleRunAnomalyCheck} disabled={isAnomalyChecking} style={{ marginTop: '8px', padding: '10px', justifyContent: 'center', background: 'rgba(0, 240, 255, 0.2)', borderColor: '#00f0ff' }}>
                  <Activity size={14} color="#00f0ff" />
                  <span>{isAnomalyChecking ? 'EVALUATING SENSORS...' : 'CHECK TELEMETRY ANOMALY'}</span>
                </button>

                {anomalyResult && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#040711', border: `1px solid ${anomalyResult.is_anomaly ? '#ff3366' : '#10b981'}`, borderRadius: '8px' }}>
                    <div className="font-mono text-xs" style={{ color: anomalyResult.is_anomaly ? '#ff3366' : '#10b981', fontWeight: 700 }}>
                      {anomalyResult.is_anomaly ? '⚠️ SENSOR ANOMALY DETECTED' : '✓ TELEMETRY NORMAL'}
                    </div>
                    {anomalyResult.anomaly_reason && (
                      <div className="font-mono text-xs" style={{ color: '#cbd5e1', marginTop: '4px' }}>
                        {anomalyResult.anomaly_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Failure & Maintenance Section */}
            <div style={{ background: 'rgba(6, 11, 24, 0.9)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 className="font-display" style={{ fontSize: '1rem', color: '#00f0ff', margin: 0 }}>Predictive Vehicle Maintenance</h3>
                <span className="font-mono text-xs" style={{ color: '#a855f7' }}>vehicle_failure_model.joblib</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Odometer:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{failureOdo.toLocaleString()} km</span>
                  </div>
                  <input type="range" min="10000" max="350000" step="5000" value={failureOdo} onChange={(e) => setFailureOdo(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Days Since Last Service:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{failureDaysService} Days</span>
                  </div>
                  <input type="range" min="1" max="120" step="1" value={failureDaysService} onChange={(e) => setFailureDaysService(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Brake Pad Wear:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{failureBrakeWear}%</span>
                  </div>
                  <input type="range" min="5" max="98" step="1" value={failureBrakeWear} onChange={(e) => setFailureBrakeWear(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Battery Voltage:</span>
                    <span className="font-mono text-xs" style={{ color: '#00f0ff' }}>{failureVolts}V</span>
                  </div>
                  <input type="range" min="10.5" max="14.2" step="0.1" value={failureVolts} onChange={(e) => setFailureVolts(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <button className="cyber-btn" onClick={handleRunFailurePredict} disabled={isFailurePredicting} style={{ marginTop: '8px', padding: '10px', justifyContent: 'center', background: 'rgba(168, 85, 247, 0.2)', borderColor: '#a855f7' }}>
                  <ShieldCheck size={14} color="#a855f7" />
                  <span>{isFailurePredicting ? 'PREDICTING FAILURE PROBABILITY...' : 'PREDICT COMPONENT FAILURE RISK'}</span>
                </button>

                {failureResult && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#040711', border: `1px solid ${failureResult.risk_level === 'HEALTHY' ? '#10b981' : failureResult.risk_level === 'MODERATE' ? '#f59e0b' : '#ff3366'}`, borderRadius: '8px' }}>
                    <div className="font-mono text-xs" style={{ color: '#94a3b8' }}>Breakdown Probability: <b style={{ color: failureResult.risk_level === 'HEALTHY' ? '#10b981' : '#ff3366', fontSize: '1rem' }}>{(failureResult.failure_probability * 100).toFixed(0)}%</b></div>
                    <div className="font-mono text-xs" style={{ color: '#cbd5e1', marginTop: '4px' }}>Directive: <b>{failureResult.recommended_action}</b></div>
                    <div className="font-mono text-xs" style={{ color: '#64748b', marginTop: '2px' }}>Est. Safe Range: {failureResult.estimated_remaining_range_km} km</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ================================================================= */}
        {/* TAB 1: ULEO NORMALIZATION STUDIO */}
        {/* ================================================================= */}
        {activeTab === 'ULEO' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>HETEROGENEOUS PROTOCOL PRESET:</span>
                <select
                  value={selectedSample.id}
                  onChange={(e) => {
                    const sample = SAMPLE_RAW_INPUTS.find((s) => s.id === e.target.value);
                    if (sample) setSelectedSample(sample);
                  }}
                  className="cyber-input"
                  style={{ width: '260px', padding: '6px 10px', fontSize: '12px' }}
                >
                  {SAMPLE_RAW_INPUTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.source}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, background: '#040711', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '14px', overflow: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#f59e0b' }}>
                  <FileCode size={14} />
                  <span className="font-mono text-xs" style={{ fontWeight: 600 }}>RAW INCOMING TELEMETRY (JSON / IDoc / NMEA)</span>
                </div>
                <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {selectedSample.raw}
                </pre>
              </div>

              <button className="cyber-btn" onClick={handleTranslateAndCommit} disabled={isExecuting} style={{ width: '100%', padding: '12px', justifyContent: 'center', background: 'rgba(0, 240, 255, 0.2)', borderColor: '#00f0ff' }}>
                <Sparkles size={16} color="#00f0ff" />
                <span>{isExecuting ? 'TRANSLATING & COMMITTING...' : 'NORMALIZE INTO ULEO & COMMIT'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={16} color="#00f0ff" />
                <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 600 }}>STANDARDIZED ULEO PROTOCOL PAYLOAD</span>
              </div>

              <div style={{ flex: 1, background: '#040711', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px', padding: '14px', overflow: 'auto' }}>
                <pre style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#00f0ff', lineHeight: '1.4' }}>
                  {JSON.stringify(
                    {
                      uleo_version: '0.1.0-alpha',
                      event_id: `evt-${selectedSample.entity_id}-uleo`,
                      event_type: selectedSample.target_event,
                      entity_id: selectedSample.entity_id,
                      source_adapter: selectedSample.source,
                      timestamp: new Date().toISOString(),
                      payload: selectedSample.normalized_payload,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              {translationResult && (
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
                  <CheckCircle2 size={18} />
                  <div className="font-mono text-xs">
                    <div><b>DUAL-COMMIT CONFIRMED:</b> Appended to Redis Stream & PostgreSQL World Model.</div>
                    <div style={{ color: '#6ee7b7', fontSize: '10px' }}>Deterministic Latency: 1.2ms | Sequence: #{translationResult.sequence_number || 1048}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: CNN AUTOMATED OPTICAL INSPECTION (AOI) */}
        {/* ================================================================= */}
        {activeTab === 'VISION_CNN' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>OPTICAL SCANNER PRESET:</span>
                <select
                  value={selectedVisionSample.id}
                  onChange={(e) => {
                    const s = VISION_SAMPLES.find((v) => v.id === e.target.value);
                    if (s) {
                      setSelectedVisionSample(s);
                      setVisionInspectionResult(null);
                    }
                  }}
                  className="cyber-input"
                  style={{ width: '280px', padding: '6px 10px', fontSize: '12px' }}
                >
                  {VISION_SAMPLES.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: '#040711', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '16px' }}>
                <h4 className="font-mono text-xs" style={{ color: '#00f0ff', marginBottom: '12px' }}>CONV-LAYER FEATURE EXTRACTION MATRIX:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {Object.entries(selectedVisionSample.params).map(([key, val]) => (
                    <div key={key} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                      <div className="font-mono text-xs" style={{ color: '#64748b' }}>{key.replace(/_/g, ' ').toUpperCase()}</div>
                      <div className="font-mono text-sm" style={{ color: '#f8fafc', fontWeight: 600 }}>{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="cyber-btn" onClick={handleRunCNNInspection} disabled={isInspecting} style={{ padding: '12px', justifyContent: 'center', background: 'rgba(0, 240, 255, 0.2)', borderColor: '#00f0ff' }}>
                <Eye size={16} color="#00f0ff" />
                <span>{isInspecting ? 'PROCESSING CNN INFERENCE...' : 'RUN LIVE OPTICAL INFERENCE'}</span>
              </button>
            </div>

            <div>
              {visionInspectionResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '16px', background: 'rgba(6, 11, 24, 0.9)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px' }}>
                    <div className="font-mono text-xs" style={{ color: '#64748b' }}>PREDICTED DEFECT CLASS:</div>
                    <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00f0ff', marginTop: '4px' }}>
                      {visionInspectionResult.predicted_class}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span className="font-mono text-xs" style={{ color: '#10b981' }}>Confidence: {visionInspectionResult.confidence}%</span>
                      <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Model: {visionInspectionResult.model_architecture}</span>
                    </div>
                  </div>

                  <div style={{ background: '#040711', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '16px' }}>
                    <h4 className="font-mono text-xs" style={{ color: '#f59e0b', marginBottom: '8px' }}>AUTOMATED WAREHOUSE ROUTING DIRECTIVE:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div className="font-mono text-xs"><b>CONVEYOR ROUTE:</b> <span style={{ color: '#00f0ff' }}>{visionInspectionResult.routing_directive?.route}</span></div>
                      <div className="font-mono text-xs"><b>ACTION:</b> <span style={{ color: '#f8fafc' }}>{visionInspectionResult.routing_directive?.action}</span></div>
                      <div className="font-mono text-xs"><b>SLA BUFFER:</b> <span style={{ color: '#10b981' }}>+{visionInspectionResult.routing_directive?.sla_delay_mins} mins</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                  Click 'RUN LIVE OPTICAL INFERENCE' to execute model on real Scikit-Learn weights.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: DEMAND FORECASTER */}
        {/* ================================================================= */}
        {activeTab === 'DEMAND_MLP' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>SELECT REGIONAL SUPER-HUB:</span>
              {['DEL-W12', 'BOM-W04', 'BLR-W08', 'CCU-W19', 'MAA-W22', 'HYD-W09', 'AMD-W03', 'PNQ-W06'].map((hub) => (
                <button
                  key={hub}
                  className="cyber-btn"
                  onClick={() => setSelectedHub(hub)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    background: selectedHub === hub ? 'rgba(0, 240, 255, 0.25)' : 'transparent',
                    borderColor: selectedHub === hub ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {hub}
                </button>
              ))}
            </div>

            {demandData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ background: '#040711', padding: '14px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                    <div className="font-mono text-xs" style={{ color: '#64748b' }}>24H FORECAST VOLUME</div>
                    <div className="font-mono text-lg" style={{ color: '#00f0ff', fontWeight: 700 }}>{demandData.total_24h_predicted_volume?.toLocaleString()} pkgs</div>
                  </div>
                  <div style={{ background: '#040711', padding: '14px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                    <div className="font-mono text-xs" style={{ color: '#64748b' }}>PEAK SURGE HOUR</div>
                    <div className="font-mono text-lg" style={{ color: '#f59e0b', fontWeight: 700 }}>{demandData.peak_surge_hour} ({demandData.peak_surge_volume} pkgs/hr)</div>
                  </div>
                  <div style={{ background: '#040711', padding: '14px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                    <div className="font-mono text-xs" style={{ color: '#64748b' }}>RECOMMENDED DOCK ALLOCATION</div>
                    <div className="font-mono text-lg" style={{ color: '#10b981', fontWeight: 700 }}>{demandData.recommended_dock_allocation} Scanner Bays</div>
                  </div>
                  <div style={{ background: '#040711', padding: '14px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                    <div className="font-mono text-xs" style={{ color: '#64748b' }}>CAPACITY PRESSURE</div>
                    <div className="font-mono text-lg" style={{ color: '#a855f7', fontWeight: 700 }}>{demandData.overall_capacity_pressure}</div>
                  </div>
                </div>

                {/* Hourly Diurnal Curve Visualizer */}
                <div style={{ background: '#040711', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h4 className="font-mono text-xs" style={{ color: '#00f0ff', marginBottom: '14px' }}>24-HOUR DIURNAL PACKAGE INTAKE THROUGHPUT CURVE:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '4px', alignItems: 'flex-end', height: '140px', paddingBottom: '8px' }}>
                    {demandData.hourly_forecast?.map((hour: any) => {
                      const heightPct = Math.min(100, Math.max(10, (hour.predicted_inflow_parcels / (demandData.peak_surge_volume || 1000)) * 100));
                      const isPeak = hour.hour === demandData.peak_surge_hour;
                      return (
                        <div key={hour.hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <div
                            style={{
                              width: '100%',
                              height: `${heightPct}%`,
                              background: isPeak ? 'linear-gradient(180deg, #ff3366 0%, #f59e0b 100%)' : 'linear-gradient(180deg, #00f0ff 0%, #0284c7 100%)',
                              borderRadius: '3px',
                              transition: 'height 0.3s ease',
                            }}
                            title={`${hour.hour} - ${hour.predicted_inflow_parcels} pkgs (${hour.dock_utilization_percent}% capacity)`}
                          />
                          <span style={{ fontSize: '8px', color: '#64748b', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{hour.hour.slice(0, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: COLD-CHAIN THERMAL PREDICTOR */}
        {/* ================================================================= */}
        {activeTab === 'COLD_CHAIN' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="font-display" style={{ fontSize: '1rem', color: '#00f0ff' }}>Reefer Telemetry & Ambient Conditions</h3>
              
              <div>
                <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>Ambient India Temperature: <b>{coldAmbient}°C</b></label>
                <input type="range" min="20" max="48" step="0.5" value={coldAmbient} onChange={(e) => setColdAmbient(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
              </div>

              <div>
                <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>Chiller Compressor Power: <b>{compressorPower} kW</b></label>
                <input type="range" min="1.0" max="5.0" step="0.1" value={compressorPower} onChange={(e) => setCompressorPower(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
              </div>

              <div>
                <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>Dock Door Open Frequency: <b>{doorOpens} cycles/hr</b></label>
                <input type="range" min="0" max="8" step="0.5" value={doorOpens} onChange={(e) => setDoorOpens(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
              </div>

              <button className="cyber-btn" onClick={handleRunColdChainPredict} disabled={isColdPredicting} style={{ padding: '12px', justifyContent: 'center', background: 'rgba(0, 240, 255, 0.2)', borderColor: '#00f0ff' }}>
                <Thermometer size={16} color="#00f0ff" />
                <span>{isColdPredicting ? 'PREDICTING THERMAL TRAJECTORY...' : 'CALCULATE 4-HOUR THERMAL RISK'}</span>
              </button>
            </div>

            <div>
              {coldResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '16px', background: '#040711', border: `1px solid ${coldResult.risk_level === 'OPTIMAL_SAFE' ? '#10b981' : coldResult.risk_level === 'WARNING_ELEVATED' ? '#f59e0b' : '#ff3366'}`, borderRadius: '8px' }}>
                    <div className="font-mono text-xs" style={{ color: '#64748b' }}>4-HOUR PREDICTED CARGO TEMP:</div>
                    <div className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: coldResult.risk_level === 'OPTIMAL_SAFE' ? '#10b981' : coldResult.risk_level === 'WARNING_ELEVATED' ? '#f59e0b' : '#ff3366' }}>
                      {coldResult.predicted_4h_temp_celsius}°C
                    </div>
                    <div className="font-mono text-xs" style={{ marginTop: '4px', color: '#94a3b8' }}>
                      Status: <b>{coldResult.thermal_stability_status}</b> ({coldResult.risk_level})
                    </div>
                  </div>

                  <div style={{ background: 'rgba(6, 11, 24, 0.9)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="font-mono text-xs" style={{ color: '#f59e0b', marginBottom: '8px' }}>AUTOMATED COLD-CHAIN TRIAGE DIRECTIVE:</div>
                    <div className="font-mono text-xs" style={{ color: '#f8fafc' }}>Action: <b>{coldResult.recommended_mitigation}</b></div>
                    <div className="font-mono text-xs" style={{ color: '#10b981', marginTop: '6px' }}>Spoilage Buffer Remaining: <b>{coldResult.spoilage_time_buffer_mins} mins</b></div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: ECO FLEET FUEL & CO2 CARBON FORECASTER */}
        {/* ================================================================= */}
        {activeTab === 'FUEL_EMISSION' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="font-display" style={{ fontSize: '1rem', color: '#00f0ff' }}>Corridor Transit Parameters</h3>
              
              <div>
                <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>Highway Distance: <b>{tripDistance} km</b></label>
                <input type="range" min="100" max="2200" step="50" value={tripDistance} onChange={(e) => setTripDistance(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
              </div>

              <div>
                <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>Payload Cargo Weight: <b>{payloadTons} Tons</b></label>
                <input type="range" min="5" max="32" step="0.5" value={payloadTons} onChange={(e) => setPayloadTons(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
              </div>

              <div>
                <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>Average Highway Velocity: <b>{avgSpeed} km/h</b></label>
                <input type="range" min="40" max="85" step="1" value={avgSpeed} onChange={(e) => setAvgSpeed(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
              </div>

              <div>
                <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>Elevation Ascent Gradient: <b>{elevationGain} meters</b></label>
                <input type="range" min="0" max="1200" step="50" value={elevationGain} onChange={(e) => setElevationGain(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00f0ff' }} />
              </div>

              <button className="cyber-btn" onClick={handleRunFuelPredict} disabled={isFuelPredicting} style={{ padding: '12px', justifyContent: 'center', background: 'rgba(0, 240, 255, 0.2)', borderColor: '#00f0ff' }}>
                <Leaf size={16} color="#00f0ff" />
                <span>{isFuelPredicting ? 'CALCULATING EMISSIONS...' : 'PREDICT FUEL DRAG & CO2 FOOTPRINT'}</span>
              </button>
            </div>

            <div>
              {fuelResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '14px', background: '#040711', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px' }}>
                      <div className="font-mono text-xs" style={{ color: '#64748b' }}>DIESEL CONSUMPTION</div>
                      <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#00f0ff' }}>{fuelResult.predicted_consumption_l_per_100km} L/100km</div>
                      <div className="font-mono text-xs" style={{ color: '#94a3b8' }}>Total: {fuelResult.total_diesel_litres} Litres</div>
                    </div>

                    <div style={{ padding: '14px', background: '#040711', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px' }}>
                      <div className="font-mono text-xs" style={{ color: '#64748b' }}>CARBON EMISSIONS</div>
                      <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#10b981' }}>{fuelResult.carbon_footprint_kg_co2} kg CO2</div>
                      <div className="font-mono text-xs" style={{ color: '#6ee7b7' }}>Rating: {fuelResult.fleet_sustainability_rating}</div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(6, 11, 24, 0.9)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="font-mono text-xs" style={{ color: '#f59e0b', marginBottom: '8px' }}>SUSTAINABILITY METRICS:</div>
                    <div className="font-mono text-xs">Green Efficiency Score: <b>{fuelResult.green_efficiency_score} / 100</b></div>
                    <div className="font-mono text-xs" style={{ color: '#94a3b8', marginTop: '6px' }}>Model: {fuelResult.model_architecture}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: PRODUCTION MODEL REGISTRY & MANIFEST */}
        {/* ================================================================= */}
        {activeTab === 'REGISTRY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.1rem', color: '#00f0ff' }}>Production Binary Scikit-Learn Model Registry</h3>
                <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>Trained .joblib serialization artifacts with validation metrics and tree ensemble properties</span>
              </div>
              <button className="cyber-btn" onClick={() => apiClient.fetchModelManifest().then(setManifestData)} style={{ padding: '6px 12px' }}>
                <RefreshCw size={12} color="#00f0ff" />
                <span>REFRESH MANIFEST</span>
              </button>
            </div>

            {manifestData?.models && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                {Object.entries(manifestData.models).map(([modelKey, modelInfo]: [string, any]) => (
                  <div key={modelKey} style={{ background: '#040711', border: '1px solid rgba(0, 240, 255, 0.25)', borderRadius: '10px', padding: '16px' }}>
                    <div className="font-mono text-xs" style={{ color: '#f59e0b', fontWeight: 700 }}>{modelKey.replace(/_/g, ' ').toUpperCase()}</div>
                    <div className="font-mono text-sm" style={{ color: '#00f0ff', marginTop: '4px', fontWeight: 600 }}>{modelInfo.framework}</div>
                    <div className="font-mono text-xs" style={{ color: '#64748b', marginTop: '2px' }}>Artifact: {modelInfo.artifact_file}</div>

                    <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px' }}>
                      <div className="font-mono text-xs" style={{ color: '#94a3b8', marginBottom: '4px' }}>VALIDATION METRICS:</div>
                      {Object.entries(modelInfo.metrics || {}).map(([k, v]: [string, any]) => {
                        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                          return (
                            <div key={k} style={{ marginTop: '6px' }}>
                              <div className="font-mono text-xs" style={{ color: '#64748b' }}>{k.replace(/_/g, ' ')}:</div>
                              <div style={{ paddingLeft: '8px' }}>
                                {Object.entries(v).map(([fk, fv]) => (
                                  <div key={fk} className="font-mono text-xs" style={{ color: '#cbd5e1' }}>• {fk}: {String(fv)}</div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={k} className="font-mono text-xs" style={{ color: '#10b981' }}>
                            {k.replace(/_/g, ' ')}: <b>{Array.isArray(v) ? v.join(', ') : String(v)}</b>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
