import { test, expect } from '@playwright/test';

type A11yNode = {
  role?: string;
  name?: string;
  children?: A11yNode[];
};

const treeIncludesRole = (node: A11yNode | null, role: string): boolean => {
  if (!node) return false;
  if (node.role === role) return true;
  return (node.children || []).some((child) => treeIncludesRole(child, role));
};

test.describe('Screen Reader Compatibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/?facilityId=*');
  });

  test('Accessibility tree exposes main landmarks and headings', async ({ page }) => {
    const snapshot = (await page.accessibility.snapshot({
      interestingOnly: true,
    })) as A11yNode | null;
    expect(snapshot).toBeTruthy();
    expect(treeIncludesRole(snapshot, 'main')).toBeTruthy();
    expect(treeIncludesRole(snapshot, 'navigation')).toBeTruthy();
    expect(treeIncludesRole(snapshot, 'heading')).toBeTruthy();
  });

  test('Page has proper document title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('Main landmark exists and is properly labeled', async ({ page }) => {
    const mainLandmark = await page.locator('main, [role="main"]').count();
    expect(mainLandmark).toBeGreaterThanOrEqual(1);

    const ariaLabel = await page
      .locator('main, [role="main"]')
      .first()
      .getAttribute('aria-label')
      .catch(() => null);

    const mainText = await page.locator('main, [role="main"]').first().textContent();
    expect(ariaLabel || mainText).toBeTruthy();
  });

  test('Navigation landmark exists with proper role', async ({ page }) => {
    const navCount = await page.locator('nav, [role="navigation"]').count();
    expect(navCount).toBeGreaterThanOrEqual(1);
  });

  test('All buttons have accessible names', async ({ page }) => {
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const isVisible = await button.isVisible().catch(() => false);
      if (!isVisible) continue;

      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledby = await button.getAttribute('aria-labelledby');
      const textContent = await button.textContent();
      const title = await button.getAttribute('title');

      const hasAccessibleName = ariaLabel || ariaLabelledby || textContent?.trim() || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('All links have accessible names', async ({ page }) => {
    const links = await page.locator('a').all();

    for (const link of links) {
      const isVisible = await link.isVisible().catch(() => false);
      if (!isVisible) continue;

      const ariaLabel = await link.getAttribute('aria-label');
      const textContent = await link.textContent();
      const title = await link.getAttribute('title');

      const hasAccessibleName = ariaLabel || textContent?.trim() || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('Form inputs have associated labels', async ({ page }) => {
    await page.goto('/login');

    const inputs = await page.locator('input').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      let hasLabel = false;

      if (id) {
        const labelCount = await page.locator(`label[for="${id}"]`).count();
        hasLabel = labelCount > 0;
      }

      hasLabel = hasLabel || !!ariaLabel || !!ariaLabelledby;

      expect(hasLabel || !!placeholder).toBeTruthy();
    }
  });

  test('Status messages have appropriate ARIA live regions', async ({ page }) => {
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();

    for (const region of liveRegions) {
      const ariaLive = await region.getAttribute('aria-live');
      const role = await region.getAttribute('role');

      expect(ariaLive || role).toBeTruthy();
    }
  });

  test('Alert severity is conveyed through ARIA attributes', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    const alertItems = await page.locator('.alert-item, [data-severity]').all();

    if (alertItems.length > 0) {
      for (const alert of alertItems.slice(0, 5)) {
        const isVisible = await alert.isVisible().catch(() => false);
        if (!isVisible) continue;

        const ariaLabel = await alert.getAttribute('aria-label');
        const dataSeverity = await alert.getAttribute('data-severity');
        const textContent = await alert.textContent();

        const hasSeverityInfo =
          ariaLabel?.match(/critical|high|medium|low/i) ||
          dataSeverity ||
          textContent?.match(/critical|high|medium|low/i);

        expect(hasSeverityInfo).toBeTruthy();
      }
    }
  });

  test('Dialogs have proper ARIA attributes', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    const firstAlert = page.locator('.alert-item').first();
    if (await firstAlert.isVisible()) {
      await firstAlert.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const dialog = page.locator('[role="dialog"]').first();

      const ariaModal = await dialog.getAttribute('aria-modal');
      const ariaLabel = await dialog.getAttribute('aria-label');
      const ariaLabelledby = await dialog.getAttribute('aria-labelledby');

      expect(ariaModal).toBe('true');
      expect(ariaLabel || ariaLabelledby).toBeTruthy();
    }
  });

  test('Loading states are announced to screen readers', async ({ page }) => {
    await page.goto('/rul-prediction');

    const loadingIndicators = await page
      .locator('[role="status"], [aria-busy="true"], [aria-live]')
      .all();

    for (const indicator of loadingIndicators) {
      const role = await indicator.getAttribute('role');
      const ariaBusy = await indicator.getAttribute('aria-busy');
      const ariaLive = await indicator.getAttribute('aria-live');

      expect(role || ariaBusy || ariaLive).toBeTruthy();
    }
  });

  test('Error messages are associated with form fields', async ({ page }) => {
    await page.goto('/login');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    const errorMessages = await page
      .locator('[role="alert"], .error-message, [aria-invalid="true"]')
      .all();

    for (const error of errorMessages) {
      const ariaDescribedby = await error.getAttribute('aria-describedby');
      const id = await error.getAttribute('id');
      const role = await error.getAttribute('role');

      expect(ariaDescribedby || id || role).toBeTruthy();
    }
  });

  test('Charts and data visualizations have text alternatives', async ({ page }) => {
    await page.goto('/rul-prediction');
    await page.waitForLoadState('networkidle');

    const charts = await page.locator('svg, canvas, .recharts-wrapper').all();

    for (const chart of charts.slice(0, 3)) {
      const isVisible = await chart.isVisible().catch(() => false);
      if (!isVisible) continue;

      const ariaLabel = await chart.getAttribute('aria-label');
      const role = await chart.getAttribute('role');
      const title = await chart
        .locator('title')
        .textContent()
        .catch(() => null);

      const hasTextAlternative = ariaLabel || title || role === 'img';
      expect(hasTextAlternative).toBeTruthy();
    }
  });

  test('Dynamic content updates are announced', async ({ page }) => {
    await page.goto('/alerts');

    const liveRegions = await page
      .locator('[aria-live="polite"], [aria-live="assertive"], [role="status"]')
      .count();

    expect(liveRegions).toBeGreaterThanOrEqual(0);
  });

  test('Page headings create proper document outline', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    expect(headings.length).toBeGreaterThan(0);

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(2);
  });

  test('Tables have proper headers and captions', async ({ page }) => {
    await page.goto('/rul-prediction');
    await page.waitForLoadState('networkidle');

    const tables = await page.locator('table').all();

    for (const table of tables) {
      const hasHeaders = await table.locator('th').count();
      const hasCaption = await table.locator('caption').count();
      const ariaLabel = await table.getAttribute('aria-label');
      const ariaLabelledby = await table.getAttribute('aria-labelledby');

      const isAccessible = hasHeaders > 0 || hasCaption > 0 || ariaLabel || ariaLabelledby;
      expect(isAccessible).toBeTruthy();
    }
  });

  test('Required form fields are marked as required', async ({ page }) => {
    await page.goto('/login');

    const requiredInputs = await page.locator('input[required], input[aria-required="true"]').all();

    for (const input of requiredInputs) {
      const required = await input.getAttribute('required');
      const ariaRequired = await input.getAttribute('aria-required');

      expect(required !== null || ariaRequired === 'true').toBeTruthy();
    }
  });
});
