import { test, expect } from '@playwright/test';

test.describe('Dashboard User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/?facilityId=*');
  });

  test('displays dashboard with KPIs', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Facility Manager/);

    // Verify facility name displayed
    await expect(page.locator('h1')).toContainText('Bangkok');

    // Verify KPI cards
    await expect(page.locator('text=Total Capacity')).toBeVisible();
    await expect(page.locator('text=Avg State of Charge')).toBeVisible();
    await expect(page.locator('text=Avg State of Health')).toBeVisible();
    await expect(page.locator('text=Total Power')).toBeVisible();
    await expect(page.locator('text=Active Alerts')).toBeVisible();

    // Verify KPI values are numbers
    const capacityValue = await page.locator('.kpi-card:has-text("Total Capacity") .kpi-value').textContent();
    expect(parseFloat(capacityValue!)).toBeGreaterThan(0);
  });

  test('switches between facilities', async ({ page }) => {
    // Click facility selector
    await page.click('.facility-selector-button');

    // Wait for dropdown
    await expect(page.locator('.facility-dropdown')).toBeVisible();

    // Select second facility
    await page.click('.facility-option:nth-child(2)');

    // Verify URL updated
    await page.waitForURL(/facilityId=[^&]+/);

    // Verify dashboard reloaded with new data
    await expect(page.locator('.dashboard-container')).toBeVisible();
  });

  test('displays and acknowledges alerts', async ({ page }) => {
    // Verify alerts section
    await expect(page.locator('text=Active Alerts')).toBeVisible();

    // Find first alert
    const firstAlert = page.locator('.alert-item').first();
    await expect(firstAlert).toBeVisible();

    // Click acknowledge button
    await firstAlert.locator('button:has-text("Acknowledge")').click();

    // Verify alert status updated
    await expect(firstAlert.locator('text=Acknowledged')).toBeVisible();
  });

  test('navigates to zone detail', async ({ page }) => {
    // Click on first zone card
    await page.click('.zone-card:first-child');

    // Verify navigation to zone detail page
    await page.waitForURL('**/zones/*');

    // Verify zone detail page loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('shows loading skeleton on initial load', async ({ page }) => {
    // Navigate to dashboard with slow network
    await page.route('**/api/v1/facilities/*/kpis', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('http://localhost:5173/?facilityId=fac-001');

    // Verify loading skeleton visible
    await expect(page.locator('.skeleton')).toBeVisible();

    // Wait for real data
    await expect(page.locator('.kpi-card')).toBeVisible({ timeout: 5000 });
  });

  test('handles offline mode', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Verify offline banner
    await expect(page.locator('.offline-banner')).toBeVisible();
    await expect(page.locator('text=You are offline')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Verify banner disappears
    await expect(page.locator('.offline-banner')).not.toBeVisible();
  });

  test('responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify mobile navigation toggle visible
    await expect(page.locator('.mobile-nav-toggle')).toBeVisible();

    // Verify KPI cards stack vertically
    const kpiSection = page.locator('.kpi-section');
    const boundingBox = await kpiSection.boundingBox();
    expect(boundingBox!.height).toBeGreaterThan(500); // Stacked = taller

    // Open mobile menu
    await page.click('.mobile-nav-toggle');
    await expect(page.locator('.mobile-nav')).toBeVisible();
  });
});
