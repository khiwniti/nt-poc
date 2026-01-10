# T220: Chaos Testing Implementation

## Overview

Implemented comprehensive chaos testing with Chaos Monkey to validate system resilience under failure conditions. The implementation includes service failure simulation, network latency injection, database connection failures, Redis unavailability tests, and system recovery validation.

## Architecture

### Components

1. **ChaosMonkey Service** (`src/chaos/chaosMonkey.ts`)
   - Core chaos engineering logic
   - Configurable failure rates and scenarios
   - Runtime configuration updates
   - Logging of all chaos events

2. **Chaos Middleware** (`src/middleware/chaos.ts`)
   - Express middleware for request-level chaos injection
   - Service failure and network latency simulation
   - Non-intrusive when disabled

3. **Chaos-Aware Database** (`src/chaos/chaosAwareDatabase.ts`)
   - Wrapper around database pool
   - Injects connection failures on demand
   - Transparent to application code

4. **Chaos-Aware Redis** (`src/chaos/chaosAwareRedis.ts`)
   - Wrapper around Redis client
   - Simulates cache unavailability
   - Graceful degradation support

5. **Chaos API** (`src/routes/chaos.ts`)
   - Runtime configuration endpoints
   - Test scenario triggers
   - Enable/disable controls

## Configuration

### Environment Variables

```bash
CHAOS_ENABLED=false                    # Enable/disable chaos testing
CHAOS_FAILURE_RATE=0.1                 # Failure probability (0.0-1.0)
CHAOS_SERVICE_FAILURE=true             # Enable service failure simulation
CHAOS_NETWORK_LATENCY=true             # Enable network latency injection
CHAOS_DATABASE_FAILURE=true            # Enable database failure simulation
CHAOS_REDIS_FAILURE=true               # Enable Redis failure simulation
CHAOS_LATENCY_MIN=100                  # Minimum latency in ms
CHAOS_LATENCY_MAX=3000                 # Maximum latency in ms
```

### Default Configuration

By default, chaos testing is **disabled** in all environments. It must be explicitly enabled for testing purposes.

## API Endpoints

### Get Configuration
```bash
GET /api/v1/chaos/config
```

Returns current chaos monkey configuration.

### Update Configuration
```bash
POST /api/v1/chaos/config
Content-Type: application/json

{
  "enabled": true,
  "failureRate": 0.3,
  "scenarios": {
    "serviceFailure": true,
    "networkLatency": true,
    "databaseFailure": true,
    "redisFailure": true
  },
  "networkLatencyMs": {
    "min": 100,
    "max": 1000
  }
}
```

### Enable/Disable Chaos
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

## Usage

### Manual Testing

1. **Enable chaos testing:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/chaos/enable
   ```

2. **Configure failure rate:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/chaos/config \
     -H "Content-Type: application/json" \
     -d '{"failureRate": 0.5}'
   ```

3. **Test specific scenario:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/chaos/test/service-failure
   ```

4. **Disable when done:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/chaos/disable
   ```

### Automated Testing

Run the chaos testing suite:

```bash
./chaos-testing.sh
```

This script:
- Enables chaos testing
- Configures all scenarios
- Tests each failure type
- Validates system behavior
- Verifies recovery
- Disables chaos testing

### Unit Tests

Run chaos-specific tests:

```bash
cd services/backend
npm test -- chaos
```

## Testing Scenarios

### 1. Service Failure Simulation
- **What**: Random request failures
- **When**: Triggered by middleware
- **Impact**: 5xx errors returned to clients
- **Recovery**: Automatic when chaos disabled

### 2. Network Latency Injection
- **What**: Random delays (100-3000ms)
- **When**: Before request processing
- **Impact**: Slow response times
- **Recovery**: Immediate when chaos disabled

### 3. Database Connection Failures
- **What**: Simulated connection errors
- **When**: Before query execution
- **Impact**: Database operation failures
- **Recovery**: Next query succeeds when disabled

### 4. Redis Unavailability
- **What**: Cache access failures
- **When**: Before Redis operations
- **Impact**: Cache misses, fallback to DB
- **Recovery**: Cache available when disabled

## System Recovery Validation

### Health Checks
The system maintains health check endpoints that work even under chaos:
- `/api/v1/health` - Overall system health
- `/metrics` - Prometheus metrics

### Recovery Process
1. **Disable chaos testing**
2. **Verify services respond normally**
3. **Check database connectivity**
4. **Validate Redis availability**
5. **Confirm end-to-end functionality**

### Monitoring
All chaos events are logged with structured data:
```json
{
  "level": "warn",
  "message": "chaos_injected_service_failure",
  "timestamp": "2024-01-10T07:00:00.000Z"
}
```

## Test Coverage

- ✅ ChaosMonkey unit tests (15 tests)
- ✅ ChaosAwareDatabase tests (3 tests)
- ✅ ChaosAwareRedis tests (8 tests)
- ✅ Chaos API routes tests (10 tests)
- ✅ System recovery tests (8 tests)

Total: **44 chaos-specific tests**

## Best Practices

### Development
- Keep chaos disabled by default
- Use low failure rates (0.1-0.3) for realistic testing
- Test one scenario at a time initially
- Monitor logs during chaos testing

### Staging
- Enable chaos during off-peak hours
- Use moderate failure rates (0.2-0.5)
- Run automated chaos suite regularly
- Validate monitoring and alerting

### Production
- **Never enable in production** (safety first)
- Use dedicated chaos testing environment
- If enabled, use very low failure rates (0.05-0.1)
- Have rollback plan ready

## Integration with Existing Systems

### Observability
- All chaos events logged via Winston
- Prometheus metrics track chaos injections
- Sentry captures chaos-related errors

### Error Handling
- Chaos errors handled by error middleware
- Client receives appropriate error responses
- Retry logic in clients can handle transient failures

### Circuit Breakers
Chaos testing validates:
- Circuit breaker triggers correctly
- Fallback mechanisms work
- Recovery after breaker resets

## Troubleshooting

### Chaos Not Working
1. Check `CHAOS_ENABLED` environment variable
2. Verify failure rate > 0
3. Confirm scenarios enabled in config
4. Check logs for chaos events

### Too Many Failures
1. Reduce `CHAOS_FAILURE_RATE`
2. Disable specific scenarios
3. Increase latency tolerance
4. Use `POST /chaos/disable` to stop

### System Not Recovering
1. Verify chaos is disabled
2. Check database connectivity
3. Restart Redis if needed
4. Review error logs

## Files Created

```
services/backend/src/
├── chaos/
│   ├── chaosMonkey.ts                    # Core chaos logic
│   ├── chaosAwareDatabase.ts             # Database wrapper
│   ├── chaosAwareRedis.ts                # Redis wrapper
│   └── __tests__/
│       ├── chaosMonkey.test.ts           # Unit tests
│       ├── chaosAwareDatabase.test.ts    # Database tests
│       ├── chaosAwareRedis.test.ts       # Redis tests
│       └── systemRecovery.test.ts        # Recovery tests
├── middleware/
│   └── chaos.ts                          # Express middleware
└── routes/
    ├── chaos.ts                          # API routes
    └── __tests__/
        └── chaos.test.ts                 # Route tests

chaos-testing.sh                          # Automated test script
T220_QUICK_REFERENCE.md                   # This file
T220_ACCEPTANCE_CHECKLIST.md              # Acceptance criteria
T220_IMPLEMENTATION_COMPLETE.md           # Implementation summary
```

## Next Steps

1. **CI/CD Integration**: Add chaos tests to pipeline
2. **Metrics Dashboard**: Create Grafana dashboard for chaos events
3. **Scheduled Chaos**: Implement automated chaos testing schedule
4. **Advanced Scenarios**: Add disk I/O, CPU stress, memory pressure
5. **Game Days**: Schedule regular chaos engineering exercises

## References

- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Netflix Chaos Monkey](https://netflix.github.io/chaosmonkey/)
- [AWS Fault Injection Simulator](https://aws.amazon.com/fis/)

## Support

For questions or issues:
1. Check this documentation
2. Review test examples in `__tests__` directories
3. Examine logs during chaos testing
4. Contact DevOps team
