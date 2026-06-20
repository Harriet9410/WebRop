import { create } from 'zustand';
import { OccupancyGridData } from '../utils/mapRenderer';
import { mockRestoreGrid } from '../ros/mock';

const MAX_MAP_HISTORY = 60;

interface MapState {
  grid: OccupancyGridData | null;
  previousGrid: OccupancyGridData | null;
  overlayOpacity: number;
  skipPreviousOnSet: boolean;
  mapEditHistory: number[][];
  mapEditIndex: number;
  canMapUndo: boolean;
  canMapRedo: boolean;
  setGrid: (grid: OccupancyGridData) => void;
  setOverlayOpacity: (opacity: number) => void;
  clearPreviousGrid: () => void;
  setSkipPreviousOnSet: (v: boolean) => void;
  ensureMapEditInitial: () => void;
  pushMapEdit: () => void;
  mapUndo: () => void;
  mapRedo: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  grid: null,
  previousGrid: null,
  overlayOpacity: 0.5,
  skipPreviousOnSet: false,
  mapEditHistory: [],
  mapEditIndex: -1,
  canMapUndo: false,
  canMapRedo: false,

  setGrid: (grid) => {
    const current = get().grid;
    const skip = get().skipPreviousOnSet;
    set({
      grid,
      previousGrid: skip || !current ? get().previousGrid : { ...current, data: [...current.data] },
      skipPreviousOnSet: false,
    });
  },
  setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),
  clearPreviousGrid: () => set({ previousGrid: null }),
  setSkipPreviousOnSet: (skipPreviousOnSet) => set({ skipPreviousOnSet }),

  ensureMapEditInitial: () => {
    const grid = get().grid;
    if (!grid) return;
    if (get().mapEditHistory.length > 0) return;
    const data = [...grid.data];
    set({ mapEditHistory: [data], mapEditIndex: 0, canMapUndo: false, canMapRedo: false });
  },

  pushMapEdit: () => {
    const grid = get().grid;
    if (!grid) return;
    const data = [...grid.data];
    set((s) => {
      const newHistory = s.mapEditHistory.slice(0, s.mapEditIndex + 1);
      newHistory.push(data);
      if (newHistory.length > MAX_MAP_HISTORY) {
        newHistory.shift();
      }
      const newIndex = newHistory.length - 1;
      return {
        mapEditHistory: newHistory,
        mapEditIndex: newIndex,
        canMapUndo: newIndex > 0,
        canMapRedo: false,
      };
    });
  },

  mapUndo: () => {
    const { mapEditHistory, mapEditIndex } = get();
    if (mapEditIndex <= 0) return;
    const newIndex = mapEditIndex - 1;
    const data = mapEditHistory[newIndex];
    mockRestoreGrid(data);
    set({
      mapEditIndex: newIndex,
      canMapUndo: newIndex > 0,
      canMapRedo: true,
    });
  },

  mapRedo: () => {
    const { mapEditHistory, mapEditIndex } = get();
    if (mapEditIndex >= mapEditHistory.length - 1) return;
    const newIndex = mapEditIndex + 1;
    const data = mapEditHistory[newIndex];
    mockRestoreGrid(data);
    set({
      mapEditIndex: newIndex,
      canMapUndo: true,
      canMapRedo: newIndex < mapEditHistory.length - 1,
    });
  },
}));
