import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

interface CameraControlsProps {
  mode: 'navigate' | 'hrz' | 'hrp';
}

export function CameraControls({ mode }: CameraControlsProps) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.mouseButtons = {
        LEFT: -1,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    }
  }, [mode]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={1}
      maxDistance={100}
      maxPolarAngle={Math.PI / 2.1}
      target={[5, 0, 5]}
    />
  );
}
