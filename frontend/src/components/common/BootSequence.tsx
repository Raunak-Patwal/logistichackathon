import React, { useEffect, useState } from 'react';
import { Cpu, CheckCircle } from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';

const BOOT_STEPS = [
  'INITIALIZING OPERATIONAL WORLD MODEL...',
  'CONNECTING HETEROGENEOUS INGESTION STREAM (WMS, GPS, ERP)...',
  'COMPILING ULEO v0.1 ONTOLOGY SCHEMAS...',
  'VALIDATING FINITE STATE MACHINE INVARIANTS...',
  'ESTABLISHING ATOMIC DUAL-COMMIT POSTGRES ENGINE...',
  'SYSTEM OPERATIONAL • PHASE 1 [OBSERVE] READY',
];

export const BootSequence: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const completeBootSequence = useUIStore((s) => s.completeBootSequence);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= BOOT_STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            completeBootSequence();
          }, 400);
          return prev;
        }
        return prev + 1;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [completeBootSequence]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#07090e',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
      }}
    >
      <div
        style={{
          width: '460px',
          maxWidth: '90%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        {/* Emblem */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(56, 189, 248, 0.4)',
          }}
        >
          <Cpu size={36} color="#07090e" strokeWidth={2.5} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1
            className="font-display"
            style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}
          >
            AI LOGISTICS BRAIN
          </h1>
          <p className="font-mono" style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.12em' }}>
            OPERATIONAL INTELLIGENCE PLATFORM
          </p>
        </div>

        {/* Progress Log */}
        <div
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '6px',
            padding: '16px',
            minHeight: '140px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {BOOT_STEPS.slice(0, stepIndex + 1).map((step, idx) => (
            <div
              key={idx}
              className="font-mono text-xs"
              style={{
                color: idx === stepIndex ? '#38bdf8' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {idx < stepIndex ? (
                <CheckCircle size={12} color="#10b981" />
              ) : (
                <span className="status-dot status-dot-active" />
              )}
              <span>{step}</span>
            </div>
          ))}
        </div>

        {/* Skip button for rapid debugging */}
        <button
          onClick={completeBootSequence}
          className="tactical-btn"
          style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}
        >
          ENTER SYSTEM DIRECTLY →
        </button>
      </div>
    </div>
  );
};
