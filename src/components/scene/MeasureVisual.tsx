import { useMemo } from 'react';
import * as THREE from 'three';
import { useMeasureStore } from '../../stores/measureStore';
import { dist } from '../../utils/coordinate';

function makeDistLabel(d: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${d.toFixed(2)}m`, 64, 16);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function MeasureVisual() {
  const points = useMeasureStore((s) => s.points);

  if (points.length < 2) return null;

  const p0 = points[0];
  const p1 = points[1];
  const d = dist(p0, p1);
  const midX = (p0.x + p1.x) / 2;
  const midZ = (p0.z + p1.z) / 2;
  const positions = useMemo(() => new Float32Array([p0.x, 0.06, p0.z, p1.x, 0.06, p1.z]), [p0, p1]);
  const texture = useMemo(() => makeDistLabel(d), [d]);

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineDashedMaterial color="#00e5ff" dashSize={0.2} gapSize={0.1} />
      </line>
      <sprite position={[midX, 0.2, midZ]} scale={[0.8, 0.2, 1]}>
        <spriteMaterial map={texture} transparent opacity={0.9} />
      </sprite>
      <mesh position={[p0.x, 0.06, p0.z]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh position={[p1.x, 0.06, p1.z]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
    </group>
  );
}
