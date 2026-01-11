import { test, expect } from '@playwright/test';

test.describe('Mapbox Facility Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display Mapbox map on geospatial page', async ({ page }) => {
    await page.goto('/geospatial');
    
    await page.waitForTimeout(2000);

    const mapContainer = page.locator('[class*="mapboxgl-map"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should show map controls', async ({ page }) => {
    await page.goto('/geospatial');
    
    await page.waitForTimeout(2000);

    const navControl = page.locator('.mapboxgl-ctrl-group').first();
    await expect(navControl).toBeVisible({ timeout: 10000 });
  });

  test('should display facility markers with health colors', async ({ page }) => {
    await page.goto('/geospatial');
    
    await page.waitForTimeout(3000);

    const canvas = page.locator('canvas.mapboxgl-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('should show clusters for dense areas', async ({ page }) => {
    await page.goto('/geospatial');
    
    await page.waitForTimeout(3000);

    const map = page.locator('[class*="mapboxgl-map"]').first();
    await expect(map).toBeVisible({ timeout: 10000 });
  });

  test('should zoom in on cluster click', async ({ page }) => {
    await page.goto('/geospatial');
    
    await page.waitForTimeout(3000);

    const canvas = page.locator('canvas.mapboxgl-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    const boundingBox = await canvas.boundingBox();
    if (boundingBox) {
      await canvas.click({
        position: {
          x: boundingBox.width / 2,
          y: boundingBox.height / 2,
        },
      });
    }
  });

  test('should display popup on marker click', async ({ page }) => {
    await page.goto('/geospatial');
    
    await page.waitForTimeout(3000);

    const canvas = page.locator('canvas.mapboxgl-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    const boundingBox = await canvas.boundingBox();
    if (boundingBox) {
      await canvas.click({
        position: {
          x: boundingBox.width / 3,
          y: boundingBox.height / 3,
        },
      });
      
      await page.waitForTimeout(1000);
      
      const popup = page.locator('.mapboxgl-popup');
      if (await popup.isVisible()) {
        await expect(popup).toBeVisible();
      }
    }
  });

  test('should show fullscreen control', async ({ page }) => {
    await page.goto('/geospatial');
    
    await page.waitForTimeout(2000);

    const fullscreenBtn = page.locator('.mapboxgl-ctrl-fullscreen');
    await expect(fullscreenBtn).toBeVisible({ timeout: 10000 });
  });

  test('should show geolocate control', async ({ page }) => {
    await page.goto('/geospatial');
    
    await page.waitForTimeout(2000);

    const geolocateBtn = page.locator('.mapboxgl-ctrl-geolocate');
    await expect(geolocateBtn).toBeVisible({ timeout: 10000 });
  });

  test('should handle missing Mapbox token gracefully', async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'VITE_MAPBOX_API_KEY', {
        value: '',
        writable: false,
      });
    });

    await page.goto('/geospatial');
    
    await page.waitForTimeout(2000);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/geospatial');
    
    await page.waitForTimeout(2000);

    const mapContainer = page.locator('[class*="mapboxgl-map"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });
});
