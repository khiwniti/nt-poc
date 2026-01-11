# T213: Contract Tests (Pact) - Acceptance Checklist

## ✅ Pact setup for consumer (Frontend)
- [x] Installed `@pact-foundation/pact` package
- [x] Created `pact.config.ts` for consumer configuration
- [x] Created dedicated `vitest.pact.config.ts` to avoid MSW conflicts
- [x] Added `test:pact` and `test:pact:watch` scripts

## ✅ Pact setup for provider (Backend)
- [x] Installed `@pact-foundation/pact` package
- [x] Created `pact.provider.config.ts` for provider configuration
- [x] Created `provider.verification.spec.ts` with mock server
- [x] Created dedicated `vitest.pact.config.ts`
- [x] Added `test:pact` and `test:pact:verify` scripts

## ✅ Contract tests for key endpoints
- [x] Health API (`GET /api/v1/health`)
- [x] Facilities API
  - [x] `GET /api/v1/facilities` - List facilities
  - [x] `GET /api/v1/facilities/:id` - Get single facility
  - [x] `GET /api/v1/facilities/:id/kpis` - Get facility KPIs
- [x] Alerts API
  - [x] `GET /api/v1/alerts` - List alerts with pagination
  - [x] `GET /api/v1/alerts/:id` - Get single alert
  - [x] `GET /api/v1/alerts/stats/summary` - Get alert statistics
  - [x] `POST /api/v1/alerts/:id/acknowledge` - Acknowledge alert
  - [x] `POST /api/v1/alerts/:id/resolve` - Resolve alert (with validation)

## ✅ Contract verification on CI
- [x] Created `.github/workflows/contract-testing.yml`
- [x] Consumer tests run and generate pact files
- [x] Pact files uploaded as artifacts
- [x] Provider verification runs after consumer tests
- [x] Status check gate for contract tests

## ✅ Pact broker integration
- [x] Broker configuration in `pact.provider.config.ts`
- [x] Environment variable support (`PACT_BROKER_BASE_URL`, `PACT_BROKER_TOKEN`)
- [x] Contract publishing workflow step
- [x] Created `docs/PACT_BROKER_SETUP.md` with setup instructions
- [x] Consumer version selectors for mainBranch and deployedOrReleased

## ✅ Breaking change detection
- [x] CI workflow includes `can-i-deploy` check
- [x] Checks both consumer and provider deployability
- [x] PR comment with contract testing status
- [x] Pending pact support enabled
- [x] WIP pacts since 2024-01-01

## Files Created/Modified

### New Files
- `services/frontend/src/__tests__/pact/pact.config.ts`
- `services/frontend/src/__tests__/pact/alerts.consumer.pact.spec.ts`
- `services/frontend/src/__tests__/pact/facilities.consumer.pact.spec.ts`
- `services/frontend/src/__tests__/pact/health.consumer.pact.spec.ts`
- `services/frontend/vitest.pact.config.ts`
- `services/backend/src/test/pact/pact.provider.config.ts`
- `services/backend/src/test/pact/provider.verification.spec.ts`
- `services/backend/vitest.pact.config.ts`
- `.github/workflows/contract-testing.yml`
- `docs/PACT_BROKER_SETUP.md`
- `pacts/BMS-Frontend-BMS-Backend.json` (generated)

### Modified Files
- `services/frontend/package.json` - Added Pact scripts and node-fetch
- `services/backend/package.json` - Added Pact scripts
- `package.json` - Added root-level Pact scripts

## Test Results

### Consumer Tests: 12 passed
- Health API: 1 test
- Facilities API: 4 tests
- Alerts API: 7 tests

### Contract Generated
- `pacts/BMS-Frontend-BMS-Backend.json` - V4 Pact specification
