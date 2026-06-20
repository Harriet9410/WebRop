import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

export type ZoneType = 'forbidden' | 'slow' | 'charging';

export const ZONE_COLORS: Record<ZoneType, string> = {
  forbidden: '#e53935',
  slow: '#fdd835',
  charging: '#4caf50',
};

export const ZONE_OUTLINE_COLORS: Record<ZoneType, string> = {
  forbidden: '#b71c1c',
  slow: '#f57f17',
  charging: '#1b5e20',
};

export const ZONE_SPEED: Record<ZoneType, number> = {
  forbidden: 0,
  slow: 0.2,
  charging: 0.1,
};

export const ZONE_BREATH_SPEED: Record<ZoneType, number> = {
  forbidden: 2.5,
  slow: 1.5,
  charging: 0.8,
};

export const ZONE_FILL_OPACITY: Record<ZoneType, number> = {
  forbidden: 0.35,
  slow: 0.2,
  charging: 0.25,
};

export const ZONE_COST_VALUE: Record<ZoneType, number> = {
  forbidden: 254,
  slow: 128,
  charging: 0,
};

export interface HRZZone {
  id: string;
  name?: string;
  vertices: Vec2[];
  zoneType: ZoneType;
}

export function computeZoneArea(vertices: Vec2[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].z;
    area -= vertices[j].x * vertices[i].z;
  }
  return Math.abs(area) / 2;
}

export function computeZoneCenter(vertices: Vec2[]): Vec2 {
  if (vertices.length === 0) return { x: 0, z: 0 };
  let cx = 0, cz = 0;
  for (const v of vertices) { cx += v.x; cz += v.z; }
  return { x: cx / vertices.length, z: cz / vertices.length };
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
  renameZone: (zoneId: string, name: string) => void;
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
    const { currentVertices, currentZoneType, zones } = get();
    if (currentVertices.length < 3) return;
    zoneCounter++;
    const id = `zone-${zoneCounter}-${Date.now()}`;
    const name = `Zone ${zones.length + 1}`;
    set((s) => ({
      zones: [...s.zones, { id, name, vertices: [...currentVertices], zoneType: currentZoneType }],
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

  renameZone: (zoneId, name) =>
    set((s) => ({
      zones: s.zones.map((z) => z.id === zoneId ? { ...z, name } : z),
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

  loadZones: (zones) => set({ zones: zones.map((z, i) => ({ ...z, name: z.name || `Zone ${i + 1}` })) }),

  clearAll: () => set({ zones: [], currentVertices: [], isDrawing: false }),
}));
