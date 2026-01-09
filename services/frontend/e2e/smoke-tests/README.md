# Smoke Tests for Critical Flows

## Overview

This directory contains end-to-end smoke tests for critical user journeys in the NT-POC application. These tests are designed to run on staging environments before production deployments to ensure core functionality is working.

## Test Coverage

### 1. Authentication Flow (`auth.smoke.spec.ts`)
- ✓ Successful login redirects to dashboard
- ✓ Protected routes redirect to login when unauthenticated
- ✓ Logout clears session and redirects
- ✓ Login form validation works

### 2. Dashboard View and Navigation (`dashboard.smoke.spec.ts`)
- ✓ Dashboard loads with header and navigation
- ✓ Critical navigation links are accessible
- ✓ Page renders without JavaScript errors
- ✓ Dashboard is responsive on mobile viewport

### 3. Alert Management Flow (`alerts.smoke.spec.ts`)
- ✓ Alerts page loads successfully
- ✓ Alert list or empty state is displayed
- ✓ Alert filters are accessible
- ✓ Pagination or infinite scroll works
- ✓ Alert stats dashboard displays if available

### 4. Report Generation Flow (`reports.smoke.spec.ts`)
- ✓ Reports page loads successfully
- ✓ Report sections are visible
- ✓ Report data displays correctly
- ✓ Page renders without errors
- ✓ Export or download functionality is available

## Running Smoke Tests

### Quick Start

```bash
# From project root
./run-smoke-tests.sh
```

### Manual Execution

```bash
# From frontend directory
cd services/frontend

# Run all smoke tests
npx playwright test e2e/smoke-tests --config=playwright.smoke.config.ts

# Run specific test suite
npx playwright test e2e/smoke-tests/auth.smoke.spec.ts

# Run with UI mode
npx playwright test e2e/smoke-tests --ui

# Run in headed mode (see browser)
npx playwright test e2e/smoke-tests --headed
```

### Environment Configuration

Set environment variables to test against different environments:

```bash
# Staging environment
export FRONTEND_URL=https://staging.example.com
export BACKEND_URL=https://api-staging.example.com
export TEST_ENV=staging
./run-smoke-tests.sh

# Production environment (read-only smoke tests)
export FRONTEND_URL=https://app.example.com
export BACKEND_URL=https://api.example.com
export TEST_ENV=production
./run-smoke-tests.sh
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Staging Smoke Tests

on:
  deployment_status:

jobs:
  smoke-tests:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd services/frontend
          npm ci
          npx playwright install --with-deps chromium
      - name: Run smoke tests
        env:
          FRONTEND_URL: ${{ secrets.STAGING_FRONTEND_URL }}
          BACKEND_URL: ${{ secrets.STAGING_BACKEND_URL }}
        run: ./run-smoke-tests.sh
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: smoke-test-results
          path: services/frontend/smoke-test-results/
```

### Railway Deployment Hook

Add to your `railway.toml`:

```toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300

[deploy.smokeTests]
command = "./run-smoke-tests.sh"
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report services/frontend/smoke-test-results
```

## Troubleshooting

### Tests fail on "service not accessible"

Ensure services are running:
```bash
# Start backend
cd services/backend && npm run dev

# Start frontend (in another terminal)
cd services/frontend && npm run dev
```

### Authentication tests fail

Check that the test user credentials exist in your test database or update the test credentials in the spec files.

### Timeout errors

Increase timeout in `playwright.smoke.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Browser not installed

Install Playwright browsers:
```bash
npx playwright install chromium
```

## Best Practices

1. **Keep tests minimal** - Only test critical happy paths
2. **Run before deployment** - Always run on staging before production
3. **Monitor execution time** - Smoke tests should complete in < 5 minutes
4. **Handle flakiness** - Use proper waits and retries
5. **Update regularly** - Keep tests in sync with UI changes

## Adding New Smoke Tests

1. Create a new spec file in `e2e/smoke-tests/`
2. Follow the naming convention: `*.smoke.spec.ts`
3. Focus on critical user journeys only
4. Update this README with test coverage
5. Add to `run-smoke-tests.sh` if needed

Example:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Smoke Test: New Feature', () => {
  test('critical functionality works', async ({ page }) => {
    // Test implementation
  });
});
```

## Support

For issues or questions:
- Check logs in `smoke-test-*.log`
- Review HTML report in `smoke-test-results/`
- Consult Playwright documentation: https://playwright.dev
