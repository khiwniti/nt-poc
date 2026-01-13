# T222: Monitoring & Observability - Quick Reference

## Environment Setup

```bash
# Required
LOG_LEVEL=debug|info|warn|error

# Optional (but recommended for production)
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=development|production
```

## Key Files

```
src/
├── config/
│   ├── logger.ts              # Winston logger
│   ├── sentry.ts              # Sentry error tracking
│   ├── metrics.ts             # Prometheus metrics
│   └── alertThresholds.ts     # Alert thresholds
├── middleware/
│   ├── logging.ts             # HTTP logging
│   ├── metrics.ts             # HTTP metrics
│   └── errorHandler.ts        # Error handling
├── routes/
│   └── monitoring.ts          # Health & metrics endpoints
└── utils/
    └── monitoring.ts          # Monitoring utilities
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Health check |
| `GET /api/v1/metrics` | Prometheus metrics |

## Usage

### Logging
```typescript
import logger from './config/logger.js';

logger.debug('Debug info', { key: 'value' });
logger.info('Information', { userId: 123 });
logger.warn('Warning message');
logger.error('Error occurred', { error: err.message });
```

### Track Prediction
```typescript
import { trackPrediction } from './utils/monitoring.js';

const result = await trackPrediction('model-type', async () => {
  return await predict(data);
});
```

### Track Job
```typescript
import { trackJobExecution } from './utils/monitoring.js';

await trackJobExecution('job-name', async () => {
  // Job code
});
```

### Track Alert
```typescript
import { trackAlert } from './utils/monitoring.js';

trackAlert('critical', 'battery-temp-high');
```

### Track DB Query
```typescript
import { trackDbQuery } from './utils/monitoring.js';

const data = await trackDbQuery('select', 'facilities', async () => {
  return db('facilities').select();
});
```

## Metrics Available

- `http_request_duration_seconds` - HTTP request duration
- `http_requests_total` - Total HTTP requests
- `application_errors_total` - Application errors
- `prediction_duration_seconds` - Prediction duration
- `predictions_total` - Total predictions
- `alerts_generated_total` - Alerts generated
- `db_query_duration_seconds` - Database query duration
- `job_execution_duration_seconds` - Job execution duration
- `job_executions_total` - Total job executions
- Plus default Node.js metrics (CPU, memory, etc.)

## Alert Thresholds

### HTTP
- Error rate: 5% warning, 10% critical
- Response time: 2s warning, 5s critical

### Predictions
- Error rate: 2% warning, 5% critical
- Response time: 5s warning, 10s critical

### Database
- Query time: 1s warning, 2s critical

### System
- Memory: 80% warning, 90% critical
- CPU: 70% warning, 85% critical

## Testing

```bash
# Start server
npm run dev

# Test health
curl http://localhost:3000/api/v1/health

# Test metrics
curl http://localhost:3000/api/v1/metrics

# Check logs
tail -f logs/combined.log
tail -f logs/error.log
```

## Dependencies

- `@sentry/node` - Error tracking
- `@sentry/profiling-node` - Performance profiling
- `winston` - Logging
- `prom-client` - Prometheus metrics
