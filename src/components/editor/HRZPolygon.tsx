import * as THREE from 'three';
import { useMemo } from 'react';
import { Vec2 } from '../../utils/coordinate';
import { useDragStore } from '../../stores/dragStore';

interface HRZPolygonProps {
  vertices: Vec2[];
  zoneId?: string;
  color?: string;
  opacity?: number;
  closed?: boolean;
}

export function HRZPolygon({ vertices, zoneId, color = '#e53935', opacity = 0.3, closed = true }: HRZPolygonProps) {
  if (vertices.length === 0) return null;

  const linePositions = useMemo(() => {
    const pts = vertices.map((v) => [v.x, 0.02, v.z]);
    if (closed && vertices.length >= 3) {
      pts.push([vertices[0].x, 0.02, vertices[0].z]);
    }
    return new Float32Array(pts.flat());
  }, [vertices, closed]);

  const lineCount = closed && vertices.length >= 3 ? vertices.length + 1 : vertices.length;

  const geometryKey = vertices.map((v) => `${v.x.toFixed(2)},${v.z.toFixed(2)}`).join('|');

  const dragInfo = useDragStore((s) => s.dragInfo);

  return (
    <group>
      {closed && vertices.length >= 3 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <shapeGeometry args={[createShape(vertices)]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} side={2} />
        </mesh>
      )}
      {lineCount >= 2 && (
        <line key={geometryKey}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={lineCount}
              array={linePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} linewidth={2} />
        </line>
      )}
      {vertices.map((v, i) => {
        const isDragged = dragInfo?.type === 'hrz' && dragInfo?.zoneId === zoneId && dragInfo?.vertexIndex === i;
        return (
          <mesh key={i} position={[v.x, isDragged ? 0.12 : 0.05, v.z]}>
            <sphereGeometry args={[i === 0 ? 0.12 : isDragged ? 0.14 : 0.08, 16, 16]} />
            <meshBasicMaterial color={isDragged ? '#ffffff' : i === 0 ? '#fdd835' : color} />
          </mesh>
        );
      })}
    </group>
  );
}

function createShape(vertices: Vec2[]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(vertices[0].x, -vertices[0].z);
  for (let i = 1; i < vertices.length; i++) {
    shape.lineTo(vertices[i].x, -vertices[i].z);
  }
  shape.closePath();
  return shape;
}
