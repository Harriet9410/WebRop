import { useMapStore } from '../stores/mapStore';
import { useRosStore } from '../stores/rosStore';
import { useRobotPoseStore } from '../stores/robotPoseStore';
import type { OccupancyGridData } from '../utils/mapRenderer';

const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const RESOLUTION = 0.1;

let mockTimer: ReturnType<typeof setInterval> | null = null;
let odomTimer: ReturnType<typeof setInterval> | null = null;

let robotX = 5.0;
let robotZ = 5.0;
let robotYaw = 0;
let targetPath: { x: number; z: number }[] = [];
let pathIdx = 0;
let mockLog: string[] = [];
let logListeners: ((log: string[]) => void)[] = [];

function addLog(msg: string) {
  const ts = new Date().toLocaleTimeString();
  const entry = `[${ts}] ${msg}`;
  mockLog = [...mockLog.slice(-99), entry];
  logListeners.forEach((fn) => fn(mockLog));
}

export function onMockLog(fn: (log: string[]) => void): () => void {
  logListeners.push(fn);
  return () => {
    logListeners = logListeners.filter((l) => l !== fn);
  };
}

export function getMockLog(): string[] {
  return mockLog;
}

function generateMockGrid(): OccupancyGridData {
  const data: number[] = [];
  for (let row = 0; row < MAP_HEIGHT; row++) {
    for (let col = 0; col < MAP_WIDTH; col++) {
      const isBorder =
        row === 0 || row === MAP_HEIGHT - 1 || col === 0 || col === MAP_WIDTH - 1;
      const isInnerWall =
        (row === 30 && col >= 20 && col <= 70) ||
        (row === 60 && col >= 30 && col <= 80) ||
        (col === 50 && row >= 30 && row <= 60) ||
        (col === 25 && row >= 10 && row <= 40);
      const isObstacle =
        (row >= 75 && row <= 80 && col >= 10 && col <= 20) ||
        (row >= 40 && row <= 50 && col >= 70 && col <= 80);

      if (isBorder || isInnerWall || isObstacle) {
        data.push(254);
      } else {
        data.push(0);
      }
    }
  }
  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    resolution: RESOLUTION,
    originX: 0,
    originY: 0,
    data,
  };
}

function updateOdom() {
  if (targetPath.length > 0 && pathIdx < targetPath.length) {
    const target = targetPath[pathIdx];
    const dx = target.x - robotX;
    const dz = target.z - robotZ;
    const d = Math.sqrt(dx * dx + dz * dz);

    if (d < 0.05) {
      pathIdx++;
      addLog(`Robot reached waypoint ${pathIdx}/${targetPath.length}`);
    } else {
      const speed = Math.min(0.1, d);
      robotX += (dx / d) * speed;
      robotZ += (dz / d) * speed;
      robotYaw = Math.atan2(dx, -dz);
    }
  }

  useRobotPoseStore.getState().setPose({ x: robotX, z: robotZ, yaw: robotYaw });
}

export function startMock(): void {
  stopMock();
  mockLog = [];
  useRosStore.getState().setStatus('connected');

  const grid = generateMockGrid();
  useMapStore.getState().setGrid(grid);
  addLog('Mock map published to /map (100x100, 0.1m res)');
  addLog('Mock odometry started');

  robotX = 5.0;
  robotZ = 5.0;
  robotYaw = 0;
  useRobotPoseStore.getState().setPose({ x: robotX, z: robotZ, yaw: robotYaw });
  targetPath = [];
  pathIdx = 0;

  odomTimer = setInterval(updateOdom, 100);

  mockTimer = setInterval(() => {
    const grid = generateMockGrid();
    useMapStore.getState().setGrid(grid);
  }, 5000);
}

export function stopMock(): void {
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }
  if (odomTimer) {
    clearInterval(odomTimer);
    odomTimer = null;
  }
  targetPath = [];
  pathIdx = 0;
  useRosStore.getState().setStatus('disconnected');
}

export function mockPublishHRZZones(json: string): void {
  const zones = JSON.parse(json);
  const count = Array.isArray(zones) ? zones.length : 0;
  addLog(`Published to /hrz_zones: ${count} zone(s)`);
  zones.forEach((z: { id: string; vertices: { x: number; z: number }[] }, i: number) => {
    addLog(`  Zone ${i + 1} (${z.id}): ${z.vertices.length} vertices`);
  });
}

export function mockPublishHRPPath(poses: { x: number; z: number }[]): void {
  if (poses.length === 0) return;
  addLog(`Published to /hrp_path: ${poses.length} waypoints`);

  targetPath = poses.map((p) => ({ x: p.x, z: p.z }));
  pathIdx = 0;
  addLog(`Robot navigating along path...`);
}
