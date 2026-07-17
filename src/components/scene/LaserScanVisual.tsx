import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useScanStore } from '../../stores/scanStore';
import { useFleetStore } from '../../stores/fleetStore';

const MAX_POINTS = 2000;

export function LaserScanVisual() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const positions = useMemo(() => new Float32Array(MAX_POINTS * 3), []);
  const linePositions = useMemo(() => new Float32Array(MAX_POINTS * 2 * 3), []);
  const colors = useMemo(() => new Float32Array(MAX_POINTS * 3), []);

  // 每帧用「实时机器人位姿 + 原始 scan」重算点位：地图加载/重定位导致位姿跳变时，
  // 激光始终贴着当前机器人，不会冻在旧坐标而"消失"。
  useFrame(() => {
    const scan = useScanStore.getState();
    if (!scan.showScan || scan.ranges.length === 0) {
      if (pointsRef.current) pointsRef.current.visible = false;
      if (linesRef.current) linesRef.current.visible = false;
      return;
    }

    const bot = useFleetStore.getState().getActiveRobot();
    if (!bot) {
      if (pointsRef.current) pointsRef.current.visible = false;
      if (linesRef.current) linesRef.current.visible = false;
      return;
    }

    const robotX = bot.pose.x;
    const robotZ = bot.pose.z;
    const robotYaw = bot.pose.yaw;
    const { ranges, angleMin, angleInc, rangeMin, rangeMax } = scan;

    const cosY = Math.cos(robotYaw - Math.PI / 2);
    const sinY = Math.sin(robotYaw - Math.PI / 2);

    let count = 0;
    for (let i = 0; i < ranges.length && count < MAX_POINTS; i++) {
      const range = ranges[i];
      if (!isFinite(range) || range < rangeMin || range > rangeMax) continue;
      const angle = angleMin + i * angleInc;
      const sceneDx = range * Math.cos(angle);
      const sceneDz = -range * Math.sin(angle);
      const px = robotX + sceneDx * cosY - sceneDz * sinY;
      const pz = robotZ + sceneDx * sinY + sceneDz * cosY;

      positions[count * 3] = px;
      positions[count * 3 + 1] = 0.18;
      positions[count * 3 + 2] = pz;

      const t = Math.min(range / 8.0, 1.0);
      colors[count * 3] = 1.0 - t * 0.5;
      colors[count * 3 + 1] = 0.3 + t * 0.5;
      colors[count * 3 + 2] = t;

      linePositions[count * 6] = robotX;
      linePositions[count * 6 + 1] = 0.18;
      linePositions[count * 6 + 2] = robotZ;
      linePositions[count * 6 + 3] = px;
      linePositions[count * 6 + 4] = 0.18;
      linePositions[count * 6 + 5] = pz;
      count++;
    }

    if (count === 0) {
      if (pointsRef.current) pointsRef.current.visible = false;
      if (linesRef.current) linesRef.current.visible = false;
      return;
    }

    if (pointsRef.current) {
      const geom = pointsRef.current.geometry;
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.setDrawRange(0, count);
      geom.attributes.position.needsUpdate = true;
      geom.attributes.color.needsUpdate = true;
      pointsRef.current.visible = true;
    }

    if (linesRef.current) {
      const geom = linesRef.current.geometry;
      geom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      geom.setDrawRange(0, count * 2);
      geom.attributes.position.needsUpdate = true;
      linesRef.current.visible = true;
    }
  });

  return (
    <group>
      <points ref={pointsRef} visible={false} renderOrder={999} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={0} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={0} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={10} vertexColors transparent opacity={0.95} depthWrite={false} depthTest={false} sizeAttenuation={false} />
      </points>
      <lineSegments ref={linesRef} visible={false} renderOrder={998} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={0} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#00e5ff" transparent opacity={0.5} depthWrite={false} depthTest={false} />
      </lineSegments>
    </group>
  );
}
