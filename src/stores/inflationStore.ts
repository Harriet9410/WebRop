import { create } from 'zustand';

interface InflationState {
  showInflation: boolean;
  toggleInflation: () => void;
  setShowInflation: (v: boolean) => void;
}

export const useInflationStore = create<InflationState>((set, get) => ({
  showInflation: false,
  toggleInflation: () => set({ showInflation: !get().showInflation }),
  setShowInflation: (v) => set({ showInflation: v }),
}));
