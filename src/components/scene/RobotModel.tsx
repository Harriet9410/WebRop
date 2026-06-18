import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RobotModelProps {
  x: number;
  z: number;
  yaw: number;
}

const BODY_COLOR = '#3a3a4a';
const BODY_TOP_COLOR = '#4a4a5a';
const WHEEL_COLOR = '#222222';
const WHEEL_RIM_COLOR = '#555555';
const SENSOR_COLOR = '#1a1a2e';
const LED_GREEN = '#4caf50';
const LED_RED = '#e53935';
const STRIP_COLOR = '#fdd835';
const LIDAR_COLOR = '#2a2a3a';
const SCREEN_COLOR = '#4fc3f7';

export function RobotModel({ x, z, yaw }: RobotModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lidarRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z);
      groupRef.current.rotation.y = yaw;
    }
    if (lidarRef.current) {
      lidarRef.current.rotation.y += delta * 3;
    }
  });

  return (
    <group ref={groupRef}>
      <Footprint />
      <Chassis />
      <Wheels />
      <TopPlate />
      <LidarGroup ref={lidarRef} />
      <Sensors />
      <LEDs />
      <FrontBumper />
    </group>
  );
}

const ROBOT_RADIUS = 0.16;

function Footprint() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <circleGeometry args={[ROBOT_RADIUS, 48]} />
      <meshBasicMaterial color="#42a5f5" transparent opacity={0.2} side={2} depthWrite={false} />
    </mesh>
  );
}

function Chassis() {
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.08, 0.48]} />
        <meshStandardMaterial color={BODY_COLOR} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.045, 0.02]} castShadow>
        <boxGeometry args={[0.38, 0.01, 0.42]} />
        <meshStandardMaterial color={BODY_TOP_COLOR} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.045, 0.02]}>
        <boxGeometry args={[0.40, 0.01, 0.44]} />
        <meshStandardMaterial color="#2a2a35" metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Wheels() {
  const wheelPositions: [number, number, number, boolean][] = [
    [-0.24, 0.07, 0.15, false],
    [-0.24, 0.07, -0.15, false],
    [0.24, 0.07, 0.15, true],
    [0.24, 0.07, -0.15, true],
  ];

  return (
    <group>
      {wheelPositions.map(([wx, wy, wz, isFront], i) => (
        <group key={i} position={[wx, wy, wz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 24]} />
            <meshStandardMaterial color={WHEEL_COLOR} metalness={0.3} roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[wx > 0 ? -0.015 : 0.015, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.015, 16]} />
            <meshStandardMaterial color={WHEEL_RIM_COLOR} metalness={0.7} roughness={0.3} />
          </mesh>
          {isFront && (
            <mesh rotation={[0, 0, Math.PI / 2]} position={[wx > 0 ? -0.025 : 0.025, 0, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.01, 8]} />
              <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function TopPlate() {
  return (
    <group position={[0, 0.16, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.36, 0.03, 0.40]} />
        <meshStandardMaterial color={BODY_TOP_COLOR} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.016, 0]}>
        <boxGeometry args={[0.34, 0.002, 0.38]} />
        <meshStandardMaterial color={BODY_TOP_COLOR} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.018, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 0.004]} />
        <meshStandardMaterial color={STRIP_COLOR} emissive={STRIP_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.004, 0.38]} />
        <meshStandardMaterial color={STRIP_COLOR} emissive={STRIP_COLOR} emissiveIntensity={0.3} />
      </mesh>
      <Screen />
    </group>
  );
}

function Screen() {
  return (
    <group position={[0, 0.04, -0.12]}>
      <mesh>
        <boxGeometry args={[0.10, 0.06, 0.01]} />
        <meshStandardMaterial color="#111" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[0.08, 0.045]} />
        <meshStandardMaterial
          color={SCREEN_COLOR}
          emissive={SCREEN_COLOR}
          emissiveIntensity={0.5}
          metalness={0.1}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

const LidarGroup = React.forwardRef<THREE.Group>(function LidarGroup(_, ref) {
  return (
    <group ref={ref} position={[0, 0.21, 0.08]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.03, 24]} />
        <meshStandardMaterial color={LIDAR_COLOR} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.018, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.006, 24]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 0.003, 24]} />
        <meshStandardMaterial
          color="#111"
          metalness={0.3}
          roughness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI * 2) / 6) * 0.04,
            0.015,
            Math.sin((i * Math.PI * 2) / 6) * 0.04,
          ]}
        >
          <boxGeometry args={[0.008, 0.008, 0.008]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
});

function Sensors() {
  return (
    <group>
      <mesh position={[0, 0.14, -0.21]}>
        <boxGeometry args={[0.08, 0.02, 0.01]} />
        <meshStandardMaterial color={SENSOR_COLOR} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[-0.14, 0.14, -0.18]}>
        <boxGeometry args={[0.01, 0.02, 0.06]} />
        <meshStandardMaterial color={SENSOR_COLOR} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0.14, 0.14, -0.18]}>
        <boxGeometry args={[0.01, 0.02, 0.06]} />
        <meshStandardMaterial color={SENSOR_COLOR} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.14, 0.21]}>
        <boxGeometry args={[0.06, 0.015, 0.01]} />
        <meshStandardMaterial color={SENSOR_COLOR} metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

function LEDs() {
  return (
    <group>
      <mesh position={[-0.10, 0.125, -0.245]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color={LED_GREEN} emissive={LED_GREEN} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.10, 0.125, -0.245]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color={LED_GREEN} emissive={LED_GREEN} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.10, 0.125, 0.245]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color={LED_RED} emissive={LED_RED} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.10, 0.125, 0.245]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color={LED_RED} emissive={LED_RED} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function FrontBumper() {
  return (
    <group position={[0, 0.06, -0.25]}>
      <mesh castShadow>
        <boxGeometry args={[0.46, 0.04, 0.02]} />
        <meshStandardMaterial color="#2a2a35" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[0.44, 0.015, 0.005]} />
        <meshStandardMaterial
          color={STRIP_COLOR}
          emissive={STRIP_COLOR}
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

import React from 'react';
