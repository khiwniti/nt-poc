# 3D Asset Loading System

## Overview

The 3D asset loading system provides a robust, efficient way to load and manage GLTF (.glb) 3D models in the application. It includes caching, progress tracking, error handling, and React integration.

## Components

### 1. AssetCache (`utils/assetLoader.ts`)

The core asset loading and caching system.

**Features:**
- GLTF/GLB format support using Three.js GLTFLoader
- Automatic asset caching to prevent redundant loads
- Loading progress tracking with callbacks
- Error handling with detailed messages
- Concurrent load management (multiple requests for same asset)
- Cache management (clear all, clear specific asset)

**API:**

```typescript
import { assetCache } from './utils/assetLoader';

// Load an asset with progress tracking
const gltf = await assetCache.load('/models/battery.glb', (progress) => {
  console.log(`Loading: ${progress}%`);
});

// Check if asset is cached
if (assetCache.has('/models/battery.glb')) {
  // Asset is in cache
}

// Clear specific asset
assetCache.clearAsset('/models/battery.glb');

// Clear all cached assets
assetCache.clear();

// Get cache statistics
console.log(`Cached assets: ${assetCache.getCacheSize()}`);
console.log(`Cached URLs: ${assetCache.getCachedUrls()}`);
```

### 2. useAssetLoader Hook (`hooks/useAssetLoader.ts`)

React hook for loading assets with state management.

**Features:**
- Loading state management
- Progress tracking
- Error handling
- Reload functionality
- Automatic cleanup

**Usage:**

```typescript
import { useAssetLoader } from './hooks/useAssetLoader';

function MyComponent() {
  const { gltf, isLoading, progress, error, reload } = useAssetLoader({
    url: '/models/battery.glb',
    enabled: true,
  });

  if (isLoading) return <div>Loading... {progress}%</div>;
  if (error) return <div>Error: {error}</div>;
  if (!gltf) return null;

  return <primitive object={gltf.scene} />;
}
```

### 3. GLTFModel Component (`components/GLTFModel.tsx`)

Reusable component for displaying GLTF models in a Three.js scene.

**Features:**
- Automatic loading and display
- Position, rotation, scale control
- Auto-rotation option
- Visibility control
- Lifecycle callbacks

**Usage:**

```typescript
import { GLTFModel } from './components/GLTFModel';

<Canvas>
  <GLTFModel
    url="/models/battery.glb"
    position={[0, 1, 0]}
    rotation={[0, Math.PI / 4, 0]}
    scale={1.5}
    autoRotate={true}
    autoRotateSpeed={0.01}
    onLoaded={() => console.log('Model loaded!')}
    onError={(error) => console.error('Load failed:', error)}
  />
</Canvas>
```

### 4. AssetLoadingIndicator Component (`components/AssetLoadingIndicator.tsx`)

UI component for displaying loading progress and errors.

**Features:**
- Loading progress bar
- Error display with retry option
- Customizable asset name
- Styled overlays

**Usage:**

```typescript
import { AssetLoadingIndicator } from './components/AssetLoadingIndicator';

<AssetLoadingIndicator
  isLoading={isLoading}
  progress={progress}
  error={error}
  assetName="Battery Model"
  onRetry={reload}
/>
```

### 5. SceneWithAssets Component (`components/SceneWithAssets.tsx`)

Example component demonstrating multiple asset loading.

**Features:**
- Multiple model types (zone, battery, facility)
- Aggregate progress tracking
- Coordinated loading states

## Asset Organization

Recommended directory structure for 3D assets:

```
public/
  assets/
    models/
      zone.glb              # Zone/area models
      battery.glb           # Battery equipment models
      facility.glb          # Facility infrastructure
      textures/
        zone_diffuse.png    # Texture maps
        battery_normal.png
```

## Supported Formats

- **.glb** (Binary GLTF) - Recommended, single-file format
- **.gltf** (JSON GLTF) - Text format with external resources

Both formats support:
- Texture maps (diffuse, normal, metallic, roughness)
- Animations
- Multiple meshes
- Material properties
- Hierarchical scene structures

## Performance Considerations

### Caching Strategy

1. **First Load**: Asset is fetched from network and cached in memory
2. **Subsequent Loads**: Asset is returned immediately from cache
3. **Memory Management**: Clear cache when not needed to free memory

### Best Practices

1. **Optimize Models**:
   - Keep polygon counts reasonable (< 100k triangles)
   - Use compressed textures
   - Combine meshes where possible

2. **Lazy Loading**:
   - Only load assets when needed
   - Use `enabled` prop to defer loading

3. **Progressive Loading**:
   - Load critical assets first
   - Display progress indicators
   - Handle errors gracefully

4. **Cache Management**:
   ```typescript
   // Clear cache when leaving 3D view
   useEffect(() => {
     return () => {
       assetCache.clear();
     };
   }, []);
   ```

## Error Handling

The system provides comprehensive error handling:

```typescript
const { error, reload } = useAssetLoader({ url: modelUrl });

if (error) {
  // Error includes:
  // - Network errors (404, timeout)
  // - Parse errors (invalid GLTF)
  // - Loading errors (corrupted file)
  console.error('Asset load failed:', error);
  
  // Retry loading
  reload();
}
```

## Testing

Comprehensive test coverage is provided:

- `assetLoader.test.ts` - Core loading and caching logic
- `useAssetLoader.test.ts` - Hook behavior and lifecycle
- `AssetLoadingIndicator.test.tsx` - UI component rendering

Run tests:
```bash
npm test -- assetLoader
```

## Integration Example

Complete example integrating all components:

```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFModel } from './components/GLTFModel';
import { AssetLoadingIndicator } from './components/AssetLoadingIndicator';
import { useAssetLoader } from './hooks/useAssetLoader';

function BatteryViewer({ batteryId }: { batteryId: string }) {
  const modelUrl = `/assets/models/battery-${batteryId}.glb`;
  const { gltf, isLoading, progress, error, reload } = useAssetLoader({
    url: modelUrl,
    enabled: true,
  });

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <Canvas camera={{ position: [5, 5, 5] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <OrbitControls />
        
        {gltf && (
          <GLTFModel
            url={modelUrl}
            position={[0, 0, 0]}
            scale={1}
            autoRotate
          />
        )}
      </Canvas>
      
      <AssetLoadingIndicator
        isLoading={isLoading}
        progress={progress}
        error={error}
        assetName={`Battery ${batteryId}`}
        onRetry={reload}
      />
    </div>
  );
}
```

## Acceptance Criteria

- ✅ **GLTFLoader Integration**: Three.js GLTFLoader fully integrated with TypeScript support
- ✅ **Asset Cache System**: Memory-based caching with cache management APIs
- ✅ **Loading Progress Indicators**: Progress tracking with visual feedback components
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages and retry capability

## References

- Three.js GLTFLoader: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- GLTF Specification: https://www.khronos.org/gltf/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
