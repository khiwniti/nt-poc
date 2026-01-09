# Contributing Guide

Thanks for contributing. This repo is organized as a multi-service project under `services/`.

## Repo Structure

- `services/frontend`: React + Vite web app
- `services/backend`: Node + Express API
- `services/ml`, `services/mlops`: Python services (training + inference)
- `.github/workflows`: CI/CD workflows

## Development Setup

### Prerequisites

- Node.js (see workflow `NODE_VERSION` in `.github/workflows/`)
- npm
- PostgreSQL (for backend tests and local runs)

### Backend

```bash
cd services/backend
cp .env.example .env
npm ci
npm run migrate
npm run dev
```

### Frontend

```bash
cd services/frontend
npm ci
npm run dev
```

## Running Tests

### Backend

```bash
cd services/backend
npm test
npm run test:coverage
```

Backend tests load `services/backend/.env.test`. Ensure the test database exists and is migrated:

```bash
cd services/backend
export $(cat .env.test | xargs)
NODE_ENV=test npm run migrate
```

### Frontend

```bash
cd services/frontend
npm test
npm run test:coverage
npm run test:smoke
npm run test:visual:local
```

## Pull Requests

### Before opening a PR

- Run the relevant test suites locally (see “Running Tests”)
- Update docs if behavior or procedures changed
- Include screenshots or Percy links for UI changes

### PR description should include

- What changed and why
- How to validate (commands and/or manual steps)
- Any deploy notes (migrations, env vars, backward compatibility)

## Review Process

- Use `CODE_REVIEW_CHECKLIST.md` for author and reviewer checks
- Follow `QUALITY_GATES.md` for required/recommended gates

## Testing Docs

- Strategy: `TESTING_STRATEGY.md`
- Writing guidelines: `TEST_WRITING_GUIDELINES.md`
- CI/CD: `CI_CD_PIPELINE.md`

