import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useHRPStore } from '../../stores/hrpStore';
import { dist } from '../../utils/coordinate';

interface HRPEditor3DProps {
  robotX: number;
  robotZ: number;
}

export function HRPEditor3D({ robotX, robotZ }: HRPEditor3DProps) {
  const path = useHRPStore((s) => s.path);
  const connectorRef = useRef<any>(null);
  const dashOffset = useRef(0);

  const linePositions = useMemo(() => {
    return new Float32Array(path.flatMap((p) => [p.x, 0.05, p.z]));
  }, [path]);

  const connectorPositions = useMemo(() => {
    if (path.length === 0) return null;
    const first = path[0];
    return new Float32Array([robotX, 0.05, robotZ, first.x, 0.05, first.z]);
  }, [path, robotX, robotZ]);

  const connectorColor = useMemo(() => {
    if (path.length === 0) return '#4caf50';
    const first = path[0];
    const d = dist({ x: robotX, z: robotZ }, { x: first.x, z: first.z });
    return d > 1 ? '#fdd835' : '#4caf50';
  }, [path, robotX, robotZ]);

  useFrame((_, delta) => {
    if (connectorRef.current) {
      const mat = connectorRef.current.material as THREE.LineDashedMaterial;
      if (mat.isLineDashedMaterial) {
        dashOffset.current -= delta * 0.5;
        (mat as any).dashOffset = dashOffset.current;
        mat.needsUpdate = true;
      }
      connectorRef.current.computeLineDistances();
    }
  });

  if (path.length === 0) return null;

  const geometryKey = path.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join('|');

  return (
    <group>
      {path.length >= 2 && (
        <line key={geometryKey}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={path.length}
              array={linePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4caf50" linewidth={3} />
        </line>
      )}
      {connectorPositions && (
        <line ref={connectorRef} key={`conn-${geometryKey}-${connectorColor}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={connectorPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineDashedMaterial
            color={connectorColor}
            dashSize={0.2}
            gapSize={0.1}
            linewidth={2}
          />
        </line>
      )}
      {path.map((p, i) => (
        <mesh key={i} position={[p.x, 0.05, p.z]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color={i === 0 ? '#4caf50' : '#81c784'} />
        </mesh>
      ))}
    </group>
  );
}
