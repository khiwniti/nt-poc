import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Key Components Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('alert stats dashboard component', async ({ page }) => {
    // Navigate to alerts or wait for component to load
    const alertsLink = page.locator('a:has-text("Alerts")').first();
    if (await alertsLink.isVisible()) {
      await alertsLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    await percySnapshot(page, 'Alert Stats Dashboard', {
      widths: [375, 768, 1280],
    });
  });

  test('RUL trend chart component', async ({ page }) => {
    // Wait for chart to render
    await page.waitForSelector('[data-testid*="chart"], .recharts-wrapper', {
      timeout: 5000,
    }).catch(() => {});
    
    await percySnapshot(page, 'RUL Trend Chart', {
      widths: [375, 768, 1280],
    });
  });

  test('3D view component', async ({ page }) => {
    const threeDLink = page.locator('a:has-text("3D View")').first();
    if (await threeDLink.isVisible()) {
      await threeDLink.click();
      await page.waitForLoadState('networkidle');
      // Wait for 3D scene to initialize
      await page.waitForTimeout(2000);
      
      await percySnapshot(page, '3D View', {
        widths: [1280],
      });
    }
  });

  test('AI insights page', async ({ page }) => {
    const aiLink = page.locator('a:has-text("AI Insights")').first();
    if (await aiLink.isVisible()) {
      await aiLink.click();
      await page.waitForLoadState('networkidle');
      
      await percySnapshot(page, 'AI Insights Page', {
        widths: [375, 768, 1280],
      });
    }
  });

  test('comparative analysis view', async ({ page }) => {
    const compareLink = page.locator('a:has-text("Comparative"), a:has-text("Analysis")').first();
    if (await compareLink.isVisible()) {
      await compareLink.click();
      await page.waitForLoadState('networkidle');
      
      await percySnapshot(page, 'Comparative Analysis View', {
        widths: [768, 1280],
      });
    }
  });

  test('loading skeleton state', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('/');
    
    await percySnapshot(page, 'Loading Skeleton', {
      widths: [375, 1280],
    });
  });

  test('offline banner component', async ({ page }) => {
    // Simulate offline state
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForTimeout(500);
    
    await percySnapshot(page, 'Offline Banner', {
      widths: [375, 1280],
    });
    
    await page.context().setOffline(false);
  });
});
