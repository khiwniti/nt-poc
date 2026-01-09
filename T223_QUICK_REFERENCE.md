# T223 Quick Reference - Smoke Tests

## Quick Commands

```bash
# Run all smoke tests
./run-smoke-tests.sh

# Run from frontend directory
cd services/frontend && npm run test:smoke

# Run specific suite
npm run test:smoke -- auth.smoke.spec.ts
npm run test:smoke -- dashboard.smoke.spec.ts
npm run test:smoke -- alerts.smoke.spec.ts
npm run test:smoke -- reports.smoke.spec.ts

# View report
npm run test:smoke:report

# Debug mode
npm run test:smoke:ui
```

## Environment Variables

```bash
# Staging
export FRONTEND_URL=https://staging.example.com
export BACKEND_URL=https://api-staging.example.com
export TEST_ENV=staging

# Production (read-only)
export FRONTEND_URL=https://app.example.com
export BACKEND_URL=https://api.example.com
export TEST_ENV=production
```

## File Structure

```
services/frontend/e2e/smoke-tests/
├── auth.smoke.spec.ts          # Authentication tests
├── dashboard.smoke.spec.ts     # Dashboard tests
├── alerts.smoke.spec.ts        # Alert management tests
├── reports.smoke.spec.ts       # Report generation tests
└── README.md                   # Full documentation

services/frontend/
├── playwright.smoke.config.ts  # Smoke test config
└── package.json               # Updated with scripts

run-smoke-tests.sh             # Main runner (project root)
```

## Test Coverage

- **Authentication**: 4 tests (login, logout, protection, validation)
- **Dashboard**: 4 tests (loading, navigation, errors, responsive)
- **Alerts**: 5 tests (loading, display, filters, pagination, stats)
- **Reports**: 5 tests (loading, sections, data, errors, export)

**Total**: 18 smoke tests covering all critical flows

## Pre-Deployment Checklist

- [ ] Backend service running
- [ ] Frontend service running
- [ ] Test database seeded
- [ ] Run `./run-smoke-tests.sh`
- [ ] All tests pass (green)
- [ ] Review HTML report
- [ ] Check for console errors

## Common Issues

**Services not running**:
```bash
cd services/backend && npm run dev
cd services/frontend && npm run dev
```

**Browsers not installed**:
```bash
npx playwright install chromium
```

**Tests timeout**:
- Check service health endpoints
- Increase timeout in `playwright.smoke.config.ts`

## Integration

Add to CI/CD pipeline:
```yaml
- name: Run smoke tests
  run: ./run-smoke-tests.sh
  env:
    FRONTEND_URL: ${{ secrets.STAGING_URL }}
```

## Support Files

- `T223_ACCEPTANCE_CHECKLIST.md` - Full acceptance criteria
- `T223_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `services/frontend/e2e/smoke-tests/README.md` - Complete documentation
