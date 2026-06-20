import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface DroneModelProps {
  x: number;
  z: number;
  yaw: number;
  color?: string;
  isActive?: boolean;
}

export function DroneModel({ x, z, yaw, color, isActive }: DroneModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const prop1 = useRef<THREE.Group>(null);
  const prop2 = useRef<THREE.Group>(null);
  const prop3 = useRef<THREE.Group>(null);
  const prop4 = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z);
      groupRef.current.rotation.y = yaw;
    }
    const speed = isActive ? 15 : 3;
    [prop1, prop2, prop3, prop4].forEach((p) => {
      if (p.current) p.current.rotation.y += delta * speed;
    });
  });

  const bodyColor = isActive ? (color || '#42a5f5') : '#3a3a4a';
  const armLen = 0.15;
  const positions: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const propRefs = [prop1, prop2, prop3, prop4];

  return (
    <group ref={groupRef}>
      <Footprint footprintColor={color || '#42a5f5'} />
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.10, 0.04, 0.10]} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.265, -0.03]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.02, 0.015, 0.03]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.4} />
      </mesh>
      {positions.map(([px, pz], i) => (
        <group key={i}>
          <mesh position={[px * armLen * 0.5, 0.3, pz * armLen * 0.5]} castShadow>
            <boxGeometry args={[Math.abs(px) * armLen, 0.015, Math.abs(pz) * armLen]} />
            <meshStandardMaterial color="#2a2a3a" metalness={0.5} roughness={0.4} />
          </mesh>
          <group position={[px * armLen, 0.3, pz * armLen]}>
            <mesh position={[0, 0.015, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.01, 12]} />
              <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
            </mesh>
            <group ref={propRefs[i]} position={[0, 0.025, 0]}>
              <mesh rotation={[0, 0, 0]}>
                <boxGeometry args={[0.12, 0.003, 0.015]} />
                <meshStandardMaterial color={isActive ? '#8f8' : '#aaa'} transparent opacity={0.7} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[0.12, 0.003, 0.015]} />
                <meshStandardMaterial color={isActive ? '#8f8' : '#aaa'} transparent opacity={0.7} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
      <LEDs isActive={isActive} />
      <LandingGear />
      <CameraGimbal />
    </group>
  );
}

const ROBOT_RADIUS = 0.16;

function Footprint({ footprintColor = '#42a5f5' }: { footprintColor?: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <circleGeometry args={[ROBOT_RADIUS, 48]} />
      <meshBasicMaterial color={footprintColor} transparent opacity={0.15} side={2} depthWrite={false} />
    </mesh>
  );
}

function LEDs({ isActive }: { isActive?: boolean }) {
  return (
    <group>
      {[[-0.08, 0.3, 0.06], [0.08, 0.3, 0.06]].map(([lx, ly, lz], i) => (
        <mesh key={i} position={[lx, ly, lz]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial color={isActive ? '#4caf50' : '#f44336'} emissive={isActive ? '#4caf50' : '#f44336'} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function LandingGear() {
  const gearPositions: [number, number][] = [[-0.06, -0.08], [0.06, -0.08], [-0.06, 0.08], [0.06, 0.08]];
  return (
    <group>
      {gearPositions.map(([gx, gz], i) => (
        <group key={i}>
          <mesh position={[gx, 0.27, gz]}>
            <cylinderGeometry args={[0.004, 0.004, 0.08, 6]} />
            <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[gx, 0.23, gz]} rotation={[-Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CameraGimbal() {
  return (
    <group position={[0, 0.275, 0]}>
      <mesh>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.01, -0.015]}>
        <cylinderGeometry args={[0.008, 0.008, 0.008, 8]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}
