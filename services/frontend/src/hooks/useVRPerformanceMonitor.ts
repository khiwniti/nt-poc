import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export interface VRPerformanceMetrics {
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameTime: number;
  droppedFrames: number;
  isUnderPerforming: boolean;
}

/**
 * Hook to monitor VR performance and ensure target frame rate
 * @param targetFPS Target frame rate (default: 90 for most VR devices)
 * @param warningThreshold FPS threshold below which to warn (default: 85)
 */
export function useVRPerformanceMonitor(targetFPS: number = 90, warningThreshold: number = 85) {
  const [metrics, setMetrics] = useState<VRPerformanceMetrics>({
    currentFPS: 0,
    averageFPS: 0,
    minFPS: Infinity,
    maxFPS: 0,
    frameTime: 0,
    droppedFrames: 0,
    isUnderPerforming: false,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const droppedFramesRef = useRef(0);
  const frameCountRef = useRef(0);
  const updateIntervalRef = useRef(0);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Calculate current FPS
    const currentFPS = 1000 / delta;
    frameTimesRef.current.push(delta);

    // Track dropped frames (frames that took longer than target frame time)
    const targetFrameTime = 1000 / targetFPS;
    if (delta > targetFrameTime * 1.5) {
      droppedFramesRef.current++;
    }

    // Keep only last 60 frames for averaging
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    frameCountRef.current++;
    updateIntervalRef.current++;

    // Update metrics every 30 frames (approximately every 0.5s at 60 FPS)
    if (updateIntervalRef.current >= 30) {
      const frameTimes = frameTimesRef.current;
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const averageFPS = 1000 / avgFrameTime;
      const minFPS = 1000 / Math.max(...frameTimes);
      const maxFPS = 1000 / Math.min(...frameTimes);

      setMetrics({
        currentFPS: Math.round(currentFPS),
        averageFPS: Math.round(averageFPS),
        minFPS: Math.round(minFPS),
        maxFPS: Math.round(maxFPS),
        frameTime: Math.round(delta * 100) / 100,
        droppedFrames: droppedFramesRef.current,
        isUnderPerforming: averageFPS < warningThreshold,
      });

      updateIntervalRef.current = 0;
    }
  });

  return metrics;
}

/**
 * Hook to automatically optimize rendering for VR performance
 */
export function useVRPerformanceOptimization(targetFPS: number = 90) {
  const metrics = useVRPerformanceMonitor(targetFPS);
  const [optimizationLevel, setOptimizationLevel] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    const { averageFPS } = metrics;

    // Adjust quality based on performance
    if (averageFPS < targetFPS * 0.8) {
      // Severe performance issues - use low quality
      setOptimizationLevel('low');
    } else if (averageFPS < targetFPS * 0.95) {
      // Moderate performance issues - use medium quality
      setOptimizationLevel('medium');
    } else {
      // Good performance - use high quality
      setOptimizationLevel('high');
    }
  }, [metrics.averageFPS, targetFPS]);

  return {
    ...metrics,
    optimizationLevel,
    qualitySettings: getQualitySettings(optimizationLevel),
  };
}

/**
 * Get rendering quality settings based on optimization level
 */
function getQualitySettings(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high':
      return {
        shadowMapSize: 2048,
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        shadowsEnabled: true,
        maxLights: 8,
        particleCount: 1000,
      };
    case 'medium':
      return {
        shadowMapSize: 1024,
        antialias: true,
        pixelRatio: 1.5,
        shadowsEnabled: true,
        maxLights: 4,
        particleCount: 500,
      };
    case 'low':
      return {
        shadowMapSize: 512,
        antialias: false,
        pixelRatio: 1,
        shadowsEnabled: false,
        maxLights: 2,
        particleCount: 100,
      };
  }
}

/**
 * Hook to measure and report VR-specific performance metrics
 */
export function useVRSessionMetrics() {
  const [sessionMetrics, setSessionMetrics] = useState({
    sessionDuration: 0,
    totalFrames: 0,
    averageFrameRate: 0,
    motionToPhotonLatency: 0,
  });

  const sessionStartRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  useFrame(() => {
    frameCountRef.current++;

    const now = performance.now();
    const sessionDuration = (now - sessionStartRef.current) / 1000; // in seconds
    const averageFrameRate = frameCountRef.current / sessionDuration;

    setSessionMetrics({
      sessionDuration,
      totalFrames: frameCountRef.current,
      averageFrameRate: Math.round(averageFrameRate),
      motionToPhotonLatency: 0, // Would need WebXR API for accurate measurement
    });
  });

  return sessionMetrics;
}
