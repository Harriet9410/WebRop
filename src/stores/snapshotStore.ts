import { create } from 'zustand';
import { useHRZStore, HRZZone, ZoneType } from './hrzStore';
import { useHRPStore, SegmentSpeed } from './hrpStore';
import { useLabelStore, MapLabel } from './labelStore';
import { Vec2 } from '../utils/coordinate';

export interface SceneSnapshot {
  id: string;
  name: string;
  timestamp: number;
  hrzZones: HRZZone[];
  hrpPath: Vec2[];
  hrpSpeeds: SegmentSpeed[];
  labels: MapLabel[];
  camera: { px: number; py: number; pz: number; tx: number; ty: number; tz: number };
}

const STORAGE_KEY = 'mrrep-snapshots';

function loadSnapshots(): SceneSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: SceneSnapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch {}
}

interface SnapshotState {
  snapshots: SceneSnapshot[];
  saveSnapshot: (name: string, camera: SceneSnapshot['camera']) => void;
  loadSnapshot: (id: string) => SceneSnapshot | null;
  deleteSnapshot: (id: string) => void;
}

let snapshotCounter = 0;

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  snapshots: loadSnapshots(),

  saveSnapshot: (name, camera) => {
    const hrz = useHRZStore.getState();
    const hrp = useHRPStore.getState();
    const lbl = useLabelStore.getState();
    const snap: SceneSnapshot = {
      id: `snap-${++snapshotCounter}-${Date.now()}`,
      name,
      timestamp: Date.now(),
      hrzZones: hrz.zones.map((z) => ({ ...z, vertices: [...z.vertices] })),
      hrpPath: [...hrp.path],
      hrpSpeeds: [...hrp.segmentSpeeds],
      labels: [...lbl.labels],
      camera,
    };
    const newSnapshots = [...get().snapshots, snap];
    saveSnapshots(newSnapshots);
    set({ snapshots: newSnapshots });
  },

  loadSnapshot: (id) => {
    const snap = get().snapshots.find((s) => s.id === id);
    if (!snap) return null;
    useHRZStore.getState().loadZones(snap.hrzZones);
    useHRPStore.getState().loadPath(snap.hrpPath);
    useHRPStore.setState({ segmentSpeeds: snap.hrpSpeeds });
    if (snap.labels) useLabelStore.getState().loadLabels(snap.labels);
    return snap;
  },

  deleteSnapshot: (id) => {
    const newSnapshots = get().snapshots.filter((s) => s.id !== id);
    saveSnapshots(newSnapshots);
    set({ snapshots: newSnapshots });
  },
}));
