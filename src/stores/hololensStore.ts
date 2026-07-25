import { create } from 'zustand';

export interface HololensPose {
  x: number;
  z: number;
  yaw: number;
  connected: boolean;
}

export interface HololensOffset {
  dx: number;
  dz: number;
  dyaw: number;
}

type Panel = 'robot' | 'hl2';

interface HololensState {
  pose: HololensPose | null;
  offset: HololensOffset | null;
  calibrating: boolean;
  alignedPose: HololensPose | null;
  lastUpdate: number;
  panel: Panel;
  setPose: (p: HololensPose) => void;
  setOffset: (o: HololensOffset) => void;
  setCalibrating: (c: boolean) => void;
  setPanel: (p: Panel) => void;
  clear: () => void;
  isHL2Connected: () => boolean;
}

function computeAligned(pose: HololensPose | null, offset: HololensOffset | null): HololensPose | null {
  if (!pose) return null;
  if (!offset) return pose;
  return {
    ...pose,
    x: pose.x + offset.dx,
    z: pose.z + offset.dz,
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
  setPose: (pose) => set({ pose, alignedPose: computeAligned(pose, get().offset), lastUpdate: Date.now() }),
  setOffset: (offset) => set({ offset, alignedPose: computeAligned(get().pose, offset) }),
  setCalibrating: (calibrating) => set({ calibrating }),
  setPanel: (panel) => set({ panel }),
  clear: () => set({ pose: null, offset: null, calibrating: false, alignedPose: null, lastUpdate: 0 }),
  isHL2Connected: () => {
    const { pose, lastUpdate } = get();
    if (!pose) return false;
    return Date.now() - lastUpdate < 3000;
  },
}));
