import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Responsive Design Visual Regression', () => {
  const viewports = {
    mobile: { width: 375, height: 812, name: 'Mobile (iPhone)' },
    tablet: { width: 768, height: 1024, name: 'Tablet (iPad)' },
    desktop: { width: 1280, height: 1024, name: 'Desktop' },
    largeDesktop: { width: 1920, height: 1080, name: 'Large Desktop' },
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('responsive navigation - all viewports', async ({ page }) => {
    for (const [key, viewport] of Object.entries(viewports)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);
      
      await percySnapshot(page, `Navigation - ${viewport.name}`, {
        widths: [viewport.width],
      });
    }
  });

  test('responsive dashboard layout - all viewports', async ({ page }) => {
    for (const [key, viewport] of Object.entries(viewports)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);
      
      await percySnapshot(page, `Dashboard Layout - ${viewport.name}`, {
        widths: [viewport.width],
      });
    }
  });

  test('responsive charts - mobile vs desktop', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await percySnapshot(page, 'Charts - Mobile Portrait');
    
    // Desktop
    await page.setViewportSize({ width: 1280, height: 1024 });
    await percySnapshot(page, 'Charts - Desktop');
  });

  test('responsive table/grid views', async ({ page }) => {
    const alertsLink = page.locator('a:has-text("Alerts")').first();
    if (await alertsLink.isVisible()) {
      await alertsLink.click();
      await page.waitForLoadState('networkidle');
      
      // Mobile
      await page.setViewportSize({ width: 375, height: 812 });
      await percySnapshot(page, 'Data Grid - Mobile');
      
      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await percySnapshot(page, 'Data Grid - Tablet');
      
      // Desktop
      await page.setViewportSize({ width: 1280, height: 1024 });
      await percySnapshot(page, 'Data Grid - Desktop');
    }
  });
});
