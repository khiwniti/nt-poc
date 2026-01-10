import { create } from 'zustand';
import type {
  ComparativeViewState,
  ViewportConfig,
  SplitOrientation,
  PerformanceMetrics
} from '../types/comparativeView';

interface ComparativeViewStore extends ComparativeViewState {
  performanceMetrics: PerformanceMetrics;

  // Actions
  setLeftView: (config: Partial<ViewportConfig>) => void;
  setRightView: (config: Partial<ViewportConfig>) => void;
  setSplitOrientation: (orientation: SplitOrientation) => void;
  toggleSyncCamera: () => void;
  toggleShowDifferences: () => void;
  setDifferenceThreshold: (threshold: number) => void;
  syncCameraPosition: (position: [number, number, number], target: [number, number, number]) => void;
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  reset: () => void;
}

const DEFAULT_CAMERA_POSITION: [number, number, number] = [5, 5, 5];
const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 0, 0];

const initialState: ComparativeViewState = {
  leftView: {
    facilityId: null,
    timestamp: null,
    cameraPosition: DEFAULT_CAMERA_POSITION,
    cameraTarget: DEFAULT_CAMERA_TARGET,
  },
  rightView: {
    facilityId: null,
    timestamp: null,
    cameraPosition: DEFAULT_CAMERA_POSITION,
    cameraTarget: DEFAULT_CAMERA_TARGET,
  },
  splitOrientation: 'horizontal',
  syncCamera: true,
  showDifferences: false,
  differenceThreshold: 0.1,
};

const initialPerformanceMetrics: PerformanceMetrics = {
  fps: 0,
  leftViewFps: 0,
  rightViewFps: 0,
  renderTime: 0,
};

export const useComparativeViewStore = create<ComparativeViewStore>((set, get) => ({
  ...initialState,
  performanceMetrics: initialPerformanceMetrics,

  setLeftView: (config) =>
    set((state) => ({
      leftView: { ...state.leftView, ...config },
    })),

  setRightView: (config) =>
    set((state) => ({
      rightView: { ...state.rightView, ...config },
    })),

  setSplitOrientation: (orientation) =>
    set({ splitOrientation: orientation }),

  toggleSyncCamera: () =>
    set((state) => ({ syncCamera: !state.syncCamera })),

  toggleShowDifferences: () =>
    set((state) => ({ showDifferences: !state.showDifferences })),

  setDifferenceThreshold: (threshold) =>
    set({ differenceThreshold: Math.max(0, Math.min(1, threshold)) }),

  syncCameraPosition: (position, target) => {
    const { syncCamera } = get();
    if (!syncCamera) return;

    set((state) => ({
      leftView: { ...state.leftView, cameraPosition: position, cameraTarget: target },
      rightView: { ...state.rightView, cameraPosition: position, cameraTarget: target },
    }));
  },

  updatePerformanceMetrics: (metrics) =>
    set((state) => ({
      performanceMetrics: { ...state.performanceMetrics, ...metrics },
    })),

  reset: () =>
    set({ ...initialState, performanceMetrics: initialPerformanceMetrics }),
}));
