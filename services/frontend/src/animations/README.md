# Animation System

A comprehensive animation system for zone state transitions using React Spring and Three.js.

## Features

✅ **React Spring Integration with Three.js**
- Seamless integration of React Spring animations with Three.js meshes
- Smooth, physics-based animations with configurable easing

✅ **Color Transition Animations (300ms duration)**
- Smooth color transitions for zone state changes
- RGB interpolation for natural color blending
- Configurable target colors with hex or named color support

✅ **Position/Scale Animations for Battery Markers**
- Animated position updates with smooth transitions
- Scale animations for visual feedback
- Combined position+scale updates for complex movements

✅ **Alert Pulse Animation (1s cycle)**
- Continuous pulse animation for alert indicators
- Configurable min/max scale and opacity
- Automatic start/stop based on alert state

✅ **Easing Functions (easeInOut)**
- Custom easeInOut implementation for smooth acceleration/deceleration
- Consistent easing across all animation types
- Configurable durations per animation type

✅ **Performance: 60 FPS maintained during animations**
- Built-in performance monitoring hook
- Real-time FPS tracking and frame time measurement
- Dropped frame detection for performance debugging

## Usage

### Basic Zone Animation

\`\`\`tsx
import { AnimatedZone, ZONE_COLORS } from './animations';

function MyScene() {
  return (
    <AnimatedZone
      zoneState={{
        color: ZONE_COLORS.green,
        position: [0, 0, 0],
        scale: [2, 2, 1],
      }}
      onTransitionComplete={() => console.log('Transition complete!')}
    />
  );
}
\`\`\`

### Battery Marker with Alert

\`\`\`tsx
import { BatteryMarker, ZONE_COLORS } from './animations';

function MyBattery() {
  return (
    <BatteryMarker
      position={[1, 2, 0]}
      hasAlert={true}
      color={ZONE_COLORS.red}
      scale={[1.5, 1.5, 1.5]}
    />
  );
}
\`\`\`

### Performance Monitoring

\`\`\`tsx
import { usePerformanceMonitor } from './animations';

function PerformanceDisplay() {
  const { metrics, isPerformant } = usePerformanceMonitor(true);

  return (
    <div>
      <p>FPS: {metrics.fps}</p>
      <p>Frame Time: {metrics.avgFrameTime}ms</p>
      <p>Status: {isPerformant ? 'Good' : 'Poor'}</p>
    </div>
  );
}
\`\`\`

### Custom Animations with Hooks

\`\`\`tsx
import { useColorTransition, usePositionScale, useAlertPulse } from './animations';

function CustomComponent() {
  const { color, updateColor } = useColorTransition({
    targetColor: '#ff0000',
  });

  const { position, updatePosition } = usePositionScale({
    initialPosition: [0, 0, 0],
  });

  const { scale, opacity } = useAlertPulse({
    enabled: true,
    minScale: 1,
    maxScale: 1.3,
  });

  return (
    <animated.mesh position={position} scale={scale}>
      <boxGeometry />
      <animated.meshStandardMaterial color={color} opacity={opacity} />
    </animated.mesh>
  );
}
\`\`\`

## Animation Configuration

All animation timings and settings are centralized in `config.ts`:

\`\`\`typescript
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
  targetFPS: 60,        // 60 FPS target
};
\`\`\`

## Zone Colors

Predefined zone colors are available:

\`\`\`typescript
export const ZONE_COLORS = {
  green: '#00ff00',
  yellow: '#ffff00',
  red: '#ff0000',
  default: '#808080',
};
\`\`\`

## Demo

A complete demo scene is available in `components/AnimationDemo.tsx` showcasing:
- Automatic zone color transitions
- Battery marker position changes
- Alert pulse animations
- Real-time performance monitoring

## Testing

Comprehensive test suite covering:
- Color transition hooks
- Position/scale animations
- Alert pulse behavior
- Performance monitoring
- Configuration values

Run tests with:
\`\`\`bash
npm test
\`\`\`

## API Reference

### Hooks

#### `useColorTransition(config: ColorTransitionConfig)`
Animates color changes for Three.js materials.

**Returns:**
- `color`: Animated color value (RGB array)
- `updateColor(newColor: string)`: Update target color

#### `usePositionScale(config?: PositionScaleConfig)`
Animates position and scale transformations.

**Returns:**
- `position`: Animated position value
- `scale`: Animated scale value
- `updatePosition(pos)`: Update position
- `updateScale(scale)`: Update scale
- `updateBoth(pos, scale)`: Update both simultaneously

#### `useAlertPulse(config?: AlertPulseConfig)`
Creates a pulsing animation for alerts.

**Returns:**
- `scale`: Animated scale value
- `opacity`: Animated opacity value
- `stop()`: Stop the animation
- `start()`: Start the animation

#### `usePerformanceMonitor(enabled: boolean)`
Monitors rendering performance.

**Returns:**
- `metrics`: Current performance metrics (fps, frameTime, droppedFrames)
- `reset()`: Reset metrics
- `isPerformant`: Boolean indicating if performance is good

### Components

#### `<AnimatedZone>`
Renders an animated 3D zone with color and transform animations.

**Props:**
- `zoneState`: Zone state including color, position, and scale
- `onTransitionComplete?`: Callback when animation completes

#### `<BatteryMarker>`
Renders an animated battery marker with alert support.

**Props:**
- `position`: 3D position
- `hasAlert?`: Whether to show alert pulse
- `color?`: Marker color
- `scale?`: Marker scale

## Performance Considerations

- All animations target 60 FPS
- Performance monitoring available to detect issues
- Animations use GPU-accelerated transforms where possible
- Easing functions optimized for smooth motion
- Alert pulses use efficient looping animations

## References

- spec.md (3D): Three.js integration details
- plan.md (3.2.3): Animation system architecture
