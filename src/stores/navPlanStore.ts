import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

interface NavPlanState {
  moveBasePlan: Vec2[];
  setMoveBasePlan: (path: Vec2[]) => void;
  clearMoveBasePlan: () => void;
  // 收到的 /hrp_path（来自 WebRop 自身 或 HoloLens2/Unity），用于在地图上叠显手绘路径
  hrpPath: Vec2[];
  setHrpPath: (path: Vec2[]) => void;
  clearHrpPath: () => void;
}

export const useNavPlanStore = create<NavPlanState>((set) => ({
  moveBasePlan: [],
  setMoveBasePlan: (path) => set({ moveBasePlan: path }),
  clearMoveBasePlan: () => set({ moveBasePlan: [] }),
  hrpPath: [],
  setHrpPath: (path) => set({ hrpPath: path }),
  clearHrpPath: () => set({ hrpPath: [] }),
}));
