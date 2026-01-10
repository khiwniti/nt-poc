# Monitoring & Alerting (T233)

## Overview

This repository supports monitoring and alerting via:

- **Sentry**: error tracking + performance monitoring (backend + frontend)
- **Winston**: structured JSON logs to stdout (aggregated by Railway logs)
- **Railway Metrics**: CPU/memory/network/restarts per service
- **In-app email alerts**: SendGrid-based critical alert notifications (backend alert escalation)

## Backend (Express)

### Endpoints

- `GET /api/v1/health` — Railway healthcheck endpoint
- `GET /api/v1/monitoring` — lightweight monitoring dashboard (HTML)
- `GET /metrics` — Prometheus metrics

Optional protection:

- Set `MONITORING_AUTH_TOKEN` to require `Authorization: Bearer <token>` for `/api/v1/monitoring/*`
- Set `METRICS_AUTH_TOKEN` to require `Authorization: Bearer <token>` for `/metrics`

### Required env vars (Railway → backend service → Variables)

```bash
# Sentry
SENTRY_DSN=<backend-sentry-dsn>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=${{RAILWAY_GIT_COMMIT_SHA}}

# Logs
LOG_LEVEL=info

# Optional: protect monitoring endpoints
MONITORING_AUTH_TOKEN=<random-32+>
METRICS_AUTH_TOKEN=<random-32+>
```

### Sentry alert rules (recommended)

Configure in Sentry (Project → Alerts):

- **Error rate**: alert when error events spike (e.g. `> 10 events / 5m` or `> 1%` of transactions)
- **Latency**: alert when `p95(transaction.duration)` exceeds a threshold (e.g. `> 2s` for 10m)

Add an action to notify via **email** (and/or Slack/PagerDuty if used).

### Dashboard (recommended)

Use:

- **Sentry → Dashboards**: add widgets for error events, throughput, and p95 latency
- **Railway → Service → Metrics**: CPU/memory/restarts for the backend service
- **Backend → `/api/v1/monitoring`**: quick links + process stats + metrics JSON

## Frontend (React/Vite)

### Required env vars

```bash
VITE_SENTRY_DSN=<frontend-sentry-dsn>
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_RELEASE=${{RAILWAY_GIT_COMMIT_SHA}}
```

## Railway metrics + notifications

In Railway (per service):

- Use the **Metrics** tab to monitor CPU/memory/network/restarts.
- Configure **Notifications** to send emails on deploy failures, restarts, and incident events.

## Email notifications (SendGrid)

The backend includes SendGrid-powered critical alert emails (separate from Sentry):

- Configure `SENDGRID_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `DASHBOARD_BASE_URL`
- Validate in SendGrid Activity and in backend logs (Winston)
