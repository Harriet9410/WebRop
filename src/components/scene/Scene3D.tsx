import { useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { MapFloor } from './MapFloor';
import { RobotModel } from './RobotModel';
import { CameraControls } from './CameraControls';
import { HRZEditor3D } from '../editor/HRZEditor3D';
import { HRPEditor3D } from '../editor/HRPEditor3D';
import type { AppMode } from '../ui/ModeSelector';
import { useHRZStore } from '../../stores/hrzStore';
import { useHRPStore } from '../../stores/hrpStore';
import { useRobotPoseStore } from '../../stores/robotPoseStore';
import { Vec2, dist } from '../../utils/coordinate';

function SceneEvents({ mode }: { mode: AppMode }) {
  const { gl, camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const lastPathPoint = useRef<Vec2 | null>(null);

  const getScenePoint = useCallback(
    (e: PointerEvent): Vec2 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hit = new THREE.Vector3();
      const result = raycaster.ray.intersectPlane(groundPlane, hit);
      if (!result) return null;
      return { x: hit.x, z: hit.z };
    },
    [gl, camera, raycaster, groundPlane]
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;

      const pt = getScenePoint(e);
      if (!pt) return;

      if (mode === 'hrz') {
        useHRZStore.getState().addVertex(pt);
      } else if (mode === 'hrp') {
        const store = useHRPStore.getState();
        store.startDrawing();
        store.addPoint(pt);
        lastPathPoint.current = pt;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (mode !== 'hrp') return;
      const store = useHRPStore.getState();
      if (!store.isDrawing) return;
      if (e.buttons !== 1) return;

      const pt = getScenePoint(e);
      if (!pt) return;
      if (lastPathPoint.current && dist(pt, lastPathPoint.current) < 0.1) return;
      store.addPoint(pt);
      lastPathPoint.current = pt;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (mode === 'hrp') {
        const store = useHRPStore.getState();
        if (store.isDrawing) store.finishDrawing();
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [mode, getScenePoint, gl]);

  return null;
}

export function Scene3D({ mode }: { mode: AppMode }) {
  const robotPose = useRobotPoseStore((s) => s.pose);

  return (
    <Canvas
      camera={{ position: [5, 15, 15], fov: 50, near: 0.1, far: 500 }}
      style={{ background: '#1a1a2e' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <MapFloor />
      <RobotModel x={robotPose.x} z={robotPose.z} yaw={robotPose.yaw} />
      <SceneEvents mode={mode} />
      {(mode === 'hrz') && <HRZEditor3D />}
      {(mode === 'hrp') && <HRPEditor3D robotX={robotPose.x} robotZ={robotPose.z} />}
      <CameraControls mode={mode} />
      <gridHelper args={[50, 50, '#555', '#333']} position={[5, 0, 5]} />
    </Canvas>
  );
}
