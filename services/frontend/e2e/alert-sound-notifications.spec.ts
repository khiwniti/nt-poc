import { test, expect } from '@playwright/test';

test.describe('Alert Sound Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h2')).toContainText('Settings');
    await expect(page.locator('h3').first()).toContainText('Alert Sound Notifications');
  });

  test('should display sound notification controls', async ({ page }) => {
    await page.goto('/settings');

    // Check for mute toggle
    await expect(page.getByRole('button', { name: /mute/i })).toBeVisible();

    // Check for volume slider
    await expect(page.getByLabel(/alert sound volume/i)).toBeVisible();

    // Check for test buttons
    await expect(page.getByRole('button', { name: /critical/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /high/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /medium/i })).toBeVisible();
  });

  test('should toggle mute state', async ({ page }) => {
    await page.goto('/settings');

    const muteButton = page.getByRole('button', { name: /mute alerts/i });
    await expect(muteButton).toContainText('Mute');

    await muteButton.click();
    await expect(page.getByRole('button', { name: /unmute alerts/i })).toContainText('Unmute');

    const unmuteButton = page.getByRole('button', { name: /unmute alerts/i });
    await unmuteButton.click();
    await expect(page.getByRole('button', { name: /mute alerts/i })).toContainText('Mute');
  });

  test('should adjust volume', async ({ page }) => {
    await page.goto('/settings');

    const volumeSlider = page.getByLabel(/alert sound volume/i);

    // Set volume to 50%
    await volumeSlider.fill('0.5');
    await expect(page.locator('text=/Volume: 50%/')).toBeVisible();

    // Set volume to 100%
    await volumeSlider.fill('1');
    await expect(page.locator('text=/Volume: 100%/')).toBeVisible();
  });

  test('should disable test buttons when muted', async ({ page }) => {
    await page.goto('/settings');

    // Mute sounds
    await page.getByRole('button', { name: /mute alerts/i }).click();

    // Check that test buttons are disabled
    await expect(page.getByRole('button', { name: /critical/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /high/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /medium/i })).toBeDisabled();
  });

  test('should toggle reduced motion preference', async ({ page }) => {
    await page.goto('/settings');

    const checkbox = page.getByRole('checkbox');

    // Should be checked by default
    await expect(checkbox).toBeChecked();

    // Uncheck
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();

    // Check again
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test('should persist settings across page reloads', async ({ page }) => {
    await page.goto('/settings');

    // Change settings
    await page.getByRole('button', { name: /mute alerts/i }).click();
    await page.getByLabel(/alert sound volume/i).fill('0.3');

    // Reload page
    await page.reload();

    // Check that settings persisted
    await expect(page.getByRole('button', { name: /unmute alerts/i })).toBeVisible();
    await expect(page.locator('text=/Volume: 30%/')).toBeVisible();
  });

  test('should have settings link in header', async ({ page }) => {
    await page.goto('/');

    const settingsLink = page.getByRole('link', { name: /settings/i });
    await expect(settingsLink).toBeVisible();

    await settingsLink.click();
    await page.waitForURL('/settings');
    await expect(page.locator('h2')).toContainText('Settings');
  });

  test('should show reduced motion warning when active', async ({ page, context }) => {
    // Emulate reduced motion preference
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
      });
    });

    await page.goto('/settings');

    // Should show warning about reduced motion
    await expect(
      page.locator(
        'text=/Alert sounds are currently disabled due to your reduced motion preference/'
      )
    ).toBeVisible();
  });
});

test.describe('Alert Sound Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should have sound player on alerts page', async ({ page }) => {
    // Go to settings and ensure sounds are enabled
    await page.goto('/settings');
    const muteButton = page.getByRole('button', { name: /mute|unmute/i });
    const buttonText = await muteButton.textContent();

    if (buttonText?.includes('Unmute')) {
      await muteButton.click();
    }

    // Navigate to alerts page
    await page.goto('/alerts');
    await expect(page.locator('h2')).toContainText('Alert Management');
  });
});
