import React from 'react';
import { Layers, Box, Map, Compass, Radio } from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';

export const MapModeSwitcher: React.FC = () => {
  const activePersona = useUIStore((s) => s.activePersona);
  const activeView = useUIStore((s) => s.activeView);
  const mapMode = useUIStore((s) => s.mapMode);
  const setMapMode = useUIStore((s) => s.setMapMode);
  const toggleMapMode = useUIStore((s) => s.toggleMapMode);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);

  // Only display on the Operations Persona World Twin / Tactical Map home screen
  if (activePersona !== 'OPERATIONS' || activeView !== 'WORLD') {
    return null;
  }

  const is3D = mapMode === '3D';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        right: inspectorOpen ? '460px' : '24px',
        zIndex: 48,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'right 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Floating Mode Switcher Bar */}
      <div
        className="floating-glass-dock"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 6px',
          borderRadius: '9999px',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.2)',
          background: 'rgba(6, 11, 24, 0.92)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* 3D Option */}
        <button
          onClick={() => setMapMode('3D')}
          className="cyber-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '9999px',
            border: is3D ? '1px solid #00f0ff' : '1px solid transparent',
            background: is3D
              ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.35) 0%, rgba(2, 132, 199, 0.2) 100%)'
              : 'transparent',
            color: is3D ? '#00f0ff' : '#94a3b8',
            fontWeight: is3D ? 700 : 500,
            fontSize: '0.74rem',
            boxShadow: is3D ? '0 0 16px rgba(0, 240, 255, 0.4)' : 'none',
            clipPath: 'none',
          }}
          title="Switch to 3D Spatial Digital Twin"
        >
          <Box size={14} color={is3D ? '#00f0ff' : '#94a3b8'} />
          <span>3D TWIN</span>
          {is3D && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#00f0ff',
                boxShadow: '0 0 8px #00f0ff',
                animation: 'pulse-dot 1.8s infinite ease-in-out',
              }}
            />
          )}
        </button>

        {/* 2D Option */}
        <button
          onClick={() => setMapMode('2D')}
          className="cyber-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '9999px',
            border: !is3D ? '1px solid #00f0ff' : '1px solid transparent',
            background: !is3D
              ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.35) 0%, rgba(2, 132, 199, 0.2) 100%)'
              : 'transparent',
            color: !is3D ? '#00f0ff' : '#94a3b8',
            fontWeight: !is3D ? 700 : 500,
            fontSize: '0.74rem',
            boxShadow: !is3D ? '0 0 16px rgba(0, 240, 255, 0.4)' : 'none',
            clipPath: 'none',
          }}
          title="Switch to 2D Tactical GIS Map"
        >
          <Map size={14} color={!is3D ? '#00f0ff' : '#94a3b8'} />
          <span>2D MAP</span>
          {!is3D && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981',
                animation: 'pulse-dot 1.8s infinite ease-in-out',
              }}
            />
          )}
        </button>

        {/* Shortcut hint tag */}
        <div
          style={{
            padding: '3px 8px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.62rem',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            marginLeft: '2px',
          }}
          title="Press 'M' key anytime to toggle between 2D and 3D map views"
        >
          <span>KEY</span>
          <kbd
            style={{
              background: 'rgba(0, 240, 255, 0.15)',
              color: '#00f0ff',
              padding: '1px 4px',
              borderRadius: '3px',
              fontWeight: 700,
              fontSize: '0.6rem',
            }}
          >
            M
          </kbd>
        </div>
      </div>
    </div>
  );
};
