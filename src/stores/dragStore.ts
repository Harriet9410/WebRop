import { create } from 'zustand';

export interface DragInfo {
  type: 'hrz' | 'hrp' | 'waypoint';
  zoneId?: string;
  vertexIndex: number;
  robotId?: string;
}

interface DragState {
  dragInfo: DragInfo | null;
  setDragInfo: (info: DragInfo | null) => void;
}

export const useDragStore = create<DragState>((set) => ({
  dragInfo: null,
  setDragInfo: (info) => set({ dragInfo: info }),
}));
