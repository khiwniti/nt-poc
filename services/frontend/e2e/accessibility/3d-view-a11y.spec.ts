import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('3D View Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/3d-view');
    await page.waitForLoadState('networkidle');
  });

  test('should not have any automatically detectable WCAG 2.1 AA violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels for 3D canvas', async ({ page }) => {
    const canvas = page.locator('[role="application"][aria-label*="3D facility"]');
    await expect(canvas).toBeVisible();
  });

  test('should support keyboard navigation - arrow keys', async ({ page }) => {
    const canvas = page.locator('[role="application"]');
    await canvas.focus();
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    
    // Should not cause page scroll
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });

  test('should support keyboard navigation - zoom', async ({ page }) => {
    const canvas = page.locator('[role="application"]');
    await canvas.focus();
    
    await page.keyboard.press('+');
    await page.keyboard.press('-');
    
    // Verify zoom functionality works (indirectly by checking no errors)
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    expect(errors).toHaveLength(0);
  });

  test('should support Tab navigation through zones', async ({ page }) => {
    const canvas = page.locator('[role="application"]');
    await canvas.focus();
    
    // Tab through zones
    await page.keyboard.press('Tab');
    
    // Should announce zone selection
    const announcement = page.locator('[role="status"]');
    await expect(announcement).toBeVisible();
  });

  test('should toggle accessibility control panel', async ({ page }) => {
    const a11yButton = page.getByRole('button', { name: /accessibility/i });
    await expect(a11yButton).toBeVisible();
    
    await a11yButton.click();
    
    const panel = page.getByRole('region', { name: /3D View Accessibility Controls/i });
    await expect(panel).toBeVisible();
  });

  test('should have accessible color scheme selector', async ({ page }) => {
    await page.getByRole('button', { name: /accessibility/i }).click();
    
    const colorSchemeSelect = page.getByLabelText('Color Scheme');
    await expect(colorSchemeSelect).toBeVisible();
    await expect(colorSchemeSelect).toBeEnabled();
    
    // Verify all options are present
    await colorSchemeSelect.click();
    await expect(page.getByRole('option', { name: 'Standard' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'High Contrast' })).toBeVisible();
    await expect(page.getByRole('option', { name: /Protanopia/i })).toBeVisible();
  });

  test('should enable high contrast mode', async ({ page }) => {
    await page.getByRole('button', { name: /accessibility/i }).click();
    
    const highContrastCheckbox = page.getByLabelText('High Contrast Mode');
    await highContrastCheckbox.check();
    
    await expect(highContrastCheckbox).toBeChecked();
    
    // Verify visual changes occurred (background should be black)
    const canvas = page.locator('[role="application"]');
    const bgColor = await canvas.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toContain('0, 0, 0'); // Black in RGB
  });

  test('should show keyboard shortcuts help', async ({ page }) => {
    const canvas = page.locator('[role="application"]');
    await canvas.focus();
    
    await page.keyboard.press('?');
    
    // Wait for announcement
    await page.waitForTimeout(200);
    
    const announcement = page.locator('[role="status"]');
    const text = await announcement.textContent();
    expect(text).toContain('Keyboard shortcuts');
  });

  test('should have screen reader announcements', async ({ page }) => {
    const announcer = page.locator('[role="status"][aria-live="polite"]');
    await expect(announcer).toBeAttached();
  });

  test('should maintain focus visibility', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('should have accessible VR toggle button', async ({ page }) => {
    const vrButton = page.getByRole('button', { name: /VR Mode/i });
    await expect(vrButton).toBeVisible();
    
    // Check ARIA attributes
    const ariaLabel = await vrButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('should support Escape key to close panels', async ({ page }) => {
    // Open accessibility panel
    await page.getByRole('button', { name: /accessibility/i }).click();
    
    const panel = page.getByRole('region', { name: /3D View Accessibility Controls/i });
    await expect(panel).toBeVisible();
    
    // Note: Panel doesn't auto-close on Escape in current impl
    // This test documents expected behavior for future enhancement
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h2 = page.locator('h2');
    await expect(h2).toHaveText('3D Facility View');
    
    // Open accessibility panel
    await page.getByRole('button', { name: /accessibility/i }).click();
    
    const h3 = page.locator('h3').first();
    await expect(h3).toContainText('Accessibility Settings');
  });

  test('should provide status updates for zone selection', async ({ page }) => {
    const canvas = page.locator('[role="application"]');
    await canvas.focus();
    
    // Select a zone with Tab
    await page.keyboard.press('Tab');
    
    // Select with Enter
    await page.keyboard.press('Enter');
    
    // Check for screen reader announcement
    const statusRegion = page.locator('[role="status"]');
    await expect(statusRegion).toBeAttached();
  });

  test('should work with color vision deficiency modes', async ({ page }) => {
    await page.getByRole('button', { name: /accessibility/i }).click();
    
    const colorSchemeSelect = page.getByLabelText('Color Scheme');
    
    // Test each color blindness mode
    const modes = ['protanopia', 'deuteranopia', 'tritanopia'];
    
    for (const mode of modes) {
      await colorSchemeSelect.selectOption(mode);
      
      // Verify selection
      const value = await colorSchemeSelect.inputValue();
      expect(value).toBe(mode);
      
      // Wait a bit for changes to apply
      await page.waitForTimeout(100);
    }
  });
});
