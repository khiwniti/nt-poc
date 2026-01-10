import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests with axe-core', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/?facilityId=*');
  });

  test('Dashboard page should not have accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Alert list should not have accessibility violations', async ({ page }) => {
    await page.click('text=Alerts');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Alert detail modal should not have accessibility violations', async ({ page }) => {
    await page.click('text=Alerts');
    await page.waitForLoadState('networkidle');

    const firstAlert = page.locator('.alert-item').first();
    if (await firstAlert.isVisible()) {
      await firstAlert.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('RUL Prediction page should not have accessibility violations', async ({ page }) => {
    await page.click('text=RUL Prediction');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Comparative Analysis page should not have accessibility violations', async ({ page }) => {
    await page.click('text=Comparative Analysis');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('What-If Scenario page should not have accessibility violations', async ({ page }) => {
    await page.click('text=What-If Scenarios');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('AI Insights page should not have accessibility violations', async ({ page }) => {
    await page.click('text=AI Insights');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include(['body'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('Form inputs have proper labels', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const labelViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'label' || v.id === 'form-field-multiple-labels'
    );

    expect(labelViolations).toHaveLength(0);
  });

  test('Images have alt text', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze();

    const imageAltViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'image-alt'
    );

    expect(imageAltViolations).toHaveLength(0);
  });

  test('Page has proper heading hierarchy', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze();

    const headingViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'heading-order'
    );

    expect(headingViolations).toHaveLength(0);
  });

  test('Interactive elements are keyboard accessible', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze();

    const keyboardViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'button-name' || v.id === 'link-name'
    );

    expect(keyboardViolations).toHaveLength(0);
  });

  test('ARIA attributes are valid', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const ariaViolations = accessibilityScanResults.violations.filter((v) =>
      v.id.startsWith('aria-')
    );

    expect(ariaViolations).toHaveLength(0);
  });

  test('Landmark regions are properly defined', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['best-practice'])
      .analyze();

    const landmarkViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'region' || v.id === 'landmark-one-main'
    );

    expect(landmarkViolations).toHaveLength(0);
  });
});
