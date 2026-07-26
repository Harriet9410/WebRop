import { create } from 'zustand';

// /hrp/status 来自 hrp_follower_node：'idle' | 'running N/M' | 'paused N/M' | 'done'
interface MissionState {
  status: string;
  lastUpdate: number;
  setStatus: (s: string) => void;
  clear: () => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  status: 'idle',
  lastUpdate: 0,
  setStatus: (status) => set({ status, lastUpdate: Date.now() }),
  clear: () => set({ status: 'idle', lastUpdate: 0 }),
}));

// 解析状态 → { phase, idx, total }，供 UI 用
export type MissionPhase = 'running' | 'paused' | 'idle';
export function parseMissionStatus(status: string): { phase: MissionPhase; idx: number; total: number } {
  const s = (status || '').trim();
  if (s.startsWith('running')) {
    const m = s.match(/running\s+(\d+)\/(\d+)/);
    return { phase: 'running', idx: m ? Number(m[1]) : 0, total: m ? Number(m[2]) : 0 };
  }
  if (s.startsWith('paused')) {
    const m = s.match(/paused\s+(\d+)\/(\d+)/);
    return { phase: 'paused', idx: m ? Number(m[1]) : 0, total: m ? Number(m[2]) : 0 };
  }
  return { phase: 'idle', idx: 0, total: 0 };
}
