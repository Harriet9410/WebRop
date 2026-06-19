import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

export type ZoneType = 'forbidden' | 'slow' | 'charging';

export const ZONE_COLORS: Record<ZoneType, string> = {
  forbidden: '#e53935',
  slow: '#fdd835',
  charging: '#4caf50',
};

export const ZONE_SPEED: Record<ZoneType, number> = {
  forbidden: 0,
  slow: 0.2,
  charging: 0.1,
};

export interface HRZZone {
  id: string;
  vertices: Vec2[];
  zoneType: ZoneType;
}

interface HRZState {
  zones: HRZZone[];
  currentVertices: Vec2[];
  currentZoneType: ZoneType;
  isDrawing: boolean;
  addVertex: (v: Vec2) => void;
  closeZone: () => void;
  cancelDrawing: () => void;
  removeZone: (id: string) => void;
  setZoneType: (zoneId: string, zoneType: ZoneType) => void;
  setCurrentZoneType: (zoneType: ZoneType) => void;
  moveVertex: (zoneId: string, vertexIndex: number, newPos: Vec2) => void;
  loadZones: (zones: HRZZone[]) => void;
  clearAll: () => void;
}

let zoneCounter = 0;

export const useHRZStore = create<HRZState>((set, get) => ({
  zones: [],
  currentVertices: [],
  currentZoneType: 'forbidden',
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
    const { currentVertices, currentZoneType } = get();
    if (currentVertices.length < 3) return;
    const id = `zone-${++zoneCounter}-${Date.now()}`;
    set((s) => ({
      zones: [...s.zones, { id, vertices: [...currentVertices], zoneType: currentZoneType }],
      currentVertices: [],
      isDrawing: false,
    }));
  },

  cancelDrawing: () => set({ currentVertices: [], isDrawing: false }),

  removeZone: (id) =>
    set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),

  setZoneType: (zoneId, zoneType) =>
    set((s) => ({
      zones: s.zones.map((z) => z.id === zoneId ? { ...z, zoneType } : z),
    })),

  setCurrentZoneType: (zoneType) => set({ currentZoneType }),

  moveVertex: (zoneId, vertexIndex, newPos) =>
    set((s) => ({
      zones: s.zones.map((z) =>
        z.id === zoneId
          ? { ...z, vertices: z.vertices.map((v, i) => (i === vertexIndex ? newPos : v)) }
          : z
      ),
    })),

  loadZones: (zones) => set({ zones }),

  clearAll: () => set({ zones: [], currentVertices: [], isDrawing: false }),
}));
