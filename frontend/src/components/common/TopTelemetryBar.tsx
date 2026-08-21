import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Zap,
  Send,
  Cpu,
  Globe,
  Package,
  Truck,
  TrendingUp,
  Server,
  UserCheck,
  Lock,
} from 'lucide-react';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { useUIStore, PersonaMode } from '../../state/useUIStore';
import { apiClient, AuthUser, FALLBACK_DEMO_USERS } from '../../api/client';

export const TopTelemetryBar: React.FC = () => {
  const telemetry = useWorldModelStore((s) => s.telemetry);
  const incidents = useWorldModelStore((s) => s.incidents);

  const activePersona = useUIStore((s) => s.activePersona);
  const setActivePersona = useUIStore((s) => s.setActivePersona);
  const setEventInjectorOpen = useUIStore((s) => s.setEventInjectorOpen);
  const setSystemDiagnosticsModalOpen = useUIStore((s) => s.setSystemDiagnosticsModalOpen);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);

  const [utcTime, setUtcTime] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(apiClient.getStoredUser());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC').slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const stored = apiClient.getStoredUser();
    if (stored) {
      setCurrentUser(stored);
    } else {
      const defaultUser: AuthUser = {
        username: 'dispatcher_delhi',
        role: 'DISPATCHER',
        persona: 'OPERATIONS',
        full_name: 'Rajesh Varma',
        permissions: ['*'],
        assigned_entity_id: 'W12',
      };
      setCurrentUser(defaultUser);
    }

    const unsubscribe = apiClient.onUserChange((user) => {
      setCurrentUser(user);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#ec4899' };
      case 'DRIVER':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' };
      case 'EXECUTIVE':
        return { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#a855f7' };
      case 'DISPATCHER':
      default:
        return { bg: 'rgba(0, 240, 255, 0.15)', border: '#00f0ff', text: '#00f0ff' };
    }
  };

  const badgeStyle = getRoleBadgeStyle(currentUser?.role);

  return (
    <header
      className="floating-glass-bar"
      style={{
        position: 'absolute',
        top: '12px',
        left: '20px',
        right: '20px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        zIndex: 60,
      }}
    >
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.65)',
          }}
        >
          <Cpu size={16} color="#040711" strokeWidth={2.5} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            className="font-display"
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#f8fafc',
              lineHeight: 1.1,
            }}
          >
            AI LOGISTICS BRAIN
          </span>
          <span
            className="font-mono"
            style={{ fontSize: '0.62rem', color: '#00f0ff', letterSpacing: '0.08em' }}
          >
            PHASES 1–6 CLOSED-LOOP ENGINE
          </span>
        </div>
      </div>

      {/* Center Persona Switcher Dock */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          background: 'rgba(4, 7, 17, 0.65)',
          padding: '4px',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {[
          { id: 'OPERATIONS', label: '3D TWIN MISSION HUB', icon: Globe },
          { id: 'DRIVER', label: 'DRIVER IN-CAB HUD', icon: Truck },
          { id: 'EXECUTIVE', label: 'CEO STRATEGY', icon: TrendingUp },
        ].map((p) => {
          const isSelected = activePersona === p.id;
          const IconComp = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setActivePersona(p.id as PersonaMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: isSelected ? 700 : 500,
                letterSpacing: '0.04em',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.35) 0%, rgba(2, 132, 199, 0.25) 100%)'
                  : 'transparent',
                border: isSelected ? '1px solid #00f0ff' : '1px solid transparent',
                color: isSelected ? '#00f0ff' : '#94a3b8',
                boxShadow: isSelected ? '0 0 16px rgba(0, 240, 255, 0.4)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                outline: 'none',
              }}
            >
              <IconComp size={13} color={isSelected ? '#00f0ff' : '#94a3b8'} />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Telemetry & Quick Action Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Interactive User Persona & RBAC Pill */}
        <button
          onClick={() => setAuthModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '3px 10px 3px 5px',
            borderRadius: '9999px',
            background: badgeStyle.bg,
            border: `1px solid ${badgeStyle.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
          }}
          title="Click to Switch Stakeholder Identity, Sign in with Google, or Inspect JWT Claims"
        >
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `1.5px solid ${badgeStyle.border}`,
              }}
            />
          ) : (
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: badgeStyle.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={12} color="#040711" strokeWidth={2.5} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                {currentUser?.full_name || currentUser?.username || 'Dispatcher'}
              </span>
              {currentUser?.auth_provider === 'google' && (
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    color: '#4285F4',
                    background: 'rgba(66, 133, 244, 0.18)',
                    padding: '0 3px',
                    borderRadius: '2px',
                  }}
                >
                  G
                </span>
              )}
            </div>
            <span
              className="font-mono"
              style={{
                fontSize: '0.6rem',
                color: badgeStyle.text,
                fontWeight: 700,
              }}
            >
              {currentUser?.role || 'DISPATCHER'}
            </span>
          </div>
        </button>

        {/* Live Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '9999px',
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            color: '#10b981',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <span>100% ACID</span>
        </div>

        {/* Throughput */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 4px' }}>
          <Activity size={13} color="#00f0ff" />
          <span className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 600 }}>
            {telemetry.events_per_sec} EPS
          </span>
        </div>

        {/* UTC Clock */}
        <span className="font-mono text-xs" style={{ color: '#64748b', marginRight: '4px' }}>
          {utcTime}
        </span>

        {/* Inject Event - RBAC Protected */}
        <button
          className="cyber-btn"
          onClick={() => setEventInjectorOpen(true)}
          style={{
            padding: '5px 10px',
            fontSize: '0.72rem',
            borderRadius: '9999px',
            opacity: apiClient.canInjectEvents() ? 1 : 0.75,
          }}
          title={
            apiClient.canInjectEvents()
              ? 'Inject Live ULEO Event'
              : 'Restricted: Requires DISPATCHER or ADMIN role (Read-Only Viewer)'
          }
        >
          {apiClient.canInjectEvents() ? <Send size={11} color="#00f0ff" /> : <Lock size={11} color="#f59e0b" />}
          <span>INJECT</span>
        </button>

        {/* System Diagnostics & ADRs Modal */}
        <button
          className="cyber-btn"
          onClick={() => setSystemDiagnosticsModalOpen(true)}
          style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '9999px' }}
          title="Open System Architecture, Database Diagnostics & ADRs"
        >
          <Server size={11} color="#00f0ff" />
          <span>SYS/ADR</span>
        </button>
      </div>
    </header>
  );
};
