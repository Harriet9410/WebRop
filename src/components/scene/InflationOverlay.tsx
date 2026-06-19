import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useMapStore } from '../../stores/mapStore';
import { useInflationStore } from '../../stores/inflationStore';

const OCCUPIED = 254;
const ROBOT_RADIUS_CELLS = 8;

function computeInflationGrid(width: number, height: number, data: number[]): Uint8Array {
  const inflated = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (data[row * width + col] === OCCUPIED) {
        inflated[row * width + col] = 2;
      }
    }
  }
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (inflated[row * width + col] === 2) continue;
      let hit = false;
      for (let dr = -ROBOT_RADIUS_CELLS; dr <= ROBOT_RADIUS_CELLS && !hit; dr++) {
        for (let dc = -ROBOT_RADIUS_CELLS; dc <= ROBOT_RADIUS_CELLS && !hit; dc++) {
          if (dr * dr + dc * dc > ROBOT_RADIUS_CELLS * ROBOT_RADIUS_CELLS) continue;
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || r >= height || c < 0 || c >= width) { hit = true; break; }
          if (data[r * width + c] === OCCUPIED) hit = true;
        }
      }
      if (hit) inflated[row * width + col] = 1;
    }
  }
  return inflated;
}

function renderInflationCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  inflated: Uint8Array
): void {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imgData = ctx.createImageData(width, height);
  for (let i = 0; i < inflated.length; i++) {
    const v = inflated[i];
    const srcRow = Math.floor(i / width);
    const srcCol = i % width;
    const dstRow = height - 1 - srcRow;
    const dstIdx = dstRow * width + srcCol;
    if (v === 2) {
      imgData.data[dstIdx * 4] = 200;
      imgData.data[dstIdx * 4 + 1] = 0;
      imgData.data[dstIdx * 4 + 2] = 0;
      imgData.data[dstIdx * 4 + 3] = 180;
    } else if (v === 1) {
      imgData.data[dstIdx * 4] = 255;
      imgData.data[dstIdx * 4 + 1] = 140;
      imgData.data[dstIdx * 4 + 2] = 0;
      imgData.data[dstIdx * 4 + 3] = 100;
    } else {
      imgData.data[dstIdx * 4] = 0;
      imgData.data[dstIdx * 4 + 1] = 0;
      imgData.data[dstIdx * 4 + 2] = 0;
      imgData.data[dstIdx * 4 + 3] = 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

export function InflationOverlay() {
  const show = useInflationStore((s) => s.showInflation);
  const grid = useMapStore((s) => s.grid);
  const meshRef = useRef<THREE.Mesh>(null);
  const offlineCanvas = useMemo(() => document.createElement('canvas'), []);

  useEffect(() => {
    if (!show || !grid) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }
    const inflated = computeInflationGrid(grid.width, grid.height, grid.data);
    renderInflationCanvas(offlineCanvas, grid.width, grid.height, inflated);
    if (meshRef.current) {
      const tex = new THREE.CanvasTexture(offlineCanvas);
      tex.flipY = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.NearestFilter;
      (meshRef.current.material as THREE.MeshBasicMaterial).map = tex;
      (meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
      (meshRef.current.material as THREE.MeshBasicMaterial).transparent = true;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5;
      const w = grid.width * grid.resolution;
      const h = grid.height * grid.resolution;
      meshRef.current.scale.set(w, h, 1);
      meshRef.current.position.set(w / 2, 0, h / 2);
      meshRef.current.visible = true;
    }
  }, [show, grid, offlineCanvas]);

  if (!grid) return null;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005, 0]}
      visible={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}
