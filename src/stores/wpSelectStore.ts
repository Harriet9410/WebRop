import { create } from 'zustand';

interface WpSelectState {
  selectedRobotId: string | null;
  selectedWpId: string | null;
  selectWaypoint: (robotId: string | null, wpId: string | null) => void;
  clearSelection: () => void;
}

export const useWpSelectStore = create<WpSelectState>((set) => ({
  selectedRobotId: null,
  selectedWpId: null,
  selectWaypoint: (robotId, wpId) => set({ selectedRobotId: robotId, selectedWpId: wpId }),
  clearSelection: () => set({ selectedRobotId: null, selectedWpId: null }),
}));
