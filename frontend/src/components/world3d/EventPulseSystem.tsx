import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEventStore } from '../../state/useEventStore';
import { useWorldModelStore } from '../../state/useWorldModelStore';

export const EventPulseSystem: React.FC = () => {
  const activePulse = useEventStore((s) => s.activePulseEvent);
  const warehouses = useWorldModelStore((s) => s.warehouses);
  const trucks = useWorldModelStore((s) => s.trucks);

  const ringMeshRef = useRef<THREE.Mesh>(null);
  const particleGroupRef = useRef<THREE.Group>(null);

  // Position of active pulse
  let pulsePosition: [number, number, number] = [0, 0, 0];
  let pulseColor = '#38bdf8';

  if (activePulse) {
    if (activePulse.entity_type === 'WAREHOUSE') {
      const wh = warehouses.find((w) => w.id === activePulse.entity_id);
      if (wh) pulsePosition = wh.position;
    } else if (activePulse.entity_type === 'TRUCK') {
      const tr = trucks.find((t) => t.id === activePulse.entity_id);
      if (tr) pulsePosition = tr.position;
    } else if (activePulse.entity_type === 'PARCEL') {
      if (activePulse.payload.truck_id) {
        const tr = trucks.find((t) => t.id === activePulse.payload.truck_id);
        if (tr) pulsePosition = tr.position;
      } else if (activePulse.payload.warehouse_id) {
        const wh = warehouses.find((w) => w.id === activePulse.payload.warehouse_id);
        if (wh) pulsePosition = wh.position;
      }
    }

    if (activePulse.event_type === 'PARCEL_DELIVERED') pulseColor = '#10b981';
    if (activePulse.event_type === 'SCANNER_OFFLINE' || activePulse.event_type.includes('ALERT'))
      pulseColor = '#ef4444';
  }

  useFrame(({ clock }) => {
    if (ringMeshRef.current && activePulse) {
      const t = clock.getElapsedTime() * 3;
      const scale = 1 + (t % 2) * 2.5;
      ringMeshRef.current.scale.set(scale, scale, 1);

      const mat = ringMeshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, 0.8 - (t % 2) * 0.4);
      }
    }

    if (particleGroupRef.current && activePulse) {
      particleGroupRef.current.rotation.y += 0.04;
    }
  });

  if (!activePulse) return null;

  return (
    <group position={pulsePosition}>
      {/* Expanding Ground Shockwave Ring */}
      <mesh ref={ringMeshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[1.5, 1.8, 32]} />
        <meshBasicMaterial
          color={pulseColor}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbiting Telemetry Particles */}
      <group ref={particleGroupRef} position={[0, 1.2, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const angle = (i * Math.PI) / 2;
          const x = Math.cos(angle) * 1.2;
          const z = Math.sin(angle) * 1.2;
          return (
            <mesh key={i} position={[x, 0, z]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color={pulseColor} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};
