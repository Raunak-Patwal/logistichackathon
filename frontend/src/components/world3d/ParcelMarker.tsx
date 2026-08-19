import React from 'react';
import { Html } from '@react-three/drei';
import { ParcelEntity } from '../../domain/worldModel';
import { useUIStore } from '../../state/useUIStore';

interface ParcelMarkerProps {
  parcel: ParcelEntity;
  position: [number, number, number];
}

export const ParcelMarker: React.FC<ParcelMarkerProps> = ({ parcel, position }) => {
  const selectedId = useUIStore((s) => s.selectedEntityId);
  const selectEntity = useUIStore((s) => s.selectEntity);
  const isSelected = selectedId === parcel.id;

  let priorityColor = '#38bdf8';
  if (parcel.priority === 'CRITICAL_MEDICAL') priorityColor = '#ef4444';
  if (parcel.priority === 'COLD_CHAIN') priorityColor = '#06b6d4';
  if (parcel.priority === 'EXPRESS') priorityColor = '#f59e0b';

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity('PARCEL', parcel.id, position);
      }}
    >
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial
          color={priorityColor}
          emissive={priorityColor}
          emissiveIntensity={isSelected ? 0.8 : 0.4}
          roughness={0.2}
        />
      </mesh>

      {/* Mini Tag */}
      <Html position={[0, 0.45, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'rgba(7, 9, 14, 0.92)',
            border: `1px solid ${priorityColor}`,
            borderRadius: '3px',
            padding: '1px 4px',
            color: '#f8fafc',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '8px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {parcel.id} [{parcel.state}]
        </div>
      </Html>
    </group>
  );
};
