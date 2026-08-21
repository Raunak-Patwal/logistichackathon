import React from 'react';
import { EffectComposer, Bloom, Vignette, N8AO } from '@react-three/postprocessing';
import { useUIStore } from '../../state/useUIStore';

export const EffectPipeline: React.FC = () => {
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  if (reducedMotion) {
    return null;
  }

  const Composer = EffectComposer as unknown as React.ComponentType<any>;

  return (
    <Composer disableNormalPass multisampling={4}>
      {/* Screen-Space Ambient Occlusion to ground 3D objects onto grid plane */}
      <N8AO
        aoRadius={2.8}
        intensity={1.4}
        distanceFalloff={2.0}
        color="#040711"
      />

      {/* Subtle Selective Bloom for Glowing Vector Lines & Beacons */}
      <Bloom
        luminanceThreshold={0.8}
        luminanceSmoothing={0.2}
        intensity={0.4}
        mipmapBlur
      />

      {/* Subtle Vignette to frame the tactical view */}
      <Vignette eskil={false} offset={0.15} darkness={0.6} />
    </Composer>
  );
};
