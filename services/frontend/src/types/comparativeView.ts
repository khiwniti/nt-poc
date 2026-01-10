export type SplitOrientation = 'horizontal' | 'vertical';

export interface ViewportConfig {
  facilityId: string | null;
  timestamp: Date | null;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

export interface ComparativeViewState {
  leftView: ViewportConfig;
  rightView: ViewportConfig;
  splitOrientation: SplitOrientation;
  syncCamera: boolean;
  showDifferences: boolean;
  differenceThreshold: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface PerformanceMetrics {
  fps: number;
  leftViewFps: number;
  rightViewFps: number;
  renderTime: number;
}
