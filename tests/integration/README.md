# Integration Test Suites

This directory hosts the multi-service integration programs derived from the plans in `docs/INTEGRATION_TEST_ARCHITECTURE_ANALYSIS.md`, `docs/INTEGRATION_TEST_STRATEGY.md`, and `docs/development/INTEGRATION_TEST_INFRA_PLAN.md`.

## Structure
- `shared/` – Harness core, Docker Compose controllers, data builders, and auth helpers reused across suites.
- `system/` – End-to-end orchestrators that spin up the full stack, coordinate health checks, and expose the `HarnessContext` to Vitest runners.
- `realtime/` – SSE and streaming-oriented scenarios that focus on alert broadcasting reliability.
- `python/` – httpx clients and pytest fixtures for the FastAPI-based services (MLOps + simulator).

Each subdirectory contains its own `README.md` with deeper guidance plus references to planned utilities. Add new suites under the most specific folder available and keep helper code in `shared/` so it can be imported from both TypeScript and Python entry points (via `ts-node` and `pytest` respectively).
