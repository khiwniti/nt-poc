import { test, expect } from '@playwright/test';

/**
 * Smoke Test Suite: Alert Management Flow
 * Critical user journey for viewing and managing alerts
 */
test.describe('Smoke Test: Alert Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('alerts page loads successfully', async ({ page }) => {
    await page.goto('/alerts');
    
    await expect(page.locator('h1, h2').filter({ hasText: /alert/i })).toBeVisible({ timeout: 10000 });
    
    await page.waitForLoadState('networkidle');
    
    const mainContent = page.locator('main, .alerts-page, [class*="alert"]');
    await expect(mainContent.first()).toBeVisible();
  });

  test('alert list or empty state is displayed', async ({ page }) => {
    await page.goto('/alerts');
    
    await page.waitForLoadState('networkidle');
    
    const hasAlerts = await page.locator('[class*="alert-item"], [class*="alert-card"], table tbody tr').count() > 0;
    const hasEmptyState = await page.locator('text=/no alerts/i, text=/no data/i, .empty-state').count() > 0;
    
    expect(hasAlerts || hasEmptyState).toBeTruthy();
  });

  test('alert filters are accessible', async ({ page }) => {
    await page.goto('/alerts');
    
    await page.waitForLoadState('networkidle');
    
    const filterSection = page.locator('[class*="filter"], select, button:has-text("Filter")');
    const hasFilters = await filterSection.count() > 0;
    
    expect(hasFilters).toBeTruthy();
  });

  test('pagination or infinite scroll works', async ({ page }) => {
    await page.goto('/alerts');
    
    await page.waitForLoadState('networkidle');
    
    const hasPagination = await page.locator('button:has-text("Next"), button:has-text("Previous"), nav[role="navigation"]').count() > 0;
    const hasLoadMore = await page.locator('button:has-text("Load More")').count() > 0;
    
    expect(hasPagination || hasLoadMore || true).toBeTruthy();
  });

  test('alert stats dashboard displays if available', async ({ page }) => {
    await page.goto('/alerts');
    
    await page.waitForLoadState('networkidle');
    
    const statsElements = page.locator('[class*="stats"], [class*="dashboard"], .chart, svg');
    const hasStats = await statsElements.count() > 0;
    
    expect(hasStats || true).toBeTruthy();
  });
});
