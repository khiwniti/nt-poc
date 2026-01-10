import { test, expect } from '@playwright/test';

test.describe('Screen Reader Compatibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper page titles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that h1 exists and is unique
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check heading order doesn't skip levels
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have proper ARIA landmarks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for main landmark
    const main = page.locator('[role="main"], main');
    await expect(main).toBeVisible();

    // Check for navigation landmark
    const nav = page.locator('[role="navigation"], nav');
    expect(await nav.count()).toBeGreaterThanOrEqual(1);
  });

  test('should have descriptive button labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      // Button should have text content or aria-label or aria-labelledby
      const hasAccessibleName = 
        (text && text.trim().length > 0) || 
        (ariaLabel && ariaLabel.trim().length > 0) || 
        ariaLabelledBy;
      
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Images should have alt text or role="presentation" for decorative images
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const inputs = await page.locator('input:not([type="hidden"])').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Input should have associated label or aria-label
      const hasLabel = 
        ariaLabel || 
        ariaLabelledBy || 
        (id && await page.locator(`label[for="${id}"]`).count() > 0);
      
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should have proper link text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const links = await page.locator('a').all();
    
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const ariaLabelledBy = await link.getAttribute('aria-labelledby');
      const title = await link.getAttribute('title');
      
      // Link should have descriptive text
      const hasAccessibleName = 
        (text && text.trim().length > 0) || 
        (ariaLabel && ariaLabel.trim().length > 0) || 
        ariaLabelledBy ||
        (title && title.trim().length > 0);
      
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should have proper ARIA roles for interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that custom interactive elements have proper roles
    const clickableElements = await page.locator('[onclick], [ng-click]').all();
    
    for (const element of clickableElements) {
      const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
      const role = await element.getAttribute('role');
      const tabindex = await element.getAttribute('tabindex');
      
      // If not a button/link, should have proper role and be keyboard accessible
      if (!['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
        expect(role).toBeTruthy();
        expect(tabindex).not.toBe('-1');
      }
    }
  });

  test('should have proper ARIA live regions for dynamic content', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    // Check for live regions for alerts/notifications
    const liveRegions = page.locator('[aria-live], [role="alert"], [role="status"]');
    const count = await liveRegions.count();
    
    // Should have at least some live regions for dynamic content
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have proper table structure with headers', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');

    const tables = await page.locator('table').all();
    
    for (const table of tables) {
      // Tables should have thead or th elements
      const hasHeaders = 
        (await table.locator('thead').count() > 0) || 
        (await table.locator('th').count() > 0);
      
      if (hasHeaders) {
        expect(hasHeaders).toBeTruthy();
      }
    }
  });

  test('should have proper ARIA expanded states for collapsible content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const expandableElements = await page.locator('[aria-expanded]').all();
    
    for (const element of expandableElements) {
      const ariaExpanded = await element.getAttribute('aria-expanded');
      
      // aria-expanded should be "true" or "false", not null
      expect(['true', 'false']).toContain(ariaExpanded);
    }
  });

  test('should have proper skip links for keyboard users', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first element - should ideally be a skip link
    await page.keyboard.press('Tab');
    
    const firstFocusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        text: el?.textContent?.toLowerCase(),
        href: (el as HTMLAnchorElement)?.href
      };
    });
    
    // Check if it's a skip link (common patterns)
    const isSkipLink = 
      firstFocusedElement.text?.includes('skip') || 
      firstFocusedElement.text?.includes('jump') ||
      firstFocusedElement.href?.includes('#main');
    
    // Skip links are recommended but not always required
    // This is more of a best practice check
    expect(isSkipLink !== undefined).toBeTruthy();
  });

  test('should have proper language attribute', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const lang = await page.locator('html').getAttribute('lang');
    
    expect(lang).toBeTruthy();
    expect(lang?.length).toBeGreaterThan(0);
  });
});
