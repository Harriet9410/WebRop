import { create } from 'zustand';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface RosState {
  status: ConnectionStatus;
  url: string;
  setUrl: (url: string) => void;
  setStatus: (status: ConnectionStatus) => void;
}

export const useRosStore = create<RosState>((set) => ({
  status: 'disconnected',
  url: 'ws://localhost:9090',
  setUrl: (url) => set({ url }),
  setStatus: (status) => set({ status }),
}));
