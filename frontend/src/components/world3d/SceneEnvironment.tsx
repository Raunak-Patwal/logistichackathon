import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
      {/* Restrained Atmospheric Lighting */}
      <ambientLight intensity={0.55} color="#e2e8f0" />
      <directionalLight
        position={[25, 40, 20]}
        intensity={1.2}
        color="#f8fafc"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-20, 15, -20]} intensity={0.4} color="#38bdf8" />
      
      {/* Soft Blue Operational Under-Glow */}
      <pointLight position={[0, -5, 0]} intensity={0.8} color="#0284c7" distance={40} />

      {/* Atmospheric Fog */}
      <fog attach="fog" args={['#07090e', 25, 75]} />

      {/* Background Star / Telemetry Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#38bdf8"
          opacity={0.35}
          transparent
          sizeAttenuation
        />
      </points>
    </>
  );
};
