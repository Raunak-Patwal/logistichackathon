import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

export const SceneEnvironment: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null);

  // Subtle floating background dust particles
  useFrame((_, delta) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.015;
    }
  });

  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 70;
    positions[i + 1] = Math.random() * 20 + 0.5;
    positions[i + 2] = (Math.random() - 0.5) * 70;
  }

  return (
    <>
      {/* High-Quality City Environment Map for Metallic & Glass Clearcoat Reflections */}
      <Environment preset="city" environmentIntensity={0.65} />

      {/* Atmospheric Operational Lighting */}
      <ambientLight intensity={0.4} color="#e2e8f0" />

      {/* Soft Directional Key Sunlight */}
      <directionalLight
        position={[35, 55, 30]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Strong Cyber Rim Backlight (Defines vehicle & building silhouettes) */}
      <directionalLight
        position={[-35, 30, -30]}
        intensity={2.2}
        color="#00f0ff"
      />

      {/* Warm Fill Accent Light */}
      <directionalLight position={[30, 20, -25]} intensity={0.8} color="#f59e0b" />

      {/* Ground Reflection Upward Glow */}
      <pointLight position={[0, -2, 0]} intensity={1.0} color="#0284c7" distance={60} />

      {/* High Visibility Distance Fog */}
      <fog attach="fog" args={['#050814', 85, 180]} />

      {/* Background Star / Telemetry Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          color="#00f0ff"
          opacity={0.45}
          transparent
          sizeAttenuation
        />
      </points>
    </>
  );
};
