# T107: 3D Heatmap Overlay - Quick Reference

## User Guide

### Enabling Heatmap
1. Navigate to 3D View page
2. Check "Heatmap Overlay" checkbox
3. Select desired metric (Temperature/Voltage/SoC/SoH)

### Metric Selection
- **Temperature**: Shows thermal distribution (°C)
- **Voltage**: Shows electrical potential distribution (V)
- **SoC**: Shows State of Charge distribution (%)
- **SoH**: Shows State of Health distribution (%)

### Legend
- Located bottom-right corner
- Shows color gradient and value ranges
- Updates in real-time (5s intervals)

## Developer Guide

### Quick Start
```tsx
import { HeatmapOverlay, type HeatmapMetric } from '@/components/HeatmapOverlay';
import { useHeatmapData } from '@/hooks/useHeatmapData';

const { data, minValue, maxValue } = useHeatmapData({ 
  metric: 'temperature',
  facilityId: 'my-facility',
  updateInterval: 5000 
});

<HeatmapOverlay
  data={data}
  metric="temperature"
  enabled={true}
  interpolationRadius={5.0}
  opacity={0.7}
/>
```

### API Endpoints (To Implement)
```
GET /api/facilities/{facilityId}/sensors
Response: {
  sensors: [{
    id: string,
    position: [x, y, z],
    temperature: number,
    voltage: number,
    soc: number,
    soh: number
  }]
}
```

### Customization
**Color Gradients**: Edit `gradientPresets` in `HeatmapOverlay.tsx`
**Data Points**: Max 100 (shader limit), edit shader for more
**Update Interval**: Pass to `useHeatmapData` hook
**Interpolation**: Adjust `interpolationRadius` prop

## Testing

### Run Unit Tests
```bash
npm test HeatmapControls
npm test HeatmapLegend
npm test useHeatmapData
```

### Run E2E Tests
```bash
npm run test:e2e -- heatmap-overlay.spec.ts
```

### Manual Testing Checklist
- [ ] Toggle on/off
- [ ] Switch between all 4 metrics
- [ ] Verify legend updates
- [ ] Check VR mode compatibility
- [ ] Test with different models
- [ ] Verify keyboard navigation

## Troubleshooting

**Heatmap not visible?**
- Check "enabled" prop is true
- Verify data array is not empty
- Check interpolationRadius is appropriate for data spacing

**Poor performance?**
- Reduce update interval (increase updateInterval value)
- Lower opacity
- Reduce number of data points

**Colors wrong?**
- Verify metric matches data
- Check minValue/maxValue calculations
- Review gradient color arrays

## Architecture

```
ThreeDView
├── HeatmapControls (UI)
│   ├── Toggle checkbox
│   └── Metric buttons
├── Canvas
│   └── HeatmapOverlay (Shader)
│       ├── Data from useHeatmapData
│       └── Real-time rendering
└── HeatmapLegend (UI)
    ├── Color scale
    └── Value ranges
```

## Key Files
- `HeatmapOverlay.tsx`: Core shader implementation
- `HeatmapControls.tsx`: UI controls
- `HeatmapLegend.tsx`: Legend display
- `useHeatmapData.ts`: Data management
- `ThreeDView.tsx`: Integration point
