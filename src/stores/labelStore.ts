import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

export interface MapLabel {
  id: string;
  text: string;
  position: Vec2;
}

interface LabelState {
  labels: MapLabel[];
  addLabel: (text: string, position: Vec2) => void;
  removeLabel: (id: string) => void;
  updateLabel: (id: string, text: string) => void;
  moveLabel: (id: string, position: Vec2) => void;
  loadLabels: (labels: MapLabel[]) => void;
  clearAll: () => void;
}

let labelCounter = 0;

export const useLabelStore = create<LabelState>((set) => ({
  labels: [],
  addLabel: (text, position) =>
    set((s) => ({
      labels: [...s.labels, { id: `label-${++labelCounter}-${Date.now()}`, text, position }],
    })),
  removeLabel: (id) =>
    set((s) => ({ labels: s.labels.filter((l) => l.id !== id) })),
  updateLabel: (id, text) =>
    set((s) => ({
      labels: s.labels.map((l) => (l.id === id ? { ...l, text } : l)),
    })),
  moveLabel: (id, position) =>
    set((s) => ({
      labels: s.labels.map((l) => (l.id === id ? { ...l, position } : l)),
    })),
  loadLabels: (labels) => set({ labels }),
  clearAll: () => set({ labels: [] }),
}));
