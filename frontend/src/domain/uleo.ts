/**
 * ULEO (Universal Logistics Event Ontology) v0.1 Frontend Type Definitions
 * Directly aligned with backend domain value objects and schemas.
 */

export type EventType =
  | 'PARCEL_CREATED'
  | 'PARCEL_PACKED'
  | 'PARCEL_LOADED'
  | 'TRUCK_DEPARTED'
  | 'TRUCK_LOCATION_PING'
  | 'TRUCK_ARRIVED'
  | 'PARCEL_DELIVERED'
  | 'SCANNER_OFFLINE'
  | 'CONGESTION_ALERT'
  | 'INSPECTION_HOLD';

export type EntityType = 'PARCEL' | 'TRUCK' | 'WAREHOUSE' | 'AIRPORT' | 'DRIVER' | 'INCIDENT';

export interface EventMetadata {
  event_id: string;
  timestamp: string; // ISO 8601 UTC
  source: string;
  correlation_id?: string;
  causation_id?: string;
  idempotency_key?: string;
}

export interface DomainEvent {
  metadata: EventMetadata;
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  payload: Record<string, any>;
  version?: number;
}

export interface EventIngestionRequest {
  event_type: EventType;
  entity_id: string;
  source: string;
  payload: Record<string, any>;
  idempotency_key?: string;
}

export interface EventIngestionResponse {
  status: 'ACCEPTED' | 'REJECTED';
  event_id: string;
  entity_id: string;
  entity_state?: string;
  message?: string;
  dual_commit: {
    event_store: boolean;
    world_model: boolean;
    latency_ms: number;
  };
}
