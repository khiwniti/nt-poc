# System-Level Integration Harness

Suites placed in this directory orchestrate the full NT-POC stack (backend, frontend, line-bot, mlops, simulator, databases, mocks) using the shared harness.

## Responsibilities
- Bootstrap Compose stacks via `composeController` with the appropriate profile (`core`, `full-stack`, `ml-suite`).
- Instantiate `HarnessContext` and expose it to Vitest suites (e.g., via `setup.ts`).
- Provide helpers to trigger scheduled jobs, control service lifecycles, and collect failure artifacts.

## Next Steps
1. Add `setup.ts` that initializes the harness before tests execute.
2. Create baseline smoke suites verifying health endpoints and cross-service connectivity.
3. Expand into feature-specific journeys (alerts workflow, prediction pipeline, SSE streaming) by importing clients from `shared/clients`.

Until the harness core is implemented, this folder serves as the target location for system-level specs.
