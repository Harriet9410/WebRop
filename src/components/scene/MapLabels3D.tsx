import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useLabelStore, MapLabel } from '../../stores/labelStore';

function makeTextTexture(text: string, fontSize: number, color: string, bgColor: string, padding: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const tw = Math.ceil(metrics.width) + padding * 2;
  const th = fontSize + padding * 2;
  canvas.width = tw;
  canvas.height = th;
  ctx.fillStyle = bgColor;
  const r = 4;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(tw - r, 0);
  ctx.quadraticCurveTo(tw, 0, tw, r);
  ctx.lineTo(tw, th - r);
  ctx.quadraticCurveTo(tw, th, tw - r, th);
  ctx.lineTo(r, th);
  ctx.quadraticCurveTo(0, th, 0, th - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tw / 2, th / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function Label3D({ label }: { label: MapLabel }) {
  const tex = useMemo(() => makeTextTexture(label.text, 20, '#ffffff', '#1e293bee', 6), [label.text]);
  const scaleX = 0.008;
  const scaleY = 0.008;
  const aspect = (tex.image?.width || 64) / (tex.image?.height || 24);

  return (
    <group position={[label.position.x, 0.1, label.position.z]}>
      <sprite position={[0, 0.3, 0]} scale={[aspect * scaleX * 100, scaleY * 100, 1]}>
        <spriteMaterial map={tex} transparent opacity={0.9} depthTest={false} />
      </sprite>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial color="#64748b" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

export function MapLabels3D() {
  const labels = useLabelStore((s) => s.labels);

  if (labels.length === 0) return null;

  return (
    <group>
      {labels.map((l) => (
        <Label3D key={l.id} label={l} />
      ))}
    </group>
  );
}
