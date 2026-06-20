import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useHRPStore } from '../../stores/hrpStore';

const PARTICLE_COUNT = 200;

export function PathParticles() {
  const path = useHRPStore((s) => s.path);
  const isDrawing = useHRPStore((s) => s.isDrawing);
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const alphas = useMemo(() => new Float32Array(PARTICLE_COUNT), []);
  const offsets = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) arr[i] = Math.random();
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || path.length < 2) return;
    timeRef.current += delta * (isDrawing ? 2.0 : 0.8);
    const t = timeRef.current;

    let totalLen = 0;
    const segLens: number[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const dx = path[i + 1].x - path[i].x;
      const dz = path[i + 1].z - path[i].z;
      const len = Math.sqrt(dx * dx + dz * dz);
      segLens.push(len);
      totalLen += len;
    }
    if (totalLen < 0.01) return;

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = pointsRef.current.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let frac = ((offsets[i] + t * 0.15) % 1);
      let targetDist = frac * totalLen;
      let accumulated = 0;
      let px = path[0].x, pz = path[0].z;
      for (let s = 0; s < segLens.length; s++) {
        if (accumulated + segLens[s] >= targetDist) {
          const localT = (targetDist - accumulated) / segLens[s];
          px = path[s].x + (path[s + 1].x - path[s].x) * localT;
          pz = path[s].z + (path[s + 1].z - path[s].z) * localT;
          break;
        }
        accumulated += segLens[s];
      }
      const height = 0.05 + Math.sin(frac * Math.PI * 4 + t * 3) * 0.08;
      posAttr.setXYZ(i, px, height, pz);
      const pulse = 0.5 + 0.5 * Math.sin(frac * Math.PI * 6 + t * 4);
      alphas[i] = isDrawing ? 0.3 + 0.7 * pulse : 0.15 + 0.3 * pulse;
      alphaAttr.setX(i, alphas[i]);
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  });

  if (path.length < 2) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-alpha" count={PARTICLE_COUNT} array={alphas} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        color={isDrawing ? '#66ffaa' : '#4caf50'}
        size={isDrawing ? 0.06 : 0.04}
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
