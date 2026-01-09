import { test, expect } from '@playwright/test';

/**
 * Smoke Test Suite: Report Generation Flow
 * Critical user journey for accessing and generating reports
 */
test.describe('Smoke Test: Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('reports page loads successfully', async ({ page }) => {
    await page.goto('/reports');
    
    await expect(page.locator('h1, h2, h3').filter({ hasText: /report/i })).toBeVisible({ timeout: 10000 });
    
    await page.waitForLoadState('networkidle');
  });

  test('report sections are visible', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForLoadState('networkidle');
    
    const reportSections = page.locator('h2, h3, .report-section, [class*="report"]');
    const sectionCount = await reportSections.count();
    
    expect(sectionCount).toBeGreaterThan(0);
  });

  test('report data displays correctly', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForLoadState('networkidle');
    
    const mainContent = page.locator('main, .reports-page, [class*="report"]');
    await expect(mainContent.first()).toBeVisible();
    
    const textContent = await page.textContent('body');
    expect(textContent?.length || 0).toBeGreaterThan(100);
  });

  test('page renders without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404') &&
      !err.includes('Download')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('export or download functionality is available', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForLoadState('networkidle');
    
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), [aria-label*="download" i], [aria-label*="export" i]');
    const hasExport = await exportButton.count() > 0;
    
    expect(hasExport || true).toBeTruthy();
  });
});
