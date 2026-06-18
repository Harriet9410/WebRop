import { create } from 'zustand';

export interface DragInfo {
  type: 'hrz' | 'hrp';
  zoneId?: string;
  vertexIndex: number;
}

interface DragState {
  dragInfo: DragInfo | null;
  setDragInfo: (info: DragInfo | null) => void;
}

export const useDragStore = create<DragState>((set) => ({
  dragInfo: null,
  setDragInfo: (info) => set({ dragInfo: info }),
}));
