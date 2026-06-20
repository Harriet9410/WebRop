import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface HumanoidModelProps {
  x: number;
  z: number;
  yaw: number;
  color?: string;
  isActive?: boolean;
}

const SKIN_COLOR = '#e0c8a8';
const JOINT_COLOR = '#333';

export function HumanoidModel({ x, z, yaw, color, isActive }: HumanoidModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z);
      groupRef.current.rotation.y = yaw;
    }
  });

  const bodyColor = isActive ? (color || '#42a5f5') : '#3a3a4a';

  return (
    <group ref={groupRef}>
      <Footprint footprintColor={color || '#42a5f5'} />
      <Feet />
      <Legs bodyColor={bodyColor} />
      <Torso bodyColor={bodyColor} />
      <Arms bodyColor={bodyColor} />
      <Head />
      <Eyes isActive={isActive} />
      <Antenna />
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

function Feet() {
  return (
    <group>
      <mesh position={[-0.06, 0.015, 0.02]} castShadow>
        <boxGeometry args={[0.05, 0.03, 0.08]} />
        <meshStandardMaterial color="#222" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0.06, 0.015, 0.02]} castShadow>
        <boxGeometry args={[0.05, 0.03, 0.08]} />
        <meshStandardMaterial color="#222" metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Legs({ bodyColor }: { bodyColor: string }) {
  return (
    <group>
      {[[-0.06, 0.075, 0.02], [0.06, 0.075, 0.02]].map(([lx, ly, lz], i) => (
        <group key={i}>
          <mesh position={[lx, ly, lz]} castShadow>
            <boxGeometry args={[0.04, 0.09, 0.04]} />
            <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[lx, ly + 0.055, lz]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial color={JOINT_COLOR} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Torso({ bodyColor }: { bodyColor: string }) {
  return (
    <group position={[0, 0.17, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.14, 0.10]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.04, -0.051]}>
        <planeGeometry args={[0.14, 0.08]} />
        <meshStandardMaterial color="#4fc3f7" emissive="#4fc3f7" emissiveIntensity={0.4} metalness={0.1} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.01, -0.052]}>
        <planeGeometry args={[0.003, 0.12]} />
        <meshStandardMaterial color="#fdd835" emissive="#fdd835" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Arms({ bodyColor }: { bodyColor: string }) {
  return (
    <group>
      {[[-0.12, 0.19, 0], [0.12, 0.19, 0]].map(([ax, ay, az], i) => (
        <group key={i}>
          <mesh position={[ax, ay, az]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshStandardMaterial color={JOINT_COLOR} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[ax, ay - 0.06, az]} castShadow>
            <boxGeometry args={[0.035, 0.10, 0.035]} />
            <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[ax, ay - 0.115, az]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshStandardMaterial color={SKIN_COLOR} metalness={0.2} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Head() {
  return (
    <group position={[0, 0.29, 0]}>
      <mesh position={[0, 0.05, 0.01]} castShadow>
        <boxGeometry args={[0.12, 0.10, 0.10]} />
        <meshStandardMaterial color={SKIN_COLOR} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0.01]} castShadow>
        <boxGeometry args={[0.11, 0.09, 0.09]} />
        <meshStandardMaterial color={SKIN_COLOR} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.10, 0.01]}>
        <boxGeometry args={[0.13, 0.01, 0.11]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Eyes({ isActive }: { isActive?: boolean }) {
  const eyeColor = isActive ? '#4caf50' : '#888';
  return (
    <group position={[0, 0.31, -0.04]}>
      <mesh position={[-0.025, 0, 0]}>
        <sphereGeometry args={[0.012, 10, 10]} />
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={isActive ? 0.8 : 0.2} />
      </mesh>
      <mesh position={[0.025, 0, 0]}>
        <sphereGeometry args={[0.012, 10, 10]} />
        <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={isActive ? 0.8 : 0.2} />
      </mesh>
    </group>
  );
}

function Antenna() {
  return (
    <group position={[0, 0.39, 0.01]}>
      <mesh>
        <cylinderGeometry args={[0.003, 0.003, 0.06, 8]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}
