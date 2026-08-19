import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useUIStore } from '../../state/useUIStore';

export const CinematicCamera: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const cameraMode = useUIStore((s) => s.cameraMode);
  const cameraTarget = useUIStore((s) => s.cameraTarget);
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const isReplayingSignature = useUIStore((s) => s.isReplayingSignature);

  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPosition = useRef(new THREE.Vector3(0, 26, 30));

  useEffect(() => {
    if (cameraMode === 'NETWORK_OVERVIEW') {
      desiredTarget.current.set(0, 0, 0);
      desiredPosition.current.set(0, 26, 30);
    } else if (cameraMode === 'REGION_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 0.5, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 8.0, cameraTarget[1] + 10.0, cameraTarget[2] + 12.0);
    } else if (cameraMode === 'WAREHOUSE_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 1.0, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 4.5, cameraTarget[1] + 3.8, cameraTarget[2] + 6.2);
    } else if (cameraMode === 'TRUCK_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 0.4, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 2.8, cameraTarget[1] + 2.2, cameraTarget[2] + 4.2);
    } else if (cameraMode === 'PARCEL_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 0.2, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 1.4, cameraTarget[1] + 1.1, cameraTarget[2] + 1.8);
    } else if (cameraMode === 'INCIDENT_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 2.0, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 6.0, cameraTarget[1] + 6.0, cameraTarget[2] + 8.0);
    } else if (cameraMode === 'SIGNATURE_DIVE') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 0.3, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 2.2, cameraTarget[1] + 1.8, cameraTarget[2] + 3.2);
    }
  }, [cameraMode, cameraTarget]);

  useFrame(({ clock }) => {
    if (!controlsRef.current) return;

    const lerpFactor = reducedMotion ? 0.35 : isReplayingSignature ? 0.035 : 0.055;

    // Subtle gentle ambient camera drift in overview mode
    if (cameraMode === 'NETWORK_OVERVIEW' && !reducedMotion) {
      const t = clock.getElapsedTime() * 0.05;
      desiredPosition.current.x = Math.sin(t) * 3.5;
    }

    // Smoothly lerp orbit target
    controlsRef.current.target.lerp(desiredTarget.current, lerpFactor);

    // Smoothly lerp camera position
    camera.position.lerp(desiredPosition.current, lerpFactor);

    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={70}
      maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below ground plane
    />
  );
};
