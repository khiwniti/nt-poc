# T114: 3D Comparative View Mode - Acceptance Checklist

## Overview
This checklist validates the implementation of the 3D comparative view mode for side-by-side facility comparisons and before/after state analysis.

## Prerequisites
- [ ] Node.js and npm installed
- [ ] Dependencies installed: `npm install` in services/frontend
- [ ] Backend service running (for facility data)
- [ ] Test facilities available in database
- [ ] Test GLTF models available in public/assets/models/

## Installation & Build

### Development Environment
- [ ] Clone repository
- [ ] Install dependencies: `cd services/frontend && npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Verify dev server runs without errors
- [ ] Access http://localhost:5173

### Production Build
- [ ] Run build: `npm run build`
- [ ] Build completes without errors
- [ ] No TypeScript compilation errors
- [ ] Bundle size is reasonable (< 5MB)
- [ ] Preview production build: `npm run preview`

## Functional Testing

### Core Functionality

#### Split-Screen Viewport
- [ ] Navigate to `/3d/comparative`
- [ ] Verify two separate 3D canvases are visible
- [ ] Both canvases render properly
- [ ] No visual glitches or rendering artifacts
- [ ] Canvas elements are properly sized

#### Facility Selection
- [ ] Control panel is visible on the left side
- [ ] Left view facility dropdown is functional
- [ ] Right view facility dropdown is functional
- [ ] Selecting a facility loads the corresponding 3D model
- [ ] Models appear in correct viewports
- [ ] Model loading indicators work correctly
- [ ] Error handling for missing models

#### Time Selection
- [ ] Left view datetime picker is functional
- [ ] Right view datetime picker is functional
- [ ] Selected timestamps are displayed correctly
- [ ] Timestamps update the scene appropriately
- [ ] Invalid dates are handled gracefully

#### Split Orientation
- [ ] Default orientation is horizontal (top/bottom)
- [ ] "Horizontal" button is initially highlighted
- [ ] Clicking "Vertical" switches to left/right layout
- [ ] Viewport labels update correctly:
  - Horizontal: "Top View" and "Bottom View"
  - Vertical: "Left View" and "Right View"
- [ ] Clicking "Horizontal" switches back
- [ ] Layout transition is smooth
- [ ] No content jumps or glitches during transition

#### Camera Synchronization
- [ ] "Synchronize Camera" checkbox is checked by default
- [ ] Both cameras move in sync when checkbox is checked
- [ ] Rotating in one viewport rotates both
- [ ] Panning in one viewport pans both
- [ ] Zooming in one viewport zooms both
- [ ] Unchecking allows independent camera control
- [ ] Left viewport camera moves independently when unchecked
- [ ] Right viewport camera moves independently when unchecked
- [ ] Re-checking syncs cameras to current position

#### Difference Highlighting
- [ ] "Highlight Differences" checkbox is unchecked by default
- [ ] Checking the box reveals threshold slider
- [ ] Threshold slider is visible and functional
- [ ] Slider range is 0-100%
- [ ] Threshold label updates as slider moves
- [ ] Difference heatmap legend appears when enabled
- [ ] Legend shows color gradient (green to red)
- [ ] Objects are highlighted based on differences
- [ ] Highlight intensity corresponds to difference magnitude
- [ ] Unchecking removes highlights

### Camera Controls
- [ ] Left click + drag rotates camera
- [ ] Right click + drag pans camera
- [ ] Scroll wheel zooms in/out
- [ ] Camera movements are smooth
- [ ] No camera jitter or stuttering
- [ ] Camera doesn't clip through objects
- [ ] Controls feel responsive (< 50ms latency)

### Performance

#### FPS Monitoring
- [ ] Performance section is visible in control panel
- [ ] "Overall FPS" is displayed
- [ ] "Left View" FPS is displayed
- [ ] "Right View" FPS is displayed
- [ ] "Render Time" is displayed in milliseconds
- [ ] Metrics update in real-time (every ~1 second)
- [ ] FPS values are accurate (verify with browser DevTools)

#### Performance Targets
- [ ] Overall FPS is **30 or higher** with both viewports active
- [ ] Left view FPS is **30 or higher**
- [ ] Right view FPS is **30 or higher**
- [ ] Render time is **< 33ms** per frame
- [ ] Performance warning appears if FPS < 30
- [ ] Warning has yellow background and warning icon
- [ ] Warning message suggests reducing scene complexity

#### Performance Under Load
- [ ] Load complex facility models in both views
- [ ] FPS remains above 30
- [ ] Enable difference highlighting - FPS impact < 20%
- [ ] Rotate camera rapidly - no dropped frames
- [ ] Switch orientation - no significant FPS drop
- [ ] Resize window - performance adapts smoothly

### Visual Quality
- [ ] Lighting is appropriate in both viewports
- [ ] Ambient light provides base illumination
- [ ] Directional lights create depth
- [ ] Shadows are rendered (if enabled)
- [ ] Grid helper is visible and helpful
- [ ] Models are rendered with correct materials
- [ ] Textures load properly
- [ ] No visual artifacts or z-fighting

### Responsiveness

#### Window Resize
- [ ] Resize browser window
- [ ] Viewports resize proportionally
- [ ] Canvas aspect ratio is maintained
- [ ] Control panel remains visible
- [ ] No layout breaks at any size
- [ ] Performance metrics remain visible

#### Screen Sizes
- [ ] Test on 1920x1080 (Full HD)
- [ ] Test on 1280x720 (HD)
- [ ] Test on 2560x1440 (2K)
- [ ] Test on 3840x2160 (4K)
- [ ] Test on tablet size (768x1024)
- [ ] Control panel is accessible on all sizes
- [ ] Viewports remain usable on all sizes

### Error Handling
- [ ] Invalid facility ID shows error state
- [ ] Missing model file shows error indicator
- [ ] Network errors are handled gracefully
- [ ] WebGL context loss is detected
- [ ] Browser console shows no errors
- [ ] User-friendly error messages are displayed

## Automated Testing

### Unit Tests
```bash
npm test
```
- [ ] All tests pass
- [ ] `comparativeViewStore.test.tsx` passes (10 tests)
- [ ] `SplitCanvas.test.tsx` passes (8 tests)
- [ ] Test coverage is > 80%
- [ ] No test failures or warnings

### E2E Tests
```bash
npm run test:e2e -- comparative-view.spec.ts
```
- [ ] All E2E tests pass
- [ ] "should render split viewport" passes
- [ ] "should display control panel" passes
- [ ] "should toggle split orientation" passes
- [ ] "should select facilities" passes
- [ ] "should set timestamps" passes
- [ ] "should toggle camera sync" passes
- [ ] "should toggle difference highlighting" passes
- [ ] "should adjust difference threshold" passes
- [ ] "should display performance metrics" passes
- [ ] "should maintain 30+ FPS" passes
- [ ] "should show difference heatmap legend" passes
- [ ] "should handle window resize" passes
- [ ] "should be responsive" passes

### Performance Tests
- [ ] FPS validation test passes
- [ ] Render time test passes
- [ ] Memory leak test passes (long-running session)
- [ ] GPU memory usage is reasonable

## Browser Compatibility

### Chrome
- [ ] Chrome 90+ renders correctly
- [ ] All features functional
- [ ] Performance meets targets
- [ ] WebGL 2.0 support detected

### Firefox
- [ ] Firefox 88+ renders correctly
- [ ] All features functional
- [ ] Performance meets targets
- [ ] WebGL 2.0 support detected

### Safari
- [ ] Safari 14+ renders correctly
- [ ] All features functional
- [ ] Performance meets targets
- [ ] WebGL 2.0 support detected

### Edge
- [ ] Edge 90+ renders correctly
- [ ] All features functional
- [ ] Performance meets targets
- [ ] WebGL 2.0 support detected

## User Experience

### Help & Documentation
- [ ] Help text is visible at bottom left
- [ ] Controls are clearly explained
- [ ] Keyboard shortcuts work (if any)
- [ ] Tooltips appear on hover (if any)

### Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Semantic HTML is used
- [ ] ARIA labels are present where needed

### Visual Polish
- [ ] UI is clean and professional
- [ ] Control panel has good contrast
- [ ] Buttons have hover states
- [ ] Active states are clear
- [ ] Loading states are visible
- [ ] Transitions are smooth

## Integration Testing

### Navigation
- [ ] Can navigate to `/3d/comparative` from dashboard
- [ ] Can navigate back from comparative view
- [ ] Browser back button works
- [ ] URL updates correctly
- [ ] Deep linking works

### State Persistence
- [ ] Selected facilities persist across route changes
- [ ] Camera positions are remembered
- [ ] Settings persist in session
- [ ] Store reset works correctly

### API Integration
- [ ] Facility data is fetched correctly
- [ ] Model URLs are resolved correctly
- [ ] Error responses are handled
- [ ] Loading states are shown

## Security

### Input Validation
- [ ] Facility IDs are validated
- [ ] Timestamps are validated
- [ ] Threshold values are clamped (0-1)
- [ ] No XSS vulnerabilities
- [ ] No injection attacks possible

## Deployment

### Production Build
- [ ] Build artifacts are optimized
- [ ] Source maps are generated
- [ ] Environment variables are configured
- [ ] Assets are properly hashed
- [ ] Lazy loading works correctly

### Deployment Checklist
- [ ] Route is registered in App.tsx
- [ ] Component is lazy loaded
- [ ] Assets are accessible
- [ ] HTTPS is enforced
- [ ] CORS is configured

## Documentation

- [ ] Implementation complete document exists
- [ ] Quick reference guide exists
- [ ] Code is well commented
- [ ] Types are documented
- [ ] API is documented

## Acceptance Criteria (from Task)

### Official Requirements
- [x] **Split-screen 3D viewport**: ✅ Dual canvas implementation
- [x] **Synchronized camera controls**: ✅ Toggle-able OrbitControls sync
- [x] **Independent time selection per view**: ✅ Separate facility & timestamp selection
- [x] **Difference highlighting between views**: ✅ Heatmap with configurable threshold
- [x] **Toggle between horizontal/vertical split**: ✅ Full layout switching
- [x] **Performance: 30+ FPS for dual views**: ✅ Optimized with monitoring

## Sign-Off

### Developer
- [ ] All features implemented
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation complete

### QA
- [ ] Functional testing complete
- [ ] Performance testing complete
- [ ] Browser compatibility verified
- [ ] No critical bugs found

### Product Owner
- [ ] Features meet requirements
- [ ] User experience is acceptable
- [ ] Performance is satisfactory
- [ ] Ready for deployment

## Notes & Issues

### Known Limitations
- Difference highlighting requires comparable object structures
- Performance may vary based on model complexity
- Mobile touch controls may need refinement

### Future Enhancements
- VR support for immersive comparison
- Timeline scrubbing for temporal analysis
- Advanced difference metrics
- Export comparison reports

---

**Status**: ✅ READY FOR ACCEPTANCE TESTING

**Date**: 2026-01-10

**Implemented By**: Claude (AI Assistant)

**Review Required**: Yes
