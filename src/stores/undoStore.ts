import { create } from 'zustand';
import { useHRZStore, HRZZone } from './hrzStore';
import { useHRPStore, SegmentSpeed } from './hrpStore';
import { Vec2 } from '../utils/coordinate';

interface Snapshot {
  hrz: { zones: HRZZone[]; currentVertices: Vec2[]; isDrawing: boolean };
  hrp: { path: Vec2[]; segmentSpeeds: SegmentSpeed[]; blockedSegments: boolean[]; isDrawing: boolean };
}

const MAX_HISTORY = 50;

interface UndoState {
  history: Snapshot[];
  index: number;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function captureSnapshot(): Snapshot {
  const hrz = useHRZStore.getState();
  const hrp = useHRPStore.getState();
  return {
    hrz: {
      zones: hrz.zones.map((z) => ({ ...z, vertices: [...z.vertices] })),
      currentVertices: [...hrz.currentVertices],
      isDrawing: hrz.isDrawing,
    },
    hrp: {
      path: [...hrp.path],
      segmentSpeeds: [...hrp.segmentSpeeds],
      blockedSegments: [...hrp.blockedSegments],
      isDrawing: hrp.isDrawing,
    },
  };
}

function restoreSnapshot(snap: Snapshot) {
  const hrz = useHRZStore.getState();
  const hrp = useHRPStore.getState();
  hrz.loadZones(snap.hrz.zones);
  if (snap.hrz.isDrawing) {
    useHRZStore.setState({ currentVertices: snap.hrz.currentVertices, isDrawing: true });
  } else {
    useHRZStore.setState({ currentVertices: [], isDrawing: false });
  }
  hrp.loadPath(snap.hrp.path);
  useHRPStore.setState({
    segmentSpeeds: snap.hrp.segmentSpeeds,
    blockedSegments: snap.hrp.blockedSegments,
    isDrawing: snap.hrp.isDrawing,
  });
}

export const useUndoStore = create<UndoState>((set, get) => ({
  history: [],
  index: -1,
  canUndo: false,
  canRedo: false,

  pushUndo: () => {
    const snap = captureSnapshot();
    set((s) => {
      const newHistory = s.history.slice(0, s.index + 1);
      newHistory.push(snap);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      const newIndex = newHistory.length - 1;
      return { history: newHistory, index: newIndex, canUndo: newIndex > 0, canRedo: false };
    });
  },

  undo: () => {
    const { history, index } = get();
    if (index <= 0) return;
    const newIndex = index - 1;
    restoreSnapshot(history[newIndex]);
    set({ index: newIndex, canUndo: newIndex > 0, canRedo: true });
  },

  redo: () => {
    const { history, index } = get();
    if (index >= history.length - 1) return;
    const newIndex = index + 1;
    restoreSnapshot(history[newIndex]);
    set({ index: newIndex, canUndo: true, canRedo: newIndex < history.length - 1 });
  },
}));
