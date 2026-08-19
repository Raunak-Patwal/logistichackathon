import React from 'react';
import {
  Compass,
  Building2,
  Truck,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';
import { useWorldModelStore } from '../../state/useWorldModelStore';

export const WorldView: React.FC = () => {
  const selectEntity = useUIStore((s) => s.selectEntity);
  const setCameraMode = useUIStore((s) => s.setCameraMode);
  const triggerSignatureReconstruction = useUIStore((s) => s.triggerSignatureReconstruction);
  const isReplayingSignature = useUIStore((s) => s.isReplayingSignature);

  const warehouses = useWorldModelStore((s) => s.warehouses);
  const trucks = useWorldModelStore((s) => s.trucks);

  return (
    <>
      {/* Top Left Floating Quick Focus Pills */}
      <div
        style={{
          position: 'absolute',
          top: '76px',
          left: '24px',
          zIndex: 20,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {/* THE SIGNATURE EXPERIENCE: RECONSTRUCT WORLD MODEL */}
        <button
          className="cyber-btn"
          onClick={() => triggerSignatureReconstruction('P-10291')}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(2, 132, 199, 0.2) 100%)',
            borderColor: '#00f0ff',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.3)',
            borderRadius: '9999px',
            padding: '6px 14px',
            fontSize: '0.74rem',
            color: '#f8fafc',
            fontWeight: 600,
          }}
          title="Signature Interaction: Dive into the network, spotlight relationships, and reconstruct current state from immutable events"
        >
          <Sparkles size={13} color="#00f0ff" />
          <span>RECONSTRUCT WORLD MODEL (P-10291)</span>
        </button>

        <button
          className="cyber-btn"
          onClick={() => setCameraMode('NETWORK_OVERVIEW')}
          style={{ borderRadius: '9999px', padding: '6px 12px', fontSize: '0.72rem' }}
        >
          <Compass size={12} color="#00f0ff" />
          <span>OVERVIEW</span>
        </button>

        <button
          className="cyber-btn"
          onClick={() => {
            const w12 = warehouses.find((w) => w.id === 'W12');
            if (w12) selectEntity('WAREHOUSE', 'W12', w12.position);
          }}
          style={{ borderRadius: '9999px', padding: '6px 12px', fontSize: '0.72rem' }}
        >
          <Building2 size={12} color="#00f0ff" />
          <span>DELHI W12</span>
        </button>

        <button
          className="cyber-btn"
          onClick={() => {
            const w04 = warehouses.find((w) => w.id === 'W04');
            if (w04) selectEntity('WAREHOUSE', 'W04', w04.position);
          }}
          style={{ borderRadius: '9999px', padding: '6px 12px', fontSize: '0.72rem' }}
        >
          <Building2 size={12} color="#00f0ff" />
          <span>MUMBAI W04</span>
        </button>

        <button
          className="cyber-btn"
          onClick={() => {
            const t184 = trucks.find((t) => t.id === 'T-184');
            if (t184) selectEntity('TRUCK', 'T-184', t184.position);
          }}
          style={{ borderRadius: '9999px', padding: '6px 12px', fontSize: '0.72rem' }}
        >
          <Truck size={12} color="#00f0ff" />
          <span>TRACK T-184</span>
        </button>
      </div>

      {/* Signature Cinematic Banner when active */}
      {isReplayingSignature && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            background: 'rgba(6, 11, 24, 0.92)',
            border: '1px solid #00f0ff',
            boxShadow: '0 0 35px rgba(0, 240, 255, 0.45)',
            borderRadius: '9999px',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(24px)',
          }}
        >
          <Sparkles size={16} color="#00f0ff" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700, letterSpacing: '0.08em' }}>
              RECONSTRUCTING WORLD MODEL • PARCEL P-10291
            </span>
            <span className="font-mono" style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              Mumbai W04 → BharatBenz T-184 → NH-48 Corridor → Bengaluru W08
            </span>
          </div>
        </div>
      )}
    </>
  );
};
