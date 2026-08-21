import React from 'react';
import {
  Globe,
  Activity,
  Boxes,
  AlertOctagon,
  Sparkles,
  Cpu,
  LucideIcon,
} from 'lucide-react';
import { useUIStore, PrimaryView } from '../../state/useUIStore';
import { useWorldModelStore } from '../../state/useWorldModelStore';

interface NavItem {
  id: PrimaryView;
  label: string;
  icon: LucideIcon;
  badgeType?: 'INCIDENTS' | 'EVENTS' | 'HOT';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'WORLD', label: 'World Twin', icon: Globe },
  { id: 'USP_COMMAND', label: '⭐ 4 USPs Matrix', icon: Sparkles, badgeType: 'HOT' },
  { id: 'SST_GNN', label: '🧠 SST-GNN Forecaster', icon: Cpu },
  { id: 'INCIDENTS', label: 'Incidents Radar', icon: AlertOctagon, badgeType: 'INCIDENTS' },
  { id: 'ENTITIES', label: 'Fleet Tree', icon: Boxes },
  { id: 'EVENTS', label: 'Event Log', icon: Activity, badgeType: 'EVENTS' },
];

export const NavRail: React.FC = () => {
  const activePersona = useUIStore((s) => s.activePersona);
  const activeView = useUIStore((s) => s.activeView);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const incidents = useWorldModelStore((s) => s.incidents);
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED').length;

  // Only show tactical sub-navigation when in OPERATIONS 3D Twin mode
  if (activePersona !== 'OPERATIONS') return null;

  return (
    <nav
      className="floating-glass-dock"
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        zIndex: 40,
        borderRadius: '9999px',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeView === item.id;
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            title={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              border: isActive ? '1px solid #00f0ff' : '1px solid transparent',
              background: isActive
                ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.3) 0%, rgba(2, 132, 199, 0.2) 100%)'
                : 'transparent',
              color: isActive ? '#00f0ff' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              outline: 'none',
              fontSize: '0.74rem',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: isActive ? 700 : 500,
              boxShadow: isActive ? '0 0 14px rgba(0, 240, 255, 0.35)' : 'none',
            }}
          >
            <IconComponent size={14} color={isActive ? '#00f0ff' : '#94a3b8'} />
            <span>{item.label}</span>

            {/* Dynamic Anomaly Badge */}
            {item.badgeType === 'INCIDENTS' && activeIncidents > 0 && (
              <span
                style={{
                  background: '#ff3366',
                  color: '#ffffff',
                  fontSize: '8px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px #ff3366',
                }}
              >
                {activeIncidents}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
