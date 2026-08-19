import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { RouteEntity } from '../../domain/worldModel';
import { useUIStore } from '../../state/useUIStore';

interface RouteArcProps {
  route: RouteEntity;
}

export const RouteArc: React.FC<RouteArcProps> = ({ route }) => {
  const pulseRef = useRef<THREE.Mesh>(null);
  const selectedRouteId = useUIStore((s) => s.highlightedRouteId);
  const selectedEntityId = useUIStore((s) => s.selectedEntityId);
  const highlightedEntityIds = useUIStore((s) => s.highlightedEntityIds);

  const isHighlighted =
    selectedRouteId === route.id ||
    highlightedEntityIds.includes(route.id) ||
    (highlightedEntityIds.includes(route.origin_id) && highlightedEntityIds.includes(route.destination_id));

  const isDimmed = selectedEntityId !== null && !isHighlighted;
  const hasActiveTrucks = route.active_truck_ids && route.active_truck_ids.length > 0;

  const points: [number, number, number][] = route.path_points || route.waypoints || [[0, 0, 0], [10, 0, 10]];

  // Create CatmullRom curve from control points
  const curve = useMemo(() => {
    const vectors = points.map((p: [number, number, number]) => new THREE.Vector3(...p));
    return new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.2);
  }, [points]);

  const curvePoints = useMemo(() => {
    const pts = curve.getPoints(50);
    return pts.map((p) => [p.x, p.y, p.z] as [number, number, number]);
  }, [curve]);

  // Color by risk & congestion
  let routeColor = '#00f0ff';
  if (route.risk_level === 'MEDIUM') routeColor = '#f59e0b';
  if (route.risk_level === 'HIGH') routeColor = '#ff3366';

  // Animate traveling energy pulse along route
  useFrame(({ clock }) => {
    if (pulseRef.current && (hasActiveTrucks || isHighlighted) && !isDimmed) {
      const speed = isHighlighted ? 0.45 : 0.25;
      const t = (clock.getElapsedTime() * speed) % 1;
      const point = curve.getPointAt(t);
      pulseRef.current.position.copy(point);
    }
  });

  return (
    <group>
      {/* Route Spline using Drei Line */}
      <Line
        points={curvePoints}
        color={isHighlighted ? '#00f0ff' : isDimmed ? '#0f172a' : routeColor}
        lineWidth={isHighlighted ? 4.0 : hasActiveTrucks ? 2.5 : 1.4}
        transparent
        opacity={isHighlighted ? 0.95 : isDimmed ? 0.08 : hasActiveTrucks ? 0.6 : 0.3}
      />

      {/* Directional Traveling Energy Pulse */}
      {(hasActiveTrucks || isHighlighted) && !isDimmed && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[isHighlighted ? 0.22 : 0.15, 12, 12]} />
          <meshBasicMaterial color={isHighlighted ? '#00f0ff' : routeColor} transparent opacity={0.95} />
        </mesh>
      )}
    </group>
  );
};

