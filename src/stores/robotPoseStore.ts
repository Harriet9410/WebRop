import { create } from 'zustand';

interface RobotPose {
  x: number;
  z: number;
  yaw: number;
}

interface RobotPoseState {
  pose: RobotPose;
  setPose: (pose: RobotPose) => void;
}

export const useRobotPoseStore = create<RobotPoseState>((set) => ({
  pose: { x: 2, z: 2, yaw: 0 },
  setPose: (pose) => set({ pose }),
}));
