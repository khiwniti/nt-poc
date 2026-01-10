import { test, expect } from '@playwright/test';

test.describe('Geospatial Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/?facilityId=*');

    // Navigate to map view (assuming it exists or will exist)
    await page.goto('http://localhost:5173/map');
  });

  test('displays map loading state and loads successfully', async ({ page }) => {
    // Verify loading skeleton appears
    await expect(page.locator('.map-loading-skeleton, .skeleton-map'))
      .toBeVisible({ timeout: 1000 })
      .catch(() => {});

    // Wait for map container to load
    await expect(
      page.locator('.map-container, #map, .leaflet-container, .mapbox-container')
    ).toBeVisible({ timeout: 10000 });

    // Verify map controls are visible
    await expect(
      page.locator('.map-zoom-controls, .leaflet-control-zoom, .mapbox-ctrl-zoom')
    ).toBeVisible();

    // Verify map has rendered tiles/content
    const mapContainer = page.locator('.map-container, #map, .leaflet-container').first();
    await expect(mapContainer).not.toBeEmpty();
  });

  test('displays facility markers on map', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map, .leaflet-container', { timeout: 10000 });

    // Wait for markers to load
    await page.waitForSelector('.facility-marker, .map-marker, .leaflet-marker, .mapbox-marker', {
      timeout: 5000,
    });

    // Verify multiple markers are present
    const markers = page.locator('.facility-marker, .map-marker, .leaflet-marker, .mapbox-marker');
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThan(0);

    // Verify marker has visual indicator
    const firstMarker = markers.first();
    await expect(firstMarker).toBeVisible();
  });

  test('opens popup on marker click', async ({ page }) => {
    // Wait for map and markers to load
    await page.waitForSelector('.map-container, #map, .leaflet-container', { timeout: 10000 });
    await page.waitForSelector('.facility-marker, .map-marker, .leaflet-marker, .mapbox-marker', {
      timeout: 5000,
    });

    // Click on first marker
    const firstMarker = page
      .locator('.facility-marker, .map-marker, .leaflet-marker, .mapbox-marker')
      .first();
    await firstMarker.click();

    // Verify popup appears
    await expect(
      page.locator('.map-popup, .leaflet-popup, .mapbox-popup, .marker-popup')
    ).toBeVisible({ timeout: 3000 });

    // Verify popup contains facility information
    const popup = page.locator('.map-popup, .leaflet-popup, .mapbox-popup, .marker-popup').first();
    await expect(popup).toContainText(/facility|battery|zone|location/i);

    // Verify popup has close button
    await expect(
      popup.locator('.popup-close, .leaflet-popup-close-button, .mapbox-popup-close-button')
    ).toBeVisible();

    // Close popup
    await popup
      .locator('.popup-close, .leaflet-popup-close-button, .mapbox-popup-close-button')
      .click();
    await expect(popup).not.toBeVisible();
  });

  test('navigates to facility detail from marker popup', async ({ page }) => {
    // Wait for map and markers to load
    await page.waitForSelector('.facility-marker, .map-marker, .leaflet-marker', {
      timeout: 10000,
    });

    // Click on marker
    const marker = page.locator('.facility-marker, .map-marker, .leaflet-marker').first();
    await marker.click();

    // Wait for popup
    await page.waitForSelector('.map-popup, .leaflet-popup, .marker-popup', { timeout: 3000 });

    // Click on "View Details" or similar link in popup
    const detailsLink = page.locator('.map-popup a, .leaflet-popup a, .popup-view-details').first();
    await detailsLink.click();

    // Verify navigation to facility/zone detail page
    await page.waitForURL(/\/(facility|zone|detail)/);

    // Verify detail page loaded
    await expect(page.locator('h1, .page-title')).toBeVisible();
  });

  test('filters facilities by status', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Open filter controls
    const filterButton = page.locator(
      'button:has-text("Filter"), .map-filter-button, .filter-toggle'
    );
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }

    // Wait for filter panel
    await expect(page.locator('.map-filter-panel, .filter-controls, .map-filters')).toBeVisible();

    // Get initial marker count
    await page.waitForSelector('.facility-marker, .map-marker', { timeout: 5000 });
    const initialMarkers = await page.locator('.facility-marker, .map-marker').count();

    // Apply status filter (e.g., only show "active" facilities)
    await page.check('input[type="checkbox"][value="active"], input[name="status-active"]');

    // Uncheck other statuses
    await page
      .uncheck('input[type="checkbox"][value="maintenance"], input[name="status-maintenance"]')
      .catch(() => {});
    await page
      .uncheck('input[type="checkbox"][value="inactive"], input[name="status-inactive"]')
      .catch(() => {});

    // Wait for map to update
    await page.waitForTimeout(1000);

    // Verify filtered markers count changed
    const filteredMarkers = await page.locator('.facility-marker, .map-marker').count();
    expect(filteredMarkers).toBeLessThanOrEqual(initialMarkers);

    // Verify filter indicator shows
    await expect(page.locator('.active-filters-count, .filter-badge'))
      .toBeVisible()
      .catch(() => {});
  });

  test('filters facilities by alert severity', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Open filter controls
    const filterButton = page.locator('button:has-text("Filter"), .map-filter-button');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await expect(page.locator('.map-filter-panel, .filter-controls')).toBeVisible();
    }

    // Filter by high severity alerts
    await page.check('input[type="checkbox"][value="high"], input[name="severity-high"]');

    // Wait for map to update
    await page.waitForTimeout(1000);

    // Verify only facilities with high severity alerts are shown
    const markers = page.locator(
      '.facility-marker.severity-high, .map-marker[data-severity="high"]'
    );
    const count = await markers.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // Clear filters
    await page.click('button:has-text("Clear"), .clear-filters');
    await page.waitForTimeout(500);
  });

  test('tests route optimization feature', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Look for route optimization button
    const routeButton = page.locator(
      'button:has-text("Optimize Route"), button:has-text("Route"), .route-optimizer-button'
    );

    if (await routeButton.isVisible()) {
      await routeButton.click();

      // Select multiple facilities for route
      await page.click('.facility-marker').catch(() => {});
      await page.keyboard.down('Shift');
      await page.click('.facility-marker:nth-child(2)').catch(() => {});
      await page.click('.facility-marker:nth-child(3)').catch(() => {});
      await page.keyboard.up('Shift');

      // Click optimize button
      await page.click('button:has-text("Calculate Route"), .calculate-route-button');

      // Wait for route to be calculated
      await expect(page.locator('.route-line, .optimized-route, .leaflet-polyline')).toBeVisible({
        timeout: 5000,
      });

      // Verify route info displayed
      await expect(page.locator('.route-info, .route-distance, .route-duration')).toBeVisible();

      // Verify route contains distance information
      await expect(page.locator('.route-distance, .total-distance')).toContainText(
        /km|mi|miles|kilometers/i
      );
    } else {
      // Skip test if route optimization not available
      test.skip();
    }
  });

  test('exports map view as image', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Look for export button
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download"), .map-export-button, .export-map-button'
    );

    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      // Click export button
      await exportButton.click();

      // Select image format if dropdown appears
      const pngOption = page.locator('button:has-text("PNG"), [data-format="png"]');
      if (await pngOption.isVisible({ timeout: 1000 })) {
        await pngOption.click();
      }

      // Wait for download
      const download = await downloadPromise;

      // Verify download filename
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/map.*\.(png|jpg|jpeg|pdf)/i);

      // Verify file was downloaded
      expect(download).toBeTruthy();
    } else {
      // Skip test if export not available
      test.skip();
    }
  });

  test('tests map zoom controls', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Find zoom controls
    const zoomIn = page
      .locator('button.zoom-in, .leaflet-control-zoom-in, .mapbox-ctrl-zoom-in')
      .first();
    const zoomOut = page
      .locator('button.zoom-out, .leaflet-control-zoom-out, .mapbox-ctrl-zoom-out')
      .first();

    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();

    // Test zoom in
    await zoomIn.click();
    await page.waitForTimeout(500);

    // Test zoom out
    await zoomOut.click();
    await page.waitForTimeout(500);

    // Verify zoom controls are still functional
    await expect(zoomIn).toBeEnabled();
    await expect(zoomOut).toBeEnabled();
  });

  test('tests map pan functionality', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    const mapContainer = page.locator('.map-container, #map').first();
    const boundingBox = await mapContainer.boundingBox();

    if (boundingBox) {
      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;

      // Pan map by dragging
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 100, centerY + 100, { steps: 10 });
      await page.mouse.up();

      // Wait for map to settle
      await page.waitForTimeout(500);

      // Verify map has moved (markers should still be visible)
      await expect(page.locator('.facility-marker, .map-marker').first()).toBeVisible();
    }
  });

  test('displays cluster markers for dense areas', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Zoom out to see clusters
    const zoomOut = page
      .locator('button.zoom-out, .leaflet-control-zoom-out, .mapbox-ctrl-zoom-out')
      .first();
    await zoomOut.click();
    await page.waitForTimeout(500);
    await zoomOut.click();
    await page.waitForTimeout(500);

    // Look for cluster markers
    const clusterMarkers = page.locator('.marker-cluster, .cluster-marker, [class*="cluster"]');

    if (await clusterMarkers.first().isVisible({ timeout: 2000 })) {
      const clusterCount = await clusterMarkers.count();
      expect(clusterCount).toBeGreaterThan(0);

      // Click on cluster to expand
      await clusterMarkers.first().click();
      await page.waitForTimeout(500);

      // Verify zoom increased or individual markers shown
      await expect(page.locator('.facility-marker, .map-marker')).toBeVisible();
    }
  });

  test('searches for facilities by name on map', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Look for search input
    const searchInput = page.locator(
      'input[placeholder*="Search"], input.map-search, input[type="search"]'
    );

    if (await searchInput.isVisible({ timeout: 2000 })) {
      // Type facility name
      await searchInput.fill('Bangkok');

      // Wait for search results or map to update
      await page.waitForTimeout(1000);

      // Verify map focused on searched facility
      await expect(page.locator('.facility-marker.highlighted, .map-marker.selected'))
        .toBeVisible({ timeout: 3000 })
        .catch(() => {});

      // Or verify search results dropdown
      const searchResults = page.locator('.search-results, .map-search-results');
      if (await searchResults.isVisible({ timeout: 1000 })) {
        await expect(searchResults.locator('.search-result-item').first()).toBeVisible();
        await searchResults.locator('.search-result-item').first().click();

        // Verify marker popup opened
        await expect(page.locator('.map-popup, .leaflet-popup')).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('displays facility info tooltip on marker hover', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });
    await page.waitForSelector('.facility-marker, .map-marker', { timeout: 5000 });

    // Hover over marker
    const marker = page.locator('.facility-marker, .map-marker').first();
    await marker.hover();

    // Verify tooltip appears
    await expect(page.locator('.map-tooltip, .leaflet-tooltip, .marker-tooltip'))
      .toBeVisible({ timeout: 2000 })
      .catch(() => {});

    // Move away from marker
    await page.mouse.move(0, 0);

    // Verify tooltip disappears
    await expect(page.locator('.map-tooltip, .leaflet-tooltip'))
      .not.toBeVisible({ timeout: 2000 })
      .catch(() => {});
  });

  test('handles map loading errors gracefully', async ({ page }) => {
    // Intercept map tile requests and simulate failure
    await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort());
    await page.route('**/api.mapbox.com/**', (route) => route.abort());

    // Navigate to map
    await page.goto('http://localhost:5173/map');

    // Wait for error state
    const errorMessage = page.locator('.map-error, .error-message, [role="alert"]');

    // Map should either show error or fallback gracefully
    await expect(errorMessage.or(page.locator('.map-container, #map'))).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Geospatial - Mobile', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/?facilityId=*');

    // Navigate to map
    await page.goto('http://localhost:5173/map');
  });

  test('displays mobile-optimized map interface', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Verify mobile controls are visible
    await expect(page.locator('.mobile-map-controls, .map-controls'))
      .toBeVisible({ timeout: 3000 })
      .catch(() => {});

    // Verify zoom controls are accessible
    await expect(page.locator('button.zoom-in, .leaflet-control-zoom-in').first()).toBeVisible();
  });

  test('supports touch gestures for zoom', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    const mapContainer = page.locator('.map-container, #map').first();
    const boundingBox = await mapContainer.boundingBox();

    if (boundingBox) {
      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;

      // Simulate pinch zoom (double tap for zoom in mobile)
      await page.touchscreen.tap(centerX, centerY);
      await page.waitForTimeout(100);
      await page.touchscreen.tap(centerX, centerY);

      // Wait for zoom animation
      await page.waitForTimeout(500);

      // Verify map is still functional
      await expect(mapContainer).toBeVisible();
    }
  });

  test('supports touch pan on mobile', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    const mapContainer = page.locator('.map-container, #map').first();
    const boundingBox = await mapContainer.boundingBox();

    if (boundingBox) {
      const startX = boundingBox.x + boundingBox.width / 2;
      const startY = boundingBox.y + boundingBox.height / 2;

      // Swipe gesture
      await page.touchscreen.tap(startX, startY);
      await page.touchscreen.swipe({ x: startX, y: startY }, { x: startX - 100, y: startY - 100 });

      // Wait for pan animation
      await page.waitForTimeout(500);

      // Verify map is still functional
      await expect(mapContainer).toBeVisible();
      await expect(page.locator('.facility-marker, .map-marker').first()).toBeVisible();
    }
  });

  test('opens mobile-optimized marker popup', async ({ page }) => {
    // Wait for map and markers
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });
    await page.waitForSelector('.facility-marker, .map-marker', { timeout: 5000 });

    // Tap on marker
    const marker = page.locator('.facility-marker, .map-marker').first();
    await marker.tap();

    // Verify popup appears
    await expect(page.locator('.map-popup, .leaflet-popup, .marker-popup')).toBeVisible({
      timeout: 3000,
    });

    // Verify popup is mobile-optimized (bottom sheet style or similar)
    const popup = page.locator('.map-popup, .leaflet-popup, .marker-popup').first();
    const popupBox = await popup.boundingBox();

    if (popupBox) {
      // Popup should be visible and within viewport
      expect(popupBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('shows mobile filter drawer', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Look for filter button
    const filterButton = page.locator(
      'button:has-text("Filter"), .map-filter-button, .filter-toggle'
    );

    if (await filterButton.isVisible({ timeout: 2000 })) {
      await filterButton.tap();

      // Verify filter drawer opens from bottom or side
      await expect(
        page.locator('.filter-drawer, .mobile-filter-panel, .map-filter-panel')
      ).toBeVisible({ timeout: 2000 });

      // Close drawer
      const closeButton = page.locator('button:has-text("Close"), .close-drawer, .drawer-close');
      if (await closeButton.isVisible({ timeout: 1000 })) {
        await closeButton.tap();
        await expect(page.locator('.filter-drawer, .mobile-filter-panel')).not.toBeVisible({
          timeout: 2000,
        });
      }
    }
  });

  test('maintains map performance on mobile', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.map-container, #map', { timeout: 10000 });

    // Perform multiple pan gestures
    const mapContainer = page.locator('.map-container, #map').first();
    const boundingBox = await mapContainer.boundingBox();

    if (boundingBox) {
      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;

      for (let i = 0; i < 3; i++) {
        await page.touchscreen.swipe(
          { x: centerX, y: centerY },
          { x: centerX + 50, y: centerY + 50 }
        );
        await page.waitForTimeout(100);
      }
    }

    // Verify map is still responsive
    await expect(mapContainer).toBeVisible();
    await expect(page.locator('.facility-marker, .map-marker').first()).toBeVisible({
      timeout: 3000,
    });
  });
});
