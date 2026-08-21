import React, { useEffect } from 'react';
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

import { WorldView } from './components/views/WorldView';
import { EventStreamView } from './components/views/EventStreamView';
import { EntitiesView } from './components/views/EntitiesView';
import { TimelineView } from './components/views/TimelineView';
import { IncidentsView } from './components/views/IncidentsView';
import { NetworkGraphView } from './components/views/NetworkGraphView';
import { UleoStudioView } from './components/views/UleoStudioView';
import { PhaseRoadmapView } from './components/views/PhaseRoadmapView';
import { ArchitectureView } from './components/views/ArchitectureView';

import { CustomerCopilotView } from './components/views/CustomerCopilotView';
import { DriverCopilotView } from './components/views/DriverCopilotView';
import { ExecutiveCopilotView } from './components/views/ExecutiveCopilotView';

import { useUIStore } from './state/useUIStore';
import { useWorldModelStore } from './state/useWorldModelStore';
import { simulationEngine } from './api/simulationEngine';
import { initializeWebSocket } from './api/websocket';

export const App: React.FC = () => {
  const activePersona = useUIStore((s) => s.activePersona);
  const activeView = useUIStore((s) => s.activeView);
  const mapMode = useUIStore((s) => s.mapMode);
  const toggleMapMode = useUIStore((s) => s.toggleMapMode);
  const bootSequenceComplete = useUIStore((s) => s.bootSequenceComplete);

  useEffect(() => {
    // 1. Hydrate real PostgreSQL & Redis state
    useWorldModelStore.getState().initFromBackend();

    // 2. Initialize Real-Time WebSocket stream
    initializeWebSocket();

    // 3. Start deterministic simulation ticker
    simulationEngine.start(2500);

    // 4. Global Keyboard Shortcut: 'M' to toggle between 2D & 3D maps
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
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleMapMode]);

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

      {/* Navigation Rail */}
      <NavRail />

      {/* 1. OPERATIONS PERSONA: 3D World Digital Twin & 2D Tactical GIS Map */}
      {activePersona === 'OPERATIONS' && (
        <>
          {mapMode === '3D' ? <WorldCanvas /> : <World2DMap />}

          {/* Floating Operational Views */}
          {activeView === 'WORLD' && <WorldView />}
          {activeView === 'EVENTS' && <EventStreamView />}
          {activeView === 'ENTITIES' && <EntitiesView />}
          {activeView === 'TIMELINE' && <TimelineView />}
          {activeView === 'INCIDENTS' && <IncidentsView />}
          {activeView === 'NETWORK' && <NetworkGraphView />}
          {activeView === 'ULEO' && <UleoStudioView />}
          {activeView === 'PHASES' && <PhaseRoadmapView />}
          {activeView === 'ARCHITECTURE' && <ArchitectureView />}

          {/* Floating Operations Copilot, Entity Inspector & Bottom-Right Mode Switcher */}
          <OperationsCopilotPanel />
          <EntityInspector />
          <MapModeSwitcher />
        </>
      )}

      {/* 2. CUSTOMER PERSONA: Conversational Shipment Assistant */}
      {activePersona === 'CUSTOMER' && <CustomerCopilotView />}

      {/* 3. DRIVER PERSONA: In-Cab Dynamic Priority HUD & Traffic Detour */}
      {activePersona === 'DRIVER' && <DriverCopilotView />}

      {/* 4. EXECUTIVE PERSONA: C-Suite Macro Scorecard & Strategic AI */}
      {activePersona === 'EXECUTIVE' && <ExecutiveCopilotView />}

      {/* Centralized Global Modals */}
      <SystemDiagnosticsModal />
      <EventInjectorModal />
      <ScenarioSelectorModal />
    </div>
  );
};
