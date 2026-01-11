import { useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
import { useKeyboardNavigation3D } from '../hooks/useKeyboardNavigation3D';
import { ScreenReaderAnnouncer } from '../components/ScreenReaderAnnouncer';
import { AccessibilityControlPanel } from '../components/AccessibilityControlPanel';
import { Accessible3DZone } from '../components/Accessible3DZone';
import { useAccessibilityStore } from '../stores/accessibilityStore';
import { generateZoneAnnouncement } from '../hooks/useAccessible3DZone';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Component to handle keyboard navigation inside Canvas
function KeyboardNavigationWrapper({ 
  onZoneSelect, 
  onAnnouncement 
}: { 
  onZoneSelect: (index: number) => void;
  onAnnouncement: (msg: string) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const cameraRef = useRef(camera);
  const { keyboardNavigationEnabled } = useAccessibilityStore();

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const { setTotalZones } = useKeyboardNavigation3D(controlsRef, cameraRef, {
    enabled: keyboardNavigationEnabled,
    onZoneSelect,
    onAnnouncement,
  });

  useEffect(() => {
    // Set demo zones count
    setTotalZones(3);
  }, [setTotalZones]);

  return <OrbitControls ref={controlsRef} makeDefault />;
}

function ThreeDView() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [vrMode, setVRMode] = useState(false);
  const [showVRFallback, setShowVRFallback] = useState(false);
  const [performanceWarning, setPerformanceWarning] = useState<string | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('temperature');
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number>(-1);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showA11yPanel, setShowA11yPanel] = useState(false);

  const { highContrastEnabled, colorScheme } = useAccessibilityStore();

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

  // Demo zones for accessibility testing
  const demoZones = [
    { id: 'zone-1', name: 'Zone A', status: 'normal' as const, position: [-2, 0, 0] as [number, number, number], temperature: 22, batteryLevel: 85, alertCount: 0 },
    { id: 'zone-2', name: 'Zone B', status: 'warning' as const, position: [0, 0, 0] as [number, number, number], temperature: 28, batteryLevel: 45, alertCount: 2 },
    { id: 'zone-3', name: 'Zone C', status: 'critical' as const, position: [2, 0, 0] as [number, number, number], temperature: 35, batteryLevel: 15, alertCount: 5 },
  ];

  const handleZoneSelect = (index: number) => {
    setSelectedZoneIndex(index);
    if (index >= 0 && index < demoZones.length) {
      const zone = demoZones[index];
      const announcement = generateZoneAnnouncement({
        zoneId: zone.id,
        zoneName: zone.name,
        status: zone.status,
        temperature: zone.temperature,
        batteryLevel: zone.batteryLevel,
        alertCount: zone.alertCount,
        position: zone.position,
      });
      setAnnouncement(announcement);
    } else if (index === -1) {
      setAnnouncement('Zone deselected');
    }
  };

  const handleAnnouncement = (message: string) => {
    setAnnouncement(message);
  };

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

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowA11yPanel(!showA11yPanel)}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              backgroundColor: highContrastEnabled ? '#000' : '#4CAF50',
              color: highContrastEnabled ? '#FFF' : 'white',
              border: highContrastEnabled ? '2px solid #FFF' : 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            aria-label="Toggle accessibility settings panel"
            aria-expanded={showA11yPanel}
          >
            <Eye size={20} />
            Accessibility
          </button>

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
            aria-label={vrMode ? 'Switch to Desktop View' : 'Enable VR Mode'}
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
        background: highContrastEnabled ? '#000' : '#f5f5f5',
        position: 'relative',
        overflow: 'hidden',
      }}
      role="application"
      aria-label="3D facility visualization"
      tabIndex={0}
      >
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
            <KeyboardNavigationWrapper 
              onZoneSelect={handleZoneSelect}
              onAnnouncement={handleAnnouncement}
            />

            {selectedModel && !error && (
              <GLTFModel
                url={selectedModel}
                position={[0, 0, 0]}
                scale={1}
                autoRotate={false}
              />
            )}

            {/* Demo accessible zones */}
            {demoZones.map((zone, index) => (
              <Accessible3DZone
                key={zone.id}
                zoneId={zone.id}
                zoneName={zone.name}
                status={zone.status}
                temperature={zone.temperature}
                batteryLevel={zone.batteryLevel}
                alertCount={zone.alertCount}
                position={zone.position}
                isSelected={selectedZoneIndex === index}
                onSelect={() => handleZoneSelect(index)}
              />
            ))}

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

        {/* Screen reader announcements */}
        <ScreenReaderAnnouncer message={announcement} priority="polite" />

        {/* Accessibility control panel */}
        {showA11yPanel && <AccessibilityControlPanel />}

        {/* Keyboard shortcuts help */}
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            padding: '0.5rem 1rem',
            background: highContrastEnabled ? '#000' : 'rgba(0, 0, 0, 0.7)',
            color: highContrastEnabled ? '#FFF' : '#fff',
            border: highContrastEnabled ? '2px solid #FFF' : 'none',
            borderRadius: '6px',
            fontSize: '0.85rem',
            maxWidth: '300px',
          }}
          role="status"
          aria-label="Keyboard navigation instructions"
        >
          Press <kbd style={{ 
            padding: '2px 6px', 
            background: highContrastEnabled ? '#FFF' : '#fff', 
            color: highContrastEnabled ? '#000' : '#000', 
            borderRadius: '3px' 
          }}>?</kbd> for keyboard shortcuts
        </div>
      </div>
    </div>
  );
}

export default ThreeDView;
