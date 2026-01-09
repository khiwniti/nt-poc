import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { GLTFModel } from '../components/GLTFModel';
import { AssetLoadingIndicator } from '../components/AssetLoadingIndicator';
import { useAssetLoader } from '../hooks/useAssetLoader';

function ThreeDView() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const { isLoading, progress, error, reload } = useAssetLoader({
    url: selectedModel,
    enabled: !!selectedModel,
  });

  const demoModels = [
    { name: 'Zone Model', url: '/assets/models/zone.glb' },
    { name: 'Battery Model', url: '/assets/models/battery.glb' },
    { name: 'Facility Element', url: '/assets/models/facility.glb' },
  ];

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h2>3D Facility View</h2>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem' }}>Load Model:</label>
        <select
          value={selectedModel || ''}
          onChange={(e) => setSelectedModel(e.target.value || null)}
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
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

      <div style={{ 
        flex: 1,
        border: '1px solid #ddd', 
        borderRadius: '8px',
        background: '#f5f5f5',
        position: 'relative',
      }}>
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
        </Canvas>

        <AssetLoadingIndicator
          isLoading={isLoading}
          progress={progress}
          error={error}
          assetName={demoModels.find(m => m.url === selectedModel)?.name}
          onRetry={reload}
        />
      </div>
    </div>
  );
}

export default ThreeDView;
