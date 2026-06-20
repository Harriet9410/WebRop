import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface DogModelProps {
  x: number;
  z: number;
  yaw: number;
  color?: string;
  isActive?: boolean;
}

export function DogModel({ x, z, yaw, color, isActive }: DogModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z);
      groupRef.current.rotation.y = yaw;
    }
  });

  const bodyColor = isActive ? (color || '#42a5f5') : '#3a3a4a';
  const legColor = '#2a2a3a';

  return (
    <group ref={groupRef}>
      <Footprint footprintColor={color || '#42a5f5'} />
      <Body bodyColor={bodyColor} />
      <Legs legColor={legColor} />
      <Head headColor={bodyColor} isActive={isActive} />
      <Tail bodyColor={bodyColor} />
      <Sensors isActive={isActive} />
    </group>
  );
}

const ROBOT_RADIUS = 0.16;

function Footprint({ footprintColor = '#42a5f5' }: { footprintColor?: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <circleGeometry args={[ROBOT_RADIUS, 48]} />
      <meshBasicMaterial color={footprintColor} transparent opacity={0.2} side={2} depthWrite={false} />
    </mesh>
  );
}

function Body({ bodyColor }: { bodyColor: string }) {
  return (
    <group position={[0, 0.12, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.12, 0.08, 0.28]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.042, 0]}>
        <boxGeometry args={[0.10, 0.005, 0.26]} />
        <meshStandardMaterial color="#4a4a5a" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.03, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.003, 0.22]} />
        <meshStandardMaterial color="#fdd835" emissive="#fdd835" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Legs({ legColor }: { legColor: string }) {
  const positions: [number, number][] = [
    [-0.08, -0.09],
    [0.08, -0.09],
    [-0.08, 0.09],
    [0.08, 0.09],
  ];

  return (
    <group>
      {positions.map(([lx, lz], i) => (
        <group key={i}>
          <mesh position={[lx, 0.09, lz]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color="#444" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[lx, 0.05, lz]} castShadow>
            <boxGeometry args={[0.025, 0.07, 0.025]} />
            <meshStandardMaterial color={legColor} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[lx, 0.012, lz]} castShadow>
            <boxGeometry args={[0.03, 0.02, 0.04]} />
            <meshStandardMaterial color="#222" metalness={0.4} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Head({ headColor, isActive }: { headColor: string; isActive?: boolean }) {
  return (
    <group position={[0, 0.15, -0.17]}>
      <mesh castShadow>
        <boxGeometry args={[0.10, 0.08, 0.08]} />
        <meshStandardMaterial color={headColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.015, -0.025]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.08, 0.03, 0.04]} />
        <meshStandardMaterial color={headColor} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-0.03, 0.02, -0.045]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshStandardMaterial color={isActive ? '#4caf50' : '#888'} emissive={isActive ? '#4caf50' : '#333'} emissiveIntensity={isActive ? 0.8 : 0.2} />
      </mesh>
      <mesh position={[0.03, 0.02, -0.045]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshStandardMaterial color={isActive ? '#4caf50' : '#888'} emissive={isActive ? '#4caf50' : '#333'} emissiveIntensity={isActive ? 0.8 : 0.2} />
      </mesh>
      <mesh position={[0, 0, -0.015]}>
        <sphereGeometry args={[0.006, 6, 6]} />
        <meshStandardMaterial color="#111" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Tail({ bodyColor }: { bodyColor: string }) {
  return (
    <group position={[0, 0.14, 0.15]} rotation={[-0.5, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.008, 0.012, 0.10, 8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.055, 0]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Sensors({ isActive }: { isActive?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.17, -0.02]}>
        <cylinderGeometry args={[0.025, 0.025, 0.015, 16]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.18, -0.02]}>
        <cylinderGeometry args={[0.02, 0.02, 0.005, 16]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      {([[-0.06, 0.16, 0.14], [0.06, 0.16, 0.14]] as [number, number, number][]).map(([sx, sy, sz], i) => (
        <mesh key={i} position={[sx, sy, sz]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial color={isActive ? '#4caf50' : '#f44336'} emissive={isActive ? '#4caf50' : '#f44336'} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}
