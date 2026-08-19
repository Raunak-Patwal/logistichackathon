import React, { useState } from 'react';
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
} from 'lucide-react';
import { simulationEngine } from '../../api/simulationEngine';
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

export const UleoStudioView: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState(SAMPLE_RAW_INPUTS[0]);
  const [translationResult, setTranslationResult] = useState<any | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

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
    }, 450);
  };

  return (
    <div
      className="tactical-panel"
      style={{
        position: 'absolute',
        top: 'calc(var(--telemetry-bar-height) + 16px)',
        left: 'calc(var(--nav-rail-width) + 16px)',
        bottom: '16px',
        width: '680px',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-default)',
          background: 'rgba(10, 14, 22, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={16} color="#38bdf8" />
          <div>
            <h2 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              ULEO v0.1 NORMALIZATION STUDIO
            </h2>
            <span className="font-mono text-xs" style={{ color: '#38bdf8' }}>
              UNIVERSAL LOGISTICS EVENT ONTOLOGY & ATOMIC DUAL-WRITE ENGINE
            </span>
          </div>
        </div>

        <div className="badge-status badge-status-active">
          <span>ONTOLOGY ACTIVE</span>
        </div>
      </div>

      {/* Main Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Sample Ingestion Selector */}
        <div>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
            SELECT HETEROGENEOUS SOURCE PROTOCOL FOR TRANSLATION:
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {SAMPLE_RAW_INPUTS.map((sample) => (
              <button
                key={sample.id}
                className="tactical-btn"
                onClick={() => {
                  setSelectedSample(sample);
                  setTranslationResult(null);
                }}
                style={{
                  flex: 1,
                  fontSize: '0.72rem',
                  borderColor: selectedSample.id === sample.id ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  background: selectedSample.id === sample.id ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: selectedSample.id === sample.id ? '#38bdf8' : 'var(--text-secondary)',
                }}
              >
                {sample.source.split(' ')[0]} ({sample.target_event.replace('PARCEL_', '')})
              </button>
            ))}
          </div>
        </div>

        {/* 4-Stage Visual Pipeline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          {/* Stage 1: Raw Ingestion */}
          <div className="tactical-panel-solid" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono text-xs" style={{ color: '#f59e0b', fontWeight: 600 }}>
                STAGE 1: RAW INGESTION
              </span>
              <span className="badge-status badge-status-warning" style={{ fontSize: '0.6rem' }}>
                HETEROGENEOUS
              </span>
            </div>
            <pre
              className="font-mono"
              style={{
                fontSize: '0.66rem',
                color: '#94a3b8',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '8px',
                borderRadius: '3px',
                minHeight: '120px',
              }}
            >
              {selectedSample.raw}
            </pre>
          </div>

          {/* Stage 2: ULEO Canonical Normalization */}
          <div className="tactical-panel-solid" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono text-xs" style={{ color: '#38bdf8', fontWeight: 600 }}>
                STAGE 2: ULEO v0.1 CANONICAL
              </span>
              <span className="badge-status badge-status-active" style={{ fontSize: '0.6rem' }}>
                NORMALIZED
              </span>
            </div>
            <pre
              className="font-mono"
              style={{
                fontSize: '0.66rem',
                color: '#38bdf8',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '8px',
                borderRadius: '3px',
                minHeight: '120px',
              }}
            >
              {JSON.stringify(
                {
                  event_type: selectedSample.target_event,
                  entity_id: selectedSample.entity_id,
                  metadata: {
                    event_id: 'auto-uuid-v4',
                    timestamp: 'UTC-NOW',
                    source: selectedSample.source,
                    correlation_id: 'corr-flow-881',
                  },
                  payload: selectedSample.normalized_payload,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>

        {/* Translation Action Trigger */}
        <button
          className="tactical-btn tactical-btn-primary"
          onClick={handleTranslateAndCommit}
          disabled={isExecuting}
          style={{ padding: '10px', fontSize: '0.82rem', fontWeight: 600 }}
        >
          <Zap size={14} />
          <span>{isExecuting ? 'VALIDATING INVARIANTS & COMMITTING...' : 'PROCESS ULEO EVENT & ATOMIC DUAL-WRITE'}</span>
        </button>

        {/* Stage 3 & 4: Dual Commit Architectural Guarantee Result */}
        {translationResult && (
          <div
            className="tactical-panel-solid"
            style={{
              padding: '14px',
              borderLeft: `4px solid ${translationResult.status === 'ACCEPTED' ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {translationResult.status === 'ACCEPTED' ? (
                  <CheckCircle2 size={16} color="#10b981" />
                ) : (
                  <AlertCircle size={16} color="#ef4444" />
                )}
                <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  {translationResult.status === 'ACCEPTED' ? 'TRANSACTION ATOMICALLY COMMITTED' : 'INVARIANT REJECTED'}
                </span>
              </div>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {translationResult.dual_commit.latency_ms}ms
              </span>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {translationResult.message}
            </p>

            {/* Atomic Dual-Write Graphic */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                marginTop: '6px',
              }}
            >
              <div
                style={{
                  padding: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Database size={13} color="#10b981" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="font-mono text-xs" style={{ color: '#10b981', fontWeight: 600 }}>
                    1. events Table (Append-Only)
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    Immutable Event Store log record
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '8px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Layers size={13} color="#38bdf8" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="font-mono text-xs" style={{ color: '#38bdf8', fontWeight: 600 }}>
                    2. world_model_* Table (Upsert)
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    Materialized entity operational state
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
