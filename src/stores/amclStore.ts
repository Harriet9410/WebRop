import { create } from 'zustand';

export type AmclQuality = 'good' | 'fair' | 'poor';

export interface AmclParticle {
  x: number;
  z: number;
  yaw: number;
  weight: number;
}

export interface PendingInitialPose {
  x: number;
  z: number;
  yaw: number;
}

interface AmclState {
  particles: AmclParticle[];
  quality: AmclQuality;
  particleCount: number;
  covariance: number[];
  pendingPose: PendingInitialPose | null;
  isRelocating: boolean;
  setParticles: (particles: AmclParticle[]) => void;
  setQuality: (quality: AmclQuality) => void;
  setCovariance: (cov: number[]) => void;
  setPendingPose: (pose: PendingInitialPose | null) => void;
  setIsRelocating: (v: boolean) => void;
  clear: () => void;
}

export const useAmclStore = create<AmclState>((set) => ({
  particles: [],
  quality: 'good',
  particleCount: 0,
  covariance: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  pendingPose: null,
  isRelocating: false,
  setParticles: (particles) => set({
    particles,
    particleCount: particles.length,
    quality: computeQuality(particles),
  }),
  setQuality: (quality) => set({ quality }),
  setCovariance: (covariance) => set({ covariance }),
  setPendingPose: (pendingPose) => set({ pendingPose }),
  setIsRelocating: (isRelocating) => set({ isRelocating }),
  clear: () => set({ particles: [], quality: 'good', particleCount: 0, covariance: [0, 0, 0, 0, 0, 0, 0, 0, 0], pendingPose: null, isRelocating: false }),
}));

function computeQuality(particles: AmclParticle[]): AmclQuality {
  if (particles.length === 0) return 'good';
  const weights = particles.map((p) => p.weight);
  const maxW = Math.max(...weights);
  if (maxW === 0) return 'poor';
  const neff = 1 / weights.reduce((sum, w) => sum + w * w, 0);
  const ratio = neff / particles.length;
  if (ratio > 0.5) return 'good';
  if (ratio > 0.2) return 'fair';
  return 'poor';
}
