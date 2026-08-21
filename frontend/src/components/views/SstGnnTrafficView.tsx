import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Network,
  TrendingUp,
  Activity,
  ArrowRight,
  Sparkles,
  Layers,
  MapPin,
  Clock,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';
import { apiClient } from '../../api/client';

export const SstGnnTrafficView: React.FC = () => {
  const setActiveView = useUIStore((s) => s.setActiveView);

  // Scenario parameters
  const [selectedHub, setSelectedHub] = useState<string>('DEL-W12');
  const [severity, setSeverity] = useState<number>(0.95);
  const [activeHop, setActiveHop] = useState<number>(1);
  const [selectedHorizon, setSelectedHorizon] = useState<number>(30); // 15, 30, 45, 60
  const [loading, setLoading] = useState<boolean>(false);

  // Live forecast results from backend PyTorch SST-GNN
  const [forecastData, setForecastData] = useState<any | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await apiClient.fetchSSTGNNForecast({
        incident_hub_id: selectedHub,
        incident_severity: severity,
        congested_corridor: 'NH-48',
      });
      if (res) {
        setForecastData(res);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [selectedHub, severity]);

  const hubsList = [
    { id: 'DEL-W12', name: 'Delhi Northern Super-Hub' },
    { id: 'BOM-W04', name: 'Mumbai Western Mega-Gateway' },
    { id: 'BLR-W08', name: 'Bengaluru Tech Logistics Hub' },
    { id: 'CCU-W19', name: 'Kolkata Eastern Express Node' },
    { id: 'MAA-W22', name: 'Chennai Maritime Express Node' },
    { id: 'HYD-W09', name: 'Hyderabad Central Logistics Node' },
    { id: 'AMD-W03', name: 'Ahmedabad Commercial Hub' },
    { id: 'PNQ-W06', name: 'Pune Industrial Transit Hub' },
    { id: 'JAI-W15', name: 'Jaipur Satellite Relief Hub' },
    { id: 'LKO-W18', name: 'Lucknow Regional Hub' },
  ];

  return (
    <div
      className="glass-card"
      style={{
        position: 'absolute',
        top: '76px',
        left: '24px',
        bottom: '84px',
        right: '24px',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.95), 0 0 30px rgba(0, 240, 255, 0.15)',
        border: '1px solid rgba(0, 240, 255, 0.35)',
        borderRadius: '20px',
        overflow: 'hidden',
        animation: 'fadeInScale 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        background: 'linear-gradient(180deg, rgba(8, 14, 28, 0.97) 0%, rgba(4, 7, 17, 0.99) 100%)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.25)',
          background: 'linear-gradient(90deg, rgba(14, 26, 52, 0.95) 0%, rgba(6, 12, 26, 0.95) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(59, 130, 246, 0.4) 100%)',
              border: '1px solid #00f0ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)',
            }}
          >
            <Cpu size={22} color="#00f0ff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
                SST-GNN: SPATIO-TEMPORAL TRAFFIC & CONGESTION FORECASTER
              </h2>
              <span className="badge-status badge-status-optimal" style={{ fontSize: '10px', padding: '3px 8px' }}>
                PAKDD 2021 IMPLEMENTATION
              </span>
            </div>
            <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>
              Simplified Spatio-Temporal Graph Neural Network &bull; Multi-Hop Spatial Aggregation &bull; Weighted Temporal Attention
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchForecast()}
            disabled={loading}
            className="cyber-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Re-Run Inference</span>
          </button>
          <button
            className="cyber-btn"
            onClick={() => setActiveView('WORLD')}
            style={{ padding: '6px 12px', borderRadius: '8px' }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '24px',
        }}
      >
        {/* Left Sidebar: Controls & Model Architecture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Scenario Config Card */}
          <div
            style={{
              background: 'rgba(10, 20, 40, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f0ff', fontSize: '0.82rem', fontWeight: 700 }}>
              <Sliders size={16} />
              <span>INCIDENT & TOPOLOGY CONTROLS</span>
            </div>

            {/* Target Hub Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target Anomaly Hub (V_0):</label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(4, 8, 18, 0.9)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              >
                {hubsList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#94a3b8' }}>Anomaly Severity:</span>
                <span className="font-mono" style={{ color: '#ff3366', fontWeight: 700 }}>{Math.round(severity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={severity}
                onChange={(e) => setSeverity(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ff3366', cursor: 'pointer' }}
              />
            </div>

            {/* Prediction Horizon Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Forecast Window Horizon:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[15, 30, 45, 60].map((h) => (
                  <button
                    key={h}
                    onClick={() => setSelectedHorizon(h)}
                    style={{
                      padding: '6px 0',
                      borderRadius: '6px',
                      border: selectedHorizon === h ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedHorizon === h ? 'rgba(0, 240, 255, 0.25)' : 'rgba(4, 8, 18, 0.6)',
                      color: selectedHorizon === h ? '#00f0ff' : '#94a3b8',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    T+{h}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mathematical Formulation Card */}
          <div
            style={{
              background: 'rgba(10, 20, 40, 0.8)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700 }}>
              <Layers size={16} />
              <span>SST-GNN FORMULATION (PAKDD 2021)</span>
            </div>

            <div style={{ background: 'rgba(4, 8, 18, 0.9)', borderRadius: '8px', padding: '10px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#38bdf8', lineHeight: 1.6 }}>
              <div>1. Spatial Hop Aggregation:</div>
              <div style={{ color: '#f8fafc' }}>H^(k)_t = A^(k) X_t W^(k)_s</div>
              <div style={{ marginTop: '4px' }}>2. Temporal Attention:</div>
              <div style={{ color: '#f8fafc' }}>Z~ = &Sigma; &alpha;_&tau; Z^&lt;&tau;&gt;</div>
              <div style={{ marginTop: '4px' }}>3. Spatio-Temporal Fusion:</div>
              <div style={{ color: '#f8fafc' }}>Z^&lt;t&gt; = [H^(1), ..., H^(K), Z~_H, Z~_C] W_st</div>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
              <strong>Advantage over DCRNN/ST-GCN:</strong> Avoids over-smoothing by keeping hop representations separate rather than blindly stacking deep GNN layers.
            </div>
          </div>
        </div>

        {/* Right Section: Multi-Hop Spatial Results, Temporal Attention, and Hub Projections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hop Distance Filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10, 20, 40, 0.6)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Network size={18} color="#00f0ff" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                Multi-Hop Spatial Cascade Breakdown from {selectedHub}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { hop: 1, label: '1-Hop Neighbors (Direct Corridors)' },
                { hop: 2, label: '2-Hop Ring (Secondary Impact)' },
                { hop: 3, label: '3-Hop Peninsular Nodes' },
              ].map((h) => (
                <button
                  key={h.hop}
                  onClick={() => setActiveHop(h.hop)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: activeHop === h.hop ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: activeHop === h.hop ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                    color: activeHop === h.hop ? '#00f0ff' : '#cbd5e1',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: activeHop === h.hop ? 700 : 500,
                  }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Temporal Attention Weights Heatmap Bar */}
          {forecastData?.temporal_attention_weights && (
            <div
              style={{
                background: 'rgba(10, 20, 40, 0.75)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span>Learned Temporal Attention Weights (&alpha;_1 ... &alpha;_12 across past hour):</span>
                <span className="font-mono" style={{ color: '#00f0ff' }}>Dynamic Recurrent Weighting</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', height: '24px', alignItems: 'flex-end' }}>
                {forecastData.temporal_attention_weights.current_day_model_weights.map((w: number, idx: number) => {
                  const heightPercent = Math.min(100, Math.max(15, w * 400));
                  return (
                    <div
                      key={idx}
                      title={`T-${12 - idx}: weight = ${w}`}
                      style={{
                        flex: 1,
                        height: `${heightPercent}%`,
                        background: `linear-gradient(180deg, #00f0ff 0%, rgba(2, 132, 199, 0.4) 100%)`,
                        borderRadius: '3px',
                        position: 'relative',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Forecasted Hub Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
              maxHeight: '440px',
              overflowY: 'auto',
            }}
          >
            {forecastData?.hub_forecasts?.map((hub: any) => {
              const targetForecast = hub.forecasts.find((f: any) => f.horizon_minutes === selectedHorizon) || hub.forecasts[0];
              const isIncident = hub.hub_id === selectedHub;
              const isTargetHop = hub.hop_distance_from_incident === activeHop || isIncident;

              return (
                <div
                  key={hub.hub_id}
                  style={{
                    background: isIncident
                      ? 'rgba(255, 51, 102, 0.12)'
                      : isTargetHop
                      ? 'rgba(0, 240, 255, 0.08)'
                      : 'rgba(4, 8, 18, 0.7)',
                    border: isIncident
                      ? '1px solid #ff3366'
                      : isTargetHop
                      ? '1px solid rgba(0, 240, 255, 0.35)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: isTargetHop ? '0 4px 20px rgba(0, 240, 255, 0.15)' : 'none',
                    opacity: isTargetHop ? 1 : 0.65,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} color={isIncident ? '#ff3366' : '#00f0ff'} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                        {hub.hub_name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isIncident ? '#ff3366' : 'rgba(0, 240, 255, 0.2)',
                        color: '#ffffff',
                      }}
                    >
                      {isIncident ? 'SOURCE ANOMALY' : `HOP-${hub.hop_distance_from_incident}`}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'rgba(4, 8, 18, 0.85)', padding: '10px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Speed @ T+{selectedHorizon}m</div>
                      <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                        {targetForecast?.predicted_avg_speed_kmh} km/h
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Congestion (C_f)</div>
                      <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: targetForecast?.predicted_congestion_factor > 1.3 ? '#ff3366' : '#34d399' }}>
                        {targetForecast?.predicted_congestion_factor}x
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Delay Delta</div>
                      <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: targetForecast?.predicted_transit_delay_mins > 20 ? '#ff3366' : '#38bdf8' }}>
                        +{targetForecast?.predicted_transit_delay_mins} min
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
