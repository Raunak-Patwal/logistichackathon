import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useUIStore } from '../../state/useUIStore';

// Easily adjust default Overview Camera Angle here: [X, Y, Z]
export const OVERVIEW_POSITION: [number, number, number] = [0, 25, 35];
export const OVERVIEW_TARGET: [number, number, number] = [0, 0, 5];

export const CinematicCamera: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const cameraMode = useUIStore((s) => s.cameraMode);
  const cameraTarget = useUIStore((s) => s.cameraTarget);
  const cameraNonce = useUIStore((s) => s.cameraNonce);
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const isReplayingSignature = useUIStore((s) => s.isReplayingSignature);

  const desiredTarget = useRef(new THREE.Vector3(...OVERVIEW_TARGET));
  const desiredPosition = useRef(new THREE.Vector3(...OVERVIEW_POSITION));
  const isTransitioning = useRef<boolean>(false);

  useEffect(() => {
    if (cameraMode === 'NETWORK_OVERVIEW') {
      desiredTarget.current.set(...OVERVIEW_TARGET);
      desiredPosition.current.set(...OVERVIEW_POSITION);
    } else if (cameraMode === 'REGION_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 0.5, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 9.5, cameraTarget[1] + 11.5, cameraTarget[2] + 14.5);
    } else if (cameraMode === 'WAREHOUSE_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 1.0, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 5.2, cameraTarget[1] + 4.5, cameraTarget[2] + 7.5);
    } else if (cameraMode === 'TRUCK_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 0.4, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 3.2, cameraTarget[1] + 2.5, cameraTarget[2] + 4.8);
    } else if (cameraMode === 'PARCEL_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 0.2, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 1.6, cameraTarget[1] + 1.3, cameraTarget[2] + 2.2);
    } else if (cameraMode === 'INCIDENT_FOCUS') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 2.0, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 7.5, cameraTarget[1] + 7.5, cameraTarget[2] + 10.0);
    } else if (cameraMode === 'SIGNATURE_DIVE') {
      desiredTarget.current.set(cameraTarget[0], cameraTarget[1] + 0.3, cameraTarget[2]);
      desiredPosition.current.set(cameraTarget[0] + 2.8, cameraTarget[1] + 2.2, cameraTarget[2] + 3.8);
    }

    isTransitioning.current = true;
  }, [cameraMode, cameraTarget, cameraNonce, isReplayingSignature]);

  useFrame(() => {
    if (!controlsRef.current) return;

    if (isTransitioning.current) {
      const lerpFactor = reducedMotion ? 0.35 : isReplayingSignature ? 0.035 : 0.06;

      // Smoothly lerp orbit target
      controlsRef.current.target.lerp(desiredTarget.current, lerpFactor);

      // Smoothly lerp camera position
      camera.position.lerp(desiredPosition.current, lerpFactor);

      // Check if camera has arrived at destination
      const distPos = camera.position.distanceTo(desiredPosition.current);
      const distTarget = controlsRef.current.target.distanceTo(desiredTarget.current);

      if (distPos < 0.08 && distTarget < 0.08 && !isReplayingSignature) {
        isTransitioning.current = false;
      }
    }

    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={120}
      maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below ground plane
      onStart={() => {
        // User started manual navigation: stop automatic animation and stay exactly where user navigates
        isTransitioning.current = false;
      }}
    />
  );
};
