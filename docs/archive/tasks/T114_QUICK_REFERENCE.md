# T114: 3D Comparative View - Quick Reference

## Access
**URL**: `/3d/comparative`

## Key Components

### Main Components
- `ComparativeView3D` - Main page component
- `SplitCanvas` - Dual viewport renderer
- `ComparativeControlPanel` - UI controls
- `DifferenceHighlight` - Difference visualization

### Store
```typescript
import { useComparativeViewStore } from '@/stores/comparativeViewStore';

const {
  leftView,
  rightView,
  splitOrientation,
  syncCamera,
  showDifferences,
  setLeftView,
  setRightView,
  toggleSyncCamera,
} = useComparativeViewStore();
```

## Quick Usage

### Select Facilities
```typescript
setLeftView({ facilityId: 'facility-1' });
setRightView({ facilityId: 'facility-2' });
```

### Set Timestamps
```typescript
setLeftView({ timestamp: new Date('2024-01-01') });
setRightView({ timestamp: new Date('2024-01-02') });
```

### Toggle Split Orientation
```typescript
setSplitOrientation('horizontal'); // Top/Bottom
setSplitOrientation('vertical');   // Left/Right
```

### Camera Sync
```typescript
toggleSyncCamera(); // Enable/disable sync
```

### Difference Highlighting
```typescript
toggleShowDifferences();
setDifferenceThreshold(0.5); // 0-1 range
```

## Performance Monitoring

### Access Metrics
```typescript
const { performanceMetrics } = useComparativeViewStore();

console.log(performanceMetrics.fps);          // Overall FPS
console.log(performanceMetrics.leftViewFps);  // Left viewport FPS
console.log(performanceMetrics.rightViewFps); // Right viewport FPS
console.log(performanceMetrics.renderTime);   // Frame render time
```

### Custom Performance Hook
```typescript
import { useComparativePerformance } from '@/hooks/useComparativePerformance';

useComparativePerformance({
  enabled: true,
  updateInterval: 1000,
  targetFps: 30,
  onPerformanceWarning: (fps) => {
    console.warn(`FPS dropped to ${fps}`);
  },
});
```

## Testing

### Unit Tests
```bash
npm test -- comparativeViewStore.test.tsx
npm test -- SplitCanvas.test.tsx
```

### E2E Tests
```bash
npm run test:e2e -- comparative-view.spec.ts
```

### Performance Validation
```bash
# Check FPS >= 30 in dual viewport
npm run test:e2e -- comparative-view.spec.ts -g "maintain 30+ FPS"
```

## File Structure
```
src/
├── pages/
│   └── ComparativeView3D.tsx
├── components/
│   ├── SplitCanvas.tsx
│   ├── ComparativeControlPanel.tsx
│   └── DifferenceHighlight.tsx
├── stores/
│   └── comparativeViewStore.ts
├── hooks/
│   └── useComparativePerformance.ts
└── types/
    └── comparativeView.ts
```

## Common Patterns

### Full Setup Example
```typescript
function ComparativeViewExample() {
  const {
    setLeftView,
    setRightView,
    setSplitOrientation,
    toggleSyncCamera,
    toggleShowDifferences,
  } = useComparativeViewStore();

  useEffect(() => {
    // Configure left view
    setLeftView({
      facilityId: 'facility-a',
      timestamp: new Date('2024-01-01'),
    });

    // Configure right view
    setRightView({
      facilityId: 'facility-b',
      timestamp: new Date('2024-01-15'),
    });

    // Set vertical split
    setSplitOrientation('vertical');

    // Enable camera sync
    // (Already enabled by default)

    // Enable differences
    toggleShowDifferences();
  }, []);

  return <ComparativeView3D />;
}
```

### Custom Scene Content
```typescript
<SplitCanvas
  leftView={
    <>
      <GLTFModel url="/models/facility-old.glb" />
      <CustomAnnotations />
    </>
  }
  rightView={
    <>
      <GLTFModel url="/models/facility-new.glb" />
      <CustomAnnotations />
    </>
  }
/>
```

## Troubleshooting

### Low FPS
- Reduce scene complexity
- Disable difference highlighting
- Check GPU capabilities
- Monitor browser performance tab

### Camera Not Syncing
- Verify `syncCamera` is true
- Check OrbitControls integration
- Ensure both canvases are mounted

### Differences Not Showing
- Enable `showDifferences`
- Adjust `differenceThreshold`
- Verify objects have comparable properties
- Check console for errors

## Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Requires WebGL 2.0

## Performance Targets
- Overall FPS: **30+**
- Render Time: **< 33ms**
- Memory: **< 512MB** per viewport
