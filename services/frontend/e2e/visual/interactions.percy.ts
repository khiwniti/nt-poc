import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('User Interaction States Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('button hover states', async ({ page }) => {
    const button = page.locator('button').first();
    if (await button.isVisible()) {
      await button.hover();
      await page.waitForTimeout(200);
      
      await percySnapshot(page, 'Button Hover State', {
        widths: [1280],
      });
    }
  });

  test('modal open state', async ({ page }) => {
    // Try to open any modal
    const modalTrigger = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("Details")').first();
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      await page.waitForTimeout(500);
      
      await percySnapshot(page, 'Modal Open', {
        widths: [375, 1280],
      });
    }
  });

  test('filter panel expanded', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);
      
      await percySnapshot(page, 'Filter Panel Expanded', {
        widths: [375, 768, 1280],
      });
    }
  });

  test('error state display', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    await page.reload();
    await page.waitForTimeout(1000);
    
    await percySnapshot(page, 'Error State', {
      widths: [375, 1280],
    });
  });

  test('empty state display', async ({ page }) => {
    // Navigate to a page that might have empty state
    const reportsLink = page.locator('a:has-text("Reports")').first();
    if (await reportsLink.isVisible()) {
      await reportsLink.click();
      await page.waitForLoadState('networkidle');
      
      await percySnapshot(page, 'Empty State', {
        widths: [375, 1280],
      });
    }
  });

  test('form validation states', async ({ page }) => {
    // Try to find and interact with a form
    const formInput = page.locator('input[type="text"], input[type="email"]').first();
    if (await formInput.isVisible()) {
      await formInput.click();
      await formInput.fill('invalid-input');
      await formInput.blur();
      await page.waitForTimeout(300);
      
      await percySnapshot(page, 'Form Validation Error', {
        widths: [1280],
      });
    }
  });

  test('dropdown menu expanded', async ({ page }) => {
    const dropdown = page.locator('select, [role="combobox"], button:has([data-icon*="chevron"])').first();
    if (await dropdown.isVisible()) {
      await dropdown.click();
      await page.waitForTimeout(300);
      
      await percySnapshot(page, 'Dropdown Expanded', {
        widths: [1280],
      });
    }
  });

  test('tooltip display', async ({ page }) => {
    const tooltipTrigger = page.locator('[title], [data-tooltip], [aria-label]').first();
    if (await tooltipTrigger.isVisible()) {
      await tooltipTrigger.hover();
      await page.waitForTimeout(500);
      
      await percySnapshot(page, 'Tooltip Display', {
        widths: [1280],
      });
    }
  });
});
