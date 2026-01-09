# CI/CD Pipeline

This repo uses GitHub Actions for CI/CD. Workflows live in `.github/workflows/`.

## Workflows

### 1) Continuous Deployment to Railway

**Workflow:** `.github/workflows/cd-railway.yml`  
**Trigger:** push to `main`, or manual `workflow_dispatch`  
**Purpose:** run tests/build, deploy backend + frontend to Railway, run health checks, tag deployments.

**High-level steps:**
- Install deps for `services/backend` and `services/frontend`
- Run `npm test` in both services
- Build frontend (`npm run build`)
- Deploy backend + run migrations via Railway CLI
- Deploy frontend
- Poll backend health endpoint until healthy
- Create and push a `deploy-YYYYMMDD-HHMMSS` git tag

**Required secrets:**
- `RAILWAY_TOKEN` (used by Railway CLI)

**Key URLs used:**
- Backend health check: `https://nt-poc-backend-production.up.railway.app/api/v1/health`

### 2) Visual Regression Tests (Percy)

**Workflow:** `.github/workflows/visual-regression.yml`  
**Triggers:**
- pull requests to `main` / `develop` when `services/frontend/**` changes
- push to `main` when `services/frontend/**` changes

**Purpose:** build the frontend and run Percy-powered Playwright snapshot tests.

**High-level steps:**
- Install frontend deps
- Install Playwright browsers
- Build frontend
- Run `npm run test:visual`
- Upload the Playwright report as an artifact

**Required secrets:**
- `PERCY_TOKEN`

**Optional variables (for PR comment links):**
- `PERCY_ORG`
- `PERCY_PROJECT`

### 3) Manual Rollback

**Workflow:** `.github/workflows/rollback.yml`  
**Trigger:** manual `workflow_dispatch`  
**Purpose:** rollback backend/frontend services on Railway and tag the rollback.

**Inputs:**
- `service`: `all` | `backend` | `frontend`
- `tag`: optional, informational for the rollback tag message

**High-level steps:**
- Roll back the selected Railway service(s)
- (If backend) run `npm run migrate:rollback` via Railway
- Verify backend health
- Create and push a `rollback-YYYYMMDD-HHMMSS` git tag

## Local CI Parity (Recommended)

Before opening a PR, run:

```bash
cd services/backend && npm ci && npm test
cd ../frontend && npm ci && npm test && npm run build
```

For frontend UI regression:

```bash
cd services/frontend
npm run test:visual:local
```

## Smoke Testing

- E2E smoke runner script: `./run-smoke-tests.sh` (Playwright, critical flows)
- Production smoke test suite: `./production-smoke-tests.sh` (API-level checks + auth + core endpoints)

These are not currently enforced as required GitHub Actions checks in this repo snapshot, but are intended as deployment-quality gates (see `QUALITY_GATES.md`).

