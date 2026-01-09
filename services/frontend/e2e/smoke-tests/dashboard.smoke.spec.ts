import { test, expect } from '@playwright/test';

/**
 * Smoke Test Suite: Dashboard View and Navigation
 * Critical user journey for main dashboard access
 */
test.describe('Smoke Test: Dashboard View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('dashboard loads with header and navigation', async ({ page }) => {
    const header = page.locator('header, .header, nav');
    await expect(header).toBeVisible({ timeout: 10000 });
    
    await expect(page.locator('main, .app-main, .dashboard')).toBeVisible();
  });

  test('critical navigation links are accessible', async ({ page }) => {
    const navLinks = [
      { text: /alerts/i, path: '/alerts' },
      { text: /reports/i, path: '/reports' },
    ];

    for (const link of navLinks) {
      const navLink = page.getByRole('link', { name: link.text }).or(
        page.locator(`a:has-text("${link.text.source.replace(/\\/gi, '').replace(/i$/, '')}")`)
      );
      
      if (await navLink.count() > 0) {
        await navLink.first().click();
        await page.waitForURL(`**${link.path}**`, { timeout: 5000 });
        await page.goBack();
      }
    }
  });

  test('page renders without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForLoadState('networkidle');
    
    expect(errors.length).toBe(0);
  });

  test('dashboard is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.locator('main, .app-main, .dashboard')).toBeVisible();
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});
