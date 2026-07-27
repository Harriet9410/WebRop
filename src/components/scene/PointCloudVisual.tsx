import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useD435iStore, D435I_MAX_POINTS } from '../../stores/d435iStore';

// 大地图点云渲染：订阅 EP 发来的 /d435i/cloud_map（已 map 帧，connection.ts 投到 scene）。
// 仿 LaserScanVisual 的写法：useFrame 读 store 刷 buffer；showPointcloud 关掉就隐藏。
// 点云已是世界坐标（不含机器人位姿），不像 LaserScan 需要每帧叠位姿，直接画即可。
// 颜色：白色（用户指定）。size 固定像素、不随距离衰减（和 LaserScan 一致）。
export function PointCloudVisual() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(D435I_MAX_POINTS * 3), []);

  useFrame(() => {
    const st = useD435iStore.getState();
    const geom = pointsRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (!st.showPointcloud || st.cloudCount === 0 || !geom || !pointsRef.current) {
      if (pointsRef.current) pointsRef.current.visible = false;
      return;
    }
    const n = Math.min(st.cloudCount, D435I_MAX_POINTS);
    // store 里 cloudPositions 长度可能 ≠ MAX_POINTS*3（来自解码的紧凑数组），按 n 拷贝
    positions.fill(0);
    positions.set(st.cloudPositions.subarray(0, n * 3));
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setDrawRange(0, n);
    geom.attributes.position.needsUpdate = true;
    pointsRef.current.visible = true;
  });

  return (
    <points ref={pointsRef} visible={false} renderOrder={997} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={0} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={4}
        transparent
        opacity={0.85}
        depthWrite={false}
        sizeAttenuation={false}
      />
    </points>
  );
}
