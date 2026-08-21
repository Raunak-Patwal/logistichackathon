/**
 * World Model Store (Materialized State)
 * Tracks the live operational state of all physical entities.
 */

import { create } from 'zustand';
import {
  WarehouseEntity,
  AirportEntity,
  TruckEntity,
  RouteEntity,
  ParcelEntity,
  DriverEntity,
  IncidentEntity,
  SystemTelemetry,
  ParcelState,
} from '../domain/worldModel';
import {
  INITIAL_WAREHOUSES,
  INITIAL_AIRPORTS,
  INITIAL_ROUTES,
  INITIAL_TRUCKS,
  INITIAL_PARCELS,
  INITIAL_DRIVERS,
  INITIAL_INCIDENTS,
} from '../domain/mockData';
import { DomainEvent } from '../domain/uleo';
import { getRoutePositionAndTangent } from '../utils/routeUtils';

interface WorldModelState {
  warehouses: WarehouseEntity[];
  airports: AirportEntity[];
  routes: RouteEntity[];
  trucks: TruckEntity[];
  parcels: ParcelEntity[];
  drivers: DriverEntity[];
  incidents: IncidentEntity[];
  telemetry: SystemTelemetry;

  // Actions
  initFromBackend: () => Promise<void>;
  applyDomainEvent: (event: DomainEvent) => void;
  updateTruckProgress: (truckId: string, progressDelta: number) => void;
  updateWarehouseStatus: (warehouseId: string, status: WarehouseEntity['status']) => void;
  addIncident: (incident: IncidentEntity) => void;
  resolveIncident: (incidentId: string) => void;
  handleLiveEvent: (data: any) => void;
  resetToInitial: () => void;
}

let pendingLiveEvents: any[] = [];
let isBatchScheduled = false;

import { apiClient } from '../api/client';

export const useWorldModelStore = create<WorldModelState>((set, get) => ({
  warehouses: INITIAL_WAREHOUSES,
  airports: INITIAL_AIRPORTS,
  routes: INITIAL_ROUTES,
  trucks: INITIAL_TRUCKS,
  parcels: INITIAL_PARCELS,
  drivers: INITIAL_DRIVERS,
  incidents: INITIAL_INCIDENTS,
  telemetry: {
    events_per_sec: 4.8,
    world_model_consistency: '100% ACID',
    active_entities_count: INITIAL_WAREHOUSES.length + INITIAL_AIRPORTS.length + INITIAL_TRUCKS.length + INITIAL_PARCELS.length,
    active_routes_count: INITIAL_ROUTES.length,
    processing_latency_ms: 1.29,
    uptime_seconds: 18420,
    system_mode: 'LIVE',
    active_phase: 'PHASE 1: OBSERVE',
  },

  initFromBackend: async () => {
    try {
      // Auto-authenticate as dispatcher if not logged in
      const user = apiClient.getStoredUser();
      if (!user) {
        await apiClient.login('dispatcher_delhi', 'dispatch123');
      }

      // Fetch live records from FastAPI & PostgreSQL
      const [backendWarehouses, backendTrucks, backendIncidents, summary] = await Promise.all([
        apiClient.fetchWarehouses(),
        apiClient.fetchTrucks(),
        apiClient.fetchIncidents(),
        apiClient.getNetworkSummary(),
      ]);

      set((state) => {
        // Merge real warehouse attributes
        let updatedWarehouses = state.warehouses;
        if (backendWarehouses && backendWarehouses.length > 0) {
          updatedWarehouses = state.warehouses.map((w) => {
            const match = backendWarehouses.find((bw: any) => bw.id === w.id);
            if (match) {
              return {
                ...w,
                name: match.name || w.name,
                code: match.code || w.code,
                current_parcels_count: match.current_parcels_count ?? w.current_parcels_count,
                dock_count: match.dock_count ?? w.dock_count,
                active_docks_occupied: match.active_docks_occupied ?? w.active_docks_occupied,
                status: match.status ?? w.status,
                has_cold_storage: match.has_cold_storage ?? w.has_cold_storage,
              };
            }
            return w;
          });
        }

        // Merge real incidents
        let updatedIncidents = state.incidents;
        if (backendIncidents && backendIncidents.length > 0) {
          updatedIncidents = backendIncidents.map((bi: any) => {
            const existing = state.incidents.find((i) => i.id === bi.id);
            return {
              id: bi.id,
              incident_type: bi.incident_type || bi.type || 'Operational Anomaly',
              type: bi.incident_type || bi.type || 'Operational Anomaly',
              severity: bi.severity || 'HIGH',
              warehouse_id: bi.warehouse_id || 'W12',
              affected_parcels: bi.affected_parcels || 400,
              affected_trucks: bi.affected_trucks || 15,
              duration_mins: bi.duration_mins || 30,
              status: bi.status || 'ACTIVE',
              reported_at: bi.reported_at || new Date().toISOString(),
              position: existing?.position || [0, 0, 0],
              context: bi.context_data || bi.context || {
                warehouse_capacity_percent: 92,
                cold_storage_parcels: 140,
                medicine_shipments: 85,
                next_truck_eta_mins: 12,
                nearest_backup_scanner: 'Hub Delhi Aux Terminal #2',
                weather: 'Clear, 28°C',
              },
            };
          });
        }

        return {
          warehouses: updatedWarehouses,
          incidents: updatedIncidents,
          telemetry: {
            ...state.telemetry,
            active_entities_count: (summary?.total_warehouses || 5) + (summary?.total_trucks || 4) + (summary?.total_parcels || 5),
            world_model_consistency: summary?.consistency || '100% ACID (PostgreSQL 16)',
            system_mode: 'LIVE_BACKEND',
          },
        };
      });
    } catch (e) {
      console.warn('Backend hydration skipped, running with local twin state:', e);
    }
  },

  applyDomainEvent: (event: DomainEvent) => {
    const { event_type, entity_id, payload, metadata } = event;

    set((state) => {
      let updatedParcels = [...state.parcels];
      let updatedTrucks = [...state.trucks];
      let updatedWarehouses = [...state.warehouses];

      if (event.entity_type === 'PARCEL') {
        const existingIndex = updatedParcels.findIndex((p) => p.id === entity_id);
        const timestampStr = metadata.timestamp.substring(11, 19);

        let targetState: ParcelState = 'CREATED';
        let desc = `Event ${event_type} processed`;

        if (event_type === 'PARCEL_CREATED') {
          targetState = 'CREATED';
          desc = `Order created for ${payload.destination || 'Destination'}`;
        } else if (event_type === 'PARCEL_PACKED') {
          targetState = 'PACKED';
          desc = `Packed by ${payload.packer_id || 'Scanner'}`;
        } else if (event_type === 'PARCEL_LOADED') {
          targetState = 'LOADED';
          desc = `Loaded into truck ${payload.truck_id || 'Unknown'}`;
        } else if (event_type === 'TRUCK_DEPARTED') {
          targetState = 'DISPATCHED';
          desc = `Dispatched in transit`;
        } else if (event_type === 'PARCEL_DELIVERED') {
          targetState = 'DELIVERED';
          desc = `Delivered with proof: ${payload.proof_of_delivery || 'Signed'}`;
        }

        const newHistoryEntry = {
          event_id: metadata.event_id,
          event_type,
          timestamp: timestampStr,
          description: desc,
        };

        if (existingIndex >= 0) {
          const parcel = updatedParcels[existingIndex];
          updatedParcels[existingIndex] = {
            ...parcel,
            state: targetState,
            current_truck_id: payload.truck_id || parcel.current_truck_id,
            current_warehouse_id: payload.warehouse_id || parcel.current_warehouse_id,
            version: (parcel.version || 1) + 1,
            updated_at: metadata.timestamp,
            history: [newHistoryEntry, ...parcel.history],
          };
        } else {
          // New Parcel created
          updatedParcels.push({
            id: entity_id,
            state: targetState,
            weight_kg: payload.weight || 5.0,
            destination: payload.destination || 'Distribution Hub',
            origin_warehouse_id: payload.warehouse_id || 'W12',
            current_warehouse_id: payload.warehouse_id || 'W12',
            priority: payload.priority || 'STANDARD',
            version: 1,
            created_at: metadata.timestamp,
            updated_at: metadata.timestamp,
            history: [newHistoryEntry],
          });
        }
      }

      if (event.entity_type === 'TRUCK') {
        const truckIndex = updatedTrucks.findIndex((t) => t.id === entity_id);
        if (truckIndex >= 0) {
          const truck = updatedTrucks[truckIndex];
          if (event_type === 'TRUCK_DEPARTED') {
            updatedTrucks[truckIndex] = {
              ...truck,
              status: 'IN_TRANSIT',
              telemetry_updated_at: metadata.timestamp,
            };
          } else if (event_type === 'TRUCK_ARRIVED') {
            updatedTrucks[truckIndex] = {
              ...truck,
              status: 'UNLOADING',
              progress: 1.0,
              telemetry_updated_at: metadata.timestamp,
            };
          }
        }
      }

      return {
        parcels: updatedParcels,
        trucks: updatedTrucks,
        warehouses: updatedWarehouses,
        telemetry: {
          ...state.telemetry,
          events_per_sec: +(state.telemetry.events_per_sec + (Math.random() * 0.4 - 0.2)).toFixed(1),
          processing_latency_ms: +(1.2 + Math.random() * 0.5).toFixed(2),
        },
      };
    });
  },

  updateTruckProgress: (truckId: string, progressDelta: number) => {
    set((state) => ({
      trucks: state.trucks.map((truck) => {
        if (truck.id !== truckId || truck.status !== 'IN_TRANSIT') return truck;
        let newProgress = truck.progress + progressDelta;
        if (newProgress > 1) newProgress = 0;

        const route = state.routes.find((r) => r.id === truck.current_route_id);
        let newPos = truck.position;
        const pts = route?.path_points || route?.waypoints;
        if (pts && pts.length >= 2) {
          const { position } = getRoutePositionAndTangent(pts, newProgress);
          newPos = position;
        }

        return {
          ...truck,
          progress: newProgress,
          position: newPos,
        };
      }),
    }));
  },

  updateWarehouseStatus: (warehouseId: string, status: WarehouseEntity['status']) => {
    set((state) => ({
      warehouses: state.warehouses.map((w) => (w.id === warehouseId ? { ...w, status } : w)),
    }));
  },

  addIncident: (incident: IncidentEntity) => {
    set((state) => ({
      incidents: [incident, ...state.incidents.filter((i) => i.id !== incident.id)],
    }));
  },

  resolveIncident: (incidentId: string) => {
    set((state) => ({
      incidents: state.incidents.map((i) => (i.id === incidentId ? { ...i, status: 'RESOLVED' } : i)),
      warehouses: state.warehouses.map((w) => {
        const incident = state.incidents.find((i) => i.id === incidentId);
        if (incident && incident.warehouse_id === w.id) {
          return { ...w, status: 'OPTIMAL' };
        }
        return w;
      }),
    }));
  },

  handleLiveEvent: (data: any) => {
    if (!data) return;
    pendingLiveEvents.push(data);

    if (!isBatchScheduled) {
      isBatchScheduled = true;
      const scheduleFn = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb: any) => setTimeout(cb, 16);

      scheduleFn(() => {
        const batch = [...pendingLiveEvents];
        pendingLiveEvents = [];
        isBatchScheduled = false;

        set((curr) => {
          let updatedParcels = [...curr.parcels];
          let updatedWarehouses = [...curr.warehouses];
          let updatedIncidents = [...curr.incidents];
          const parcelMap = new Map(updatedParcels.map((p, idx) => [p.id, idx]));

          for (const item of batch) {
            const eventType = item.event_type || item.type || 'DOMAIN_EVENT';
            const entityId = item.entity_id || item.parcel_id;
            const state = item.state;
            const timestamp = item.timestamp || new Date().toISOString();

            if (eventType === 'ACTION_EXECUTED' || item.incident_status === 'RESOLVED') {
              if (item.target_entity_id) {
                updatedWarehouses = updatedWarehouses.map((w) => (w.id === item.target_entity_id ? { ...w, status: 'OPTIMAL' } : w));
              }
              if (item.incident_id) {
                updatedIncidents = updatedIncidents.map((i) => (i.id === item.incident_id ? { ...i, status: 'RESOLVED' } : i));
              }
            }

            const existingIndex = parcelMap.get(entityId);
            if (existingIndex !== undefined) {
              const p = updatedParcels[existingIndex];
              const nextState = (state as ParcelState) || p.state;
              const eventId = item.event_id || `LIVE-${Date.now()}`;
              updatedParcels[existingIndex] = {
                ...p,
                state: nextState,
                history: [
                  ...p.history,
                  {
                    event_id: eventId,
                    event_type: eventType,
                    timestamp: typeof timestamp === 'string' ? timestamp.substring(11, 19) : '',
                    description: `Live event ${eventType} processed (Next state: ${nextState})`,
                  },
                ],
              };
            }
          }

          return {
            parcels: updatedParcels,
            warehouses: updatedWarehouses,
            incidents: updatedIncidents,
            telemetry: {
              ...curr.telemetry,
              events_per_sec: +(curr.telemetry.events_per_sec + (batch.length * 0.1)).toFixed(1),
              processing_latency_ms: +(0.8 + Math.random() * 0.3).toFixed(2),
            },
          };
        });
      });
    }
  },

  resetToInitial: () => {
    set({
      warehouses: INITIAL_WAREHOUSES,
      airports: INITIAL_AIRPORTS,
      routes: INITIAL_ROUTES,
      trucks: INITIAL_TRUCKS,
      parcels: INITIAL_PARCELS,
      drivers: INITIAL_DRIVERS,
      incidents: INITIAL_INCIDENTS,
    });
  },
}));
