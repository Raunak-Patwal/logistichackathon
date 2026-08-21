import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TruckEntity } from '../../domain/worldModel';
import { useUIStore } from '../../state/useUIStore';
import { useWorldModelStore } from '../../state/useWorldModelStore';

interface TruckVehicleProps {
  truck: TruckEntity;
}

export const TruckVehicle: React.FC<TruckVehicleProps> = ({ truck }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const selectedId = useUIStore((s) => s.selectedEntityId);
  const highlightedEntityIds = useUIStore((s) => s.highlightedEntityIds);
  const selectEntity = useUIStore((s) => s.selectEntity);
  const routes = useWorldModelStore((s) => s.routes);

  const isSelected = selectedId === truck.id;
  const isHighlighted = isSelected || highlightedEntityIds.includes(truck.id);
  const isDimmed = selectedId !== null && !isHighlighted;

  let statusColor = '#00f0ff';
  if (truck.status === 'DELAYED') statusColor = '#ff3366';
  if (truck.status === 'LOADING') statusColor = '#f59e0b';
  if (truck.status === 'IDLE') statusColor = '#64748b';

  // Calculate heading rotation along route curve
  useFrame(() => {
    if (!groupRef.current) return;

    if (truck.status === 'IN_TRANSIT' && truck.current_route_id) {
      const route = routes.find((r) => r.id === truck.current_route_id);
      const points = route?.path_points || route?.waypoints;
      if (points && points.length >= 2) {
        const totalSegments = points.length - 1;
        const currentSeg = Math.min(Math.floor(truck.progress * totalSegments), totalSegments - 1);
        const nextSeg = Math.min(currentSeg + 1, totalSegments);
        const p1 = points[currentSeg];
        const p2 = points[nextSeg];

        const dirX = p2[0] - p1[0];
        const dirZ = p2[2] - p1[2];
        const angle = Math.atan2(dirX, dirZ);

        groupRef.current.rotation.y = angle;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={truck.position}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity('TRUCK', truck.id, truck.position);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Truck Chassis */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.7, 0.14, 1.6]} />
        <meshStandardMaterial
          color="#060b18"
          metalness={0.95}
          roughness={0.3}
          transparent={isDimmed}
          opacity={isDimmed ? 0.25 : 1}
        />
      </mesh>

      {/* Aerodynamic Cyber Freight Container with Clearcoat */}
      <mesh position={[0, 0.52, -0.25]}>
        <boxGeometry args={[0.65, 0.6, 1.0]} />
        <meshPhysicalMaterial
          color={isHighlighted ? '#132d5e' : '#0a1426'}
          emissive={statusColor}
          emissiveIntensity={isDimmed ? 0.01 : isSelected ? 0.75 : isHighlighted ? 0.5 : hovered ? 0.4 : 0.2}
          roughness={0.2}
          metalness={0.88}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
          transparent={isDimmed}
          opacity={isDimmed ? 0.2 : 1}
        />
      </mesh>

      {/* Driver Cab */}
      <mesh position={[0, 0.44, 0.5]}>
        <boxGeometry args={[0.6, 0.48, 0.42]} />
        <meshPhysicalMaterial
          color="#1e293b"
          metalness={0.92}
          roughness={0.15}
          clearcoat={0.7}
          clearcoatRoughness={0.1}
          transparent={isDimmed}
          opacity={isDimmed ? 0.25 : 1}
        />
      </mesh>

      {/* Windshield with Cyan Tint */}
      <mesh position={[0, 0.52, 0.72]}>
        <planeGeometry args={[0.52, 0.24]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={isDimmed ? 0.1 : 0.75} />
      </mesh>

      {/* Front Headlights with Glowing Cones */}
      {!isDimmed && (
        <>
          <mesh position={[-0.22, 0.26, 0.72]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#e0f2fe" />
          </mesh>
          <mesh position={[0.22, 0.26, 0.72]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#e0f2fe" />
          </mesh>

          {/* Rear Laser Taillights */}
          <mesh position={[-0.26, 0.26, -0.76]}>
            <boxGeometry args={[0.09, 0.04, 0.02]} />
            <meshBasicMaterial color="#ff3366" />
          </mesh>
          <mesh position={[0.26, 0.26, -0.76]}>
            <boxGeometry args={[0.09, 0.04, 0.02]} />
            <meshBasicMaterial color="#ff3366" />
          </mesh>

          {/* Roof Telemetry Beacon */}
          <mesh position={[0, 0.84, 0.5]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={statusColor} />
          </mesh>
        </>
      )}

      {/* Selection Glow Ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.1, 1.3, 32]} />
          <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating Tactical Vehicle HUD Tag */}
      <Html position={[0, 1.5, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'rgba(4, 7, 17, 0.9)',
            border: `1px solid ${statusColor}`,
            borderRadius: '5px',
            padding: '3px 8px',
            color: '#f8fafc',
            fontFamily: 'Rajdhani, monospace',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: `0 4px 18px rgba(0,0,0,0.85), 0 0 8px ${statusColor}44`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
            }}
          />
          <span>{truck.id}</span>
          <span style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}>
            {truck.speed_kmh} KM/H • {truck.status}
          </span>
        </div>
      </Html>
    </group>
  );
};

