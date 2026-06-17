import { create } from 'zustand';
import { OccupancyGridData } from '../utils/mapRenderer';

interface MapState {
  grid: OccupancyGridData | null;
  setGrid: (grid: OccupancyGridData) => void;
}

export const useMapStore = create<MapState>((set) => ({
  grid: null,
  setGrid: (grid) => set({ grid }),
}));
