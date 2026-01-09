import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { GLTFModel } from '../components/GLTFModel';
import { useAssetLoader } from '../hooks/useAssetLoader';

export interface SceneWithAssetsProps {
  zoneModelUrl?: string;
  batteryModelUrls?: string[];
  facilityModelUrl?: string;
}

export function SceneWithAssets({
  zoneModelUrl = '/assets/models/zone.glb',
  batteryModelUrls = [
    '/assets/models/battery.glb',
  ],
  facilityModelUrl = '/assets/models/facility.glb',
}: SceneWithAssetsProps) {
  const zoneAsset = useAssetLoader({ url: zoneModelUrl });
  const facilityAsset = useAssetLoader({ url: facilityModelUrl });

  const totalAssets = 2 + batteryModelUrls.length;
  const loadedAssets = [zoneAsset, facilityAsset].filter(a => a.gltf).length;
  const loadingProgress = (loadedAssets / totalAssets) * 100;

  const hasError = zoneAsset.error || facilityAsset.error;
  const isLoading = zoneAsset.isLoading || facilityAsset.isLoading;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        
        <Grid infiniteGrid cellSize={1} cellThickness={0.5} sectionSize={5} />
        <OrbitControls makeDefault />

        {/* Zone Model */}
        {zoneAsset.gltf && (
          <GLTFModel
            url={zoneModelUrl}
            position={[0, 0, 0]}
            scale={2}
          />
        )}

        {/* Battery Models */}
        {batteryModelUrls.map((url, index) => (
          <GLTFModel
            key={url}
            url={url}
            position={[index * 3 - 3, 1, 0]}
            scale={1}
          />
        ))}

        {/* Facility Model */}
        {facilityAsset.gltf && (
          <GLTFModel
            url={facilityModelUrl}
            position={[0, 0, -5]}
            scale={1.5}
          />
        )}
      </Canvas>

      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            minWidth: '200px',
            textAlign: 'center',
          }}
        >
          <div>Loading scene assets...</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {Math.round(loadingProgress)}%
          </div>
        </div>
      )}

      {hasError && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 0, 0, 0.9)',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          Error loading some assets
        </div>
      )}
    </div>
  );
}
