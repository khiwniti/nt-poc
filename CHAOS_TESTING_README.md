# Chaos Testing with Chaos Monkey

Comprehensive chaos engineering implementation for validating system resilience under failure conditions.

## Quick Start

### 1. Enable Chaos Testing

```bash
# Via environment variable
export CHAOS_ENABLED=true

# Or via API
curl -X POST http://localhost:3000/api/v1/chaos/enable
```

### 2. Run Automated Tests

```bash
./chaos-testing.sh
```

### 3. Manual Testing

```bash
# Configure
curl -X POST http://localhost:3000/api/v1/chaos/config \
  -H "Content-Type: application/json" \
  -d '{
    "failureRate": 0.3,
    "scenarios": {
      "serviceFailure": true,
      "networkLatency": true,
      "databaseFailure": true,
      "redisFailure": true
    }
  }'

# Test scenarios
curl -X POST http://localhost:3000/api/v1/chaos/test/service-failure
curl -X POST http://localhost:3000/api/v1/chaos/test/network-latency

# Disable
curl -X POST http://localhost:3000/api/v1/chaos/disable
```

## Features

### 🎯 Four Failure Scenarios

1. **Service Failure** - Random request failures (5xx errors)
2. **Network Latency** - Configurable delays (100-3000ms)
3. **Database Failure** - Connection errors and query failures
4. **Redis Failure** - Cache unavailability and fallback testing

### ⚙️ Configuration Options

- **Failure Rate**: 0.0 (never) to 1.0 (always)
- **Per-Scenario Control**: Enable/disable individually
- **Latency Bounds**: Min/max delay configuration
- **Runtime Updates**: No deployment needed

### 📊 Observability

- All chaos events logged with structured data
- Prometheus metrics for chaos injections
- Sentry error tracking for failures
- Health check endpoints remain functional

## API Reference

### Get Configuration

```bash
GET /api/v1/chaos/config
```

Response:
```json
{
  "enabled": false,
  "failureRate": 0.1,
  "scenarios": {
    "serviceFailure": true,
    "networkLatency": true,
    "databaseFailure": true,
    "redisFailure": true
  },
  "networkLatencyMs": {
    "min": 100,
    "max": 3000
  }
}
```

### Update Configuration

```bash
POST /api/v1/chaos/config
Content-Type: application/json

{
  "enabled": true,
  "failureRate": 0.5,
  "scenarios": {
    "serviceFailure": true,
    "networkLatency": false
  }
}
```

### Enable/Disable

```bash
POST /api/v1/chaos/enable
POST /api/v1/chaos/disable
```

### Test Scenarios

```bash
POST /api/v1/chaos/test/service-failure
POST /api/v1/chaos/test/network-latency
POST /api/v1/chaos/test/database-failure
POST /api/v1/chaos/test/redis-failure
```

## Environment Variables

```bash
CHAOS_ENABLED=false              # Enable chaos testing
CHAOS_FAILURE_RATE=0.1           # Failure probability (0.0-1.0)
CHAOS_SERVICE_FAILURE=true       # Enable service failures
CHAOS_NETWORK_LATENCY=true       # Enable network latency
CHAOS_DATABASE_FAILURE=true      # Enable database failures
CHAOS_REDIS_FAILURE=true         # Enable Redis failures
CHAOS_LATENCY_MIN=100            # Min latency in ms
CHAOS_LATENCY_MAX=3000           # Max latency in ms
```

See `.env.chaos.example` for complete configuration examples.

## Testing

### Run Unit Tests

```bash
cd services/backend
npm test -- chaos
```

This runs all 44 chaos-specific tests:
- ChaosMonkey (15 tests)
- ChaosAwareDatabase (3 tests)
- ChaosAwareRedis (8 tests)
- Chaos API Routes (10 tests)
- System Recovery (8 tests)

### Run Automated Suite

```bash
./chaos-testing.sh
```

This script:
1. Enables chaos testing
2. Configures all scenarios
3. Tests each failure type
4. Validates system behavior
5. Verifies recovery
6. Disables chaos testing

## Architecture

```
services/backend/src/
├── chaos/
│   ├── chaosMonkey.ts              # Core chaos logic
│   ├── chaosAwareDatabase.ts       # Database wrapper
│   ├── chaosAwareRedis.ts          # Redis wrapper
│   └── __tests__/                  # Unit tests
├── middleware/
│   └── chaos.ts                    # Express middleware
└── routes/
    └── chaos.ts                    # API endpoints
```

## Best Practices

### Development ✅
- Use low failure rates (0.1-0.3)
- Test one scenario at a time initially
- Monitor logs during chaos testing
- Always disable when done

### Staging ✅
- Run automated chaos suite regularly
- Test during off-peak hours
- Validate monitoring and alerting
- Document failure behaviors

### Production ⚠️
- **Keep disabled by default** (safety first!)
- Use dedicated chaos testing environment
- If enabled, use very low rates (0.05-0.1)
- Have rollback plan ready

## Safety Features

1. **Disabled by Default**: Must explicitly enable
2. **Runtime Control**: Enable/disable without deployment
3. **Per-Scenario Control**: Fine-grained failure control
4. **Clean Recovery**: No persistent state corruption
5. **Observable**: All events logged

## Troubleshooting

### Chaos Not Working?

```bash
# Check configuration
curl http://localhost:3000/api/v1/chaos/config

# Verify it's enabled
# enabled: true, failureRate > 0

# Check logs for chaos events
grep "chaos" logs/app.log
```

### Too Many Failures?

```bash
# Reduce failure rate
curl -X POST http://localhost:3000/api/v1/chaos/config \
  -H "Content-Type: application/json" \
  -d '{"failureRate": 0.1}'

# Or disable specific scenarios
curl -X POST http://localhost:3000/api/v1/chaos/config \
  -H "Content-Type: application/json" \
  -d '{"scenarios": {"serviceFailure": false}}'

# Or disable completely
curl -X POST http://localhost:3000/api/v1/chaos/disable
```

### System Not Recovering?

```bash
# Force disable
curl -X POST http://localhost:3000/api/v1/chaos/disable

# Verify status
curl http://localhost:3000/api/v1/health

# Restart service if needed
pm2 restart backend
```

## Metrics & Monitoring

### Log Events

```json
{
  "level": "warn",
  "message": "chaos_injected_service_failure",
  "timestamp": "2026-01-10T07:00:00.000Z"
}

{
  "level": "warn",
  "message": "chaos_injected_network_latency",
  "delayMs": 1234,
  "timestamp": "2026-01-10T07:00:01.000Z"
}
```

### Health Checks

Even under chaos, these endpoints remain available:
- `GET /api/v1/health` - System health
- `GET /metrics` - Prometheus metrics

## Examples

### Gradual Failure Injection

```bash
# Start with low failure rate
curl -X POST http://localhost:3000/api/v1/chaos/config \
  -d '{"enabled": true, "failureRate": 0.1}'

# Observe system behavior
# ...

# Increase gradually
curl -X POST http://localhost:3000/api/v1/chaos/config \
  -d '{"failureRate": 0.3}'

# ...

# Disable
curl -X POST http://localhost:3000/api/v1/chaos/disable
```

### Specific Scenario Testing

```bash
# Enable only network latency
curl -X POST http://localhost:3000/api/v1/chaos/config \
  -d '{
    "enabled": true,
    "failureRate": 1.0,
    "scenarios": {
      "serviceFailure": false,
      "networkLatency": true,
      "databaseFailure": false,
      "redisFailure": false
    }
  }'

# Test API response times
time curl http://localhost:3000/api/v1/facilities

# Disable
curl -X POST http://localhost:3000/api/v1/chaos/disable
```

## Documentation

- **T220_QUICK_REFERENCE.md** - Complete reference guide
- **T220_ACCEPTANCE_CHECKLIST.md** - Acceptance criteria
- **T220_IMPLEMENTATION_COMPLETE.md** - Implementation details
- **.env.chaos.example** - Configuration examples

## Support

For issues or questions:
1. Check this README
2. Review test examples
3. Check logs during chaos testing
4. Contact DevOps team

## License

Part of the Battery Management System project.
