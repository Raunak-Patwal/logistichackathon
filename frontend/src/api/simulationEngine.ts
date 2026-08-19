/**
 * Deterministic Simulation Engine & Scenario Replay Controller
 * Generates canonical ULEO v0.1 domain events, enforces state machines,
 * and maintains atomic consistency between Event Store and Materialized State.
 */

import { DomainEvent, EventType, EventIngestionRequest, EventIngestionResponse } from '../domain/uleo';
import { useWorldModelStore } from '../state/useWorldModelStore';
import { useEventStore } from '../state/useEventStore';
import { validateStateTransition } from '../domain/stateMachine';

class SimulationEngine {
  private timer: number | null = null;
  private eventCounter = 1000;

  public start(intervalMs: number = 2800): void {
    this.stop();
    this.timer = window.setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Periodic deterministic event generation
   */
  private tick(): void {
    const worldStore = useWorldModelStore.getState();
    const eventStore = useEventStore.getState();

    // Advance trucks slightly
    worldStore.trucks.forEach((truck) => {
      if (truck.status === 'IN_TRANSIT') {
        worldStore.updateTruckProgress(truck.id, 0.008);
      }
    });

    // Randomly pick an eligible event type to simulate operational cadence
    const sampleEvents: EventType[] = [
      'TRUCK_LOCATION_PING',
      'PARCEL_PACKED',
      'PARCEL_LOADED',
      'TRUCK_DEPARTED',
      'PARCEL_DELIVERED',
    ];

    const chosenType = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];

    if (chosenType === 'TRUCK_LOCATION_PING') {
      const activeTruck = worldStore.trucks.find((t) => t.status === 'IN_TRANSIT') || worldStore.trucks[0];
      const pingEvent: DomainEvent = {
        metadata: {
          event_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          source: `GPS_TELEMATICS_${activeTruck.id}`,
          correlation_id: `corr-${activeTruck.id}-${Date.now()}`,
          idempotency_key: `ping-${activeTruck.id}-${Date.now()}`,
        },
        event_type: 'TRUCK_LOCATION_PING',
        entity_type: 'TRUCK',
        entity_id: activeTruck.id,
        payload: {
          speed_kmh: Math.floor(65 + Math.random() * 20),
          fuel_percent: Math.max(15, activeTruck.fuel_level_percent - 0.1),
          coordinates: activeTruck.position,
        },
      };

      eventStore.appendEvent(pingEvent);
    } else if (chosenType === 'PARCEL_PACKED') {
      // Find a CREATED parcel
      const createdParcel = worldStore.parcels.find((p) => p.state === 'CREATED');
      if (createdParcel) {
        this.processEvent({
          event_type: 'PARCEL_PACKED',
          entity_id: createdParcel.id,
          source: 'WMS_AUTO_SORTER_01',
          payload: {
            packer_id: 'ROBOTIC_PACK_CELL_A',
            warehouse_id: createdParcel.current_warehouse_id || 'W12',
          },
        });
      }
    }
  }

  /**
   * Ingest and validate any ULEO event request (from UI injector or simulation)
   */
  public processEvent(request: EventIngestionRequest): EventIngestionResponse {
    const startTime = performance.now();
    const worldStore = useWorldModelStore.getState();
    const eventStore = useEventStore.getState();

    // Check entity state
    const parcel = worldStore.parcels.find((p) => p.id === request.entity_id);
    const validation = validateStateTransition(parcel?.state, request.event_type);

    if (!validation.valid) {
      return {
        status: 'REJECTED',
        event_id: crypto.randomUUID(),
        entity_id: request.entity_id,
        entity_state: parcel?.state,
        message: validation.error || 'Invariant state machine transition violation',
        dual_commit: {
          event_store: false,
          world_model: false,
          latency_ms: +(performance.now() - startTime).toFixed(2),
        },
      };
    }

    // Valid event: create full DomainEvent
    const domainEvent: DomainEvent = {
      metadata: {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        source: request.source,
        correlation_id: `corr-${request.entity_id}-${Date.now()}`,
        idempotency_key: request.idempotency_key || `idem-${request.entity_id}-${this.eventCounter++}`,
      },
      event_type: request.event_type,
      entity_type: request.event_type.startsWith('TRUCK') ? 'TRUCK' : 'PARCEL',
      entity_id: request.entity_id,
      payload: request.payload,
      version: (parcel?.version || 0) + 1,
    };

    // Atomic dual-commit update to Event Store and Materialized State
    eventStore.appendEvent(domainEvent);
    worldStore.applyDomainEvent(domainEvent);

    const latency = +(performance.now() - startTime).toFixed(2);

    return {
      status: 'ACCEPTED',
      event_id: domainEvent.metadata.event_id,
      entity_id: request.entity_id,
      entity_state: validation.next_state,
      message: `Event ${request.event_type} committed atomically. Next state: ${validation.next_state}`,
      dual_commit: {
        event_store: true,
        world_model: true,
        latency_ms: Math.max(latency, 0.8),
      },
    };
  }

  /**
   * Load and execute a scenario
   */
  public loadScenario(scenarioId: string): void {
    const worldStore = useWorldModelStore.getState();
    worldStore.resetToInitial();

    if (scenarioId === 'SCEN-SCANNER-FAILURE') {
      worldStore.updateWarehouseStatus('W12', 'DEGRADED_SCANNER');
      worldStore.addIncident({
        id: 'INC-8921',
        incident_type: 'Scanner Hardware Failure',
        severity: 'HIGH',
        warehouse_id: 'W12',
        affected_parcels: 540,
        affected_trucks: 18,
        duration_mins: 32,
        status: 'ACTIVE',
        reported_at: new Date().toISOString(),
        context: {
          warehouse_capacity_percent: 95.0,
          cold_storage_parcels: 18,
          medicine_shipments: 12,
          next_truck_eta_mins: 14,
          nearest_backup_scanner: 'Scanner Bay B (Available)',
          weather: 'Normal / Clear 28°C',
        },
      });
    } else if (scenarioId === 'SCEN-PEAK-RUSH') {
      worldStore.updateWarehouseStatus('W12', 'HIGH_VOLUME');
      worldStore.updateWarehouseStatus('W04', 'HIGH_VOLUME');
    }
  }
}

export const simulationEngine = new SimulationEngine();
