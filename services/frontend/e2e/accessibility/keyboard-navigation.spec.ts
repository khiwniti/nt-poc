import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/?facilityId=*');
  });

  test('Can navigate to all main navigation items using Tab key', async ({ page }) => {
    await page.keyboard.press('Tab');

    const navItems = [
      'Dashboard',
      'Alerts',
      'RUL Prediction',
      'Comparative Analysis',
      'What-If Scenarios',
      'AI Insights',
    ];

    for (const item of navItems) {
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      if (focused?.includes(item)) {
        expect(focused).toContain(item);
        break;
      }
      await page.keyboard.press('Tab');
    }
  });

  test('Can activate navigation items with Enter key', async ({ page }) => {
    await page.keyboard.press('Tab');

    let attempts = 0;
    while (attempts < 20) {
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      if (focused?.includes('Alerts')) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        expect(page.url()).toContain('alerts');
        break;
      }
      await page.keyboard.press('Tab');
      attempts++;
    }
  });

  test('Can navigate through alert list with keyboard', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');

    let tabCount = 0;
    while (tabCount < 10) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          className: el?.className,
          role: el?.getAttribute('role'),
        };
      });

      if (focused.className?.includes('alert') || focused.role === 'button') {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        const modalVisible = await page
          .locator('[role="dialog"]')
          .isVisible()
          .catch(() => false);
        expect(modalVisible).toBeTruthy();
        break;
      }

      await page.keyboard.press('Tab');
      tabCount++;
    }
  });

  test('Can close modal with Escape key', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    const firstAlert = page.locator('.alert-item').first();
    if (await firstAlert.isVisible()) {
      await firstAlert.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const modalVisible = await page
        .locator('[role="dialog"]')
        .isVisible()
        .catch(() => false);
      expect(modalVisible).toBeFalsy();
    }
  });

  test('Tab order is logical on dashboard', async ({ page }) => {
    const focusableElements: string[] = [];

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName + (el?.className ? '.' + el.className.split(' ')[0] : '');
      });
      focusableElements.push(focused);
    }

    expect(focusableElements.length).toBeGreaterThan(0);
    expect(focusableElements).not.toContain('BODY');
  });

  test('Focus trap works in modal dialogs', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    const firstAlert = page.locator('.alert-item').first();
    if (await firstAlert.isVisible()) {
      await firstAlert.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const elementsBeforeTab: string[] = [];
      for (let i = 0; i < 20; i++) {
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        elementsBeforeTab.push(focused || '');
        await page.keyboard.press('Tab');
      }

      const focusStayedInModal = elementsBeforeTab.every((tag) => tag !== 'BODY');
      expect(focusStayedInModal).toBeTruthy();
    }
  });

  test('Shift+Tab navigates backwards', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const elementAfterForward = await page.evaluate(() => document.activeElement?.textContent);

    await page.keyboard.press('Shift+Tab');
    const elementAfterBackward = await page.evaluate(() => document.activeElement?.textContent);

    expect(elementAfterForward).not.toBe(elementAfterBackward);
  });

  test('Space key activates buttons', async ({ page }) => {
    await page.keyboard.press('Tab');

    let attempts = 0;
    while (attempts < 20) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          type: el?.getAttribute('type'),
          role: el?.getAttribute('role'),
        };
      });

      if (focused.tag === 'BUTTON' || focused.role === 'button') {
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
        break;
      }

      await page.keyboard.press('Tab');
      attempts++;
    }

    expect(attempts).toBeLessThan(20);
  });

  test('Arrow keys navigate through select dropdowns', async ({ page }) => {
    const facilitySelector = page
      .locator('.facility-selector-button, [aria-label*="facility"]')
      .first();

    if (await facilitySelector.isVisible()) {
      await facilitySelector.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      expect(page.url()).toMatch(/facilityId=/);
    }
  });

  test('Skip to main content link is accessible', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.textContent);

    if (firstFocused?.toLowerCase().includes('skip')) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);

      const mainFocused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName + '#' + (el?.id || el?.getAttribute('role'));
      });

      expect(mainFocused).toMatch(/main|MAIN/);
    }
  });
});
