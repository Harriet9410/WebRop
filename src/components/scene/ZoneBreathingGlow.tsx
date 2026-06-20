import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useHRZStore, ZONE_COLORS } from '../../stores/hrzStore';

export function ZoneBreathingGlow() {
  const zones = useHRZStore((s) => s.zones);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
  });

  if (zones.length === 0) return null;

  return (
    <group>
      {zones.map((zone) => {
        const color = ZONE_COLORS[zone.zoneType];
        return (
          <ZoneGlow
            key={zone.id}
            vertices={zone.vertices}
            color={color}
            timeRef={timeRef}
          />
        );
      })}
    </group>
  );
}

function ZoneGlow({ vertices, color, timeRef }: { vertices: { x: number; z: number }[]; color: string; timeRef: React.RefObject<number> }) {
  const lineRef = useRef<THREE.Line>(null);

  useFrame(() => {
    if (!lineRef.current) return;
    const t = timeRef.current;
    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2));
    (lineRef.current.material as THREE.LineBasicMaterial).opacity = pulse;
  });

  if (vertices.length < 3) return null;

  const pts = [...vertices, vertices[0]];
  const positions = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    positions[i * 3] = pts[i].x;
    positions[i * 3 + 1] = 0.03;
    positions[i * 3 + 2] = pts[i].z;
  }

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={pts.length} array={positions} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
    </line>
  );
}
