/**
 * Operational World Model Materialized Entity Interfaces
 * Represents the current operational belief of the world.
 */

export type ParcelState = 'CREATED' | 'PACKED' | 'LOADED' | 'DISPATCHED' | 'DELIVERED';

export interface ParcelEntity {
  id: string;
  state: ParcelState;
  weight_kg: number;
  destination: string;
  origin_warehouse_id: string;
  current_warehouse_id?: string;
  current_truck_id?: string;
  assigned_route_id?: string;
  priority: 'STANDARD' | 'EXPRESS' | 'COLD_CHAIN' | 'CRITICAL_MEDICAL';
  version: number;
  created_at: string;
  updated_at: string;
  history: {
    event_id: string;
    event_type: string;
    timestamp: string;
    description: string;
  }[];
}

export type TruckStatus = 'IDLE' | 'LOADING' | 'IN_TRANSIT' | 'UNLOADING' | 'DELAYED' | 'MAINTENANCE';

export interface TruckEntity {
  id: string;
  name: string;
  status: TruckStatus;
  license_plate: string;
  current_route_id?: string;
  origin_id: string;
  destination_id: string;
  position: [number, number, number]; // [x, y, z] in 3D operational space
  target_position: [number, number, number];
  progress: number; // 0.0 to 1.0 along the route spline
  speed_kmh: number;
  capacity_kg: number;
  current_load_kg: number;
  parcel_ids: string[];
  driver_id: string;
  fuel_level_percent: number;
  telemetry_updated_at: string;
}

export interface WarehouseEntity {
  id: string;
  name: string;
  code: string;
  region: string;
  position: [number, number, number]; // 3D coordinates
  capacity_parcels: number;
  current_parcels_count: number;
  dock_count: number;
  active_docks_occupied: number;
  status: 'OPTIMAL' | 'HIGH_VOLUME' | 'DEGRADED_SCANNER' | 'CRITICAL_CONGESTION';
  has_cold_storage: boolean;
  staging_parcels: string[];
  active_truck_ids: string[];
}

export interface AirportEntity {
  id: string;
  name: string;
  iata: string;
  position: [number, number, number];
  cargo_throughput_tons_day: number;
  active_air_routes: number;
  status: 'OPERATIONAL' | 'WEATHER_HOLD' | 'HIGH_CARGO_DEMAND';
  connected_warehouse_ids: string[];
}

export interface RouteEntity {
  id: string;
  name: string;
  origin_id: string;
  destination_id: string;
  distance_km: number;
  estimated_time_mins: number;
  congestion_factor: number; // 1.0 is free flow, > 1.4 is congested
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  active_truck_ids: string[];
  path_points: [number, number, number][]; // 3D spline control points
  waypoints?: [number, number, number][];
}

export interface DriverEntity {
  id: string;
  name: string;
  license_number: string;
  assigned_truck_id?: string;
  shift_hours: number;
  status: 'ON_DUTY' | 'DRIVING' | 'REST_BREAK' | 'OFF_DUTY';
  rating: number;
}

export interface IncidentContext {
  warehouse_capacity_percent: number;
  cold_storage_parcels: number;
  medicine_shipments: number;
  next_truck_eta_mins: number;
  nearest_backup_scanner: string;
  weather: string;
}

export interface IncidentEntity {
  id: string;
  incident_type: string;
  type?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  warehouse_id: string;
  affected_parcels: number;
  affected_trucks: number;
  duration_mins: number;
  status: 'ACTIVE' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED' | 'OPEN';
  reported_at: string;
  context: IncidentContext;
  position?: [number, number, number];
}

export interface SystemTelemetry {
  events_per_sec: number;
  world_model_consistency: string; // e.g., "100% ACID"
  active_entities_count: number;
  active_routes_count: number;
  processing_latency_ms: number;
  uptime_seconds: number;
  system_mode: 'LIVE' | 'SIMULATION' | 'REPLAY' | 'LIVE_BACKEND' | 'LIVE_LOCAL';
  active_phase: string;
}

