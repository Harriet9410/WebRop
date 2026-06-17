import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RobotModelProps {
  x: number;
  z: number;
  yaw: number;
}

export function RobotModel({ x, z, yaw }: RobotModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z);
      groupRef.current.rotation.y = yaw;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.3, 32]} />
        <meshStandardMaterial color="#4fc3f7" />
      </mesh>
      <mesh position={[0, 0.15, -0.18]}>
        <boxGeometry args={[0.06, 0.06, 0.12]} />
        <meshStandardMaterial color="#e53935" />
      </mesh>
    </group>
  );
}
