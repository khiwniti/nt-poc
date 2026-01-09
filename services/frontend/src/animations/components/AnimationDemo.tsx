import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useState, useEffect } from 'react';
import { AnimatedZone, BatteryMarker, ZONE_COLORS, usePerformanceMonitor } from '../index';

export function AnimationDemo() {
  const [zoneColor, setZoneColor] = useState<string>(ZONE_COLORS.green);
  const [hasAlert, setHasAlert] = useState(false);
  const [batteryPosition, setBatteryPosition] = useState<[number, number, number]>([2, 0, 0]);
  
  const { metrics, isPerformant } = usePerformanceMonitor(true);

  useEffect(() => {
    const colorInterval = setInterval(() => {
      const colors = [ZONE_COLORS.green, ZONE_COLORS.yellow, ZONE_COLORS.red];
      setZoneColor(colors[Math.floor(Math.random() * colors.length)]);
    }, 3000);

    const alertInterval = setInterval(() => {
      setHasAlert((prev) => !prev);
    }, 2000);

    const positionInterval = setInterval(() => {
      const x = (Math.random() - 0.5) * 4;
      const y = (Math.random() - 0.5) * 4;
      setBatteryPosition([x, y, 0]);
    }, 4000);

    return () => {
      clearInterval(colorInterval);
      clearInterval(alertInterval);
      clearInterval(positionInterval);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          borderRadius: '5px',
          zIndex: 1000,
          fontFamily: 'monospace',
        }}
      >
        <div>FPS: {metrics.fps}</div>
        <div>Avg Frame Time: {metrics.avgFrameTime.toFixed(2)}ms</div>
        <div>Dropped Frames: {metrics.droppedFrames}</div>
        <div>Performance: {isPerformant ? '✓ Good' : '✗ Poor'}</div>
      </div>

      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <AnimatedZone
          zoneState={{
            color: zoneColor,
            position: [0, 0, 0],
            scale: [2, 2, 0.5],
          }}
        />

        <BatteryMarker
          position={batteryPosition}
          hasAlert={hasAlert}
          color={hasAlert ? ZONE_COLORS.red : ZONE_COLORS.green}
        />

        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
}
