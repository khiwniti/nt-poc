# T104 US2: 3D Accessibility Architecture

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         ThreeDView Page                            │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    User Interface Layer                       │ │
│  │  ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐ │ │
│  │  │ Accessibility  │  │   VR Toggle      │  │   Heatmap    │ │ │
│  │  │ Button         │  │   Button         │  │   Controls   │ │ │
│  │  └────────────────┘  └──────────────────┘  └──────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     3D Canvas (React Three Fiber)            │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │              KeyboardNavigationWrapper                  │ │ │
│  │  │  ┌──────────────────────────────────────────────────┐  │ │ │
│  │  │  │        useKeyboardNavigation3D Hook             │  │ │ │
│  │  │  │  • Arrow key controls (rotate/pan)              │  │ │ │
│  │  │  │  • Zoom controls (+/-)                          │  │ │ │
│  │  │  │  • Zone cycling (Tab/Shift+Tab)                 │  │ │ │
│  │  │  │  • Selection (Enter/Space)                      │  │ │ │
│  │  │  └──────────────────────────────────────────────────┘  │ │ │
│  │  │                                                          │ │ │
│  │  │  ┌──────────────────────────────────────────────────┐  │ │ │
│  │  │  │         OrbitControls (Camera Control)          │  │ │ │
│  │  │  └──────────────────────────────────────────────────┘  │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │ │
│  │  │ Accessible3D   │  │ Accessible3D   │  │Accessible3D  │ │ │
│  │  │ Zone A         │  │ Zone B         │  │Zone C        │ │ │
│  │  │ (Normal)       │  │ (Warning)      │  │(Critical)    │ │ │
│  │  └────────────────┘  └────────────────┘  └──────────────┘ │ │
│  │         ↓                    ↓                   ↓          │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │         useAccessible3DZone Hook                    │   │ │
│  │  │  • Generate ARIA labels                             │   │ │
│  │  │  • Zone announcements                               │   │ │
│  │  │  • Status descriptions                              │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Overlay Components Layer                        │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  AccessibilityControlPanel (Floating Panel)            │ │ │
│  │  │  • Color scheme selector                               │ │ │
│  │  │  • High contrast toggle                                │ │ │
│  │  │  • Keyboard navigation settings                        │ │ │
│  │  │  • Screen reader options                               │ │ │
│  │  │  • Visual options                                      │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  ScreenReaderAnnouncer (Live Region)                  │ │ │
│  │  │  • role="status"                                       │ │ │
│  │  │  • aria-live="polite"                                  │ │ │
│  │  │  • Announces navigation & selections                   │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  Keyboard Shortcuts Help (Bottom Overlay)              │ │ │
│  │  │  "Press ? for keyboard shortcuts"                      │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                       State Management Layer                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              useAccessibilityStore (Zustand)                 │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  State:                                                 │ │ │
│  │  │  • highContrastEnabled: boolean                        │ │ │
│  │  │  • colorScheme: 'standard' | 'high-contrast' | ...    │ │ │
│  │  │  • keyboardNavigationEnabled: boolean                  │ │ │
│  │  │  • screenReaderOptimized: boolean                      │ │ │
│  │  │  • reduceMotion: boolean                               │ │ │
│  │  │  • show3DLabels: boolean                               │ │ │
│  │  │  • use3DOutlines: boolean                              │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  Actions:                                               │ │ │
│  │  │  • setHighContrastEnabled()                            │ │ │
│  │  │  • setColorScheme()                                    │ │ │
│  │  │  • setKeyboardNavigationEnabled()                      │ │ │
│  │  │  • toggleHighContrast()                                │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  Persisted to localStorage as 'accessibility-settings'      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Keyboard Input Flow
```
User Keyboard Input
    ↓
KeyboardNavigationWrapper (listens to 'keydown')
    ↓
useKeyboardNavigation3D (processes key)
    ↓
Camera/Controls Update
    ↓
Announcement Generated
    ↓
ScreenReaderAnnouncer (announces via live region)
```

### 2. Zone Selection Flow
```
User Action (Tab/Click)
    ↓
setSelectedZoneIndex(index)
    ↓
generateZoneAnnouncement()
    ↓
setAnnouncement(message)
    ↓
ScreenReaderAnnouncer renders
    ↓
Screen Reader announces to user
```

### 3. Color Scheme Change Flow
```
User changes color scheme
    ↓
AccessibilityControlPanel (onChange event)
    ↓
useAccessibilityStore.setColorScheme()
    ↓
Store updates (persisted to localStorage)
    ↓
Accessible3DZone re-renders with new colors
    ↓
Visual updates reflected in 3D scene
```

## Component Hierarchy

```
ThreeDView
├── div (header)
│   ├── h2 ("3D Facility View")
│   └── div (buttons)
│       ├── button (Accessibility)
│       └── button (VR Mode)
├── div (controls)
│   ├── select (model selector)
│   └── HeatmapControls
├── div (canvas container)
│   ├── Canvas
│   │   ├── ambientLight
│   │   ├── directionalLight (x2)
│   │   ├── Grid
│   │   ├── KeyboardNavigationWrapper
│   │   │   └── OrbitControls
│   │   ├── GLTFModel (optional)
│   │   ├── Accessible3DZone (Zone A)
│   │   ├── Accessible3DZone (Zone B)
│   │   ├── Accessible3DZone (Zone C)
│   │   └── HeatmapOverlay
│   ├── VRStatusBadge
│   ├── AssetLoadingIndicator
│   ├── HeatmapLegend (conditional)
│   ├── ScreenReaderAnnouncer
│   ├── AccessibilityControlPanel (conditional)
│   └── div (keyboard shortcuts help)
└── (VRFallbackUI - conditional)
```

## Event Flow

### Keyboard Events
```
window.addEventListener('keydown')
    ↓
Switch on event.key
    ↓
┌─────────────┬──────────────┬─────────────┬──────────────┐
│ Arrow Keys  │ +/- Keys     │ Tab Key     │ Enter/Space  │
│ (Rotate)    │ (Zoom)       │ (Cycle)     │ (Select)     │
└─────────────┴──────────────┴─────────────┴──────────────┘
    ↓               ↓              ↓              ↓
Update Camera   Update Camera  Select Next   Activate Zone
& Controls      Position       Zone Index    & Announce
    ↓               ↓              ↓              ↓
Announce        Announce       Announce      Announce
Action          Action         Zone Info     Activation
```

## Accessibility Features Map

```
WCAG 2.1 AA Requirement          Implementation
─────────────────────────────────────────────────────────
1.1.1 Non-text Content        → ARIA labels on zones
1.3.1 Info/Relationships      → Semantic HTML, roles
1.4.3 Contrast (Minimum)      → High contrast mode
1.4.11 Non-text Contrast      → 3:1 ratio outlines
2.1.1 Keyboard                → Full keyboard nav
2.1.2 No Keyboard Trap        → Proper focus management
2.4.3 Focus Order             → Logical tab sequence
2.4.7 Focus Visible           → Visual focus indicators
3.1.1 Language of Page        → HTML lang attribute
3.2.1 On Focus                → No unexpected changes
3.3.1 Error Identification    → Clear error messages
3.3.2 Labels/Instructions     → Comprehensive labels
4.1.2 Name, Role, Value       → Proper ARIA attributes
4.1.3 Status Messages         → Live region announcements
```

## Technology Stack

```
┌─────────────────────────────────────────────┐
│              React 18.2.0                   │
├─────────────────────────────────────────────┤
│  React Three Fiber 8.18.0                   │
│  @react-three/drei 9.122.0                  │
├─────────────────────────────────────────────┤
│  Three.js 0.182.0                           │
├─────────────────────────────────────────────┤
│  Zustand 4.4.7 (State)                      │
├─────────────────────────────────────────────┤
│  Lucide React (Icons)                       │
└─────────────────────────────────────────────┘

Testing Stack:
├── Vitest (Unit Tests)
├── @testing-library/react
├── Playwright (E2E)
├── @axe-core/playwright
└── vitest-axe
```

## File Organization

```
services/frontend/src/
├── components/
│   ├── Accessible3DZone.tsx          ← 3D zone with a11y
│   ├── AccessibilityControlPanel.tsx  ← Settings UI
│   ├── ScreenReaderAnnouncer.tsx     ← Live announcements
│   └── __tests__/
│       ├── AccessibilityControlPanel.test.tsx
│       └── AccessibilityControlPanel.a11y.test.tsx
├── hooks/
│   ├── useKeyboardNavigation3D.ts     ← Keyboard controls
│   ├── useAccessible3DZone.ts         ← Zone helpers
│   └── __tests__/
│       └── useKeyboardNavigation3D.test.ts
├── stores/
│   └── accessibilityStore.ts          ← Global a11y state
└── pages/
    └── ThreeDView.tsx                 ← Main integration

e2e/
└── accessibility/
    └── 3d-view-a11y.spec.ts          ← E2E tests
```

## Integration Points

```
External Systems:
├── Three.js Scene Graph
│   └── Camera, Controls, Objects
├── Browser APIs
│   ├── KeyboardEvent
│   ├── MediaQuery (prefers-*)
│   └── localStorage
└── Screen Readers
    ├── NVDA
    ├── JAWS
    └── VoiceOver

Internal Systems:
├── VR System (VRScene)
├── Heatmap System
├── Asset Loading System
└── Alert System
```

## Performance Considerations

```
Optimization Strategy:
├── Event Debouncing
│   └── Keyboard events processed at 60fps
├── Lazy State Updates
│   └── Only update when values change
├── Efficient Re-renders
│   └── Memoized color calculations
└── Minimal Bundle Impact
    └── Tree-shakeable exports
```

## Future Extensibility

```
Planned Extensions:
├── Voice Commands
│   └── Web Speech API integration
├── Gesture Support
│   └── Touch gesture navigation
├── Haptic Feedback
│   └── VR controller vibration
└── Audio Descriptions
    └── Spatial audio cues
```
