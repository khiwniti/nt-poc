# Python Integration Utilities

Python-specific helpers live under this namespace to support tests hitting the FastAPI-based services (MLOps + Simulator).

## Layout
- `clients/` – httpx clients for MLOps (`/api/models`, `/api/rul`, `/api/anomaly`) and simulator endpoints (`/api/sensors`, `/api/metrics`).
- `fixtures/` – pytest fixtures that provision deterministic seeds, load serialized model artifacts, and inject shared random sources.

## Tooling
- Target Python 3.11 (align with `services/mlops` + `services/simulator`).
- Depend on `httpx`, `pytest`, and `tenacity` for retries.
- Provide `tests/integration/python/requirements.txt` once dependencies stabilize.

These helpers integrate with the TypeScript harness via environment variables published by `envOrchestrator`. Python tests should read the `HARNESS_CONTEXT_FILE` to acquire service URLs, auth secrets, and snapshot metadata.
