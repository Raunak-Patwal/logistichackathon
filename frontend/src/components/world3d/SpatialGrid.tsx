import React, { useRef } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export const SpatialGrid: React.FC = () => {
  const radarRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (radarRef.current) {
      radarRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group position={[0, -0.05, 0]}>
      {/* Primary Deep Cyber Grid Plane */}
      <gridHelper
        args={[100, 100, '#00f0ff', '#091833']}
        position={[0, 0, 0]}
      />

      {/* Rotating Holographic Radar Beam */}
      <group ref={radarRef} position={[0, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 35, 64, 1, 0, Math.PI / 6]} />
          <meshBasicMaterial
            color="#00f0ff"
            opacity={0.08}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
        <Line
          points={[[0, 0, 0], [35, 0, 0]]}
          color="#00f0ff"
          lineWidth={1.5}
          transparent
          opacity={0.4}
        />
      </group>

      {/* Concentric Tactical Range Rings with Neon Cyan glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[14.8, 15, 64]} />
        <meshBasicMaterial color="#00f0ff" opacity={0.25} transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[29.8, 30, 64]} />
        <meshBasicMaterial color="#00f0ff" opacity={0.15} transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[44.8, 45, 64]} />
        <meshBasicMaterial color="#00f0ff" opacity={0.08} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Tactical Crosshair Axis Lines */}
      <Line
        points={[[-50, 0.03, 0], [50, 0.03, 0]]}
        color="#00f0ff"
        lineWidth={1.5}
        transparent
        opacity={0.25}
      />
      <Line
        points={[[0, 0.03, -50], [0, 0.03, 50]]}
        color="#00f0ff"
        lineWidth={1.5}
        transparent
        opacity={0.25}
      />
    </group>
  );
};

