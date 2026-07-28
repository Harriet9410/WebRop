import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useD435iStore, D435I_MAX_POINTS } from '../../stores/d435iStore';

// 大地图点云渲染：订阅 EP 发来的 /d435i/cloud_map（已 map 帧，connection.ts 投到 scene）。
// 仿 LaserScanVisual：useFrame 读 store 刷 buffer；showPointcloud 关掉就隐藏。
// H5 上色：有 rgb 时 vertexColors=true，点用真实彩色；无 rgb 时退回粉色（#ff69b4）。
// size 固定像素、不随距离衰减（和 LaserScan 一致）。
export function PointCloudVisual() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(D435I_MAX_POINTS * 3), []);
  const colors = useMemo(() => new Float32Array(D435I_MAX_POINTS * 3), []);
  const prevHadColors = useRef(false); // 跟踪材质是否需要切换（彩色↔粉色）

  useFrame(() => {
    const st = useD435iStore.getState();
    const geom = pointsRef.current?.geometry as THREE.BufferGeometry | undefined;
    const mat = pointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (!st.showPointcloud || st.cloudCount === 0 || !geom || !pointsRef.current) {
      if (pointsRef.current) pointsRef.current.visible = false;
      return;
    }
    const n = Math.min(st.cloudCount, D435I_MAX_POINTS);

    // 位置
    positions.fill(0);
    positions.set(st.cloudPositions.subarray(0, n * 3));
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setDrawRange(0, n);
    geom.attributes.position.needsUpdate = true;

    // H5 颜色
    const hasColors = st.cloudColors !== null && st.cloudColors.length >= n * 3;
    if (hasColors) {
      colors.fill(0);
      colors.set(st.cloudColors!.subarray(0, n * 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.attributes.color!.needsUpdate = true;
    } else {
      // 无颜色数据时移除 color 属性，退回单色材质
      if (geom.getAttribute('color')) geom.deleteAttribute('color');
    }

    // 仅在 彩色↔粉色 切换时更新材质（避免每帧 needsUpdate）
    if (mat && hasColors !== prevHadColors.current) {
      mat.vertexColors = hasColors;
      mat.color.setHex(hasColors ? 0xffffff : 0xff69b4); // 白底×顶点色=真实色；无顶点色用粉色
      mat.needsUpdate = true;
      prevHadColors.current = hasColors;
    }

    pointsRef.current.visible = true;
  });

  return (
    <points ref={pointsRef} visible={false} renderOrder={997} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={0} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#ff69b4"
        size={4}
        transparent
        opacity={0.85}
        depthWrite={false}
        sizeAttenuation={false}
      />
    </points>
  );
}
