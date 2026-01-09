import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Dashboard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('dashboard - desktop view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    await percySnapshot(page, 'Dashboard - Desktop');
  });

  test('dashboard - tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await percySnapshot(page, 'Dashboard - Tablet');
  });

  test('dashboard - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await percySnapshot(page, 'Dashboard - Mobile');
  });

  test('dashboard with filters applied', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    
    // Apply some filters if filter controls exist
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
    }
    
    await percySnapshot(page, 'Dashboard - Filters Applied');
  });
});
