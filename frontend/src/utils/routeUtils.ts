import * as THREE from 'three';

// Cache generated curves for high performance
const curveCache = new Map<string, THREE.CatmullRomCurve3>();

export function getRouteCurve(points: [number, number, number][]): THREE.CatmullRomCurve3 {
  const key = JSON.stringify(points);
  if (curveCache.has(key)) {
    return curveCache.get(key)!;
  }
  const vectors = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.2);
  curveCache.set(key, curve);
  return curve;
}

export function getRoutePositionAndTangent(
  points: [number, number, number][],
  progress: number
): { position: [number, number, number]; angle: number } {
  if (!points || points.length < 2) {
    return { position: [0, 0, 0], angle: 0 };
  }

  const curve = getRouteCurve(points);
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  const pt = curve.getPointAt(clampedProgress);
  const tangent = curve.getTangentAt(clampedProgress);
  
  // Calculate orientation angle along XZ ground plane
  const angle = Math.atan2(tangent.x, tangent.z);

  return {
    position: [pt.x, pt.y + 0.15, pt.z], // slight lift above asphalt
    angle,
  };
}
