/**
 * UI State Store & 3D Spatial Twin Camera Controller Orchestration
 * Handles selective network focus, relationship highlighting, dimming,
 * and cinematic camera choreography.
 */

import { create } from 'zustand';
import { EntityType, DomainEvent } from '../domain/uleo';
import { useWorldModelStore } from './useWorldModelStore';

export type PersonaMode = 'OPERATIONS' | 'DRIVER' | 'EXECUTIVE';

export type PrimaryView =
  | 'WORLD'
  | 'USP_COMMAND'
  | 'SST_GNN'
  | 'EVENTS'
  | 'ENTITIES'
  | 'TIMELINE'
  | 'INCIDENTS'
  | 'NETWORK'
  | 'ULEO'
  | 'PHASES'
  | 'ARCHITECTURE';

export type MapMode = '3D' | '2D';

export type CameraFocusMode =
  | 'NETWORK_OVERVIEW'
  | 'REGION_FOCUS'
  | 'WAREHOUSE_FOCUS'
  | 'TRUCK_FOCUS'
  | 'PARCEL_FOCUS'
  | 'EVENT_FOCUS'
  | 'INCIDENT_FOCUS'
  | 'SIGNATURE_DIVE';

interface UIState {
  activePersona: PersonaMode;
  activeView: PrimaryView;
  mapMode: MapMode;
  selectedEntityType: EntityType | null;
  selectedEntityId: string | null;
  highlightedRouteId: string | null;
  highlightedEntityIds: string[]; // Connected entities in the relational chain
  cameraMode: CameraFocusMode;
  cameraTarget: [number, number, number];
  cameraNonce: number;
  inspectorOpen: boolean;
  eventInjectorOpen: boolean;
  scenarioModalOpen: boolean;
  systemDiagnosticsModalOpen: boolean;
  authModalOpen: boolean;
  reducedMotion: boolean;
  bootSequenceComplete: boolean;
  isReplayingSignature: boolean;

  // Actions
  setActivePersona: (persona: PersonaMode) => void;
  setActiveView: (view: PrimaryView) => void;
  setMapMode: (mode: MapMode) => void;
  toggleMapMode: () => void;
  resetOverview: () => void;
  selectEntity: (type: EntityType | null, id: string | null, position?: [number, number, number]) => void;
  clearSelection: () => void;
  setCameraMode: (mode: CameraFocusMode, target?: [number, number, number]) => void;
  setInspectorOpen: (open: boolean) => void;
  setEventInjectorOpen: (open: boolean) => void;
  setScenarioModalOpen: (open: boolean) => void;
  setSystemDiagnosticsModalOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  toggleReducedMotion: () => void;
  completeBootSequence: () => void;
  followEvent: (event: DomainEvent, entityPosition?: [number, number, number]) => void;
  triggerSignatureReconstruction: (parcelId?: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  activePersona: 'OPERATIONS',
  activeView: 'WORLD',
  mapMode: '3D',
  selectedEntityType: null,
  selectedEntityId: null,
  highlightedRouteId: null,
  highlightedEntityIds: [],
  cameraMode: 'NETWORK_OVERVIEW',
  cameraTarget: [0, 0, 0],
  cameraNonce: 0,
  inspectorOpen: false,
  eventInjectorOpen: false,
  scenarioModalOpen: false,
  systemDiagnosticsModalOpen: false,
  authModalOpen: false,
  reducedMotion: false,
  bootSequenceComplete: false,
  isReplayingSignature: false,

  setActivePersona: (persona) => set({ activePersona: persona }),
  setActiveView: (view) => set({ activeView: view }),
  setMapMode: (mapMode) => set({ mapMode }),
  toggleMapMode: () => set((s) => ({ mapMode: s.mapMode === '3D' ? '2D' : '3D' })),
  resetOverview: () =>
    set((s) => ({
      cameraMode: 'NETWORK_OVERVIEW',
      cameraTarget: [0, 0, 0],
      selectedEntityType: null,
      selectedEntityId: null,
      highlightedRouteId: null,
      highlightedEntityIds: [],
      inspectorOpen: false,
      cameraNonce: s.cameraNonce + 1,
    })),
  setSystemDiagnosticsModalOpen: (open) => set({ systemDiagnosticsModalOpen: open }),
  setAuthModalOpen: (open) => set({ authModalOpen: open }),

  selectEntity: (type, id, position) => {
    if (!type || !id) {
      set({
        selectedEntityType: null,
        selectedEntityId: null,
        highlightedRouteId: null,
        highlightedEntityIds: [],
        inspectorOpen: false,
      });
      return;
    }

    const worldStore = useWorldModelStore.getState();
    const relatedIds: string[] = [id];
    let routeId: string | null = null;
    let targetPos = position || [0, 0, 0];

    // Compute Relational Chain for Selective Network Focus
    if (type === 'PARCEL') {
      const parcel = worldStore.parcels.find((p) => p.id === id);
      if (parcel) {
        if (parcel.current_truck_id) relatedIds.push(parcel.current_truck_id);
        if (parcel.origin_warehouse_id) relatedIds.push(parcel.origin_warehouse_id);
        if (parcel.current_warehouse_id) relatedIds.push(parcel.current_warehouse_id);
        if (parcel.assigned_route_id) {
          routeId = parcel.assigned_route_id;
          relatedIds.push(parcel.assigned_route_id);
        }

        // Target coordinates
        const tr = worldStore.trucks.find((t) => t.id === parcel.current_truck_id);
        const wh = worldStore.warehouses.find((w) => w.id === parcel.current_warehouse_id);
        if (tr) targetPos = tr.position;
        else if (wh) targetPos = wh.position;
      }
    } else if (type === 'TRUCK') {
      const truck = worldStore.trucks.find((t) => t.id === id);
      if (truck) {
        targetPos = truck.position;
        if (truck.origin_id) relatedIds.push(truck.origin_id);
        if (truck.destination_id) relatedIds.push(truck.destination_id);
        if (truck.driver_id) relatedIds.push(truck.driver_id);
        if (truck.current_route_id) {
          routeId = truck.current_route_id;
          relatedIds.push(truck.current_route_id);
        }
        relatedIds.push(...truck.parcel_ids);
      }
    } else if (type === 'WAREHOUSE') {
      const wh = worldStore.warehouses.find((w) => w.id === id);
      if (wh) {
        targetPos = wh.position;
        relatedIds.push(...wh.active_truck_ids);
        relatedIds.push(...wh.staging_parcels);
        const connectedAirports = worldStore.airports.filter((a) =>
          a.connected_warehouse_ids.includes(id)
        );
        connectedAirports.forEach((a) => relatedIds.push(a.id));
      }
    } else if (type === 'AIRPORT') {
      const ap = worldStore.airports.find((a) => a.id === id);
      if (ap) {
        targetPos = ap.position;
        relatedIds.push(...ap.connected_warehouse_ids);
      }
    } else if (type === 'INCIDENT') {
      const inc = worldStore.incidents.find((i) => i.id === id);
      if (inc) {
        const wh = worldStore.warehouses.find((w) => w.id === inc.warehouse_id);
        if (wh) {
          targetPos = wh.position;
          relatedIds.push(wh.id);
        }
      }
    }

    let mode: CameraFocusMode = 'NETWORK_OVERVIEW';
    if (type === 'WAREHOUSE') mode = 'WAREHOUSE_FOCUS';
    else if (type === 'TRUCK') mode = 'TRUCK_FOCUS';
    else if (type === 'PARCEL') mode = 'PARCEL_FOCUS';
    else if (type === 'AIRPORT') mode = 'REGION_FOCUS';
    else if (type === 'INCIDENT') mode = 'INCIDENT_FOCUS';

    set((state) => ({
      selectedEntityType: type,
      selectedEntityId: id,
      highlightedEntityIds: relatedIds,
      highlightedRouteId: routeId,
      cameraMode: mode,
      cameraTarget: targetPos,
      cameraNonce: state.cameraNonce + 1,
      inspectorOpen: true,
    }));
  },

  clearSelection: () =>
    set({
      selectedEntityType: null,
      selectedEntityId: null,
      highlightedRouteId: null,
      highlightedEntityIds: [],
      inspectorOpen: false,
    }),

  setCameraMode: (mode, target) =>
    set((state) => ({
      cameraMode: mode,
      cameraTarget: target || [0, 0, 0],
      cameraNonce: state.cameraNonce + 1,
    })),

  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setEventInjectorOpen: (eventInjectorOpen) => set({ eventInjectorOpen }),
  setScenarioModalOpen: (scenarioModalOpen) => set({ scenarioModalOpen }),
  toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
  completeBootSequence: () => set({ bootSequenceComplete: true }),

  /**
   * Signature Interaction: Follow an event through the world
   */
  followEvent: (event, entityPosition) => {
    let mode: CameraFocusMode = 'EVENT_FOCUS';
    if (event.entity_type === 'PARCEL') mode = 'PARCEL_FOCUS';
    else if (event.entity_type === 'TRUCK') mode = 'TRUCK_FOCUS';
    else if (event.entity_type === 'WAREHOUSE') mode = 'WAREHOUSE_FOCUS';

    const relatedIds: string[] = [event.entity_id];
    if (event.payload.truck_id) relatedIds.push(event.payload.truck_id);
    if (event.payload.warehouse_id) relatedIds.push(event.payload.warehouse_id);

    set({
      selectedEntityType: event.entity_type,
      selectedEntityId: event.entity_id,
      highlightedEntityIds: relatedIds,
      cameraMode: mode,
      cameraTarget: entityPosition || [0, 0, 0],
      inspectorOpen: true,
      activeView: 'WORLD',
    });
  },

  /**
   * The Signature "Wow Moment" Cinematic World Model Reconstruction Sequence
   */
  triggerSignatureReconstruction: (parcelId = 'P-10291') => {
    const worldStore = useWorldModelStore.getState();
    const parcel = worldStore.parcels.find((p) => p.id === parcelId) || worldStore.parcels[0];
    const truck = worldStore.trucks.find((t) => t.id === parcel.current_truck_id);
    const targetPos: [number, number, number] = truck ? truck.position : [-9.2, 0.22, 6.4];

    set({
      isReplayingSignature: true,
      selectedEntityType: 'PARCEL',
      selectedEntityId: parcel.id,
      highlightedEntityIds: [parcel.id, 'T-184', 'W04', 'W08', 'ROUTE-BOM-BLR', 'DRV-102'],
      highlightedRouteId: 'ROUTE-BOM-BLR',
      cameraMode: 'SIGNATURE_DIVE',
      cameraTarget: targetPos,
      inspectorOpen: true,
      activeView: 'WORLD',
    });

    // Reset replay flag after cinematic completion
    setTimeout(() => {
      set({ isReplayingSignature: false });
    }, 4500);
  },
}));
