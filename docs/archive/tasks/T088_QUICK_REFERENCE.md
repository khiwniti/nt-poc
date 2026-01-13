# T088 - US2: Raycasting Implementation - Quick Reference

## Overview
Implemented raycasting for zone/battery selection in the 3D scene using Three.js Raycaster.

## Files Created
- `services/frontend/src/components/3D/InteractionManager.tsx` - Main raycasting component
- `services/frontend/src/components/3D/index.ts` - Export file
- `services/frontend/src/components/__tests__/InteractionManager.test.tsx` - Unit tests

## Key Features

### InteractionManager Component
- **Raycaster-based selection**: Uses Three.js Raycaster for mouse interactions
- **Hover detection**: Changes cursor to pointer on hover
- **Click handling**: Separate callbacks for zone and battery clicks
- **Event cleanup**: Proper event listener cleanup on unmount

### useRaycast Hook
- Reusable hook for custom raycast implementations
- Accepts normalized device coordinates (-1 to +1)
- Returns intersection results

## Usage Example

```typescript
import { InteractionManager } from '@/components/3D';
import { Canvas } from '@react-three/fiber';

function Scene() {
  const zones = [
    { id: 'zone-1', mesh: zoneMeshRef.current },
    { id: 'zone-2', mesh: zoneMeshRef2.current },
  ];
  
  const batteries = [
    { id: 'battery-1', mesh: batteryMeshRef.current },
    { id: 'battery-2', mesh: batteryMeshRef2.current },
  ];

  return (
    <Canvas>
      <InteractionManager
        zones={zones}
        batteries={batteries}
        onZoneClick={(zoneId) => console.log('Zone clicked:', zoneId)}
        onBatteryClick={(batteryId) => console.log('Battery clicked:', batteryId)}
      />
      {/* Your 3D scene */}
    </Canvas>
  );
}
```

### Using the Hook

```typescript
import { useRaycast } from '@/components/3D';

function CustomComponent() {
  const raycast = useRaycast();
  
  const handleCustomRaycast = (x: number, y: number, objects: Mesh[]) => {
    const intersections = raycast(x, y, objects);
    if (intersections.length > 0) {
      console.log('Hit:', intersections[0].object);
    }
  };
  
  return null;
}
```

## API Reference

### InteractionManager Props

```typescript
interface InteractionManagerProps {
  onZoneClick?: (zoneId: string) => void;
  onBatteryClick?: (batteryId: string) => void;
  zones: Array<{ id: string; mesh: Mesh }>;
  batteries: Array<{ id: string; mesh: Mesh }>;
}
```

### useRaycast Hook

```typescript
const raycast = useRaycast();
// Returns: (x: number, y: number, objects: Mesh[]) => Intersection[]
```

**Parameters:**
- `x`: Normalized device coordinate X (-1 to +1)
- `y`: Normalized device coordinate Y (-1 to +1)
- `objects`: Array of Three.js meshes to check intersections

**Returns:** Array of Three.js Intersection objects

## Implementation Details

### Raycaster Setup
- Created using `new Raycaster()` in a ref to persist across renders
- Updated via `setFromCamera()` with normalized mouse coordinates
- Checks intersections with `intersectObjects(objects, recursive: true)`

### Event Handling
- `pointermove`: Updates raycaster and checks for hover
- `click`: Triggers appropriate callback based on hovered object
- Event listeners attached to canvas DOM element
- Proper cleanup in useEffect return function

### Coordinate Conversion
Mouse coordinates are converted from screen space to normalized device coordinates:
```typescript
mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
```

## Testing
- 3 passing unit tests
- Tests verify component structure and prop handling
- Tests avoid rendering Canvas (no ResizeObserver in jsdom)

## Run Tests
```bash
cd services/frontend
npm test -- InteractionManager.test.tsx
```

## Acceptance Criteria Status
- ✅ Raycaster for mouse interactions
- ✅ Hover detection with cursor change
- ✅ Click detection for zones/batteries
- ✅ Event delegation and cleanup
- ✅ Reusable raycast hook

## Integration Notes
- Component must be used inside `@react-three/fiber` Canvas
- Requires mesh refs to be passed from parent components
- Returns `null` (doesn't render any visible elements)
- Handles both direct mesh hits and child mesh hits

## Performance Considerations
- Raycaster instances are reused (stored in refs)
- Event listeners attached once per component instance
- Intersection checks only on pointer move and click
- Recursive intersection checking enabled for complex mesh hierarchies

## Next Steps
1. Integrate with Zone3DView component (T089)
2. Add visual feedback for hover state (T089)
3. Connect to state management for selection handling
4. Add performance optimization if needed (object culling)

## References
- Three.js Raycaster: https://threejs.org/docs/#api/en/core/Raycaster
- @react-three/fiber hooks: https://docs.pmnd.rs/react-three-fiber/api/hooks
- Spec: spec.md (US2: Click Interaction)
- Plan: plan.md (Three.js integration)
