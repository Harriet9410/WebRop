import { create } from 'zustand';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface RosState {
  status: ConnectionStatus;
  url: string;
  isMock: boolean;
  setUrl: (url: string) => void;
  setStatus: (status: ConnectionStatus) => void;
  setMock: (mock: boolean) => void;
}

export const useRosStore = create<RosState>((set) => ({
  status: 'disconnected',
  url: 'ws://localhost:9090',
  isMock: false,
  setUrl: (url) => set({ url }),
  setStatus: (status) => set({ status }),
  setMock: (isMock) => set({ isMock }),
}));
