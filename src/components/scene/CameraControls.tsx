import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useCameraStore } from '../../stores/cameraStore';
import { useRobotPoseStore } from '../../stores/robotPoseStore';

interface CameraControlsProps {
  mode: 'navigate' | 'hrz' | 'hrp' | 'mapedit';
  followRobot: boolean;
}

const lerpTarget = new THREE.Vector3();

export type CameraPreset = 'top' | 'side' | 'perspective' | null;

let pendingPreset: CameraPreset = null;

export function setCameraPreset(preset: CameraPreset) {
  pendingPreset = preset;
}

export function CameraControls({ mode, followRobot }: CameraControlsProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const appliedKey = useRef('');
  const snapshotApplied = useRef(false);
  const presetAnim = useRef<{ startPos: THREE.Vector3; endPos: THREE.Vector3; startTarget: THREE.Vector3; endTarget: THREE.Vector3; t: number } | null>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.mouseButtons = {
        LEFT: -1,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    }
  }, [mode]);

  useEffect(() => {
    const cam = useCameraStore.getState();
    if (controlsRef.current && !snapshotApplied.current) {
      camera.position.set(...cam.position);
      controlsRef.current.target.set(...cam.target);
      controlsRef.current.update();
      appliedKey.current = `${cam.position.join(',')}-${cam.target.join(',')}`;
      snapshotApplied.current = true;
    }
  }, [camera]);

  useEffect(() => {
    snapshotApplied.current = false;
  }, [useCameraStore.getState().position, useCameraStore.getState().target]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (pendingPreset && !presetAnim.current) {
      const t = controlsRef.current.target;
      let endPos: [number, number, number];
      let endTarget: [number, number, number];

      switch (pendingPreset) {
        case 'top':
          endPos = [t.x, 25, t.z + 0.01];
          endTarget = [t.x, 0, t.z];
          break;
        case 'side':
          endPos = [t.x, 5, t.z + 20];
          endTarget = [t.x, 0, t.z];
          break;
        case 'perspective':
          endPos = [t.x + 12, 12, t.z + 12];
          endTarget = [t.x, 0, t.z];
          break;
        default:
          endPos = [t.x, 15, t.z + 15];
          endTarget = [t.x, 0, t.z];
      }

      presetAnim.current = {
        startPos: camera.position.clone(),
        endPos: new THREE.Vector3(...endPos),
        startTarget: t.clone(),
        endTarget: new THREE.Vector3(...endTarget),
        t: 0,
      };
      pendingPreset = null;
    }

    if (presetAnim.current) {
      const anim = presetAnim.current;
      anim.t = Math.min(1, anim.t + delta * 2.5);
      const ease = 1 - Math.pow(1 - anim.t, 3);
      camera.position.lerpVectors(anim.startPos, anim.endPos, ease);
      controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, ease);
      controlsRef.current.update();
      if (anim.t >= 1) {
        presetAnim.current = null;
      }
      return;
    }

    if (followRobot) {
      const pose = useRobotPoseStore.getState().pose;
      lerpTarget.set(pose.x, 0, pose.z);
      controlsRef.current.target.lerp(lerpTarget, 0.05);
    }

    const t = controlsRef.current.target;
    const p = camera.position;
    const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}-${t.x.toFixed(2)},${t.y.toFixed(2)},${t.z.toFixed(2)}`;
    if (key !== appliedKey.current) {
      appliedKey.current = key;
      useCameraStore.getState().setPosition([p.x, p.y, p.z]);
      useCameraStore.getState().setTarget([t.x, t.y, t.z]);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={1}
      maxDistance={100}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}
