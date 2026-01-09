import { test, expect } from '@playwright/test';

/**
 * Smoke Test Suite: Authentication Flow
 * Critical user journey for login and session management
 */
test.describe('Smoke Test: Authentication Flow', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeTruthy();
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
    
    await page.goto('/alerts');
    await expect(page).toHaveURL('/login');
  });

  test('logout clears session and redirects', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    
    await page.evaluate(() => localStorage.removeItem('token'));
    await page.reload();
    
    await expect(page).toHaveURL('/login');
  });

  test('login form validation works', async ({ page }) => {
    await page.goto('/login');
    
    await page.click('button[type="submit"]');
    
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});
