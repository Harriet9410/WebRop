import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useScanStore } from '../../stores/scanStore';

const MAX_POINTS = 2000;

export function LaserScanVisual() {
  const points = useScanStore((s) => s.points);
  const robotX = useScanStore((s) => s.robotX);
  const robotZ = useScanStore((s) => s.robotZ);
  const showScan = useScanStore((s) => s.showScan);

  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const positions = useMemo(() => new Float32Array(MAX_POINTS * 3), []);
  const linePositions = useMemo(() => new Float32Array(MAX_POINTS * 2 * 3), []);
  const colors = useMemo(() => new Float32Array(MAX_POINTS * 3), []);

  useFrame(() => {
    if (!showScan || points.length === 0) {
      if (pointsRef.current) pointsRef.current.visible = false;
      if (linesRef.current) linesRef.current.visible = false;
      return;
    }

    const count = Math.min(points.length, MAX_POINTS);

    for (let i = 0; i < count; i++) {
      const p = points[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = 0.05;
      positions[i * 3 + 2] = p.z;

      const t = Math.min(p.range / 8.0, 1.0);
      colors[i * 3] = 1.0 - t * 0.5;
      colors[i * 3 + 1] = 0.3 + t * 0.5;
      colors[i * 3 + 2] = t;

      linePositions[i * 6] = robotX;
      linePositions[i * 6 + 1] = 0.05;
      linePositions[i * 6 + 2] = robotZ;
      linePositions[i * 6 + 3] = p.x;
      linePositions[i * 6 + 4] = 0.05;
      linePositions[i * 6 + 5] = p.z;
    }

    if (pointsRef.current) {
      const geom = pointsRef.current.geometry;
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.setDrawRange(0, count);
      geom.attributes.position.needsUpdate = true;
      geom.attributes.color.needsUpdate = true;
      pointsRef.current.visible = true;
    }

    if (linesRef.current) {
      const geom = linesRef.current.geometry;
      geom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      geom.setDrawRange(0, count * 2);
      geom.attributes.position.needsUpdate = true;
      linesRef.current.visible = true;
    }
  });

  return (
    <group>
      <points ref={pointsRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={0} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={0} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.06} vertexColors transparent opacity={0.9} depthWrite={false} sizeAttenuation />
      </points>
      <lineSegments ref={linesRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={0} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#00e5ff" transparent opacity={0.15} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
