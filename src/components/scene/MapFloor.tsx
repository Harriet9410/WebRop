import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useMapStore } from '../../stores/mapStore';
import { renderMapToCanvas } from '../../utils/mapRenderer';

export function MapFloor() {
  const grid = useMapStore((s) => s.grid);
  const meshRef = useRef<THREE.Mesh>(null);
  const offlineCanvas = useMemo(() => document.createElement('canvas'), []);

  useEffect(() => {
    if (!grid) return;
    renderMapToCanvas(offlineCanvas, grid);
    if (meshRef.current) {
      const tex = new THREE.CanvasTexture(offlineCanvas);
      tex.flipY = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.NearestFilter;
      (meshRef.current.material as THREE.MeshBasicMaterial).map = tex;
      (meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
      const w = grid.width * grid.resolution;
      const h = grid.height * grid.resolution;
      meshRef.current.scale.set(w, h, 1);
      meshRef.current.position.set(w / 2, 0, h / 2);
    }
  }, [grid, offlineCanvas]);

  if (!grid) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.01, 5]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
    );
  }

  return (
    <>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
      <MapOverlay />
    </>
  );
}

function MapOverlay() {
  const previousGrid = useMapStore((s) => s.previousGrid);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const currentGrid = useMapStore((s) => s.grid);
  const meshRef = useRef<THREE.Mesh>(null);
  const offlineCanvas = useMemo(() => document.createElement('canvas'), []);

  useEffect(() => {
    if (!previousGrid || !currentGrid) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }
    renderMapToCanvas(offlineCanvas, previousGrid);
    if (meshRef.current) {
      const tex = new THREE.CanvasTexture(offlineCanvas);
      tex.flipY = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.NearestFilter;
      (meshRef.current.material as THREE.MeshBasicMaterial).map = tex;
      (meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
      const w = previousGrid.width * previousGrid.resolution;
      const h = previousGrid.height * previousGrid.resolution;
      meshRef.current.scale.set(w, h, 1);
      meshRef.current.position.set(w / 2, 0, h / 2);
      meshRef.current.visible = true;
    }
  }, [previousGrid, currentGrid, offlineCanvas]);

  useEffect(() => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = overlayOpacity;
    }
  }, [overlayOpacity]);

  if (!previousGrid) return null;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.003, 0]}
      visible={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={overlayOpacity} depthWrite={false} />
    </mesh>
  );
}
