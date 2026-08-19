import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AirportEntity } from '../../domain/worldModel';
import { useUIStore } from '../../state/useUIStore';

interface AirportNodeProps {
  airport: AirportEntity;
}

export const AirportNode: React.FC<AirportNodeProps> = ({ airport }) => {
  const radarRef = useRef<THREE.Mesh>(null);
  const dishRef = useRef<THREE.Group>(null);
  const selectEntity = useUIStore((s) => s.selectEntity);
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const highlightedEntityIds = useUIStore((s) => s.highlightedEntityIds);

  const isSelected = selectedId === airport.id;
  const isHighlighted = isSelected || highlightedEntityIds.includes(airport.id);
  const isDimmed = selectedId !== null && !isHighlighted;

  // Radar sweep rotation
  useFrame((_, delta) => {
    if (radarRef.current && !isDimmed) {
      radarRef.current.rotation.z += delta * 2.2;
    }
    if (dishRef.current && !isDimmed) {
      dishRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <group
      position={airport.position}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity('AIRPORT', airport.id, airport.position);
      }}
    >
      {/* Intersecting Dual Runway Platforms */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <planeGeometry args={[0.7, 3.8]} />
        <meshStandardMaterial
          color="#060b18"
          roughness={0.4}
          metalness={0.9}
          transparent={isDimmed}
          opacity={isDimmed ? 0.2 : 1}
        />
      </mesh>

      {/* Runway Centerline Neon Cyan Strobe Lights */}
      {!isDimmed && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <planeGeometry args={[0.06, 3.4]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.85} />
        </mesh>
      )}

      {/* Rotating Radar Range Ring */}
      {!isDimmed && (
        <mesh ref={radarRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color="#00f0ff" opacity={0.4} transparent side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Air Cargo Control Tower & Rotating Dish */}
      <group position={[0.9, 0.5, 0.9]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.25, 1.1, 8]} />
          <meshStandardMaterial
            color="#0f172a"
            metalness={0.9}
            roughness={0.2}
            transparent={isDimmed}
            opacity={isDimmed ? 0.2 : 1}
          />
        </mesh>
        {!isDimmed && (
          <group ref={dishRef} position={[0, 0.7, 0]}>
            <mesh rotation={[Math.PI / 4, 0, 0]}>
              <coneGeometry args={[0.2, 0.1, 8, 1, true]} />
              <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.8} />
            </mesh>
          </group>
        )}
      </group>

      {/* Floating Aerospace Badge */}
      {!isDimmed && (
        <Html position={[0, 2.7, 0]} center distanceFactor={22} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(4, 7, 17, 0.92)',
              border: `1px solid ${isSelected ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)'}`,
              borderRadius: '5px',
              padding: '3px 9px',
              color: '#00f0ff',
              fontFamily: 'Rajdhani, monospace',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              boxShadow: '0 4px 16px rgba(0,0,0,0.85), 0 0 10px rgba(0, 240, 255, 0.3)',
              backdropFilter: 'blur(12px)',
            }}
          >
            ✈ {airport.iata} AIR CARGO ({airport.cargo_throughput_tons_day} T/DAY)
          </div>
        </Html>
      )}
    </group>
  );
};

