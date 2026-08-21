import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { SpatialGrid } from './SpatialGrid';
import { SceneEnvironment } from './SceneEnvironment';
import { WarehouseNode } from './WarehouseNode';
import { AirportNode } from './AirportNode';
import { RouteArc } from './RouteArc';
import { TruckVehicle } from './TruckVehicle';
import { IncidentMarker } from './IncidentMarker';
import { ParcelMarker } from './ParcelMarker';
import { EventPulseSystem } from './EventPulseSystem';
import { CinematicCamera } from './CinematicCamera';
import { EffectPipeline } from './EffectPipeline';
import { useWorldModelStore } from '../../state/useWorldModelStore';
import { useUIStore } from '../../state/useUIStore';

export const WorldCanvas: React.FC = () => {
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const airports = useWorldModelStore((s) => s.airports);
  const routes = useWorldModelStore((s) => s.routes);
  const trucks = useWorldModelStore((s) => s.trucks);
  const incidents = useWorldModelStore((s) => s.incidents);
  const parcels = useWorldModelStore((s) => s.parcels);

  const selectedType = useUIStore((s) => s.selectedEntityType);
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const clearSelection = useUIStore((s) => s.clearSelection);

  // Show parcels when focused on a specific warehouse or truck, or when a parcel is directly selected
  const visibleParcels = React.useMemo(() => {
    if (selectedType === 'WAREHOUSE') {
      return parcels.filter((p) => p.current_warehouse_id === selectedId);
    }
    if (selectedType === 'TRUCK') {
      return parcels.filter((p) => p.current_truck_id === selectedId);
    }
    if (selectedType === 'PARCEL') {
      return parcels.filter((p) => p.id === selectedId);
    }
    return [];
  }, [parcels, selectedType, selectedId]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#07090e',
        zIndex: 0,
      }}
      onClick={() => clearSelection()}
    >
      <Canvas
        shadows
        camera={{ position: [0, 26, 30], fov: 45 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          <SceneEnvironment />
          <EffectPipeline />
          <SpatialGrid />

          {/* Logistics Routes */}
          {routes.map((route) => (
            <RouteArc key={route.id} route={route} />
          ))}

          {/* Warehouses */}
          {warehouses.map((warehouse) => (
            <WarehouseNode key={warehouse.id} warehouse={warehouse} />
          ))}

          {/* Intermodal Airports */}
          {airports.map((airport) => (
            <AirportNode key={airport.id} airport={airport} />
          ))}

          {/* Dynamic Trucks */}
          {trucks.map((truck) => (
            <TruckVehicle key={truck.id} truck={truck} />
          ))}

          {/* Active Incidents / Anomalies */}
          {incidents.map((incident) => {
            const wh = warehouses.find((w) => w.id === incident.warehouse_id);
            const pos: [number, number, number] = wh ? [wh.position[0], wh.position[1], wh.position[2]] : [0, 0, 0];
            return <IncidentMarker key={incident.id} incident={incident} position={pos} />;
          })}

          {/* Spatial Event Pulse Shockwaves */}
          <EventPulseSystem />

          {/* Hierarchical LOD Parcels */}
          {visibleParcels.map((parcel, idx) => {
            const wh = warehouses.find((w) => w.id === parcel.current_warehouse_id);
            const tr = trucks.find((t) => t.id === parcel.current_truck_id);
            const basePos: [number, number, number] = tr
              ? tr.position
              : wh
              ? wh.position
              : [0, 0, 0];

            const offsetPos: [number, number, number] = [
              basePos[0] + (idx % 3 - 1) * 0.35,
              basePos[1] + 0.3,
              basePos[2] + (Math.floor(idx / 3) - 1) * 0.35,
            ];

            return <ParcelMarker key={parcel.id} parcel={parcel} position={offsetPos} />;
          })}

          <CinematicCamera />
        </Suspense>
      </Canvas>
    </div>
  );
};
