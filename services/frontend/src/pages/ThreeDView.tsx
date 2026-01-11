import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Eye, Glasses } from 'lucide-react';
import { GLTFModel } from '../components/GLTFModel';
import { AssetLoadingIndicator } from '../components/AssetLoadingIndicator';
import { VRScene } from '../components/VRScene';
import { VRNavigationController } from '../components/VRControllers';
import { VRFallbackUI, VRStatusBadge } from '../components/VRFallbackUI';
import { HeatmapOverlay, type HeatmapMetric } from '../components/HeatmapOverlay';
import { HeatmapControls } from '../components/HeatmapControls';
import { HeatmapLegend } from '../components/HeatmapLegend';
import { useAssetLoader } from '../hooks/useAssetLoader';
import { useVRCapabilities } from '../hooks/useVRCapabilities';
import { useHeatmapData } from '../hooks/useHeatmapData';
import { getRecommendedVRFrameRate } from '../utils/vrDetection';

function ThreeDView() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [vrMode, setVRMode] = useState(false);
  const [showVRFallback, setShowVRFallback] = useState(false);
  const [performanceWarning, setPerformanceWarning] = useState<string | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('temperature');

  const { isLoading, progress, error, reload } = useAssetLoader({
    url: selectedModel,
    enabled: !!selectedModel,
  });

  const { capabilities, isVRSupported } = useVRCapabilities();
  const targetFPS = getRecommendedVRFrameRate();
  
  const { 
    data: heatmapData, 
    minValue, 
    maxValue,
    isLoading: heatmapLoading,
  } = useHeatmapData({
    metric: heatmapMetric,
    facilityId: 'facility-1',
    updateInterval: 5000,
  });

  const demoModels = [
    { name: 'Zone Model', url: '/assets/models/zone.glb' },
    { name: 'Battery Model', url: '/assets/models/battery.glb' },
    { name: 'Facility Element', url: '/assets/models/facility.glb' },
  ];

  const handleVRToggle = () => {
    if (!isVRSupported) {
      setShowVRFallback(true);
      return;
    }
    setVRMode(!vrMode);
  };

  const handlePerformanceWarning = (fps: number) => {
    setPerformanceWarning(
      `Performance warning: FPS dropped to ${fps}. Target is ${targetFPS} FPS for VR.`
    );
    setTimeout(() => setPerformanceWarning(null), 5000);
  };

  useEffect(() => {
    // Auto-select first model on mount
    if (!selectedModel && demoModels.length > 0) {
      setSelectedModel(demoModels[0].url);
    }
  }, []);

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>3D Facility View</h2>

        <button
          onClick={handleVRToggle}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: vrMode ? '#FF5722' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {vrMode ? (
            <>
              <Eye size={20} />
              Switch to Desktop View
            </>
          ) : (
            <>
              <Glasses size={20} />
              Enable VR Mode
            </>
          )}
        </button>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ marginRight: '0.5rem' }}>Load Model:</label>
          <select
            value={selectedModel || ''}
            onChange={(e) => setSelectedModel(e.target.value || null)}
            style={{ padding: '0.5rem', minWidth: '200px' }}
          >
            <option value="">-- Select a model --</option>
            {demoModels.map((model) => (
              <option key={model.url} value={model.url}>
                {model.name}
              </option>
            ))}
          </select>

          {selectedModel && (
            <button onClick={reload} style={{ padding: '0.5rem 1rem' }}>
              Reload
            </button>
          )}
        </div>

        <HeatmapControls
          enabled={heatmapEnabled}
          metric={heatmapMetric}
          onToggle={() => setHeatmapEnabled(!heatmapEnabled)}
          onMetricChange={setHeatmapMetric}
        />
      </div>

      {performanceWarning && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#FFF3CD',
            color: '#856404',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {performanceWarning}
        </div>
      )}

      <div style={{
        flex: 1,
        border: '1px solid #ddd',
        borderRadius: '8px',
        background: '#f5f5f5',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {vrMode && isVRSupported ? (
          <VRScene
            enableControllers
            enableHandTracking={false}
            targetFrameRate={targetFPS}
            onPerformanceWarning={handlePerformanceWarning}
          >
            <VRNavigationController speed={2.0} rotationSpeed={1.5} teleportEnabled />

            {selectedModel && !error && (
              <GLTFModel
                url={selectedModel}
                position={[0, 0, 0]}
                scale={1}
                autoRotate={false}
              />
            )}

            <HeatmapOverlay
              data={heatmapData}
              metric={heatmapMetric}
              enabled={heatmapEnabled}
              interpolationRadius={5.0}
              opacity={0.7}
            />
          </VRScene>
        ) : (
          <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} />

            <Grid infiniteGrid cellSize={1} cellThickness={0.5} sectionSize={5} />
            <OrbitControls makeDefault />

            {selectedModel && !error && (
              <GLTFModel
                url={selectedModel}
                position={[0, 0, 0]}
                scale={1}
                autoRotate={false}
              />
            )}

            <HeatmapOverlay
              data={heatmapData}
              metric={heatmapMetric}
              enabled={heatmapEnabled}
              interpolationRadius={5.0}
              opacity={0.7}
            />
          </Canvas>
        )}

        <VRStatusBadge capabilities={capabilities} />

        {showVRFallback && (
          <VRFallbackUI
            capabilities={capabilities}
            onDismiss={() => setShowVRFallback(false)}
          />
        )}

        <AssetLoadingIndicator
          isLoading={isLoading}
          progress={progress}
          error={error}
          assetName={demoModels.find(m => m.url === selectedModel)?.name}
          onRetry={reload}
        />

        {heatmapEnabled && !heatmapLoading && (
          <HeatmapLegend
            metric={heatmapMetric}
            minValue={minValue}
            maxValue={maxValue}
          />
        )}
      </div>
    </div>
  );
}

export default ThreeDView;
