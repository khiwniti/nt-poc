import { useEffect, useRef, useState } from 'react';
import { ANIMATION_CONFIG } from './config';

export interface PerformanceMetrics {
  fps: number;
  avgFrameTime: number;
  droppedFrames: number;
}

export function usePerformanceMonitor(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    avgFrameTime: 0,
    droppedFrames: 0,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const droppedFramesRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const targetFrameTime = 1000 / ANIMATION_CONFIG.targetFPS;

    const measureFrame = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameTimesRef.current.push(frameTime);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      if (frameTime > targetFrameTime * 1.5) {
        droppedFramesRef.current++;
      }

      if (frameTimesRef.current.length >= 10) {
        const avgFrameTime =
          frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = Math.round(1000 / avgFrameTime);

        setMetrics({
          fps,
          avgFrameTime: Math.round(avgFrameTime * 100) / 100,
          droppedFrames: droppedFramesRef.current,
        });
      }

      animationFrameRef.current = requestAnimationFrame(measureFrame);
    };

    animationFrameRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  const reset = () => {
    frameTimesRef.current = [];
    droppedFramesRef.current = 0;
    setMetrics({
      fps: 60,
      avgFrameTime: 0,
      droppedFrames: 0,
    });
  };

  return {
    metrics,
    reset,
    isPerformant: metrics.fps >= ANIMATION_CONFIG.targetFPS * 0.9,
  };
}
