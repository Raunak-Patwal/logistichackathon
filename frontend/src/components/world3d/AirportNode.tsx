import React, { useRef, useState } from 'react';
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
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

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
    if (ringRef.current && !isDimmed) {
      ringRef.current.rotation.z += delta * 0.8;
    }
  });

  return (
    <group
      position={airport.position}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity('AIRPORT', airport.id, airport.position);
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
      {/* Base Runway Apron Pad */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <planeGeometry args={[0.9, 4.2]} />
        <meshPhysicalMaterial
          color={isHighlighted ? '#0b1b36' : '#060b18'}
          roughness={0.3}
          metalness={0.9}
          clearcoat={0.4}
          transparent={isDimmed}
          opacity={isDimmed ? 0.2 : 1}
        />
      </mesh>

      {/* Runway Centerline Neon Cyan Strobe Lights */}
      {!isDimmed && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <planeGeometry args={[0.08, 3.8]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.85} />
        </mesh>
      )}

      {/* Rotating Cyber Outer Ring (Glows on Hover just like Warehouses & Trucks) */}
      {!isDimmed && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[2.3, 2.5, 32]} />
          <meshBasicMaterial
            color="#00f0ff"
            opacity={isSelected ? 0.95 : hovered ? 0.85 : 0.3}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Air Cargo Control Tower & Rotating Dish */}
      <group position={[0.9, 0.5, 0.9]}>
        {/* Main Shaft */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.25, 1.1, 8]} />
          <meshPhysicalMaterial
            color={isHighlighted ? '#13284c' : '#0f172a'}
            metalness={0.9}
            roughness={0.25}
            clearcoat={0.5}
            transparent={isDimmed}
            opacity={isDimmed ? 0.2 : 1}
          />
        </mesh>

        {/* Frosted Translucent Tower Window Ring */}
        {!isDimmed && (
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.18, 8]} />
            <meshPhysicalMaterial
              color="#00f0ff"
              emissive="#00f0ff"
              emissiveIntensity={0.5}
              transmission={0.9}
              roughness={0.15}
              thickness={0.5}
              transparent
              opacity={0.85}
            />
          </mesh>
        )}

        {!isDimmed && (
          <group ref={dishRef} position={[0, 0.75, 0]}>
            <mesh rotation={[Math.PI / 4, 0, 0]}>
              <coneGeometry args={[0.22, 0.1, 8, 1, true]} />
              <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.9} />
            </mesh>
          </group>
        )}
      </group>

      {/* Floating Aerospace Badge with Hover Glow */}
      {!isDimmed && (
        <Html
          position={[0, 4.2, 0]}
          center
          distanceFactor={28}
          zIndexRange={[140, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="hud-airport-badge"
            style={{
              background: 'rgba(4, 7, 17, 0.94)',
              border: `1px solid ${isSelected ? '#00f0ff' : hovered ? 'rgba(0, 240, 255, 0.9)' : 'rgba(0, 240, 255, 0.4)'}`,
              borderRadius: '6px',
              padding: '5px 12px',
              color: '#00f0ff',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              boxShadow: isSelected || hovered ? '0 0 24px rgba(0, 240, 255, 0.7)' : '0 4px 18px rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '14px' }}>✈</span>
            <span>{airport.iata} AIR CARGO</span>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
              ({airport.cargo_throughput_tons_day} T/DAY)
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};

