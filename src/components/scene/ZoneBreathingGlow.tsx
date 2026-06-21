import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useHRZStore, ZONE_COLORS, ZONE_OUTLINE_COLORS, ZONE_BREATH_SPEED } from '../../stores/hrzStore';

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
        const outlineColor = ZONE_OUTLINE_COLORS[zone.zoneType];
        const breathSpeed = ZONE_BREATH_SPEED[zone.zoneType];
        return (
          <ZoneGlow
            key={zone.id}
            vertices={zone.vertices}
            color={color}
            outlineColor={outlineColor}
            breathSpeed={breathSpeed}
            timeRef={timeRef}
          />
        );
      })}
    </group>
  );
}

function ZoneGlow({ vertices, color, outlineColor, breathSpeed, timeRef }: {
  vertices: { x: number; z: number }[];
  color: string;
  outlineColor: string;
  breathSpeed: number;
  timeRef: React.RefObject<number>;
}) {
  const lineRef = useRef<any>(null);
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const t = timeRef.current;
    const sin = 0.5 + 0.5 * Math.sin(t * breathSpeed);
    const pulse = 0.3 + 0.7 * sin;
    if (lineRef.current) {
      (lineRef.current.material as THREE.LineBasicMaterial).opacity = pulse;
    }
    for (const mesh of dotRefs.current) {
      if (mesh) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = pulse * 0.7;
        const s = 0.8 + 0.4 * sin;
        mesh.scale.setScalar(s);
      }
    }
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
    <group>
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={pts.length} array={positions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={outlineColor} transparent opacity={0.5} depthWrite={false} />
      </line>
      {vertices.map((v, i) => (
        <mesh
          key={i}
          ref={(el) => { dotRefs.current[i] = el; }}
          position={[v.x, 0.06, v.z]}
        >
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
