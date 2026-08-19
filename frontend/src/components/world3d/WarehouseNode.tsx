import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { WarehouseEntity } from '../../domain/worldModel';
import { useUIStore } from '../../state/useUIStore';

interface WarehouseNodeProps {
  warehouse: WarehouseEntity;
}

export const WarehouseNode: React.FC<WarehouseNodeProps> = ({ warehouse }) => {
  const meshRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const selectedId = useUIStore((s) => s.selectedEntityId);
  const highlightedEntityIds = useUIStore((s) => s.highlightedEntityIds);
  const selectEntity = useUIStore((s) => s.selectEntity);

  const isSelected = selectedId === warehouse.id;
  const isHighlighted = isSelected || highlightedEntityIds.includes(warehouse.id);
  const isDimmed = selectedId !== null && !isHighlighted;

  // Status-dependent palette
  let statusColor = '#00f0ff'; // Neon Cyan
  if (warehouse.status === 'DEGRADED_SCANNER') statusColor = '#f59e0b'; // Solar Amber
  if (warehouse.status === 'CRITICAL_CONGESTION') statusColor = '#ff3366'; // Laser Red
  if (warehouse.status === 'HIGH_VOLUME') statusColor = '#a855f7'; // Intelligence Violet

  const occupancyRatio = Math.min(1, warehouse.current_parcels_count / warehouse.capacity_parcels);

  // Subtle beacon pulse & rotating tactical ring
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconRef.current && !isDimmed) {
      beaconRef.current.scale.y = 1 + Math.sin(t * 3.5) * 0.15;
    }
    if (ringRef.current && !isDimmed) {
      ringRef.current.rotation.z += 0.015;
    }
  });

  return (
    <group
      ref={meshRef}
      position={warehouse.position}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity('WAREHOUSE', warehouse.id, warehouse.position);
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
      {/* Base Foundation Pad */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[2.4, 2.7, 0.12, 12]} />
        <meshStandardMaterial
          color="#060b18"
          roughness={0.4}
          metalness={0.9}
          transparent={isDimmed}
          opacity={isDimmed ? 0.25 : 1}
        />
      </mesh>

      {/* Rotating Cyber Outer Ring */}
      {!isDimmed && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[2.75, 2.9, 32]} />
          <meshBasicMaterial
            color={statusColor}
            opacity={isSelected ? 0.9 : hovered ? 0.6 : 0.25}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Main Architectural Hub Block */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[2.0, 1.3, 1.7]} />
        <meshStandardMaterial
          color={isHighlighted ? '#111d38' : '#080e1c'}
          emissive={statusColor}
          emissiveIntensity={isDimmed ? 0.02 : isSelected ? 0.55 : isHighlighted ? 0.35 : hovered ? 0.3 : 0.12}
          roughness={0.2}
          metalness={0.88}
          transparent={isDimmed}
          opacity={isDimmed ? 0.2 : 1}
        />
      </mesh>

      {/* Loading Dock Bays with Status LEDs */}
      <group position={[0, 0.25, 0.9]}>
        {[-0.6, -0.2, 0.2, 0.6].map((xOffset, idx) => {
          const isDockActive = idx < warehouse.active_docks_occupied;
          return (
            <group key={idx} position={[xOffset, 0, 0]}>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.3, 0.4, 0.08]} />
                <meshStandardMaterial color="#02040a" roughness={0.9} />
              </mesh>
              {!isDimmed && (
                <mesh position={[0, 0.24, 0.05]}>
                  <sphereGeometry args={[0.04, 8, 8]} />
                  <meshBasicMaterial color={isDockActive ? '#10b981' : '#334155'} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* Volumetric 3D Capacity Column */}
      <group position={[-0.7, 1.5, 0.5]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshStandardMaterial color="#1e293b" wireframe />
        </mesh>
        {!isDimmed && (
          <mesh position={[0, -0.4 + (occupancyRatio * 0.8) / 2, 0]}>
            <cylinderGeometry args={[0.07, 0.07, occupancyRatio * 0.8, 8]} />
            <meshBasicMaterial color={occupancyRatio > 0.85 ? '#ff3366' : occupancyRatio > 0.7 ? '#f59e0b' : '#00f0ff'} />
          </mesh>
        )}
      </group>

      {/* Roof Gantry & Landing Pad */}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[1.5, 0.12, 1.3]} />
        <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* Vertical Telemetry Light Beacon */}
      {!isDimmed && (
        <>
          <mesh ref={beaconRef} position={[0, 2.9, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2.8, 8]} />
            <meshBasicMaterial
              color={statusColor}
              transparent
              opacity={isSelected ? 0.95 : isHighlighted ? 0.8 : hovered ? 0.65 : 0.4}
            />
          </mesh>
          <mesh position={[0, 4.3, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={statusColor} />
          </mesh>
        </>
      )}

      {/* Persistent Floating Aerospace HUD Label */}
      <Html
        position={[0, 4.8, 0]}
        center
        distanceFactor={24}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(4, 7, 17, 0.88)',
            border: `1px solid ${isSelected ? '#00f0ff' : hovered ? 'rgba(0, 240, 255, 0.6)' : 'rgba(0, 240, 255, 0.25)'}`,
            borderRadius: '6px',
            padding: '5px 12px',
            color: '#f8fafc',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            boxShadow: isSelected ? '0 0 20px rgba(0, 240, 255, 0.4)' : '0 8px 30px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                display: 'inline-block',
                boxShadow: `0 0 8px ${statusColor}`,
              }}
            />
            <span style={{ fontWeight: 700, letterSpacing: '0.06em', fontSize: '13px' }}>
              {warehouse.code} • {warehouse.name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: occupancyRatio > 0.85 ? '#ff3366' : '#38bdf8' }}>
              LOAD: {(occupancyRatio * 100).toFixed(0)}%
            </span>
            <span>•</span>
            <span>DOCKS: {warehouse.active_docks_occupied}/{warehouse.dock_count}</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

