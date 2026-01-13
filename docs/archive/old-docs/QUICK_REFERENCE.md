# Animation System Quick Reference

## Installation
```bash
cd services/frontend
npm install --legacy-peer-deps
```

## Quick Start

### 1. Basic Zone Animation
```tsx
import { AnimatedZone, ZONE_COLORS } from './animations';

<AnimatedZone
  zoneState={{
    color: ZONE_COLORS.green,
    position: [0, 0, 0],
    scale: [2, 2, 1],
  }}
/>
```

### 2. Battery Marker with Alert
```tsx
import { BatteryMarker, ZONE_COLORS } from './animations';

<BatteryMarker
  position={[1, 2, 0]}
  hasAlert={true}
  color={ZONE_COLORS.red}
/>
```

### 3. Custom Hook Usage
```tsx
import { useColorTransition, usePositionScale, useAlertPulse } from './animations';
import { animated } from '@react-spring/three';

function MyComponent() {
  const { color, updateColor } = useColorTransition({
    targetColor: '#ff0000',
  });

  const { position, scale, updateBoth } = usePositionScale({
    initialPosition: [0, 0, 0],
    initialScale: [1, 1, 1],
  });

  const { scale: pulseScale, opacity } = useAlertPulse({
    enabled: true,
  });

  return (
    <animated.mesh position={position} scale={scale}>
      <boxGeometry />
      <animated.meshStandardMaterial 
        color={color}
        opacity={opacity}
      />
    </animated.mesh>
  );
}
```

### 4. Performance Monitoring
```tsx
import { usePerformanceMonitor } from './animations';

function PerformanceDisplay() {
  const { metrics, isPerformant } = usePerformanceMonitor(true);

  return (
    <div>
      <p>FPS: {metrics.fps}</p>
      <p>Frame Time: {metrics.avgFrameTime}ms</p>
      <p>Status: {isPerformant ? '✓ Good' : '✗ Poor'}</p>
    </div>
  );
}
```

## Configuration

All animation settings in `src/animations/config.ts`:

```typescript
export const ANIMATION_CONFIG = {
  colorTransition: {
    duration: 300,      // 300ms for color changes
    easing: 'easeInOut',
  },
  positionScale: {
    duration: 400,      // 400ms for position/scale
    easing: 'easeInOut',
  },
  alertPulse: {
    duration: 1000,     // 1s cycle for alerts
    easing: 'easeInOut',
  },
  targetFPS: 60,
};

export const ZONE_COLORS = {
  green: '#00ff00',
  yellow: '#ffff00',
  red: '#ff0000',
  default: '#808080',
};
```

## API Reference

### Hooks

#### `useColorTransition(config)`
Animates color changes for Three.js materials.

**Parameters:**
- `targetColor: string` - Initial color (hex or named)
- `onComplete?: () => void` - Callback when animation completes

**Returns:**
- `color` - Animated RGB color value
- `updateColor(newColor: string)` - Update target color

---

#### `usePositionScale(config?)`
Animates position and scale transformations.

**Parameters:**
- `initialPosition?: [number, number, number]` - Starting position
- `initialScale?: [number, number, number]` - Starting scale
- `onComplete?: () => void` - Callback when animation completes

**Returns:**
- `position` - Animated position value
- `scale` - Animated scale value
- `updatePosition(pos)` - Update position
- `updateScale(scale)` - Update scale
- `updateBoth(pos, scale)` - Update both simultaneously

---

#### `useAlertPulse(config?)`
Creates a continuous pulsing animation for alerts.

**Parameters:**
- `enabled?: boolean` - Enable/disable pulse (default: true)
- `minScale?: number` - Minimum scale (default: 1)
- `maxScale?: number` - Maximum scale (default: 1.3)

**Returns:**
- `scale` - Animated scale value
- `opacity` - Animated opacity value
- `stop()` - Stop the animation
- `start()` - Start the animation

---

#### `usePerformanceMonitor(enabled)`
Monitors rendering performance.

**Parameters:**
- `enabled: boolean` - Enable/disable monitoring

**Returns:**
- `metrics: PerformanceMetrics` - Current FPS, frame time, dropped frames
- `reset()` - Reset metrics
- `isPerformant: boolean` - True if FPS >= 54 (90% of target)

### Components

#### `<AnimatedZone>`
Renders an animated 3D zone with color and transform animations.

**Props:**
```typescript
{
  zoneState: {
    color: string;
    position?: [number, number, number];
    scale?: [number, number, number];
  };
  onTransitionComplete?: () => void;
}
```

---

#### `<BatteryMarker>`
Renders an animated battery marker with optional alert pulse.

**Props:**
```typescript
{
  position: [number, number, number];
  hasAlert?: boolean;
  color?: string;
  scale?: [number, number, number];
}
```

## Testing

Run animation tests:
```bash
npm test -- src/animations/__tests__
```

Check TypeScript:
```bash
npx tsc --noEmit src/animations/**/*.ts src/animations/**/*.tsx
```

## Examples

### Complete Demo
See `src/animations/components/AnimationDemo.tsx` for a full working example.

### Dashboard Integration
See `src/animations/components/DashboardScene.tsx` for integration with existing stores and hooks.

## Performance Tips

1. **Use performance monitoring in development**
   ```tsx
   const { metrics } = usePerformanceMonitor(true);
   ```

2. **Disable monitoring in production**
   ```tsx
   const { metrics } = usePerformanceMonitor(false);
   ```

3. **Batch updates when possible**
   ```tsx
   // Good: Update both at once
   updateBoth([1, 2, 3], [2, 2, 2]);
   
   // Avoid: Separate updates
   updatePosition([1, 2, 3]);
   updateScale([2, 2, 2]);
   ```

4. **Monitor dropped frames**
   ```tsx
   const { metrics } = usePerformanceMonitor(true);
   if (metrics.droppedFrames > 10) {
     console.warn('Performance degradation detected');
   }
   ```

## Troubleshooting

### Issue: Three.js WARNING about multiple instances
**Solution:** This is a known warning and doesn't affect functionality. It occurs during tests.

### Issue: Performance drops below 60 FPS
**Solution:** 
- Check for too many animated objects
- Use performance monitoring to identify bottlenecks
- Consider reducing animation complexity

### Issue: Colors not updating
**Solution:**
- Ensure you're calling `updateColor()` with a valid color string
- Check that the color is in hex format or a valid CSS color name

## Documentation

Full documentation available in:
- `src/animations/README.md` - Complete guide
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `ACCEPTANCE_CHECKLIST.md` - Acceptance criteria status
