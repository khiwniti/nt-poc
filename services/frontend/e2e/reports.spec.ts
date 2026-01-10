import { expect, test, type Page } from '@playwright/test';

const login = async (page: Page) => {
  await page.goto('/login');
  await page.fill('input[type="text"]', 'testuser');
  await page.fill('input[type="password"]', 'testpass');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
};

test.describe('Reporting workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('supports custom report generation and preview', async ({ page }) => {
    await page.goto('/reports');

    await page.fill('[data-testid="report-name-input"]', 'Custom Efficiency Report');
    await page.selectOption('[data-testid="report-template"]', 'reliability');
    await page.selectOption('[data-testid="date-range"]', 'last-30-days');
    await page.selectOption('[data-testid="metric-focus"]', 'cost');
    await page.click('[data-testid="include-forecast"]');

    await page.click('[data-testid="generate-report"]');

    await expect(page.getByTestId('generation-status')).toContainText('ready for preview');
    await expect(page.getByTestId('preview-title')).toContainText('Custom Efficiency Report');
    await expect(page.getByTestId('report-preview')).toBeVisible();
  });

  test('renders detailed preview with chart and table', async ({ page }) => {
    await page.goto('/reports');
    await page.click('[data-testid="generate-report"]');

    const chartCards = page.getByTestId('preview-chart').locator('div');
    const tableRows = page.getByTestId('preview-table').locator('tbody tr');

    expect(await chartCards.count()).toBeGreaterThan(0);
    expect(await tableRows.count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId('preview-table')).toBeVisible();
  });

  test('exports report to PDF, CSV, and XLSX', async ({ page }) => {
    await page.goto('/reports');
    await page.click('[data-testid="generate-report"]');

    await page.click('[data-testid="export-pdf"]');
    await expect(page.getByTestId('export-status')).toContainText('PDF export');

    await page.click('[data-testid="export-csv"]');
    await expect(page.getByTestId('export-status')).toContainText('CSV export');

    await page.click('[data-testid="export-xlsx"]');
    await expect(page.getByTestId('export-status')).toContainText('XLSX export');
  });

  test('configures scheduled delivery', async ({ page }) => {
    await page.goto('/reports');
    await page.click('[data-testid="generate-report"]');

    await page.selectOption('[data-testid="schedule-frequency"]', 'weekly');
    await page.selectOption('[data-testid="schedule-day"]', 'friday');
    await page.fill('[data-testid="schedule-time"]', '08:30');
    await page.selectOption('[data-testid="schedule-timezone"]', 'Europe/London');
    await page.fill('[data-testid="schedule-recipients"]', 'ops@example.com, manager@example.com');

    await page.click('[data-testid="save-schedule"]');

    await expect(page.getByTestId('schedule-status')).toContainText('Friday');
    await expect(page.getByTestId('schedule-status')).toContainText('08:30');
    await expect(page.getByTestId('next-run')).toContainText('Friday');
  });

  test('queues email delivery for scheduled reports', async ({ page }) => {
    await page.goto('/reports');
    await page.fill('[data-testid="schedule-recipients"]', 'alerts@example.com');
    await page.click('[data-testid="send-test-email"]');

    await expect(page.getByTestId('email-status')).toContainText('alerts@example.com');
  });

  test('enforces report access control', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('role', 'viewer'));
    await page.goto('/reports');

    await expect(page.getByTestId('access-banner')).toContainText('view-only');
    await expect(page.getByTestId('generate-report')).toBeDisabled();
    await expect(page.getByTestId('export-pdf')).toBeDisabled();
    await expect(page.getByTestId('save-schedule')).toBeDisabled();
    await expect(page.getByTestId('send-test-email')).toBeDisabled();
  });
});
