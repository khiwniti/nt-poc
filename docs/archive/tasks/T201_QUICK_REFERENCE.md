# T201: Map Layer Controls - Quick Reference

## Files

**Components:**
- `services/frontend/src/components/geospatial/MapLayerControls.tsx`
- `services/frontend/src/components/geospatial/__tests__/MapLayerControls.test.tsx`

**Hooks:**
- `services/frontend/src/hooks/useMapLayers.ts`
- `services/frontend/src/hooks/__tests__/useMapLayers.test.ts`

**Pages:**
- `services/frontend/src/pages/GeospatialDashboard.tsx` (demo)

**Modified:**
- `services/frontend/src/components/geospatial/FacilityMap.tsx` (added layer controls support)

## Quick Start

```tsx
import { FacilityMap } from './components/geospatial/FacilityMap';
import { useMapLayers } from './hooks/useMapLayers';

function MyMap() {
  const { layers, toggleLayer, savePreferences } = useMapLayers();
  
  return (
    <FacilityMap
      facilities={myFacilities}
      showLayerControls={true}
      layers={layers}
      onLayerToggle={toggleLayer}
      onSaveLayerPreferences={savePreferences}
    />
  );
}
```

## Layer Types

- **Heatmap**: Thermal data overlay (🌡️)
- **Weather**: Weather conditions (☁️)
- **Clustering**: Marker grouping (📍)
- **Traffic**: Traffic conditions (🚦)

## Testing

```bash
# Run all layer control tests
cd services/frontend
npm test -- MapLayerControls.test.tsx --run

# Run hook tests
npm test -- useMapLayers.test.ts --run

# Run all tests
npm test -- --run
```

**Results:** 56/56 tests passing ✅

## Key Features

1. **Collapsible Panel** - Click "Layers" button to toggle
2. **4 Layer Toggles** - Independent on/off switches
3. **Save Preferences** - Persists to localStorage
4. **Auto-load** - Restores preferences on mount
5. **Unsaved Indicator** - Visual feedback for changes
6. **Accessibility** - Full ARIA support, keyboard nav

## LocalStorage

Key: `map_layer_preferences`
```json
{
  "heatmap": false,
  "weather": true,
  "clustering": true,
  "traffic": false
}
```

## Hook API

```tsx
const {
  layers,              // LayerPreferences object
  toggleLayer,         // (layer: string) => void
  setLayers,           // (layers: LayerPreferences) => void
  resetLayers,         // () => void
  savePreferences,     // () => void
  hasUnsavedChanges    // boolean
} = useMapLayers(initialLayers?, autoLoad?);
```

## TypeScript Types

```tsx
interface LayerPreferences {
  heatmap: boolean;
  weather: boolean;
  clustering: boolean;
  traffic: boolean;
}

interface MapLayerControlsProps {
  layers: LayerPreferences;
  onLayerToggle: (layer: keyof LayerPreferences) => void;
  onSavePreferences?: () => void;
  className?: string;
}
```

## Common Tasks

### Add to Existing Map
```tsx
// Add to FacilityMap props
<FacilityMap
  // ... existing props
  showLayerControls={true}
  layers={layers}
  onLayerToggle={toggleLayer}
  onSaveLayerPreferences={savePreferences}
/>
```

### Standalone Controls
```tsx
<MapLayerControls
  layers={layers}
  onLayerToggle={handleToggle}
/>
```

### Manual State
```tsx
const [layers, setLayers] = useState({
  heatmap: false,
  weather: false,
  clustering: true,
  traffic: false
});
```

### Listen to Changes
```tsx
useEffect(() => {
  console.log('Active layers:', Object.keys(layers).filter(k => layers[k]));
}, [layers]);
```

## Demo Page

View complete implementation:
```
/services/frontend/src/pages/GeospatialDashboard.tsx
```

Run the app and navigate to the dashboard to see controls in action.
