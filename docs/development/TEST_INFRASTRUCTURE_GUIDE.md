# Test Infrastructure Guide

This guide covers the comprehensive test infrastructure setup for the NT-POC project.

## Overview

The project uses a multi-layered testing approach:

- **Backend**: Vitest + Jest for unit/integration tests
- **Frontend**: Vitest + React Testing Library for unit/component tests  
- **E2E**: Playwright for end-to-end testing
- **API Mocking**: MSW (Mock Service Worker) for API mocking
- **Coverage**: Codecov integration for coverage reporting

## Backend Testing

### Vitest Configuration
Primary test runner configured in `vitest.config.ts`:
- Node.js environment
- Coverage with V8 provider
- Setup file: `src/test/setup.ts`

### Jest Configuration (Alternative)
Jest is available as an alternative test runner:
```bash
# Run Jest tests
npm run test:jest

# Watch mode
npm run test:jest:watch
```

Configuration in `jest.config.js`:
- TypeScript support via ts-jest
- Test timeout: 30s
- Coverage collection from `src/**/*.ts`
- Setup file: `src/test/jest.setup.ts`

### Running Backend Tests
```bash
cd services/backend

# Vitest (primary)
npm test
npm run test:coverage

# Jest (alternative) 
npm run test:jest
```

## Frontend Testing

### Vitest + React Testing Library
Configuration in `vitest.config.ts`:
- jsdom environment for browser APIs
- React plugin for JSX support
- Setup file: `src/__tests__/setup.ts`
- Excludes E2E tests (`**/e2e/**`)

### Running Frontend Tests
```bash
cd services/frontend

# Unit/component tests
npm test
npm run test:coverage

# Watch mode
npm test -- --watch
```

## End-to-End Testing

### Playwright Configuration
Configuration in `playwright.config.ts`:
- Multiple browsers: Chrome, Firefox, Safari, Mobile
- Retry on CI: 2 retries
- Screenshots on failure
- Trace on first retry

### Test Types
- **Full E2E**: `e2e/*.spec.ts` - Comprehensive user journeys
- **Smoke Tests**: `e2e/smoke-tests/*.smoke.spec.ts` - Critical path verification
- **Visual Tests**: `e2e/visual/*.percy.ts` - Visual regression with Percy

### Running E2E Tests
```bash
cd services/frontend

# Install browsers (first time)
npx playwright install

# Run all E2E tests
npm run test:e2e

# UI mode for debugging
npm run test:e2e:ui

# Smoke tests only
npm run test:smoke

# Visual regression tests
npm run test:visual
```

## API Mocking with MSW

### Frontend Mocking
Setup in `src/__tests__/mocks/`:
- `handlers.ts` - API route definitions
- `server.ts` - Node.js test server  
- `browser.ts` - Browser development server

Automatic setup in test environment via `setup.ts`.

### Backend Mocking
Setup in `src/test/mocks/`:
- `handlers.ts` - External API mocks (weather, ML APIs)
- `server.ts` - Test server setup

### Mock Data Included
- Facilities and battery systems
- Alerts and notifications
- Metrics and KPIs
- RUL predictions
- User authentication
- Reports

## Coverage Reporting

### Codecov Integration
Configuration in root `codecov.yml`:
- Target: 70% coverage
- Flags for backend/frontend separation
- Automatic reporting on CI/CD

### Local Coverage
```bash
# Backend coverage
cd services/backend
npm run test:coverage

# Frontend coverage  
cd services/frontend
npm run test:coverage
```

Coverage reports generated in `coverage/` directories.

## Test Writing Guidelines

### Unit Tests
- Test individual functions/classes
- Use factories from `src/test/factories/` (backend)
- Mock external dependencies
- Fast execution (< 100ms per test)

### Integration Tests  
- Test API endpoints with real database
- Use test fixtures from `src/test/fixtures/`
- Clean up after each test
- Use MSW for external APIs

### Component Tests
- Test React components in isolation
- Use React Testing Library queries
- Mock API calls with MSW
- Test user interactions

### E2E Tests
- Test complete user workflows
- Use page objects for maintainability
- Include accessibility checks
- Test across multiple browsers

## Best Practices

### Test Organization
```
backend/src/test/
├── setup.ts              # Test environment setup
├── jest.setup.ts         # Jest-specific setup
├── factories/            # Test data factories
├── fixtures/             # Complete test scenarios
├── mocks/                # MSW external API mocks
└── utils/                # Test utilities

frontend/src/__tests__/
├── setup.ts              # Test environment setup
├── mocks/                # MSW API mocks
└── **/*.test.tsx         # Component tests

frontend/e2e/
├── smoke-tests/          # Critical path tests
├── visual/               # Visual regression tests
└── *.spec.ts            # Full E2E tests
```

### Naming Conventions
- Test files: `*.test.ts`, `*.spec.ts`
- E2E tests: `*.spec.ts`
- Smoke tests: `*.smoke.spec.ts`  
- Visual tests: `*.percy.ts`

### Performance
- Keep unit tests under 100ms
- Use `describe.concurrent()` for parallel execution
- Mock expensive operations
- Use factories for test data generation

## CI/CD Integration

Tests run automatically on:
- Pull request creation/updates
- Merge to main branch
- Deployment pipeline

### Test Commands in CI
```bash
# Backend tests
npm run test:coverage

# Frontend tests  
npm run test:coverage

# E2E tests
npm run test:smoke

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Troubleshooting

### Common Issues
1. **Database connection errors**: Ensure test database is configured
2. **Playwright browser errors**: Run `npx playwright install`
3. **MSW not intercepting**: Check handler setup in `setup.ts`
4. **Coverage thresholds**: Check `codecov.yml` configuration

### Debug Commands
```bash
# Debug Vitest
npm test -- --reporter=verbose

# Debug Playwright
npm run test:e2e:ui

# Debug MSW
console.log server requests in test setup
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/) 
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Codecov Documentation](https://docs.codecov.io/)