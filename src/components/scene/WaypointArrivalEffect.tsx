import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useFleetStore } from '../../stores/fleetStore';

let rippleCounter = 0;
const activeRipples: { id: number; x: number; z: number; color: string; born: number }[] = [];

export function spawnRipple(x: number, z: number, color: string) {
  activeRipples.push({ id: ++rippleCounter, x, z, color, born: performance.now() / 1000 });
}

export function WaypointArrivalEffect() {
  const prevIdxRef = useRef<Record<string, number>>({});
  const [ripples, setRipples] = useState<typeof activeRipples>([]);

  useFrame(() => {
    const fleet = useFleetStore.getState();
    let changed = false;
    for (const r of fleet.robots) {
      const prev = prevIdxRef.current[r.id] ?? 0;
      if (r.navigating && r.currentWaypointIdx > prev && r.currentWaypointIdx > 0) {
        const wp = r.waypoints[r.currentWaypointIdx - 1];
        if (wp) { spawnRipple(wp.x, wp.z, r.color); changed = true; }
      }
      prevIdxRef.current[r.id] = r.currentWaypointIdx;
    }
    const now = performance.now() / 1000;
    const expired = activeRipples.filter(r => now - r.born < 2.0);
    if (changed || expired.length !== activeRipples.length) {
      activeRipples.length = 0;
      activeRipples.push(...expired);
      setRipples([...activeRipples]);
    }
  });

  return (
    <group>
      {ripples.map((r) => <Ripple key={r.id} x={r.x} z={r.z} color={r.color} born={r.born} />)}
    </group>
  );
}

function Ripple({ x, z, color, born }: { x: number; z: number; color: string; born: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ringRef.current) return;
    const t = (performance.now() / 1000 - born) / 1.5;
    if (t >= 1) return;
    const scale = 0.1 + t * 0.6;
    ringRef.current.scale.set(scale, scale, 1);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.6;
  });

  return (
    <mesh ref={ringRef} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={2} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}
