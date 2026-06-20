import { create } from 'zustand';
import { OccupancyGridData } from '../utils/mapRenderer';

interface MapState {
  grid: OccupancyGridData | null;
  previousGrid: OccupancyGridData | null;
  overlayOpacity: number;
  setGrid: (grid: OccupancyGridData) => void;
  setOverlayOpacity: (opacity: number) => void;
  clearPreviousGrid: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  grid: null,
  previousGrid: null,
  overlayOpacity: 0.5,
  setGrid: (grid) => {
    const current = get().grid;
    set({
      grid,
      previousGrid: current ? { ...current, data: [...current.data] } : null,
    });
  },
  setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),
  clearPreviousGrid: () => set({ previousGrid: null }),
}));
