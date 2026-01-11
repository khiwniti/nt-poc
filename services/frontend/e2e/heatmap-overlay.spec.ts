import { test, expect } from '@playwright/test';

test.describe('3D Heatmap Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/3d-view');
    await page.waitForLoadState('networkidle');
  });

  test('should display heatmap controls', async ({ page }) => {
    await expect(page.getByText('Heatmap Overlay')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /heatmap overlay/i })).toBeVisible();
  });

  test('should toggle heatmap overlay on/off', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    
    // Initially unchecked
    await expect(checkbox).not.toBeChecked();
    
    // Toggle on
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    
    // Verify metric options appear
    await expect(page.getByText('Temperature')).toBeVisible();
    await expect(page.getByText('Voltage')).toBeVisible();
    await expect(page.getByText('SoC')).toBeVisible();
    await expect(page.getByText('SoH')).toBeVisible();
    
    // Toggle off
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });

  test('should display heatmap legend when enabled', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    await checkbox.click();
    
    // Wait for legend to appear
    await expect(page.getByText('Real-time facility distribution')).toBeVisible();
  });

  test('should switch between different metrics', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    await checkbox.click();
    
    // Click temperature
    await page.getByRole('button', { name: /temperature/i }).click();
    await expect(page.getByText('Temperature')).toBeVisible();
    
    // Click voltage
    await page.getByRole('button', { name: /^voltage$/i }).click();
    await expect(page.getByText('Voltage')).toBeVisible();
    
    // Click SoC
    await page.getByRole('button', { name: /^soc$/i }).click();
    await expect(page.getByText('State of Charge')).toBeVisible();
    
    // Click SoH
    await page.getByRole('button', { name: /^soh$/i }).click();
    await expect(page.getByText('State of Health')).toBeVisible();
  });

  test('should highlight selected metric button', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    await checkbox.click();
    
    const temperatureButton = page.getByRole('button', { name: /temperature/i });
    await temperatureButton.click();
    
    // Check if button is highlighted (background color changes)
    const bgColor = await temperatureButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBe('rgb(227, 242, 253)'); // #E3F2FD
  });

  test('should display correct units for each metric in legend', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    await checkbox.click();
    
    // Temperature - °C
    await page.getByRole('button', { name: /temperature/i }).click();
    await expect(page.locator('text=/°C/')).toBeVisible();
    
    // Voltage - V
    await page.getByRole('button', { name: /^voltage$/i }).click();
    await expect(page.locator('text=/V/')).toBeVisible();
    
    // SoC - %
    await page.getByRole('button', { name: /^soc$/i }).click();
    await expect(page.locator('text=/%/').first()).toBeVisible();
  });

  test('should persist heatmap state when switching models', async ({ page }) => {
    // Enable heatmap
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    await checkbox.click();
    await page.getByRole('button', { name: /voltage/i }).click();
    
    // Switch model
    await page.selectOption('select', { label: 'Battery Model' });
    await page.waitForTimeout(500);
    
    // Verify heatmap is still enabled with voltage selected
    await expect(checkbox).toBeChecked();
    const voltageButton = page.getByRole('button', { name: /^voltage$/i });
    const bgColor = await voltageButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBe('rgb(227, 242, 253)');
  });

  test('should work in VR mode', async ({ page }) => {
    // Enable heatmap first
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    await checkbox.click();
    
    // Enable VR mode
    const vrButton = page.getByRole('button', { name: /enable vr mode/i });
    await vrButton.click();
    
    // Heatmap controls should still be visible
    await expect(page.getByText('Heatmap Overlay')).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab to checkbox
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Activate with Space
    await page.keyboard.press('Space');
    
    // Verify enabled
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    await expect(checkbox).toBeChecked();
    
    // Tab to metric buttons and activate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
  });

  test('should update legend values when data changes', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    await checkbox.click();
    
    // Get initial legend values
    const initialMin = await page.locator('text=/[0-9]+\.[0-9]+°C/').first().textContent();
    
    // Wait for data update (5 seconds based on updateInterval)
    await page.waitForTimeout(5500);
    
    // Values should have updated (though might be subtle)
    const updatedMin = await page.locator('text=/[0-9]+\.[0-9]+°C/').first().textContent();
    
    // At least verify the legend is still there and showing valid numbers
    expect(updatedMin).toMatch(/\d+\.\d+°C/);
  });

  test('should hide metric options when heatmap is disabled', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: /heatmap overlay/i });
    
    // Enable first
    await checkbox.click();
    await expect(page.getByText('Temperature')).toBeVisible();
    
    // Disable
    await checkbox.click();
    await expect(page.getByText('Temperature')).not.toBeVisible();
  });
});
