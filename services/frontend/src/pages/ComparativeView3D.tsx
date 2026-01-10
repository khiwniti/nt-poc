import { useCallback } from 'react';
import { Grid } from '@react-three/drei';
import { GLTFModel } from '../components/GLTFModel';
import { SplitCanvas } from '../components/SplitCanvas';
import { ComparativeControlPanel } from '../components/ComparativeControlPanel';
import { DifferenceHeatmapLegend } from '../components/DifferenceHighlight';
import { useComparativeViewStore } from '../stores/comparativeViewStore';
import { useComparativePerformance } from '../hooks/useComparativePerformance';

function SceneContent({ facilityId }: { facilityId: string | null }) {
  const modelUrl = facilityId ? `/assets/models/${facilityId}.glb` : null;

  return (
    <>
      <Grid infiniteGrid cellSize={1} cellThickness={0.5} sectionSize={5} />
      {modelUrl && (
        <GLTFModel
          url={modelUrl}
          position={[0, 0, 0]}
          scale={1}
          autoRotate={false}
        />
      )}
      {/* Placeholder content when no facility is selected */}
      {!modelUrl && (
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      )}
    </>
  );
}

function PerformanceMonitor() {
  useComparativePerformance({
    enabled: true,
    updateInterval: 1000,
    targetFps: 30,
    onPerformanceWarning: (fps) => {
      console.warn(`Performance warning: FPS dropped to ${fps}`);
    },
  });

  return null;
}

function ComparativeView3D() {
  const { leftView, rightView, syncCameraPosition, showDifferences } = useComparativeViewStore();

  const handleLeftCameraChange = useCallback(
    (position: [number, number, number], target: [number, number, number]) => {
      syncCameraPosition(position, target);
    },
    [syncCameraPosition]
  );

  const handleRightCameraChange = useCallback(
    (position: [number, number, number], target: [number, number, number]) => {
      syncCameraPosition(position, target);
    },
    [syncCameraPosition]
  );

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      background: '#1a1a1a',
    }}>
      <SplitCanvas
        leftView={
          <>
            <SceneContent facilityId={leftView.facilityId} />
            <PerformanceMonitor />
          </>
        }
        rightView={
          <>
            <SceneContent facilityId={rightView.facilityId} />
          </>
        }
        onLeftCameraChange={handleLeftCameraChange}
        onRightCameraChange={handleRightCameraChange}
      />

      <ComparativeControlPanel />

      {showDifferences && <DifferenceHeatmapLegend />}

      {/* Help Text */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        borderRadius: 4,
        fontSize: '12px',
        maxWidth: 300,
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Controls:</div>
        <div>• Left click + drag: Rotate camera</div>
        <div>• Right click + drag: Pan camera</div>
        <div>• Scroll: Zoom in/out</div>
        <div>• Enable sync to link both cameras</div>
      </div>
    </div>
  );
}

export default ComparativeView3D;
