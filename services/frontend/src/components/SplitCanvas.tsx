import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useComparativeViewStore } from '../stores/comparativeViewStore';
import type { ViewportDimensions } from '../types/comparativeView';

interface SplitCanvasProps {
  leftView: React.ReactNode;
  rightView: React.ReactNode;
  onLeftCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
  onRightCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
}

function SynchronizedControls({
  side,
  onCameraChange
}: {
  side: 'left' | 'right';
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { syncCamera, leftView, rightView } = useComparativeViewStore();

  useEffect(() => {
    if (!controlsRef.current || !syncCamera) return;

    const controls = controlsRef.current;

    const handleChange = () => {
      const position: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z
      ];
      const target: [number, number, number] = [
        controls.target.x,
        controls.target.y,
        controls.target.z
      ];

      onCameraChange?.(position, target);
    };

    controls.addEventListener('change', handleChange);
    return () => controls.removeEventListener('change', handleChange);
  }, [camera, syncCamera, onCameraChange]);

  // Sync camera position when it changes in the store
  useEffect(() => {
    if (!controlsRef.current || !syncCamera) return;

    const viewConfig = side === 'left' ? leftView : rightView;
    const [x, y, z] = viewConfig.cameraPosition;
    const [tx, ty, tz] = viewConfig.cameraTarget;

    camera.position.set(x, y, z);
    controlsRef.current.target.set(tx, ty, tz);
    controlsRef.current.update();
  }, [camera, syncCamera, side, leftView.cameraPosition, rightView.cameraPosition, leftView.cameraTarget, rightView.cameraTarget]);

  return <OrbitControls ref={controlsRef} makeDefault />;
}

export function SplitCanvas({
  leftView,
  rightView,
  onLeftCameraChange,
  onRightCameraChange,
}: SplitCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_viewports, setViewports] = useState<{
    left: ViewportDimensions;
    right: ViewportDimensions;
  }>({
    left: { width: 0, height: 0, x: 0, y: 0 },
    right: { width: 0, height: 0, x: 0, y: 0 },
  });

  const { splitOrientation, leftView: leftViewConfig, rightView: rightViewConfig } = useComparativeViewStore();

  const calculateViewports = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (splitOrientation === 'horizontal') {
      const halfHeight = height / 2;
      setViewports({
        left: { width, height: halfHeight, x: 0, y: 0 },
        right: { width, height: halfHeight, x: 0, y: halfHeight },
      });
    } else {
      const halfWidth = width / 2;
      setViewports({
        left: { width: halfWidth, height, x: 0, y: 0 },
        right: { width: halfWidth, height, x: halfWidth, y: 0 },
      });
    }
  }, [splitOrientation]);

  useEffect(() => {
    calculateViewports();
    window.addEventListener('resize', calculateViewports);
    return () => window.removeEventListener('resize', calculateViewports);
  }, [calculateViewports]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: splitOrientation === 'horizontal' ? 'column' : 'row',
      }}
    >
      {/* Left/Top Viewport */}
      <div style={{
        flex: 1,
        position: 'relative',
        borderRight: splitOrientation === 'vertical' ? '2px solid #333' : 'none',
        borderBottom: splitOrientation === 'horizontal' ? '2px solid #333' : 'none',
      }}>
        <Canvas
          camera={{
            position: leftViewConfig.cameraPosition,
            fov: 50
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />

          <SynchronizedControls
            side="left"
            onCameraChange={onLeftCameraChange}
          />

          {leftView}
        </Canvas>

        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 8px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: 4,
          fontSize: '12px',
          pointerEvents: 'none',
        }}>
          {splitOrientation === 'horizontal' ? 'Top View' : 'Left View'}
        </div>
      </div>

      {/* Right/Bottom Viewport */}
      <div style={{
        flex: 1,
        position: 'relative',
      }}>
        <Canvas
          camera={{
            position: rightViewConfig.cameraPosition,
            fov: 50
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />

          <SynchronizedControls
            side="right"
            onCameraChange={onRightCameraChange}
          />

          {rightView}
        </Canvas>

        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 8px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: 4,
          fontSize: '12px',
          pointerEvents: 'none',
        }}>
          {splitOrientation === 'horizontal' ? 'Bottom View' : 'Right View'}
        </div>
      </div>
    </div>
  );
}
