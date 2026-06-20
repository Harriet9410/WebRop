import * as THREE from 'three';
import { useMemo } from 'react';
import { Vec2 } from '../../utils/coordinate';
import { useDragStore } from '../../stores/dragStore';
import { ZoneType, ZONE_COLORS, ZONE_FILL_OPACITY, computeZoneCenter } from '../../stores/hrzStore';

interface HRZPolygonProps {
  vertices: Vec2[];
  zoneId?: string;
  zoneType?: ZoneType;
  name?: string;
  color?: string;
  opacity?: number;
  closed?: boolean;
}

export function HRZPolygon({ vertices, zoneId, zoneType, name, color, opacity, closed = true }: HRZPolygonProps) {
  const resolvedColor = color || (zoneType ? ZONE_COLORS[zoneType] : '#e53935');
  const resolvedOpacity = opacity ?? (zoneType ? ZONE_FILL_OPACITY[zoneType] : 0.3);

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

  const center = useMemo(() => computeZoneCenter(vertices), [vertices]);

  const labelTexture = useMemo(() => {
    if (!name && !zoneType) return null;
    const label = name || '';
    if (!label && !zoneType) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);
    const bgColor = zoneType ? ZONE_COLORS[zoneType] : '#888888';
    ctx.fillStyle = bgColor + 'cc';
    const text = label;
    ctx.font = 'bold 24px sans-serif';
    const tw = ctx.measureText(text).width;
    const pad = 12;
    const bw = Math.min(tw + pad * 2, 250);
    const bh = 36;
    const bx = (256 - bw) / 2;
    const by = (64 - bh) / 2;
    ctx.beginPath();
    ctx.moveTo(bx + 6, by);
    ctx.lineTo(bx + bw - 6, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 6);
    ctx.lineTo(bx + bw, by + bh - 6);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 6, by + bh);
    ctx.lineTo(bx + 6, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 6);
    ctx.lineTo(bx, by + 6);
    ctx.quadraticCurveTo(bx, by, bx + 6, by);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [name, zoneType]);

  return (
    <group>
      {closed && vertices.length >= 3 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <shapeGeometry args={[createShape(vertices)]} />
          <meshBasicMaterial color={resolvedColor} transparent opacity={resolvedOpacity} side={2} />
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
          <lineBasicMaterial color={resolvedColor} linewidth={2} />
        </line>
      )}
      {closed && labelTexture && (
        <sprite position={[center.x, 0.4, center.z]} scale={[1.2, 0.3, 1]}>
          <spriteMaterial map={labelTexture} transparent opacity={0.9} depthWrite={false} />
        </sprite>
      )}
      {vertices.map((v, i) => {
        const isDragged = dragInfo?.type === 'hrz' && dragInfo?.zoneId === zoneId && dragInfo?.vertexIndex === i;
        return (
          <mesh key={i} position={[v.x, isDragged ? 0.12 : 0.05, v.z]}>
            <sphereGeometry args={[i === 0 ? 0.12 : isDragged ? 0.14 : 0.08, 16, 16]} />
            <meshBasicMaterial color={isDragged ? '#ffffff' : i === 0 ? '#fdd835' : resolvedColor} />
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
