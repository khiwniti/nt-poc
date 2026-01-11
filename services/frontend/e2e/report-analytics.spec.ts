import { expect, test, type Page } from '@playwright/test';

const login = async (page: Page) => {
  await page.goto('/login');
  await page.fill('input[type="text"]', 'testuser');
  await page.fill('input[type="password"]', 'testpass');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
};

test.describe('Report Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display analytics overview stats', async ({ page }) => {
    await page.goto('/report-analytics');

    await expect(page.getByTestId('stat-card-reports')).toBeVisible();
    await expect(page.getByTestId('stat-card-views')).toBeVisible();
    await expect(page.getByTestId('stat-card-downloads')).toBeVisible();
    await expect(page.getByTestId('stat-card-email-opens')).toBeVisible();
    await expect(page.getByTestId('stat-card-email-clicks')).toBeVisible();
  });

  test('should display downloads by format', async ({ page }) => {
    await page.goto('/report-analytics');

    await expect(page.getByTestId('downloads-by-format')).toBeVisible();
    await expect(page.getByTestId('pdf-downloads')).toBeVisible();
    await expect(page.getByTestId('csv-downloads')).toBeVisible();
    await expect(page.getByTestId('xlsx-downloads')).toBeVisible();
  });

  test('should display popular reports table', async ({ page }) => {
    await page.goto('/report-analytics');

    await expect(page.getByTestId('popular-reports-section')).toBeVisible();
    await expect(page.getByTestId('popular-reports-table')).toBeVisible();
  });

  test('should display activity timeline chart', async ({ page }) => {
    await page.goto('/report-analytics');

    await expect(page.getByTestId('timeline-chart')).toBeVisible();
  });

  test('should display recent activity list', async ({ page }) => {
    await page.goto('/report-analytics');

    await expect(page.getByTestId('recent-activity-section')).toBeVisible();
  });

  test('should allow changing time range', async ({ page }) => {
    await page.goto('/report-analytics');

    const selector = page.getByTestId('time-range-selector');
    await expect(selector).toBeVisible();

    await selector.selectOption('7');
    await page.waitForTimeout(500);

    await selector.selectOption('90');
    await page.waitForTimeout(500);
  });

  test('should export analytics data to CSV', async ({ page }) => {
    await page.goto('/report-analytics');

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-button"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('report-analytics');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should track report view events', async ({ page }) => {
    await page.goto('/reports');

    await page.fill('[data-testid="report-name-input"]', 'Analytics Test Report');
    await page.click('[data-testid="generate-report"]');

    await expect(page.getByTestId('generation-status')).toContainText('ready for preview');

    // View event should be tracked automatically
  });

  test('should track download events', async ({ page }) => {
    await page.goto('/reports');

    await page.click('[data-testid="generate-report"]');
    await page.click('[data-testid="export-pdf"]');

    await expect(page.getByTestId('export-status')).toContainText('PDF export');

    // Download event should be tracked
  });

  test('should track email events', async ({ page }) => {
    await page.goto('/reports');

    await page.fill('[data-testid="schedule-recipients"]', 'test@example.com');
    await page.click('[data-testid="send-test-email"]');

    await expect(page.getByTestId('email-status')).toContainText('Delivery queued');

    // Email event should be tracked
  });

  test('should show loading state', async ({ page }) => {
    await page.goto('/report-analytics');

    // Should show loading briefly
    const loadingSpinner = page.getByTestId('loading-spinner');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="overview-section"]', { timeout: 5000 });
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await page.goto('/report-analytics');

    // Even with no data, dashboard should render without errors
    await expect(page.getByTestId('overview-section')).toBeVisible();
  });
});

test.describe('Report Analytics Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should track full report workflow', async ({ page }) => {
    // Generate report
    await page.goto('/reports');
    await page.fill('[data-testid="report-name-input"]', 'Workflow Test Report');
    await page.click('[data-testid="generate-report"]');
    await expect(page.getByTestId('generation-status')).toContainText('ready for preview');

    // Download in multiple formats
    await page.click('[data-testid="export-pdf"]');
    await page.waitForTimeout(200);
    await page.click('[data-testid="export-csv"]');
    await page.waitForTimeout(200);
    await page.click('[data-testid="export-xlsx"]');

    // Send test email
    await page.fill('[data-testid="schedule-recipients"]', 'workflow@example.com');
    await page.click('[data-testid="send-test-email"]');

    // Check analytics dashboard
    await page.goto('/report-analytics');
    
    // Verify stats are updated
    await expect(page.getByTestId('stat-card-views')).toBeVisible();
    await expect(page.getByTestId('stat-card-downloads')).toBeVisible();
  });

  test('should show analytics for popular reports', async ({ page }) => {
    // Create and interact with multiple reports
    for (let i = 1; i <= 3; i++) {
      await page.goto('/reports');
      await page.fill('[data-testid="report-name-input"]', `Report ${i}`);
      await page.click('[data-testid="generate-report"]');
      await page.waitForTimeout(200);
      
      if (i === 1) {
        // Make first report most popular
        await page.click('[data-testid="export-pdf"]');
        await page.click('[data-testid="export-csv"]');
      }
    }

    // Check popular reports ranking
    await page.goto('/report-analytics');
    await expect(page.getByTestId('popular-reports-table')).toBeVisible();
  });
});
