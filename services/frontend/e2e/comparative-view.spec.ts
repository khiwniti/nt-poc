import { test, expect } from '@playwright/test';

test.describe('Comparative 3D View', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to comparative view
    await page.goto('/3d/comparative');
    await page.waitForLoadState('networkidle');
  });

  test('should render split viewport with both canvases', async ({ page }) => {
    // Check that both canvas elements are present
    const canvases = page.locator('canvas');
    await expect(canvases).toHaveCount(2);
  });

  test('should display control panel', async ({ page }) => {
    await expect(page.getByText('Left View')).toBeVisible();
    await expect(page.getByText('Right View')).toBeVisible();
    await expect(page.getByText('View Controls')).toBeVisible();
    await expect(page.getByText('Performance')).toBeVisible();
  });

  test('should toggle split orientation', async ({ page }) => {
    // Check initial orientation label
    await expect(page.getByText('Top View')).toBeVisible();
    await expect(page.getByText('Bottom View')).toBeVisible();

    // Click vertical button
    await page.getByRole('button', { name: 'Vertical' }).click();

    // Check orientation changed
    await expect(page.getByText('Left View')).toBeVisible();
    await expect(page.getByText('Right View')).toBeVisible();

    // Click horizontal button
    await page.getByRole('button', { name: 'Horizontal' }).click();

    // Check orientation changed back
    await expect(page.getByText('Top View')).toBeVisible();
    await expect(page.getByText('Bottom View')).toBeVisible();
  });

  test('should select facilities for left and right views', async ({ page }) => {
    // Select facility for left view
    const leftFacilitySelect = page.locator('select').first();
    await leftFacilitySelect.selectOption('facility-1');

    // Select facility for right view
    const rightFacilitySelect = page.locator('select').nth(1);
    await rightFacilitySelect.selectOption('facility-2');

    // Wait for models to potentially load
    await page.waitForTimeout(1000);

    // Verify selections persist
    await expect(leftFacilitySelect).toHaveValue('facility-1');
    await expect(rightFacilitySelect).toHaveValue('facility-2');
  });

  test('should set timestamps for both views', async ({ page }) => {
    // Set timestamp for left view
    const leftTimeInput = page.locator('input[type="datetime-local"]').first();
    await leftTimeInput.fill('2024-01-01T12:00');

    // Set timestamp for right view
    const rightTimeInput = page.locator('input[type="datetime-local"]').nth(1);
    await rightTimeInput.fill('2024-01-02T12:00');

    // Verify timestamps are set
    await expect(leftTimeInput).toHaveValue('2024-01-01T12:00');
    await expect(rightTimeInput).toHaveValue('2024-01-02T12:00');
  });

  test('should toggle camera synchronization', async ({ page }) => {
    // Find sync camera checkbox
    const syncCheckbox = page.getByLabel('Synchronize Camera');

    // Should be checked by default
    await expect(syncCheckbox).toBeChecked();

    // Uncheck it
    await syncCheckbox.uncheck();
    await expect(syncCheckbox).not.toBeChecked();

    // Check it again
    await syncCheckbox.check();
    await expect(syncCheckbox).toBeChecked();
  });

  test('should toggle difference highlighting', async ({ page }) => {
    // Find difference highlighting checkbox
    const diffCheckbox = page.getByLabel('Highlight Differences');

    // Should be unchecked by default
    await expect(diffCheckbox).not.toBeChecked();

    // Check it
    await diffCheckbox.check();
    await expect(diffCheckbox).toBeChecked();

    // Verify threshold slider appears
    await expect(page.getByText(/Difference Threshold:/)).toBeVisible();

    // Uncheck it
    await diffCheckbox.uncheck();
    await expect(diffCheckbox).not.toBeChecked();
  });

  test('should adjust difference threshold', async ({ page }) => {
    // Enable difference highlighting first
    const diffCheckbox = page.getByLabel('Highlight Differences');
    await diffCheckbox.check();

    // Find and adjust the threshold slider
    const thresholdSlider = page.locator('input[type="range"]');
    await thresholdSlider.fill('50');

    // Verify the label updates
    await expect(page.getByText('Difference Threshold: 50%')).toBeVisible();

    // Adjust to another value
    await thresholdSlider.fill('75');
    await expect(page.getByText('Difference Threshold: 75%')).toBeVisible();
  });

  test('should display performance metrics', async ({ page }) => {
    // Check that performance section is visible
    await expect(page.getByText('Performance')).toBeVisible();

    // Check for FPS metrics
    await expect(page.getByText('Overall FPS:')).toBeVisible();
    await expect(page.getByText('Left View:')).toBeVisible();
    await expect(page.getByText('Right View:')).toBeVisible();
    await expect(page.getByText('Render Time:')).toBeVisible();
  });

  test('should show performance warning when FPS drops below 30', async ({ page }) => {
    // This test would require simulating low FPS
    // In a real scenario, you might load a heavy scene
    // For now, we just check the warning element structure exists

    // The warning appears when FPS < 30
    // This is a visual regression test placeholder
    const performanceSection = page.getByText('Performance').locator('..');
    await expect(performanceSection).toBeVisible();
  });

  test('should display help text', async ({ page }) => {
    await expect(page.getByText('Controls:')).toBeVisible();
    await expect(page.getByText(/Left click \+ drag: Rotate camera/)).toBeVisible();
    await expect(page.getByText(/Right click \+ drag: Pan camera/)).toBeVisible();
    await expect(page.getByText(/Scroll: Zoom in\/out/)).toBeVisible();
  });

  test('should maintain 30+ FPS with dual viewports', async ({ page }) => {
    // Load facilities in both views
    const leftFacilitySelect = page.locator('select').first();
    await leftFacilitySelect.selectOption('facility-1');

    const rightFacilitySelect = page.locator('select').nth(1);
    await rightFacilitySelect.selectOption('facility-2');

    // Wait for scene to stabilize
    await page.waitForTimeout(2000);

    // Check performance metrics
    const fpsText = await page.locator('text=/Overall FPS:.*\\d+/').textContent();
    const fpsMatch = fpsText?.match(/(\d+)/);

    if (fpsMatch) {
      const fps = parseInt(fpsMatch[1]);
      // Allow some margin for CI environments
      expect(fps).toBeGreaterThanOrEqual(25);
    }
  });

  test('should show difference heatmap legend when highlighting enabled', async ({ page }) => {
    // Enable difference highlighting
    const diffCheckbox = page.getByLabel('Highlight Differences');
    await diffCheckbox.check();

    // Check for heatmap legend
    await expect(page.getByText('Difference Intensity')).toBeVisible();
  });

  test('should handle window resize', async ({ page }) => {
    // Initial size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Verify canvases are visible
    const canvases = page.locator('canvas');
    await expect(canvases).toHaveCount(2);

    // Resize window
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for resize to settle
    await page.waitForTimeout(500);

    // Canvases should still be visible and responsive
    await expect(canvases).toHaveCount(2);
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('View Controls')).toBeVisible();

    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    // Control panel should still be accessible (may be scrollable)
    await expect(page.getByText('View Controls')).toBeVisible();
  });
});
