import { create } from 'zustand';

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  setPosition: (pos: [number, number, number]) => void;
  setTarget: (tgt: [number, number, number]) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  position: [5, 15, 15],
  target: [5, 0, 5],
  setPosition: (position) => set({ position }),
  setTarget: (target) => set({ target }),
}));
