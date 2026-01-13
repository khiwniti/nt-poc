# Realtime Integration Suites

Scenarios focused on Server-Sent Events (SSE) alert broadcasting and other streaming concerns belong here.

## Planned Coverage
- Alert lifecycle broadcasts (create → update → resolve) delivered via backend SSE gateway.
- Reconnection behavior, heartbeat validation, and payload ordering guarantees using `eventStreamHarness`.
- Chaos/resilience overlays that simulate latency or dropped connections through toxiproxy.

## Getting Started
1. Import the shared `HarnessContext` from `../shared/harnessContext` once available.
2. Leverage `eventStreamHarness` to subscribe to `/api/v1/alerts/stream` and record transcripts for assertions.
3. Use fixture builders to seed alerts and battery systems before subscribing; rely on `metricsProbe` to assert SSE counter deltas.

Document failing scenarios and attach SSE transcripts via the failure hooks described in the infrastructure plan.
