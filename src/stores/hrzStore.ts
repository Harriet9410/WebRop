import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

export interface HRZZone {
  id: string;
  vertices: Vec2[];
}

interface HRZState {
  zones: HRZZone[];
  currentVertices: Vec2[];
  isDrawing: boolean;
  addVertex: (v: Vec2) => void;
  closeZone: () => void;
  cancelDrawing: () => void;
  removeZone: (id: string) => void;
  loadZones: (zones: HRZZone[]) => void;
  clearAll: () => void;
}

let zoneCounter = 0;

export const useHRZStore = create<HRZState>((set, get) => ({
  zones: [],
  currentVertices: [],
  isDrawing: false,

  addVertex: (v) => {
    const { currentVertices, isDrawing } = get();
    if (!isDrawing) {
      set({ isDrawing: true, currentVertices: [v] });
      return;
    }
    const first = currentVertices[0];
    if (currentVertices.length >= 3 && first) {
      const dx = v.x - first.x;
      const dz = v.z - first.z;
      if (Math.sqrt(dx * dx + dz * dz) < 0.3) {
        get().closeZone();
        return;
      }
    }
    set({ currentVertices: [...currentVertices, v] });
  },

  closeZone: () => {
    const { currentVertices } = get();
    if (currentVertices.length < 3) return;
    const id = `zone-${++zoneCounter}-${Date.now()}`;
    set((s) => ({
      zones: [...s.zones, { id, vertices: [...currentVertices] }],
      currentVertices: [],
      isDrawing: false,
    }));
  },

  cancelDrawing: () => set({ currentVertices: [], isDrawing: false }),

  removeZone: (id) =>
    set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),

  loadZones: (zones) => set({ zones }),

  clearAll: () => set({ zones: [], currentVertices: [], isDrawing: false }),
}));
