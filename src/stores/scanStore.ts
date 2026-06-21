import { create } from 'zustand';

export interface ScanPoint {
  x: number;
  z: number;
  range: number;
}

export type SlamMethod = 'gmapping' | 'cartographer' | 'hector' | 'rtabmap';

export type SensorDevice = 'rplidar' | 'hokuyo' | 'kinect' | 'realsense';

export const SLAM_METHOD_LABELS: Record<SlamMethod, string> = {
  gmapping: 'GMapping',
  cartographer: 'Cartographer',
  hector: 'Hector SLAM',
  rtabmap: 'RTAB-Map',
};

export const SLAM_METHOD_DESC: Record<SlamMethod, string> = {
  gmapping: '2D particle filter, needs odometry',
  cartographer: 'Google 2D/3D graph SLAM',
  hector: 'No odometry needed, scan matching only',
  rtabmap: 'RGB-D visual SLAM, best for handheld',
};

export const SLAM_METHODS: SlamMethod[] = ['gmapping', 'cartographer', 'hector', 'rtabmap'];

export const SENSOR_LABELS: Record<SensorDevice, string> = {
  rplidar: 'RPLidar (2D Laser)',
  hokuyo: 'Hokuyo (2D Laser)',
  kinect: 'Azure Kinect DK',
  realsense: 'Intel RealSense',
};

export const SENSOR_DESC: Record<SensorDevice, string> = {
  rplidar: '2D laser scanner, USB/Serial',
  hokuyo: '2D laser scanner, USB/Serial',
  kinect: 'RGB-D depth camera, USB 3.0',
  realsense: 'RGB-D depth camera, USB 3.0',
};

export const SLAM_SENSOR_MAP: Record<SlamMethod, SensorDevice[]> = {
  gmapping: ['rplidar', 'hokuyo'],
  cartographer: ['rplidar', 'hokuyo', 'kinect', 'realsense'],
  hector: ['rplidar', 'hokuyo'],
  rtabmap: ['kinect', 'realsense'],
};

interface ScanState {
  points: ScanPoint[];
  robotX: number;
  robotZ: number;
  robotYaw: number;
  scanTime: number;
  showScan: boolean;
  showCamera: boolean;
  cameraImage: string | null;
  slamActive: boolean;
  slamMethod: SlamMethod;
  sensorDevice: SensorDevice;
  setScanData: (points: ScanPoint[], robotX: number, robotZ: number, robotYaw: number) => void;
  setShowScan: (show: boolean) => void;
  setShowCamera: (show: boolean) => void;
  setCameraImage: (img: string | null) => void;
  setSlamActive: (active: boolean) => void;
  setSlamMethod: (method: SlamMethod) => void;
  setSensorDevice: (device: SensorDevice) => void;
  clearScan: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  points: [],
  robotX: 0,
  robotZ: 0,
  robotYaw: 0,
  scanTime: 0,
  showScan: true,
  showCamera: false,
  cameraImage: null,
  slamActive: false,
  slamMethod: 'gmapping',
  sensorDevice: 'rplidar',

  setScanData: (points, robotX, robotZ, robotYaw) =>
    set({ points, robotX, robotZ, robotYaw, scanTime: Date.now() }),

  setShowScan: (showScan) => set({ showScan }),
  setShowCamera: (showCamera) => set({ showCamera }),
  setCameraImage: (cameraImage) => set({ cameraImage }),
  setSlamActive: (slamActive) => set({ slamActive }),
  setSlamMethod: (slamMethod) => set((s) => {
    const allowed = SLAM_SENSOR_MAP[slamMethod];
    const device = allowed.includes(s.sensorDevice) ? s.sensorDevice : allowed[0];
    return { slamMethod, sensorDevice: device };
  }),
  setSensorDevice: (sensorDevice) => set({ sensorDevice }),
  clearScan: () => set({ points: [], cameraImage: null }),
}));
