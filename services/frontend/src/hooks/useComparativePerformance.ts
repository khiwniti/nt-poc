import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useComparativeViewStore } from '../stores/comparativeViewStore';

interface PerformanceMonitorConfig {
  enabled?: boolean;
  updateInterval?: number;
  targetFps?: number;
  onPerformanceWarning?: (fps: number) => void;
}

export function useComparativePerformance({
  enabled = true,
  updateInterval = 1000,
  targetFps = 30,
  onPerformanceWarning,
}: PerformanceMonitorConfig = {}) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const renderTimeRef = useRef(0);
  const updatePerformanceMetrics = useComparativeViewStore((state) => state.updatePerformanceMetrics);

  const calculateFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= updateInterval) {
      const fps = Math.round((frameCount.current * 1000) / delta);
      const avgRenderTime = renderTimeRef.current / frameCount.current;

      updatePerformanceMetrics({
        fps,
        renderTime: avgRenderTime,
      });

      if (fps < targetFps && onPerformanceWarning) {
        onPerformanceWarning(fps);
      }

      frameCount.current = 0;
      renderTimeRef.current = 0;
      lastTime.current = now;
    }
  }, [updateInterval, targetFps, onPerformanceWarning, updatePerformanceMetrics]);

  useFrame(() => {
    if (!enabled) return;

    const startTime = performance.now();
    frameCount.current++;

    calculateFPS();

    const endTime = performance.now();
    renderTimeRef.current += endTime - startTime;
  });

  return {
    reset: () => {
      frameCount.current = 0;
      lastTime.current = performance.now();
      renderTimeRef.current = 0;
    },
  };
}

export function useViewportPerformance(
  viewportId: 'left' | 'right',
  config: PerformanceMonitorConfig = {}
) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const updatePerformanceMetrics = useComparativeViewStore((state) => state.updatePerformanceMetrics);

  useFrame(() => {
    if (!config.enabled) return;

    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= (config.updateInterval || 1000)) {
      const fps = Math.round((frameCount.current * 1000) / delta);

      if (viewportId === 'left') {
        updatePerformanceMetrics({ leftViewFps: fps });
      } else {
        updatePerformanceMetrics({ rightViewFps: fps });
      }

      if (fps < (config.targetFps || 30) && config.onPerformanceWarning) {
        config.onPerformanceWarning(fps);
      }

      frameCount.current = 0;
      lastTime.current = now;
    }

    frameCount.current++;
  });
}
