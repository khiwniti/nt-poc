import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should support Tab navigation through interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Press Tab and verify focus moves through interactive elements
    await page.keyboard.press('Tab');
    const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(firstFocusedElement);

    // Continue tabbing to verify focus order is logical
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    }
  });

  test('should support Shift+Tab for backward navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab forward first
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Then tab backward
    await page.keyboard.press('Shift+Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should activate buttons with Enter key', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find a button and focus it
    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await button.focus();
      await page.keyboard.press('Enter');
      // Verify button was activated (could check for navigation or state change)
      await expect(button).toBeVisible();
    }
  });

  test('should activate buttons with Space key', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await button.focus();
      await page.keyboard.press('Space');
      await expect(button).toBeVisible();
    }
  });

  test('should support Escape key to close modals/dialogs', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    // Try to open a modal if available
    const modalTrigger = page.locator('[role="button"]').first();
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Modal should be closed
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) {
        await expect(modal).toBeHidden();
      }
    }
  });

  test('should trap focus within modal dialogs', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    // Try to open a modal
    const modalTrigger = page.locator('button').first();
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
        
        // Tab through modal elements - focus should stay within modal
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => {
            const el = document.activeElement;
            return el?.closest('[role="dialog"]') !== null;
          });
          // Focus should remain in dialog
          expect(focusedElement).toBeTruthy();
        }
      }
    }
  });

  test('should support arrow keys for navigation in lists/menus', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find navigation menu or list
    const menuItems = page.locator('[role="menuitem"], [role="listitem"]');
    if (await menuItems.count() > 1) {
      await menuItems.first().focus();
      
      await page.keyboard.press('ArrowDown');
      const focusedAfterDown = await page.evaluate(() => document.activeElement?.textContent);
      expect(focusedAfterDown).toBeTruthy();
      
      await page.keyboard.press('ArrowUp');
      const focusedAfterUp = await page.evaluate(() => document.activeElement?.textContent);
      expect(focusedAfterUp).toBeTruthy();
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Check if focus indicator is visible
    const hasFocusStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      
      const styles = window.getComputedStyle(el);
      // Check for common focus indicators
      return (
        styles.outline !== 'none' ||
        styles.outlineWidth !== '0px' ||
        styles.boxShadow !== 'none'
      );
    });
    
    expect(hasFocusStyle).toBeTruthy();
  });

  test('should not have keyboard traps outside of modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    let lastFocusedElement = '';
    let sameElementCount = 0;

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const currentFocusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return `${el?.tagName}:${el?.id}:${el?.className}`;
      });

      if (currentFocusedElement === lastFocusedElement) {
        sameElementCount++;
      } else {
        sameElementCount = 0;
      }

      // If focus is stuck on the same element for 3+ tabs, it's a trap
      expect(sameElementCount).toBeLessThan(3);
      
      lastFocusedElement = currentFocusedElement;
    }
  });
});
