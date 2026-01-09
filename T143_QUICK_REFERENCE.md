# T143: Scheduled ML Prediction Job - Quick Reference

## Quick Start

### Start Server with Scheduled Job
```bash
cd services/backend
npm run dev
```

The scheduled job starts automatically and runs every hour.

## Configuration

### Environment Variables
```bash
PREDICTION_JOB_INTERVAL_MINUTES=60  # Job interval (default: 60 = 1 hour)
```

### Adjust Job Interval
```bash
# Every 30 minutes
PREDICTION_JOB_INTERVAL_MINUTES=30

# Every 2 hours
PREDICTION_JOB_INTERVAL_MINUTES=120
```

## API Endpoints

### Get Job Status
```bash
GET /api/v1/jobs/predictions/status
Authorization: Bearer YOUR_TOKEN

Response:
{
  "data": {
    "isRunning": false,
    "lastRun": "2024-01-09T10:00:00Z",
    "metrics": {
      "startTime": "2024-01-09T10:00:00Z",
      "endTime": "2024-01-09T10:05:00Z",
      "durationMs": 300000,
      "batteriesProcessed": 10,
      "predictionsCreated": 10,
      "errors": 0
    }
  }
}
```

### Manually Trigger Job
```bash
POST /api/v1/jobs/predictions/trigger
Authorization: Bearer YOUR_TOKEN

Response:
{
  "message": "Prediction job triggered successfully",
  "data": {
    "triggeredAt": "2024-01-09T10:00:00Z"
  }
}
```

## Job Execution Flow

1. **Fetch Active Batteries**
   - Query all batteries with `status = 'active'`
   - Extract features from last 24 hours of sensor data

2. **Process Each Battery**
   - Extract features: SoH delta, anomaly count, max temp, min voltage
   - Call ML model for risk prediction
   - Map risk to RUL: `7d→7 days`, `14d→14 days`, `30d→30 days`, `safe→365 days`
   - Store prediction in database

3. **Track Metrics**
   - Batteries processed
   - Predictions created
   - Errors encountered
   - Execution time

## RUL Mapping

| Risk Level | RUL (days) | Description |
|------------|------------|-------------|
| `7d`       | 7          | Critical - Failure likely within 7 days |
| `14d`      | 14         | High - Failure likely within 14 days |
| `30d`      | 30         | Medium - Failure likely within 30 days |
| `safe`     | 365        | Low - Healthy battery, 1 year life |

## Error Handling

- **Retry Logic**: 3 attempts with exponential backoff (5s, 10s, 15s)
- **Error Isolation**: One failure doesn't stop entire job
- **Logging**: All errors logged with battery ID and stack trace
- **Metrics**: Error count and last error message tracked

## Monitoring

### Check Last Run
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/jobs/predictions/status | jq '.data.lastRun'
```

### Check Error Count
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/jobs/predictions/status | jq '.data.metrics.errors'
```

### View Recent Predictions
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/predictions/BATTERY_ID?limit=10
```

## Troubleshooting

### Job Not Running
1. Check server logs for startup errors
2. Verify ML model initialized: Look for "ML model initialized successfully"
3. Check database connection

### High Error Rate
1. Check database connectivity
2. Verify ML model is trained
3. Review error logs for specific failures
4. Check sensor data availability

### Manual Testing
```bash
# Trigger job manually
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/jobs/predictions/trigger

# Check status after 5 minutes
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/jobs/predictions/status
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Job Tests Only
```bash
npm test -- scheduledPredictionJob.test.ts
```

### Run API Tests Only
```bash
npm test -- jobs.test.ts
```

## Key Files

### Implementation
- `src/services/scheduledPredictionJob.ts` - Job service
- `src/routes/jobs.ts` - API endpoints
- `src/index.ts` - Server startup with job initialization

### Tests
- `src/services/__tests__/scheduledPredictionJob.test.ts` - 17 tests
- `src/routes/__tests__/jobs.test.ts` - 11 tests

### Configuration
- `.env.example` - Environment variables
- `package.json` - Dependencies (node-cron)

## Performance

### Expected Metrics
- **Processing time**: ~500ms per battery
- **Batch size**: All active batteries (recommend <500)
- **Job duration**: ~4-5 minutes for 500 batteries
- **Database queries**: 1 + N (where N = battery count)

### Optimization Tips
- Ensure database indexes are in place
- Monitor job duration over time
- Scale horizontally for large deployments
- Consider feature caching for high-frequency jobs

## Dependencies

```json
{
  "node-cron": "^3.x.x",
  "@types/node-cron": "^3.x.x"
}
```

## Acceptance Criteria ✅

- [x] Cron job scheduler with node-cron
- [x] Runs every 1 hour (configurable)
- [x] Batch process all active batteries
- [x] Store predictions in RULPrediction table
- [x] Error handling and retry logic
- [x] Job execution logging and metrics

## Support

For issues or questions:
1. Check server logs: `npm run dev`
2. Review implementation: `T143_IMPLEMENTATION_COMPLETE.md`
3. Run tests: `npm test`
4. Check job status API endpoint
