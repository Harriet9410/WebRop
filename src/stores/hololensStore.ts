import { create } from 'zustand';

export interface HololensPose {
  x: number;
  z: number;
  yaw: number;
  connected: boolean;
}

// 位置用仿射：alignedPos = Rot(rot)·rawPos + (tx,tz)；朝向：alignedYaw = rawYaw + dyaw
// rot/tx/tz 由两点校准直接量出（scene 空间，构造自洽，一次到位）；dyaw 由第一点拖拽量出。
export interface HololensOffset {
  tx: number;
  tz: number;
  rot: number;
  dyaw: number;
}

// 两点校准：第一点（press + 拖朝向）提交后暂存，等第二点。
export interface HololensCalibPoint1 {
  trueX: number;
  trueZ: number;
  rawX: number;
  rawZ: number;
  dyaw: number;
}

type Panel = 'robot' | 'hl2' | 'd435i';

interface HololensState {
  pose: HololensPose | null;
  offset: HololensOffset | null;
  calibrating: boolean;
  alignedPose: HololensPose | null;
  lastUpdate: number;
  panel: Panel;
  // 第一点拖拽时的预览位姿（press 点 = 位置，drag 方向 = 朝向）
  pendingPose: HololensPose | null;
  // 两点校准第一点（提交后等待第二点；为 null 表示在第一阶段或未校准）
  calibPoint1: HololensCalibPoint1 | null;
  setPose: (p: HololensPose) => void;
  setOffset: (o: HololensOffset) => void;
  setCalibrating: (c: boolean) => void;
  setPanel: (p: Panel) => void;
  setPendingPose: (p: HololensPose | null) => void;
  setCalibPoint1: (p: HololensCalibPoint1 | null) => void;
  clear: () => void;
  isHL2Connected: () => boolean;
}

function computeAligned(pose: HololensPose | null, offset: HololensOffset | null): HololensPose | null {
  if (!pose) return null;
  if (!offset) return pose;
  const c = Math.cos(offset.rot);
  const s = Math.sin(offset.rot);
  return {
    ...pose,
    x: c * pose.x - s * pose.z + offset.tx,
    z: s * pose.x + c * pose.z + offset.tz,
    yaw: pose.yaw + offset.dyaw,
  };
}

export const useHololensStore = create<HololensState>((set, get) => ({
  pose: null,
  offset: null,
  calibrating: false,
  alignedPose: null,
  lastUpdate: 0,
  panel: 'robot',
  pendingPose: null,
  calibPoint1: null,
  setPose: (pose) => set({ pose, alignedPose: computeAligned(pose, get().offset), lastUpdate: Date.now() }),
  setOffset: (offset) => set({ offset, alignedPose: computeAligned(get().pose, offset) }),
  setCalibrating: (calibrating) => set({ calibrating }),
  setPanel: (panel) => set({ panel }),
  setPendingPose: (pendingPose) => set({ pendingPose }),
  setCalibPoint1: (calibPoint1) => set({ calibPoint1 }),
  clear: () => set({ pose: null, offset: null, calibrating: false, alignedPose: null, lastUpdate: 0, pendingPose: null, calibPoint1: null }),
  isHL2Connected: () => {
    const { pose, lastUpdate } = get();
    if (!pose) return false;
    return Date.now() - lastUpdate < 3000;
  },
}));
