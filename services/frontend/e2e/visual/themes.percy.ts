import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Theme Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('light theme - dashboard', async ({ page }) => {
    // Ensure light theme is active
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(300);
    
    await percySnapshot(page, 'Dashboard - Light Theme', {
      widths: [375, 768, 1280],
    });
  });

  test('dark theme - dashboard', async ({ page }) => {
    // Enable dark theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(300);
    
    await percySnapshot(page, 'Dashboard - Dark Theme', {
      widths: [375, 768, 1280],
    });
  });

  test('dark theme - alerts page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    const alertsLink = page.locator('a:has-text("Alerts")').first();
    if (await alertsLink.isVisible()) {
      await alertsLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    await percySnapshot(page, 'Alerts Page - Dark Theme', {
      widths: [375, 768, 1280],
    });
  });

  test('dark theme - 3D view', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    const threeDLink = page.locator('a:has-text("3D View")').first();
    if (await threeDLink.isVisible()) {
      await threeDLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      await percySnapshot(page, '3D View - Dark Theme', {
        widths: [1280],
      });
    }
  });

  test('dark theme - AI insights', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    const aiLink = page.locator('a:has-text("AI Insights")').first();
    if (await aiLink.isVisible()) {
      await aiLink.click();
      await page.waitForLoadState('networkidle');
      
      await percySnapshot(page, 'AI Insights - Dark Theme', {
        widths: [768, 1280],
      });
    }
  });

  test('dark theme - comparative analysis', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    const compareLink = page.locator('a:has-text("Comparative"), a:has-text("Analysis")').first();
    if (await compareLink.isVisible()) {
      await compareLink.click();
      await page.waitForLoadState('networkidle');
      
      await percySnapshot(page, 'Comparative Analysis - Dark Theme', {
        widths: [768, 1280],
      });
    }
  });
});
