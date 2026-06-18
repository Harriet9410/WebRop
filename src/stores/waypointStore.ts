import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

export interface Waypoint extends Vec2 {
  id: string;
}

interface WaypointState {
  waypoints: Waypoint[];
  currentWaypointIdx: number;
  navigating: boolean;
  plannedPath: Vec2[];
  addWaypoint: (point: Vec2) => void;
  removeWaypoint: (id: string) => void;
  moveWaypoint: (id: string, direction: 'up' | 'down') => void;
  setCurrentWaypointIdx: (idx: number) => void;
  setNavigating: (navigating: boolean) => void;
  setPlannedPath: (path: Vec2[]) => void;
  clearWaypoints: () => void;
  clearNav: () => void;
}

let waypointCounter = 0;

export const useWaypointStore = create<WaypointState>((set) => ({
  waypoints: [],
  currentWaypointIdx: 0,
  navigating: false,
  plannedPath: [],

  addWaypoint: (point) =>
    set((s) => ({
      waypoints: [...s.waypoints, { ...point, id: `wp-${++waypointCounter}` }],
    })),

  removeWaypoint: (id) =>
    set((s) => {
      const idx = s.waypoints.findIndex((w) => w.id === id);
      const newWps = s.waypoints.filter((w) => w.id !== id);
      let newIdx = s.currentWaypointIdx;
      if (idx < s.currentWaypointIdx) {
        newIdx = Math.max(0, newIdx - 1);
      } else if (idx === s.currentWaypointIdx) {
        newIdx = Math.min(newIdx, newWps.length - 1);
      }
      return { waypoints: newWps, currentWaypointIdx: Math.max(0, newIdx) };
    }),

  moveWaypoint: (id, direction) =>
    set((s) => {
      const idx = s.waypoints.findIndex((w) => w.id === id);
      if (idx === -1) return s;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= s.waypoints.length) return s;
      const newWps = [...s.waypoints];
      [newWps[idx], newWps[swapIdx]] = [newWps[swapIdx], newWps[idx]];
      let newCurIdx = s.currentWaypointIdx;
      if (s.currentWaypointIdx === idx) newCurIdx = swapIdx;
      else if (s.currentWaypointIdx === swapIdx) newCurIdx = idx;
      return { waypoints: newWps, currentWaypointIdx: newCurIdx };
    }),

  setCurrentWaypointIdx: (idx) => set({ currentWaypointIdx: idx }),
  setNavigating: (navigating) => set({ navigating }),
  setPlannedPath: (plannedPath) => set({ plannedPath }),

  clearWaypoints: () =>
    set({ waypoints: [], currentWaypointIdx: 0, navigating: false, plannedPath: [] }),

  clearNav: () =>
    set({ navigating: false, plannedPath: [] }),
}));
