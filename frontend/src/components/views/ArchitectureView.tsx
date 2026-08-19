import React, { useState } from 'react';
import {
  Server,
  Database,
  Layers,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  ArrowDown,
  Info,
  CheckCircle2,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { apiClient } from '../../api/client';

const ARCHITECTURE_LAYERS = [
  {
    id: 'EXTERNAL',
    title: '1. External Sources & Ingestion Connectors',
    badge: 'EXTERNAL ECOSYSTEM',
    color: '#f59e0b',
    tech: 'HTTPS / JSON / ULEO v0.1',
    description: 'Receives heterogeneous event streams from WMS scanners, GPS trackers, ERP orders, and scenario replay simulators.',
    components: ['WMS Connector', 'GPS Telematics Gateway', 'ERP SAP Webhook', 'Scenario Simulator'],
    invariants: 'Events are untrusted until validated by schema contracts.',
  },
  {
    id: 'API',
    title: '2. API Transport Layer (src/api)',
    badge: 'FASTAPI & PYDANTIC',
    color: '#00f0ff',
    tech: 'FastAPI / Pydantic v2 / OAuth2 JWT Auth',
    description: 'Enforces strict ULEO schema conformance, authenticates payloads, and transforms raw HTTP requests into typed Application Commands.',
    components: ['EventIngestionRequest Schema', 'Dependency Injection (get_db_session)', 'Health, Warehouse, Truck, Incident Routes'],
    invariants: 'Zero business logic in API controllers.',
  },
  {
    id: 'APPLICATION',
    title: '3. Application Orchestrator (src/application)',
    badge: 'USE CASES & IDEMPOTENCY',
    color: '#0284c7',
    tech: 'Python Orchestration / Transaction Boundaries',
    description: 'Enforces idempotency checks via event_id deduplication, coordinates domain aggregate loading, and commits atomic dual-write transactions.',
    components: ['GeminiReasonerService', 'RAGService (PgVector)', 'ContextBuilderService', 'ActionService', 'EventWorker'],
    invariants: 'Manages ACID transaction boundaries around Event Store & World Model.',
  },
  {
    id: 'DOMAIN',
    title: '4. Pure Domain Layer (src/domain)',
    badge: '100% PURE PYTHON',
    color: '#10b981',
    tech: 'Pure Python (No FastAPI, SQLAlchemy, or DB imports)',
    description: 'Encapsulates finite state machines, domain invariants, and aggregate lifecycles. Strictly decoupled from frameworks.',
    components: ['Parcel Aggregate (FSM)', 'EventType & ParcelState Enums', 'EventMetadata Value Objects'],
    invariants: 'Direct assignment like parcel.state = "DELIVERED" is forbidden. All transitions occur via domain methods.',
  },
  {
    id: 'INFRASTRUCTURE',
    title: '5. Infrastructure & PostgreSQL 16 (src/infrastructure)',
    badge: 'UNIFIED STORAGE ENGINE',
    color: '#a855f7',
    tech: 'PostgreSQL 16 / PgVector 768-dim / Redis 7 Stream / SQLAlchemy 2.0',
    description: 'Stores immutable Event Store log records and materialized World Model tables within the same PostgreSQL ACID database transaction.',
    components: ['event_store Table (Append-Only)', 'world_model_* Tables (Materialized)', 'incident_embeddings (PgVector)', 'logistics:events:stream (Redis 7)'],
    invariants: 'Atomic Dual-Write: Event append and state materialization commit in 1 single transaction (ADR-002).',
  },
];

export const ArchitectureView: React.FC = () => {
  const [selectedLayerId, setSelectedLayerId] = useState<string>('INFRASTRUCTURE');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [testingHealth, setTestingHealth] = useState(false);

  const selectedLayer = ARCHITECTURE_LAYERS.find((l) => l.id === selectedLayerId) || ARCHITECTURE_LAYERS[4];

  const handleTestHealth = async () => {
    setTestingHealth(true);
    try {
      const res = await fetch('http://localhost:8000/health');
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data);
      } else {
        setHealthStatus({ status: 'error', error: 'HTTP ' + res.status });
      }
    } catch (e: any) {
      setHealthStatus({ status: 'unreachable', error: e.message });
    } finally {
      setTestingHealth(false);
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        position: 'absolute',
        top: 'calc(var(--telemetry-bar-height) + 16px)',
        left: 'calc(var(--nav-rail-width) + 16px)',
        bottom: '16px',
        width: '680px',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          background: 'linear-gradient(90deg, rgba(8, 14, 28, 0.9) 0%, rgba(4, 7, 17, 0.9) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Server size={18} color="#00f0ff" />
          <div>
            <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              C4 ARCHITECTURE & PERSISTENCE ENGINE
            </h2>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', letterSpacing: '0.04em' }}>
              HEXAGONAL ARCHITECTURE • ATOMIC DUAL-COMMIT (ADR-001 & ADR-002)
            </span>
          </div>
        </div>

        <button
          className="cyber-btn"
          onClick={handleTestHealth}
          disabled={testingHealth}
          style={{ padding: '4px 10px', fontSize: '11px' }}
        >
          <RefreshCw size={12} className={testingHealth ? 'animate-spin' : ''} color="#00f0ff" />
          <span>PING LIVE BACKEND</span>
        </button>
      </div>

      {/* Live Health Banner if Tested */}
      {healthStatus && (
        <div
          style={{
            padding: '8px 16px',
            background: healthStatus.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 51, 102, 0.15)',
            borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            color: healthStatus.status === 'healthy' ? '#10b981' : '#ff3366',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} />
            <span>BACKEND STATUS: {healthStatus.status.toUpperCase()}</span>
          </div>
          <span>FASTAPI (PORT 8000) • POSTGRES 16 ACID • REDIS 7 STREAM</span>
        </div>
      )}

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Architecture Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ARCHITECTURE_LAYERS.map((layer, index) => {
            const isSelected = selectedLayerId === layer.id;

            return (
              <React.Fragment key={layer.id}>
                <div
                  className="glass-card"
                  onClick={() => setSelectedLayerId(layer.id)}
                  style={{
                    padding: '10px 14px',
                    borderLeft: `4px solid ${layer.color}`,
                    background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(8, 14, 28, 0.7)',
                    borderColor: isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: layer.color,
                        boxShadow: `0 0 8px ${layer.color}`,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 600 }}>
                        {layer.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {layer.tech}
                      </span>
                    </div>
                  </div>

                  <span
                    className="font-mono text-xs"
                    style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: layer.color,
                      fontSize: '0.62rem',
                    }}
                  >
                    {layer.badge}
                  </span>
                </div>

                {index < ARCHITECTURE_LAYERS.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                    <ArrowDown size={12} color="#64748b" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Deep Dive Panel on Selected Layer */}
        <div
          className="glass-card"
          style={{
            padding: '14px',
            marginTop: '8px',
            borderTop: `3px solid ${selectedLayer.color}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={14} color={selectedLayer.color} />
            <span className="font-mono text-xs" style={{ color: selectedLayer.color, fontWeight: 700 }}>
              DEEP-DIVE: {selectedLayer.title.toUpperCase()}
            </span>
          </div>

          <p className="text-xs" style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
            {selectedLayer.description}
          </p>

          <div>
            <span className="font-mono text-xs" style={{ color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
              KEY IMPLEMENTATION MODULES:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedLayer.components.map((c) => (
                <span
                  key={c}
                  className="font-mono text-xs"
                  style={{
                    padding: '2px 8px',
                    background: 'rgba(0, 240, 255, 0.06)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#00f0ff',
                    fontSize: '0.68rem',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: '4px',
              padding: '8px 10px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '4px',
              border: '1px dashed rgba(0, 240, 255, 0.3)',
            }}
          >
            <span className="font-mono text-xs" style={{ color: '#f59e0b' }}>
              ARCHITECTURAL GUARANTEE:{' '}
            </span>
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              {selectedLayer.invariants}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

