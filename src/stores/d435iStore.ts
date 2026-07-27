import { create } from 'zustand';

// D435i 深度相机状态（WebRop 侧）。
// - rgbImage: CompressedImage 解出的 data URL，直接喂 <img>。
// - cloudPositions: 已转 scene 坐标的点云 (x,y,z 交错)；count 为有效点数。
// - showPointcloud: 大地图点云开关（仿 scanStore.showScan 的 Laser Scan 勾选框）。
// - cameraConnected: 由 connection.ts 看门狗维护——任一帧 RGB/点云到达置 true，
//   3 秒(STALE_MS)没数据置 false。比 rosbridge 连接状态更准（rosbridge 连了不代表 D435i 在发）。
export const STALE_MS = 3000;
const MAX_POINTS = 20000; // 点数上限保护，防异常大点云撑爆内存/显卡

interface D435iState {
  rgbImage: string | null;
  cloudPositions: Float32Array; // 长度恒为 MAX_POINTS*3，多余部分不渲染（用 cloudCount 控制 drawRange）
  cloudCount: number;
  showPointcloud: boolean;
  cameraConnected: boolean;
  lastMsgTs: number;
  setRgb: (img: string | null) => void;
  setCloud: (positions: Float32Array, count: number) => void;
  setShowPointcloud: (show: boolean) => void;
  touch: () => void; // 收到任一帧 RGB/点云时调用
  setCameraConnected: (c: boolean) => void;
  clear: () => void;
}

export const useD435iStore = create<D435iState>((set) => ({
  rgbImage: null,
  cloudPositions: new Float32Array(MAX_POINTS * 3),
  cloudCount: 0,
  showPointcloud: false,
  cameraConnected: false,
  lastMsgTs: 0,
  setRgb: (rgbImage) => set({ rgbImage }),
  setCloud: (positions, count) =>
    set({ cloudPositions: positions, cloudCount: Math.min(count, MAX_POINTS) }),
  setShowPointcloud: (showPointcloud) => set({ showPointcloud }),
  touch: () => set({ lastMsgTs: Date.now(), cameraConnected: true }),
  setCameraConnected: (cameraConnected) => set({ cameraConnected }),
  clear: () => set({ rgbImage: null, cloudCount: 0, cameraConnected: false, lastMsgTs: 0 }),
}));

export const D435I_MAX_POINTS = MAX_POINTS;
