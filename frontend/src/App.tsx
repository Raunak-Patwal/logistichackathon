import React, { useEffect, useState } from 'react';
import { WorldCanvas } from './components/world3d/WorldCanvas';
import { World2DMap } from './components/world2d/World2DMap';
import { MapModeSwitcher } from './components/common/MapModeSwitcher';
import { TopTelemetryBar } from './components/common/TopTelemetryBar';
import { NavRail } from './components/common/NavRail';
import { BootSequence } from './components/common/BootSequence';
import { EntityInspector } from './components/inspector/EntityInspector';
import { OperationsCopilotPanel } from './components/inspector/OperationsCopilotPanel';
import { EventInjectorModal } from './components/controls/EventInjectorModal';
import { ScenarioSelectorModal } from './components/controls/ScenarioSelectorModal';
import { SystemDiagnosticsModal } from './components/controls/SystemDiagnosticsModal';
import { AuthModal } from './components/auth/AuthModal';

import { WorldView } from './components/views/WorldView';
import { EventStreamView } from './components/views/EventStreamView';
import { EntitiesView } from './components/views/EntitiesView';
import { TimelineView } from './components/views/TimelineView';
import { IncidentsView } from './components/views/IncidentsView';
import { NetworkGraphView } from './components/views/NetworkGraphView';
import { UleoStudioView } from './components/views/UleoStudioView';
import { PhaseRoadmapView } from './components/views/PhaseRoadmapView';
import { ArchitectureView } from './components/views/ArchitectureView';
import { FourUspsCommandView } from './components/views/FourUspsCommandView';
import { SstGnnTrafficView } from './components/views/SstGnnTrafficView';

import { DriverCopilotView } from './components/views/DriverCopilotView';
import { ExecutiveCopilotView } from './components/views/ExecutiveCopilotView';

import { useUIStore, PersonaMode } from './state/useUIStore';
import { useWorldModelStore } from './state/useWorldModelStore';
import { apiClient, AuthUser } from './api/client';
import { simulationEngine } from './api/simulationEngine';
import { initializeWebSocket } from './api/websocket';
import { Lock, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export const App: React.FC = () => {
  const activePersona = useUIStore((s) => s.activePersona);
  const setActivePersona = useUIStore((s) => s.setActivePersona);
  const activeView = useUIStore((s) => s.activeView);
  const mapMode = useUIStore((s) => s.mapMode);
  const toggleMapMode = useUIStore((s) => s.toggleMapMode);
  const bootSequenceComplete = useUIStore((s) => s.bootSequenceComplete);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(apiClient.getStoredUser());

  useEffect(() => {
    // 1. Hydrate real PostgreSQL & Redis state
    useWorldModelStore.getState().initFromBackend();

    // 2. Initialize Real-Time WebSocket stream
    initializeWebSocket();

    // 3. Start deterministic simulation ticker
    simulationEngine.start(2500);

    // 4. Subscribe to auth changes
    const unsubscribe = apiClient.onUserChange((user) => {
      setCurrentUser(user);
    });

    // 5. Global Keyboard Shortcut: 'M' to toggle between 2D & 3D maps
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'm' || e.key === 'M') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        toggleMapMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      simulationEngine.stop();
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleMapMode]);

  // Determine if active persona is allowed for the logged in user
  const isPersonaAllowed = () => {
    if (!currentUser) return true; // Default fallback
    if (currentUser.role === 'ADMIN') return true; // SuperAdmin bypass
    return currentUser.persona === activePersona;
  };

  const allowed = isPersonaAllowed();

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#040711',
      }}
    >
      {/* Boot Experience */}
      {!bootSequenceComplete && <BootSequence />}

      {/* Top Telemetry & Persona Switcher Bar */}
      <TopTelemetryBar />

      {/* Access Restriction Screen if role does not permit this cockpit */}
      {!allowed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 35,
            backgroundColor: 'rgba(4, 7, 17, 0.94)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '520px',
              padding: '32px',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.25)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
              }}
            >
              <Lock size={28} color="#ef4444" />
            </div>

            <div>
              <span
                className="font-mono text-xs"
                style={{ color: '#ef4444', fontWeight: 700, letterSpacing: '0.1em' }}
              >
                ROLE-BASED ACCESS RESTRICTION • 403 FORBIDDEN
              </span>
              <h2
                className="font-display"
                style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc', margin: '6px 0' }}
              >
                Insufficient Privileges
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                You are currently authenticated as{' '}
                <strong style={{ color: '#f8fafc' }}>
                  {currentUser?.full_name || currentUser?.username}
                </strong>{' '}
                with the role{' '}
                <span
                  className="font-mono"
                  style={{
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {currentUser?.role}
                </span>
                . Access to the <strong style={{ color: '#00f0ff' }}>{activePersona}</strong> cockpit requires an
                elevated operational identity or SuperAdmin clearance.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="cyber-btn"
                onClick={() => setActivePersona(currentUser?.persona || 'OPERATIONS')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)',
                  color: '#040711',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                }}
              >
                <span>RETURN TO MY COCKPIT ({currentUser?.persona})</span>
                <ArrowRight size={14} />
              </button>

              <button
                className="cyber-btn"
                onClick={() => setAuthModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.78rem',
                }}
              >
                <UserCheck size={14} />
                <span>SWITCH OR ELEVATE IDENTITY</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Rail */}
      {allowed && <NavRail />}

      {/* 1. OPERATIONS PERSONA: 3D World Digital Twin & 2D Tactical GIS Map */}
      {allowed && activePersona === 'OPERATIONS' && (
        <>
          {mapMode === '3D' ? <WorldCanvas /> : <World2DMap />}

          {/* Floating Operational Views */}
          {activeView === 'WORLD' && (
            <>
              <WorldView />
              <OperationsCopilotPanel />
            </>
          )}
          {activeView === 'USP_COMMAND' && <FourUspsCommandView />}
          {activeView === 'SST_GNN' && <SstGnnTrafficView />}
          {activeView === 'EVENTS' && <EventStreamView />}
          {activeView === 'ENTITIES' && <EntitiesView />}
          {activeView === 'TIMELINE' && <TimelineView />}
          {activeView === 'INCIDENTS' && <IncidentsView />}
          {activeView === 'NETWORK' && <NetworkGraphView />}
          {activeView === 'ULEO' && <UleoStudioView />}
          {activeView === 'PHASES' && <PhaseRoadmapView />}
          {activeView === 'ARCHITECTURE' && <ArchitectureView />}

          {/* Floating Operations Copilot, Entity Inspector & Bottom-Right Mode Switcher */}
          <EntityInspector />
          <MapModeSwitcher />
        </>
      )}

      {/* 3. DRIVER PERSONA: In-Cab Dynamic Priority HUD & Traffic Detour */}
      {allowed && activePersona === 'DRIVER' && <DriverCopilotView />}

      {/* 4. EXECUTIVE PERSONA: C-Suite Macro Scorecard & Strategic AI */}
      {allowed && activePersona === 'EXECUTIVE' && <ExecutiveCopilotView />}

      {/* Centralized Global Modals */}
      <SystemDiagnosticsModal />
      <EventInjectorModal />
      <ScenarioSelectorModal />
      <AuthModal />
    </div>
  );
};
