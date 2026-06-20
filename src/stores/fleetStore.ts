import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

export type RobotType = 'car' | 'humanoid' | 'drone' | 'dog';

export const ROBOT_TYPE_LABELS: Record<RobotType, string> = {
  car: 'Car',
  humanoid: 'Humanoid',
  drone: 'Drone',
  dog: 'Dog',
};

export const ROBOT_TYPES: RobotType[] = ['car', 'humanoid', 'drone', 'dog'];

export interface RobotInstance {
  id: string;
  name: string;
  color: string;
  robotType: RobotType;
  pose: { x: number; z: number; yaw: number };
  linearVelocity: number;
  angularVelocity: number;
  waypoints: { id: string; x: number; z: number }[];
  currentWaypointIdx: number;
  navigating: boolean;
  plannedPath: Vec2[];
  battery: number;
  idleTime: number;
}

export type FormationType = 'line' | 'v' | 'circle' | 'column';

const ROBOT_COLORS = ['#42a5f5', '#ef5350', '#66bb6a', '#ffa726', '#ab47bc', '#26c6da'];

interface FleetState {
  robots: RobotInstance[];
  activeRobotId: string;
  formation: FormationType;
  formationSpacing: number;
  addRobot: (name?: string, robotType?: RobotType) => string;
  removeRobot: (id: string) => void;
  setRobotType: (id: string, robotType: RobotType) => void;
  setActiveRobot: (id: string) => void;
  setRobotPose: (id: string, pose: { x: number; z: number; yaw: number }) => void;
  setRobotVelocity: (id: string, linear: number, angular: number) => void;
  setRobotBattery: (id: string, battery: number) => void;
  tickRobotIdle: (id: string, dt: number) => void;
  resetRobotIdle: (id: string) => void;
  addWaypoint: (robotId: string, point: Vec2) => void;
  removeWaypoint: (robotId: string, wpId: string) => void;
  moveWaypoint: (robotId: string, wpId: string, newPos: Vec2) => void;
  clearWaypoints: (robotId: string) => void;
  setNavigating: (robotId: string, navigating: boolean) => void;
  setCurrentWaypointIdx: (robotId: string, idx: number) => void;
  setPlannedPath: (robotId: string, path: Vec2[]) => void;
  clearNav: (robotId: string) => void;
  setFormation: (formation: FormationType) => void;
  setFormationSpacing: (spacing: number) => void;
  getFormationOffsets: () => { dx: number; dz: number }[];
  getActiveRobot: () => RobotInstance | undefined;
}

let robotCounter = 0;
let wpCounter = 0;

export const useFleetStore = create<FleetState>((set, get) => ({
  robots: [{
    id: 'robot-0',
    name: 'Robot 1',
    color: ROBOT_COLORS[0],
    robotType: 'car' as RobotType,
    pose: { x: 2, z: 2, yaw: 0 },
    linearVelocity: 0,
    angularVelocity: 0,
    waypoints: [],
    currentWaypointIdx: 0,
    navigating: false,
    plannedPath: [],
    battery: 100,
    idleTime: 0,
  }],
  activeRobotId: 'robot-0',
  formation: 'line',
  formationSpacing: 0.8,

  addRobot: (name, robotType) => {
    const id = `robot-${++robotCounter}`;
    const robots = get().robots;
    const colorIdx = robots.length % ROBOT_COLORS.length;
    const newRobot: RobotInstance = {
      id,
      name: name || `Robot ${robots.length + 1}`,
      color: ROBOT_COLORS[colorIdx],
      robotType: robotType || 'car',
      pose: { x: 2 + robots.length * 0.5, z: 2, yaw: 0 },
      linearVelocity: 0,
      angularVelocity: 0,
      waypoints: [],
      currentWaypointIdx: 0,
      navigating: false,
      plannedPath: [],
      battery: 100,
      idleTime: 0,
    };
    set({ robots: [...robots, newRobot], activeRobotId: id });
    return id;
  },

  removeRobot: (id) => {
    const robots = get().robots.filter((r) => r.id !== id);
    if (robots.length === 0) return;
    set({
      robots,
      activeRobotId: get().activeRobotId === id ? robots[0].id : get().activeRobotId,
    });
  },

  setRobotType: (id, robotType) =>
    set((s) => ({
      robots: s.robots.map((r) => (r.id === id ? { ...r, robotType } : r)),
    })),

  setActiveRobot: (id) => set({ activeRobotId: id }),

  setRobotPose: (id, pose) =>
    set((s) => ({
      robots: s.robots.map((r) => (r.id === id ? { ...r, pose } : r)),
    })),

  setRobotVelocity: (id, linear, angular) =>
    set((s) => ({
      robots: s.robots.map((r) => (r.id === id ? { ...r, linearVelocity: linear, angularVelocity: angular } : r)),
    })),

  setRobotBattery: (id, battery) =>
    set((s) => ({
      robots: s.robots.map((r) => (r.id === id ? { ...r, battery: Math.max(0, Math.min(100, battery)) } : r)),
    })),

  tickRobotIdle: (id, dt) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === id && !r.navigating ? { ...r, idleTime: r.idleTime + dt } : r
      ),
    })),

  resetRobotIdle: (id) =>
    set((s) => ({
      robots: s.robots.map((r) => (r.id === id ? { ...r, idleTime: 0 } : r)),
    })),

  addWaypoint: (robotId, point) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === robotId
          ? { ...r, waypoints: [...r.waypoints, { ...point, id: `wp-${++wpCounter}` }] }
          : r
      ),
    })),

  removeWaypoint: (robotId, wpId) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === robotId
          ? { ...r, waypoints: r.waypoints.filter((w) => w.id !== wpId) }
          : r
      ),
    })),

  moveWaypoint: (robotId, wpId, newPos) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === robotId
          ? { ...r, waypoints: r.waypoints.map((w) => w.id === wpId ? { ...w, ...newPos } : w) }
          : r
      ),
    })),

  clearWaypoints: (robotId) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === robotId
          ? { ...r, waypoints: [], currentWaypointIdx: 0, navigating: false, plannedPath: [] }
          : r
      ),
    })),

  setNavigating: (robotId, navigating) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === robotId ? { ...r, navigating } : r
      ),
    })),

  setCurrentWaypointIdx: (robotId, idx) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === robotId ? { ...r, currentWaypointIdx: idx } : r
      ),
    })),

  setPlannedPath: (robotId, path) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === robotId ? { ...r, plannedPath: path } : r
      ),
    })),

  clearNav: (robotId) =>
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === robotId ? { ...r, navigating: false, plannedPath: [] } : r
      ),
    })),

  setFormation: (formation) => set({ formation }),

  setFormationSpacing: (spacing) => set({ formationSpacing: spacing }),

  getFormationOffsets: () => {
    const { robots, formation, formationSpacing } = get();
    const n = robots.length;
    if (n <= 1) return [{ dx: 0, dz: 0 }];
    const offsets: { dx: number; dz: number }[] = [];
    switch (formation) {
      case 'line':
        for (let i = 0; i < n; i++) {
          offsets.push({ dx: (i - (n - 1) / 2) * formationSpacing, dz: 0 });
        }
        break;
      case 'column':
        for (let i = 0; i < n; i++) {
          offsets.push({ dx: 0, dz: i * formationSpacing });
        }
        break;
      case 'v':
        for (let i = 0; i < n; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const row = Math.floor((i + 1) / 2);
          offsets.push({ dx: side * row * formationSpacing * 0.7, dz: row * formationSpacing });
        }
        break;
      case 'circle': {
        const radius = Math.max(formationSpacing, formationSpacing * n / (2 * Math.PI));
        for (let i = 0; i < n; i++) {
          const angle = (2 * Math.PI * i) / n;
          offsets.push({ dx: Math.cos(angle) * radius, dz: Math.sin(angle) * radius });
        }
        break;
      }
    }
    return offsets;
  },

  getActiveRobot: () => {
    const { robots, activeRobotId } = get();
    return robots.find((r) => r.id === activeRobotId);
  },
}));
