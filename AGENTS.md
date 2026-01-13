# AGENTS.md (NT-POC)

This repository is a TypeScript/Python monorepo for an ML-enabled Battery Management System.
Use these notes as the default operating rules for agentic coding.

## Repository Layout

- `services/backend/`: Express API (TypeScript, Node 18+, ESM)
- `services/frontend/`: React + Vite (TypeScript, Node 18+, ESM)
- `services/line-bot/`: LINE Bot integration (TypeScript, Node 18+, ESM)
- `services/ml/`: Python training pipeline (TensorFlow)
- `services/mlops/`: FastAPI model serving
- `services/simulator/`: FastAPI simulator
- Other folders exist (performance/chaos tests, prototypes), but the supported npm workspaces are backend + frontend + line-bot.

## Tooling/Runtime

- Node: `>=18` (see root `package.json`)
- Package manager: `npm`
- TypeScript: `strict` enabled (backend + frontend)
- Test (TS): `vitest` (both backend + frontend)
- E2E (frontend): `playwright`
- Lint: `eslint` (flat config)
- Format: `prettier`

## Install

From repo root:

```bash
npm install
```

Notes:
- Root `npm run install:python` only prints instructions; Python deps are installed per-service with venv.

## Common Commands (Root)

Run dev servers:

```bash
npm run dev                 # backend + frontend concurrently
npm run dev:backend         # backend only
npm run dev:frontend        # frontend only
```

Build/lint/typecheck/tests across workspaces:

```bash
npm run build
npm run lint
npm run typecheck
npm run test
npm run quality             # typecheck + lint + prettier check
```

### Run a single workspace command

```bash
npm run <script> --workspace=@nt-poc/backend
npm run <script> --workspace=@nt-poc/frontend
```

Examples:

```bash
npm run test --workspace=@nt-poc/backend
npm run lint --workspace=@nt-poc/frontend
```

## Backend (services/backend)

### Dev / build

```bash
npm run dev                 # tsx watch src/index.ts
npm run build               # tsc -> dist/
npm run start               # node dist/index.js
```

### Lint / format / typecheck

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm run quality
```

Prettier settings are in `services/backend/.prettierrc.json`:
- `singleQuote: true`, `semi: true`, `printWidth: 100`, `tabWidth: 2`, `endOfLine: lf`

### Unit/integration tests (Vitest)

```bash
npm test                    # vitest (watch-like interactive by default)
npm run test:coverage
npm run test:migrations      # vitest run migration-tests/databaseMigrations.test.ts
```

Run a single test file:

```bash
npx vitest run src/routes/__tests__/health.test.ts
```

Run tests matching a name:

```bash
npx vitest run -t "should return" 
```

### Database/migrations

```bash
npm run migrate
npm run migrate:rollback
npm run migrate:status
npm run migrate:make <name>
npm run seed:run
npm run db:setup             # migrate + seed
```

Test data helpers:

```bash
npm run test:seed
npm run test:seed:minimal
npm run test:cleanup
npm run test:reset
```

## Frontend (services/frontend)

### Dev / build

```bash
npm run dev                 # vite dev server
npm run build               # tsc && vite build
npm run preview             # vite preview
```

### Lint / format / typecheck

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm run quality
```

Prettier settings are in `services/frontend/.prettierrc.json` (same as backend).

### Unit tests (Vitest)

```bash
npm test
npm run test:coverage
```

Run a single test file:

```bash
npx vitest run src/hooks/__tests__/useHeatmapData.test.ts
```

Run tests matching a name:

```bash
npx vitest run -t "renders" 
```

### E2E tests (Playwright)

```bash
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
```

Run a single Playwright spec:

```bash
npx playwright test e2e/accessibility/axe.spec.ts --project=chromium
```

Frontend also has targeted suites:

```bash
npm run test:smoke
npm run test:a11y
npm run test:visual          # percy exec -- playwright test ...
```

## Python Services (ml/mlops/simulator)

Each Python service manages deps separately.

Typical flow:

```bash
cd services/<ml|mlops|simulator>
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest                      # if tests exist in that service
```

Run servers (examples):

```bash
cd services/mlops
uvicorn src.main:app --reload --port 8000

cd services/simulator
uvicorn app.main:app --reload --port 8001
```

## CI / Automation Notes

- There are GitHub Actions workflows in `.github/workflows/` for CI, quality checks, accessibility, performance, and contract testing.
- Pact tests exist (frontend consumer + backend provider). Root scripts:

```bash
npm run test:pact
npm run test:pact:consumer
npm run test:pact:provider
```

## Cursor/Copilot Rules

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` were found in this repo at the time of writing.

---

# Code Style Guide (Repository-Wide)

## TypeScript/JavaScript Basics

- Prefer `const`, then `let`; avoid `var`.
- Use ESM imports (`import ... from ...`). Backend packages are ESM (`"type": "module"`).
- Keep functions small; route handlers should be thin and delegate logic to services.
- Avoid `any`. ESLint warns on `@typescript-eslint/no-explicit-any`; prefer `unknown` then narrow.
- Unused params/vars: prefix with `_` (ESLint ignores `_`-prefixed args).

## Imports

- Keep imports at top of file.
- Prefer type-only imports when it improves clarity:

```ts
import type { Request, Response } from 'express';
```

- Frontend supports path alias `@/*` (see `services/frontend/tsconfig.json`). Prefer `@/…` over deep relative paths when in frontend.

## Formatting

- Prettier is the source of truth. Do not hand-tune formatting.
- Default format rules:
  - 2 spaces, single quotes, semicolons, trailing commas (es5), max line length ~100.

## Naming Conventions

- Files/folders: follow existing local patterns.
  - Backend: mostly `camelCase.ts` (e.g. `facilityHealthService.ts`).
  - Frontend components: `PascalCase.tsx` for React components, `camelCase.ts` for utils/services.
- Types/interfaces: `PascalCase`.
- React components: `PascalCase`, hooks: `useXyz`.
- Constants: `UPPER_SNAKE_CASE` for true constants.

## Error Handling

### Backend

- Prefer throwing errors from service layer and handling centrally when feasible.
- There is an Express error middleware at `services/backend/src/middleware/errorHandler.ts` that:
  - Logs with Winston
  - Reports to Sentry
  - Updates Prometheus metrics
  - Returns sanitized messages in production

Guidelines:
- When creating new errors, include an HTTP status via `err.statusCode` (pattern used in middleware).
- Do not leak secrets (tokens, DB creds) into logs or responses.
- Use structured logs (objects) rather than string concatenation.

### Frontend

- Handle network failures explicitly (loading/error states).
- Avoid noisy `console.log`. `console.warn` is used for feature-disable scenarios.

## API / Domain Layering

Backend (preferred):
- `src/routes/`: validate inputs, auth, call services, map to HTTP responses.
- `src/services/`: business logic and DB operations.
- `src/middleware/`: auth/logging/metrics/error handling.

Frontend (preferred):
- `src/services/`: API clients + external integrations.
- `src/stores/`: Zustand state.
- `src/hooks/`: data fetching/polling hooks.
- `src/components/`: reusable UI.

## Testing Conventions

- Vitest is configured with `globals: true` in both backend and frontend.
- Test locations:
  - Frontend: `src/**/__tests__/*.test.ts(x)` plus E2E under `services/frontend/e2e/`.
  - Backend: `src/**/__tests__/*.test.ts`.
- Frontend tests use Testing Library + MSW; global setup is `services/frontend/src/__tests__/setup.ts`.

Patterns:
- Prefer behavior-oriented tests (user visible outcomes / HTTP responses).
- Keep tests deterministic; avoid real network.

## Safety / Secrets

- Never commit `.env` or API keys.
- When adding logging, redact:
  - `Authorization` headers
  - tokens
  - user PII unless required

## “Definition of Done” for a Patch

- `npm run quality` passes in affected workspace(s).
- New/changed behavior has tests (unit/integration/E2E as appropriate).
- No new `any` without a clear reason.
- No secrets added to repo.
