# Tests Directory

This directory contains all test suites for the Battery Management System.

## Test Types

### Performance Tests (`performance/`)
k6 load testing and performance validation suite.

**Quick Start:**
```bash
cd performance
npm run test:load:light
```

**Documentation:**
- [Performance Tests README](performance/README.md)
- [Quick Reference](../T214_QUICK_REFERENCE.md)
- [Acceptance Checklist](../T214_ACCEPTANCE_CHECKLIST.md)

**Test Scenarios:**
- Load tests (100, 500, 1000 concurrent users)
- Stress test (find breaking point)
- Spike test (traffic surge)
- Real-time latency test (<2s SLA)
- Endurance test (2-hour soak)

**SLA Requirements:**
- API p95 < 200ms
- Real-time latency < 2s
- Error rate < 1%

## Other Tests

### Backend Tests
Location: `services/backend/src/**/__tests__/`
Run: `cd services/backend && npm test`

### Frontend Tests
Location: `services/frontend/src/**/__tests__/`
Run: `cd services/frontend && npm test`

### E2E Tests
Location: `services/frontend/e2e/`
Run: `cd services/frontend && npm run test:smoke`

## CI/CD

All tests are integrated into CI/CD pipelines:
- Unit/integration tests: Run on every PR
- Performance tests: Run nightly and on-demand
- Smoke tests: Run before production deployment
- Visual regression: Run on frontend changes

See `.github/workflows/` for workflow definitions.
