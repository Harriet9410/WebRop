import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

interface MeasureState {
  points: Vec2[];
  measuring: boolean;
  startMeasure: () => void;
  addPoint: (p: Vec2) => void;
  clearMeasure: () => void;
}

export const useMeasureStore = create<MeasureState>((set, get) => ({
  points: [],
  measuring: false,

  startMeasure: () => set({ measuring: true, points: [] }),

  addPoint: (p) => {
    const { points, measuring } = get();
    if (!measuring) return;
    const newPoints = [...points, p];
    if (newPoints.length >= 2) {
      set({ points: newPoints, measuring: false });
    } else {
      set({ points: newPoints });
    }
  },

  clearMeasure: () => set({ points: [], measuring: false }),
}));
