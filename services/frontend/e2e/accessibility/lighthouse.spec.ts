import { test, expect } from '@playwright/test';
import { playAudit } from 'audit-ci';

test.describe('Lighthouse Accessibility Audits', () => {
  test('Dashboard page meets Lighthouse accessibility score > 90', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/?facilityId=*');

    const port = new URL(page.url()).port;
    const { scores } = await playAudit({
      url: `http://localhost:${port}/?facilityId=1`,
      thresholds: {
        accessibility: 90,
      },
      opts: {
        onlyCategories: ['accessibility'],
      },
    });

    expect(scores.accessibility).toBeGreaterThanOrEqual(90);
  });
});
