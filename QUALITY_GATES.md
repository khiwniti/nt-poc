# Quality Gates

This document defines the “must pass” checks we use to keep mainline code and deployments safe. It includes both **policy** (what we want) and **automation** (what the repo currently enforces).

## Gate 0: Local Development (Before PR)

**Policy (expected):**
- Run backend tests: `cd services/backend && npm test`
- Run frontend tests + build: `cd services/frontend && npm test && npm run build`
- If UI changes: run visual suite locally: `cd services/frontend && npm run test:visual:local`

## Gate 1: Pull Request (Before Merge)

**Policy (expected):**
- At least one approving review (more for risky changes)
- Tests added/updated to cover the change (see `TESTING_STRATEGY.md`)
- PR description includes how to validate and any rollout/deploy notes

**Automation (current):**
- Frontend visual regression runs for relevant PRs: `.github/workflows/visual-regression.yml`

## Gate 2: Main Branch Deployment

**Automation (current):**
- Deploy workflow runs on `main` and enforces:
  - backend tests (`services/backend`: `npm test`)
  - frontend tests (`services/frontend`: `npm test`)
  - frontend build (`npm run build`)
  - backend deploy + migrations + health check

See `.github/workflows/cd-railway.yml` and `CI_CD_PIPELINE.md`.

## Gate 3: Post-Deployment Validation

**Policy (expected):**
- Run smoke tests against the deployed environment:
  - E2E smoke suite: `./run-smoke-tests.sh`
  - API smoke suite (where applicable): `./production-smoke-tests.sh`
- Confirm health endpoints are green and key user journeys are functional

## Exceptions

If a gate must be bypassed (e.g., urgent incident response), record:
- why the bypass was necessary
- what risks were accepted
- what follow-up action is required (tests, docs, rollback plan)

