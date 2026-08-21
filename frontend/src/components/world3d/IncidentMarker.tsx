import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { IncidentEntity } from '../../domain/worldModel';
import { useUIStore } from '../../state/useUIStore';

interface IncidentMarkerProps {
  incident: IncidentEntity;
  position: [number, number, number];
}

export const IncidentMarker: React.FC<IncidentMarkerProps> = ({ incident, position }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const selectEntity = useUIStore((s) => s.selectEntity);
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const isSelected = selectedId === incident.id;

  const isResolved = incident.status === 'RESOLVED';
  const incidentTitle = (incident as any).incident_type || incident.type || 'Operational Disruption';

  // Dual pulse animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.25;
    if (ringRef.current && !isResolved) {
      const scale = 0.5 + (t * 0.5) % 0.4;
      ringRef.current.scale.set(scale, scale, 1);
    }
    if (ring2Ref.current && !isResolved) {
      const scale2 = 0.5 + ((t + 0.5) * 2) % 0.4;
      ring2Ref.current.scale.set(scale2, scale2, 1);
    }
  });

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity('INCIDENT', incident.id, position);
      }}
    >
      {/* Dynamic Laser Shockwaves */}
      {!isResolved && (
        <>
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
            <ringGeometry args={[2.5, 2.75, 32]} />
            <meshBasicMaterial color="#ff3366" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
            <ringGeometry args={[3.2, 3.4, 32]} />
            <meshBasicMaterial color="#ff3366" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {/* Floating Holographic Crystal */}
      <mesh position={[0, 5.2, 0]}>
        <octahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial
          color={isResolved ? '#10b981' : '#ff3366'}
          emissive={isResolved ? '#10b981' : '#ff3366'}
          emissiveIntensity={0.9}
          wireframe={!isResolved}
        />
      </mesh>

      {/* High-Tech Cyber Warning Tag (Positioned highest at Y=7.2 to avoid card overlaps) */}
      <Html
        position={[0, 7.2, 0]}
        center
        distanceFactor={28}
        zIndexRange={[220, 0]}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className="hud-incident-tag"
          style={{
            background: isResolved ? 'rgba(16, 185, 129, 0.95)' : 'rgba(255, 51, 102, 0.95)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '5px 12px',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: isResolved ? '0 0 20px rgba(16, 185, 129, 0.8)' : '0 0 25px rgba(255, 51, 102, 0.9)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span>{isResolved ? '✓' : '⚠'} {incident.id}</span>
          <span style={{ fontSize: '11px', opacity: 0.95, fontFamily: 'JetBrains Mono, monospace' }}>
            {incidentTitle} {isResolved && '(RESOLVED)'}
          </span>
        </div>
      </Html>
    </group>
  );
};

