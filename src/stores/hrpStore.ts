import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

interface HRPState {
  path: Vec2[];
  isDrawing: boolean;
  startDrawing: () => void;
  addPoint: (p: Vec2) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  loadPath: (path: Vec2[]) => void;
  clearPath: () => void;
}

export const useHRPStore = create<HRPState>((set) => ({
  path: [],
  isDrawing: false,

  startDrawing: () => set({ isDrawing: true, path: [] }),

  addPoint: (p) =>
    set((s) => {
      if (!s.isDrawing) return s;
      return { path: [...s.path, p] };
    }),

  finishDrawing: () => set({ isDrawing: false }),

  cancelDrawing: () => set({ isDrawing: false, path: [] }),

  loadPath: (path) => set({ path }),

  clearPath: () => set({ path: [], isDrawing: false }),
}));
