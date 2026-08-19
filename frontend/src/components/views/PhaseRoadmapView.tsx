import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Eye,
  Brain,
  Cpu,
  Navigation,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { SYSTEM_PHASES, PhaseDefinition } from '../../domain/phases';
import { useUIStore } from '../../state/useUIStore';
import { simulationEngine } from '../../api/simulationEngine';

export const PhaseRoadmapView: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<PhaseDefinition>(SYSTEM_PHASES[0]);
  const [demoOutput, setDemoOutput] = useState<string | null>(null);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const handleRunPhaseDemo = (phase: PhaseDefinition) => {
    if (phase.id === 1) {
      // Phase 1 Demo: Real lifecycle progression
      simulationEngine.processEvent({
        event_type: 'PARCEL_PACKED',
        entity_id: 'P-1022',
        source: 'WMS_PHASE1_SORTER',
        payload: { packer_id: 'AUTO_CELL_09', warehouse_id: 'W12' },
      });
      setDemoOutput('Phase 1 [OBSERVE]: Real ULEO event processed. Parcel P-1022 packed, Event Store and World Model updated atomically.');
    } else if (phase.id === 2) {
      // Phase 2 Demo: Context builder
      setDemoOutput(
        'Phase 2 [UNDERSTAND Simulation]: Context assembled for Delhi W12 — 18 trucks queued, 95% storage capacity, 18 cold-chain units at risk, nearest backup scanner located at Bay B.'
      );
    } else if (phase.id === 3) {
      setDemoOutput(
        'Phase 3 [REASON Simulation]: Root-cause anomaly detected: Scanner desync at Dock 12 caused 34-minute staging dwell-time violation. Confidence: 94.2%.'
      );
    } else if (phase.id === 4) {
      setDemoOutput(
        'Phase 4 [PREDICT Simulation]: Highway NH-48 monsoon delay forecasted at +42 minutes; 3 downstream SLA breaches predicted at Mumbai Hub by 19:30 UTC.'
      );
    } else if (phase.id === 5) {
      setDemoOutput(
        'Phase 5 [DECIDE Simulation]: Formulated optimal directive: Reroute Truck T-184 via Western Bypass (+14km, -28min). Estimated penalty avoidance: $1,420.'
      );
    } else if (phase.id === 6) {
      setDemoOutput(
        'Phase 6 [COMMUNICATE Simulation]: Multi-agent alert dispatched: SMS & In-cab navigation update pushed to Driver Vikram Singh (T-184). Acknowledgment receipt logged.'
      );
    }
  };

  return (
    <div
      className="tactical-panel"
      style={{
        position: 'absolute',
        top: 'calc(var(--telemetry-bar-height) + 16px)',
        left: 'calc(var(--nav-rail-width) + 16px)',
        bottom: '16px',
        width: '720px',
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
          <Layers size={16} color="#38bdf8" />
          <div>
            <h2 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              CLOSED-LOOP INTELLIGENCE PIPELINE (PHASES 1–6)
            </h2>
            <span className="font-mono text-xs" style={{ color: '#38bdf8' }}>
              OBSERVE → UNDERSTAND → REASON → PREDICT → DECIDE → COMMUNICATE
            </span>
          </div>
        </div>

        <div className="badge-status badge-status-active">
          <span>PHASE 1 ACTIVE</span>
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
          gap: '14px',
        }}
      >
        {/* Visual Pipeline Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '10px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-default)',
          }}
        >
          {SYSTEM_PHASES.map((p, idx) => {
            const isSelected = selectedPhase.id === p.id;
            const isActive = p.status === 'ACTIVE';

            return (
              <React.Fragment key={p.id}>
                <button
                  onClick={() => {
                    setSelectedPhase(p);
                    setDemoOutput(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-xs)',
                    border: isSelected
                      ? '1px solid var(--accent-cyan)'
                      : isActive
                      ? '1px solid rgba(56, 189, 248, 0.4)'
                      : '1px solid var(--border-subtle)',
                    background: isSelected
                      ? 'var(--accent-cyan-dim)'
                      : isActive
                      ? 'rgba(56, 189, 248, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    color: isActive ? '#38bdf8' : isSelected ? '#f8fafc' : 'var(--text-dim)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    outline: 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <span className="font-mono" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                    P{p.id}
                  </span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>{p.slug.toUpperCase()}</span>
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? 'var(--accent-cyan)' : 'var(--text-dim)',
                      boxShadow: isActive ? '0 0 6px var(--accent-cyan)' : 'none',
                    }}
                  />
                </button>

                {idx < SYSTEM_PHASES.length - 1 && (
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Selected Phase Detail Card */}
        <div
          className="tactical-panel-solid"
          style={{
            padding: '16px',
            borderLeft: `4px solid ${selectedPhase.status === 'ACTIVE' ? 'var(--accent-cyan)' : 'var(--color-intelligence)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <h3 className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                  {selectedPhase.name}
                </h3>
                <span
                  className={`badge-status ${
                    selectedPhase.status === 'ACTIVE' ? 'badge-status-active' : 'badge-status-intelligence'
                  }`}
                >
                  {selectedPhase.badgeLabel}
                </span>
              </div>
              <span className="text-xs" style={{ color: '#38bdf8' }}>
                {selectedPhase.subtitle}
              </span>
            </div>
          </div>

          <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {selectedPhase.description}
          </p>

          {/* Capabilities */}
          <div>
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              CORE SYSTEM CAPABILITIES:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {selectedPhase.coreCapabilities.map((cap) => (
                <div
                  key={cap}
                  style={{
                    padding: '6px 8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '3px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.72rem',
                    color: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={12} color={selectedPhase.status === 'ACTIVE' ? '#10b981' : '#a78bfa'} />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contracts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '10px',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <div>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>INPUT CONTRACT</span>
              <p className="font-mono text-xs" style={{ color: '#94a3b8', marginTop: '2px' }}>
                {selectedPhase.inputContract}
              </p>
            </div>
            <div>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>OUTPUT CONTRACT</span>
              <p className="font-mono text-xs" style={{ color: '#38bdf8', marginTop: '2px' }}>
                {selectedPhase.outputContract}
              </p>
            </div>
          </div>

          {/* Interactive Scenario Demo Trigger */}
          <div
            style={{
              padding: '12px',
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#a78bfa" />
                <span className="font-mono text-xs" style={{ color: '#a78bfa', fontWeight: 600 }}>
                  DEMO SCENARIO: {selectedPhase.demoScenario.title}
                </span>
              </div>
              <button
                className="tactical-btn tactical-btn-primary"
                onClick={() => handleRunPhaseDemo(selectedPhase)}
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              >
                <Zap size={11} />
                <span>{selectedPhase.demoScenario.triggerLabel}</span>
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {selectedPhase.demoScenario.description}
            </p>

            {demoOutput && (
              <div
                className="font-mono text-xs"
                style={{
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '3px',
                  borderLeft: '2px solid #a78bfa',
                  color: '#f8fafc',
                  lineHeight: 1.4,
                }}
              >
                {demoOutput}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
