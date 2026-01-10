import { ReactNode, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { createXRStore, XR } from '@react-three/xr';
import { Grid } from '@react-three/drei';
import { useVRPerformanceMonitor } from '../hooks/useVRPerformanceMonitor';

export interface VRSceneProps {
  children: ReactNode;
  enableControllers?: boolean;
  enableHandTracking?: boolean;
  targetFrameRate?: number;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onPerformanceWarning?: (fps: number) => void;
}

// Create XR store outside component to persist across renders
const store = createXRStore();

/**
 * VRScene Component
 * Provides WebXR-enabled scene with stereoscopic rendering and VR controller support
 */
export function VRScene({
  children,
  enableControllers = true,
  targetFrameRate = 90,
  onSessionStart,
  onSessionEnd,
  onPerformanceWarning,
}: VRSceneProps) {
  useEffect(() => {
    // Listen for XR session state changes
    const unsubscribe = store.subscribe((state) => {
      if (state.session) {
        console.log('VR session started');
        onSessionStart?.();
      } else {
        console.log('VR session ended');
        onSessionEnd?.();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onSessionStart, onSessionEnd]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* VR Entry Button */}
      <button
        onClick={() => store.enterVR()}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          padding: '1rem 2rem',
          fontSize: '1.125rem',
          fontWeight: 'bold',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
      >
        Enter VR
      </button>

      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: [0, 1.6, 3], // Average human eye height in VR
          fov: 75,
        }}
        frameloop="always"
        style={{ width: '100%', height: '100%' }}
      >
        <XR store={store}>
          {/* Lighting setup optimized for VR */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-10, 5, -5]} intensity={0.4} />
          <pointLight position={[0, 3, 0]} intensity={0.5} />

          {/* Grid for spatial reference */}
          <Grid
            infiniteGrid
            cellSize={1}
            cellThickness={0.5}
            sectionSize={5}
            fadeDistance={30}
            fadeStrength={1}
          />

          {/* Performance monitor for VR */}
          <VRPerformanceMonitor
            targetFrameRate={targetFrameRate}
            onPerformanceWarning={onPerformanceWarning}
          />

          {/* Scene content */}
          {children}
        </XR>
      </Canvas>
    </div>
  );
}

/**
 * Performance Monitor Component for VR
 * Monitors frame rate and warns if it drops below target
 */
function VRPerformanceMonitor({
  targetFrameRate,
  onPerformanceWarning,
}: {
  targetFrameRate: number;
  onPerformanceWarning?: (fps: number) => void;
}) {
  const { currentFPS, averageFPS, isUnderPerforming } = useVRPerformanceMonitor(targetFrameRate);

  useEffect(() => {
    if (isUnderPerforming && onPerformanceWarning) {
      onPerformanceWarning(currentFPS);
    }
  }, [isUnderPerforming, currentFPS, onPerformanceWarning]);

  return null;
}
