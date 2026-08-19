import React from 'react';
import { X, Sliders, Play, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';
import { useSimulationStore, SCENARIO_PRESETS } from '../../state/useSimulationStore';
import { simulationEngine } from '../../api/simulationEngine';

export const ScenarioSelectorModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.scenarioModalOpen);
  const setIsOpen = useUIStore((s) => s.setScenarioModalOpen);

  const activeScenarioId = useSimulationStore((s) => s.activeScenarioId);
  const setActiveScenario = useSimulationStore((s) => s.setActiveScenario);

  if (!isOpen) return null;

  const handleSelectScenario = (id: string) => {
    setActiveScenario(id);
    simulationEngine.loadScenario(id);
    setIsOpen(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="glass-card"
        style={{
          width: '600px',
          maxWidth: '90%',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 240, 255, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="#00f0ff" />
            <div>
              <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                MISSION SCENARIO SELECTOR
              </h3>
              <span className="font-mono text-xs" style={{ color: '#00f0ff', letterSpacing: '0.04em' }}>
                DETERMINISTIC SIMULATION & CHAOS INJECTION SUITE
              </span>
            </div>
          </div>
          <button className="cyber-btn" onClick={() => setIsOpen(false)} style={{ padding: '4px 8px' }}>
            <X size={14} color="#00f0ff" />
          </button>
        </div>

        {/* Scenario Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {SCENARIO_PRESETS.map((scen) => {
            const isSelected = activeScenarioId === scen.id;

            return (
              <div
                key={scen.id}
                className="glass-card"
                onClick={() => handleSelectScenario(scen.id)}
                style={{
                  padding: '14px 16px',
                  borderLeft: `4px solid ${
                    scen.severity === 'CRITICAL'
                      ? '#ff3366'
                      : scen.severity === 'ELEVATED'
                      ? '#f59e0b'
                      : '#10b981'
                  }`,
                  borderColor: isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(8, 14, 28, 0.7)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                      {scen.name}
                    </span>
                    <span className="font-mono text-xs" style={{ color: '#64748b' }}>
                      [{scen.codename}]
                    </span>
                  </div>

                  <span
                    className={`badge-status ${
                      scen.severity === 'CRITICAL'
                        ? 'badge-status-critical'
                        : scen.severity === 'ELEVATED'
                        ? 'badge-status-warning'
                        : 'badge-status-success'
                    }`}
                  >
                    {scen.severity}
                  </span>
                </div>

                <p className="text-xs" style={{ color: '#cbd5e1' }}>
                  {scen.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                    DURATION: {scen.durationSeconds}s • KEY ENTITIES: {scen.keyEntities.join(', ')}
                  </span>
                  <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>
                    LOAD SCENARIO →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

