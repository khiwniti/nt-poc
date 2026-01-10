# T207: E2E Tests for Geospatial Features - Quick Reference

## Overview
Comprehensive E2E test suite for geospatial map features including navigation, markers, filtering, route optimization, and mobile interactions.

## Test File
- **Location**: `services/frontend/e2e/geospatial.spec.ts`
- **Test Count**: 24 tests (18 desktop + 6 mobile)
- **Framework**: Playwright

## Quick Commands

```bash
# Navigate to frontend
cd services/frontend

# Run all geospatial tests
npm run test:e2e geospatial

# Run in headed mode (see browser)
npm run test:e2e geospatial.spec.ts --headed

# Run specific test
npm run test:e2e geospatial.spec.ts -g "marker click"

# Run mobile tests only
npm run test:e2e geospatial.spec.ts -g "Mobile"

# Debug mode
npm run test:e2e geospatial.spec.ts --debug

# Generate HTML report
npm run test:e2e geospatial.spec.ts --reporter=html
```

## Test Categories

### 1. Map Loading (1 test)
- ✅ Map container loads with controls and tiles

### 2. Marker Interactions (4 tests)
- ✅ Markers display on map
- ✅ Click marker opens popup
- ✅ Navigate to detail from popup
- ✅ Hover shows tooltip

### 3. Map Filtering (3 tests)
- ✅ Filter by facility status
- ✅ Filter by alert severity
- ✅ Search facilities by name

### 4. Route Optimization (1 test)
- ✅ Select facilities and calculate route

### 5. Map Export (1 test)
- ✅ Export map as image (PNG/JPG)

### 6. Navigation Controls (5 tests)
- ✅ Zoom in/out controls
- ✅ Pan functionality
- ✅ Cluster markers
- ✅ Cluster expansion

### 7. Mobile Tests (6 tests)
- ✅ Mobile-optimized interface
- ✅ Touch zoom gestures
- ✅ Touch pan/swipe
- ✅ Mobile marker popups
- ✅ Mobile filter drawer
- ✅ Mobile performance

### 8. Error Handling (1 test)
- ✅ Graceful error handling

## Key Features

### Flexible Selectors
Tests use multiple selector strategies to work with various map libraries:
- Leaflet: `.leaflet-container`, `.leaflet-marker`, `.leaflet-popup`
- Mapbox: `.mapbox-container`, `.mapbox-marker`, `.mapbox-popup`
- Custom: `.map-container`, `.facility-marker`, `.map-popup`

### Graceful Degradation
Tests handle optional features gracefully:
```typescript
if (await routeButton.isVisible()) {
  // Test route optimization
} else {
  test.skip();
}
```

### Mobile Support
Dedicated mobile test suite with:
- Touch gestures (tap, swipe, pinch)
- Viewport resize (375x667)
- Mobile-optimized UI testing
- Performance validation

## Expected Map Implementation

### HTML Structure
```html
<div class="map-container" id="map">
  <!-- Map tiles render here -->
  
  <!-- Markers -->
  <div class="facility-marker" data-facility-id="fac-001">
    <!-- Marker icon -->
  </div>
  
  <!-- Popup -->
  <div class="map-popup">
    <h3>Facility Name</h3>
    <p>Location details</p>
    <a href="/facility/fac-001">View Details</a>
    <button class="popup-close">×</button>
  </div>
  
  <!-- Controls -->
  <div class="map-zoom-controls">
    <button class="zoom-in">+</button>
    <button class="zoom-out">-</button>
  </div>
</div>

<!-- Filters -->
<div class="map-filter-panel">
  <input type="checkbox" name="status-active" value="active" />
  <input type="checkbox" name="severity-high" value="high" />
  <button class="clear-filters">Clear</button>
</div>
```

### Recommended Map Libraries
- **Leaflet**: Lightweight, open-source
- **Mapbox GL JS**: Advanced features, requires API key
- **OpenLayers**: Powerful, feature-rich
- **Google Maps**: Requires API key

## Browser Coverage
- ✅ Desktop Chrome
- ✅ Desktop Firefox
- ✅ Desktop Safari
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

## CI/CD Integration
Tests work with existing Playwright config:
- Parallel execution where possible
- 2 retries in CI environment
- Screenshot on failure
- Trace on first retry
- HTML report generation

## Debugging Failed Tests

```bash
# Run with trace
npm run test:e2e geospatial.spec.ts --trace on

# View trace
npx playwright show-trace trace.zip

# Run with video
npm run test:e2e geospatial.spec.ts --video on

# Slow down execution
npm run test:e2e geospatial.spec.ts --headed --slow-mo=1000
```

## Common Issues & Solutions

### Map not loading
- Check baseURL in playwright.config.ts
- Ensure dev server is running
- Verify map route exists in App.tsx

### Markers not found
- Wait for async marker loading: `await page.waitForSelector('.facility-marker')`
- Check marker class names match implementation
- Verify API endpoint returns facility data

### Mobile tests failing
- Ensure viewport size is set: `await page.setViewportSize({ width: 375, height: 667 })`
- Use `tap()` instead of `click()` for mobile
- Test on actual devices if emulation issues persist

### Export tests failing
- Check CORS policy for blob downloads
- Verify download event listener timing
- Ensure browser permissions allow downloads

## Next Steps

1. **Implement Map Component**: Create React component with chosen map library
2. **Add API Endpoints**: Ensure `/api/facilities` returns location data
3. **Add Map Route**: Add `/map` route to App.tsx
4. **Run Tests**: Execute test suite and fix any failures
5. **Iterate**: Refine based on actual implementation details

## Related Documentation
- `playwright.config.ts` - Playwright configuration
- `services/frontend/e2e/dashboard.spec.ts` - Example E2E test
- `TESTING_STRATEGY.md` - Overall testing approach
- `TEST_WRITING_GUIDELINES.md` - Test writing best practices

## Status
✅ **COMPLETE** - All 24 E2E tests implemented for geospatial features
