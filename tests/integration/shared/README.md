# Shared Integration Utilities

This package hosts the reusable harness components referenced in `docs/development/INTEGRATION_TEST_INFRA_PLAN.md`.

## Planned Modules

| Folder | Description |
| --- | --- |
| `infra/` | Docker Compose controller, health probes, and harness bootstrapping logic. |
| `clients/` | Typed HTTP/SSE clients (backend, line-bot, mlops, simulator) plus Playwright bridges. |
| `dataBuilders/` | Deterministic entity factories that respect backend schema constraints. |
| `security/` | Auth helpers for JWT/API key issuance, token tampering, and clock skew simulation. |
| `env/` | Environment orchestrator that materializes `.env.integration` files per run. |
| `observability/` | Metrics and log probes that assert counters, histograms, and trace IDs. |

### Coding Standards
- TypeScript `strict` enabled; prefer `zod` or existing backend types to validate payloads.
- Target Node 18 features (native fetch, AbortSignal) where practical.
- Keep utilities stateless; the `HarnessContext` instance threads runtime state.

Add deeper docs alongside the concrete implementations once each module is scaffolded.
