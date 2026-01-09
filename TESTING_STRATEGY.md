# Testing Strategy

This repo is a multi-service project:
- `services/frontend` (React + Vite)
- `services/backend` (Node + Express + TypeScript)
- `services/ml` and `services/mlops` (Python services; limited automated coverage in this repo snapshot)

The strategy below defines *what* we test, *where* tests live, and *what runs in CI/CD*.

## Goals

- Catch regressions early with fast, deterministic tests.
- Validate service integration (API + DB + UI) with higher-level tests.
- Keep production risk low with smoke tests and rollback paths.

## Test Levels (Pyramid)

1. **Unit tests (fast, isolated)**
   - Backend: pure functions, services with mocked dependencies.
   - Frontend: utilities, stores, hooks, and component behavior.

2. **Integration tests (real boundaries)**
   - Backend: API routes + DB, repositories, jobs, auth flows.
   - Frontend: components/pages with React Testing Library + MSW for API mocking.

3. **End-to-end smoke tests (critical flows)**
   - Frontend Playwright smoke suite for “can a user do the essentials?” on a deployed environment.

4. **Visual regression tests (UI snapshots)**
   - Percy + Playwright for UI snapshot comparison on PRs affecting the frontend.

## What to Test

### Backend

- **Routes**: auth, CRUD, validation, error handling, pagination/filtering.
- **Repositories**: query correctness, edge cases (missing rows, constraints).
- **Jobs/schedulers**: correct triggering, retries, idempotency where applicable.
- **Security**: auth/authorization boundaries and input validation.

### Frontend

- **User-visible behavior**: rendering, navigation, empty/error states, accessibility roles.
- **Stores/hooks**: state transitions, derived selectors, edge cases.
- **Integration points**: API interactions via MSW handlers and realistic responses.

### Smoke / E2E

- Authentication and protected routes
- Dashboard load and critical navigation
- Alert flows
- Reports flows

## Where Tests Live

- Frontend unit/integration tests: `services/frontend/src/**/__tests__/*.(test|spec).(ts|tsx)`
- Backend unit/integration tests: `services/backend/src/**/__tests__/*.(test|spec).ts`
- Backend shared test utilities: `services/backend/src/test/` (factories/fixtures/utils)
- Frontend smoke tests: `services/frontend/e2e/smoke-tests/*.smoke.spec.ts`
- Frontend visual regression: `services/frontend/e2e/visual/` (Percy snapshots)

## Local Commands

### Frontend

```bash
cd services/frontend
npm ci
npm test
npm run test:coverage
npm run test:smoke
npm run test:visual:local
```

### Backend

Backend tests use `.env.test` (loaded by `services/backend/src/test/setup.ts`). Ensure a local Postgres instance is running and the test DB schema is migrated.

```bash
cd services/backend
npm ci

# Run tests
npm test
npm run test:coverage

# One-time: migrate test DB (reads env from your shell, not .env.test)
export $(cat .env.test | xargs)
NODE_ENV=test npm run migrate
```

## CI/CD Coverage

GitHub Actions workflows currently cover:
- **Backend unit/integration tests** and **frontend unit tests** during deploy (`.github/workflows/cd-railway.yml`)
- **Frontend visual regression** on PRs and main (`.github/workflows/visual-regression.yml`)
- **Manual rollback** workflow (`.github/workflows/rollback.yml`)

See `CI_CD_PIPELINE.md` for details.

## Guiding Principles

- Prefer fewer, higher-signal tests over many brittle ones.
- Test behavior, not implementation details.
- Keep tests deterministic: control time, randomness, and network.
- When adding features, add tests at the lowest level that provides confidence.

