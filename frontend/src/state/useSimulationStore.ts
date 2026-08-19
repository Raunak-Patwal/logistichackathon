/**
 * Scenario & Simulation Preset Store
 */

import { create } from 'zustand';

export interface ScenarioPreset {
  id: string;
  name: string;
  codename: string;
  severity: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  description: string;
  durationSeconds: number;
  initialEventsCount: number;
  keyEntities: string[];
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'SCEN-NORMAL',
    name: 'Standard Cross-Hub Cadence',
    codename: 'OPERATION_NOMINAL',
    severity: 'NORMAL',
    description: 'Nominal event throughput across all 5 logistics nodes with continuous truck departures, telemetry pings, and delivery confirmations.',
    durationSeconds: 120,
    initialEventsCount: 24,
    keyEntities: ['W12', 'W04', 'T-102', 'T-184'],
  },
  {
    id: 'SCEN-PEAK-RUSH',
    name: 'Diwali Festival Peak Volume Rush',
    codename: 'OPERATION_SATURATION',
    severity: 'ELEVATED',
    description: '3.5x event velocity spike on Northern & Western trunk lines with staging dock saturation and rapid parcel pack-to-load transitions.',
    durationSeconds: 180,
    initialEventsCount: 68,
    keyEntities: ['W12', 'W19', 'T-205', 'T-312', 'P-1021'],
  },
  {
    id: 'SCEN-SCANNER-FAILURE',
    name: 'Delhi W12 Scanner Hardware Failure',
    codename: 'INCIDENT_ANOMALY_DELHI',
    severity: 'CRITICAL',
    description: 'Zebra scanner outage at Delhi Super-Hub Staging Bay 04 halts 540 parcels and 18 trucks; tests incident context builder and alert propagation.',
    durationSeconds: 90,
    initialEventsCount: 15,
    keyEntities: ['W12', 'INC-8921', 'T-312'],
  },
  {
    id: 'SCEN-MONSOON-REROUTE',
    name: 'Mumbai Expressway Monsoon Disruption',
    codename: 'INCIDENT_CORRIDOR_WATERLOG',
    severity: 'CRITICAL',
    description: 'Severe weather alert on NH-48 slows corridor velocity; tests dynamic route risk escalation and delayed truck telemetry updates.',
    durationSeconds: 150,
    initialEventsCount: 30,
    keyEntities: ['W04', 'W08', 'T-184', 'INC-4402', 'ROUTE-BOM-BLR'],
  },
];

interface SimulationState {
  activeScenarioId: string;
  isSimulating: boolean;
  autoEmitIntervalMs: number;
  eventEmissionRate: number; // events per second

  // Actions
  setActiveScenario: (id: string) => void;
  setSimulating: (isSimulating: boolean) => void;
  setAutoEmitInterval: (intervalMs: number) => void;
  setEventEmissionRate: (rate: number) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  activeScenarioId: 'SCEN-NORMAL',
  isSimulating: true,
  autoEmitIntervalMs: 2500,
  eventEmissionRate: 4.8,

  setActiveScenario: (activeScenarioId) => set({ activeScenarioId }),
  setSimulating: (isSimulating) => set({ isSimulating }),
  setAutoEmitInterval: (autoEmitIntervalMs) => set({ autoEmitIntervalMs }),
  setEventEmissionRate: (eventEmissionRate) => set({ eventEmissionRate }),
}));
