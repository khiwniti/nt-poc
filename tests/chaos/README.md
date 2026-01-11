# Chaos Testing Suite

Comprehensive chaos engineering framework for validating BMS system resilience under failure conditions.

## Overview

This chaos testing suite implements Netflix Chaos Monkey principles to inject controlled failures into the system and validate resilience, recovery, and graceful degradation capabilities.

## Architecture

```
tests/chaos/
├── chaos-monkey/          # Chaos Monkey service for automated failure injection
│   ├── Dockerfile
│   ├── package.json
│   └── index.js           # Chaos injection logic
├── config/
│   ├── config.js          # Test configuration
│   └── toxiproxy.json     # Network proxy configuration
├── scenarios/
│   ├── serviceFailure.js      # Service crash/restart scenarios
│   ├── networkLatency.js      # Network latency injection
│   ├── databaseFailure.js     # Database connection failures
│   ├── redisFailure.js        # Cache unavailability
│   ├── recoveryValidation.js  # System recovery validation
│   └── runAll.js              # Orchestrator
├── utils/
│   ├── helpers.js         # Testing utilities
│   └── generateReport.js  # Report generation
├── docker-compose.chaos.yml
└── package.json
```

## Features

### Chaos Scenarios

1. **Service Failure Simulation**
   - Container kill (crash simulation)
   - Container pause (freeze simulation)
   - Container restart (restart loop simulation)
   - Validates system behavior during service unavailability

2. **Network Latency Injection**
   - Configurable latency (default 1000ms)
   - Jitter injection (default ±500ms)
   - Tests system behavior under high latency
   - Validates timeout handling

3. **Database Connection Failures**
   - Database container pause
   - Connection timeout injection via Toxiproxy
   - Tests connection pool handling
   - Validates error recovery

4. **Redis Unavailability**
   - Redis container stop/start
   - Tests graceful degradation without cache
   - Validates reconnection logic
   - Ensures non-critical dependency

5. **System Recovery Validation**
   - Health endpoint validation
   - Response time measurement
   - Error rate validation
   - Stability testing over time
   - Resource handling under load

### Chaos Monkey

Automated failure injection service that randomly introduces failures:
- Kills random containers
- Pauses containers for random durations
- Restarts containers randomly
- Configurable failure intervals and durations

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- Backend service built and ready

### Installation

```bash
cd tests/chaos
npm install
```

### Configuration

Edit `config/config.js` to customize:
- Service endpoints
- Test timeouts
- Chaos scenario parameters
- SLA thresholds

### Running Tests

#### Run All Scenarios

```bash
npm run test:chaos
```

#### Run Individual Scenarios

```bash
npm run test:service-failure
npm run test:network-latency
npm run test:database-failure
npm run test:redis-failure
npm run test:recovery
```

#### Generate Report

```bash
npm run test:report
```

### Using Docker Compose

```bash
# Start chaos testing environment
npm run docker:up

# View logs
npm run docker:logs

# Stop environment
npm run docker:down
```

## Configuration

### Environment Variables

```bash
# Service URLs
BACKEND_URL=http://localhost:3000
BACKEND_PROXY_URL=http://localhost:3001
TOXIPROXY_URL=http://localhost:8474
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
REDIS_URL=redis://localhost:6379

# Test timeouts (milliseconds)
HEALTH_CHECK_TIMEOUT=5000
RECOVERY_TIMEOUT=30000
SERVICE_RESTART_TIMEOUT=60000

# Chaos Monkey settings
CHAOS_ENABLED=true
TARGET_SERVICES=backend,postgres,redis
FAILURE_INTERVAL_MIN=60       # seconds
FAILURE_INTERVAL_MAX=300      # seconds
FAILURE_DURATION_MIN=10       # seconds
FAILURE_DURATION_MAX=60       # seconds
```

### SLA Thresholds

Default thresholds in `config/config.js`:

```javascript
sla: {
  maxErrorRate: 0.05,      // 5% max error rate
  maxLatencyP95: 2000,     // 2 seconds P95 latency
  minSuccessRate: 0.95,    // 95% min success rate
}
```

## Test Scenarios

### 1. Service Failure

Tests system resilience when the backend service crashes or becomes unavailable.

**Steps:**
1. Stop backend container
2. Verify service is down
3. Test system behavior during failure
4. Restart backend container
5. Validate recovery and response times

**Expected Results:**
- System detects failure immediately
- Error rate increases during failure
- Service recovers within 30 seconds
- Post-recovery success rate >95%

### 2. Network Latency

Tests system behavior under high network latency conditions.

**Steps:**
1. Measure baseline latency
2. Inject 1000ms ±500ms latency via Toxiproxy
3. Measure latency under stress
4. Remove latency injection
5. Verify return to baseline

**Expected Results:**
- System continues to respond under latency
- Success rate remains >90%
- Latency returns to baseline after removal
- No connection leaks or timeouts

### 3. Database Failure

Tests system behavior when database connections fail.

**Steps:**
1. Test normal database access
2. Pause database container
3. Test failure handling
4. Unpause database
5. Validate recovery and reconnection

**Expected Results:**
- System handles database errors gracefully
- Connection timeouts are properly configured
- System recovers automatically
- No connection pool exhaustion

### 4. Redis Unavailability

Tests graceful degradation when Redis cache is unavailable.

**Steps:**
1. Test with Redis available
2. Stop Redis container
3. Test system without cache (degradation)
4. Restart Redis
5. Validate recovery and reconnection

**Expected Results:**
- System continues to function without Redis
- Success rate >70% during Redis unavailability
- System recovers to >95% with Redis
- Automatic reconnection works

### 5. Recovery Validation

Comprehensive validation of system recovery capabilities.

**Tests:**
- Health endpoint responsiveness
- Response times (avg, p95, p99)
- Error rate over time
- System stability (20 samples over 40s)
- Resource handling under load (100 concurrent requests)

**Expected Results:**
- Health endpoint always responds
- P95 latency <2000ms
- Error rate <5%
- Stability rate >95%
- Handles concurrent load effectively

## Interpreting Results

### Success Criteria

A scenario passes if:
- All individual tests pass
- Success rate ≥95%
- Metrics meet SLA thresholds

### Report Structure

```json
{
  "timestamp": "2024-01-11T12:00:00.000Z",
  "duration": "180.5s",
  "summary": {
    "totalScenarios": 5,
    "scenariosPassed": 5,
    "scenariosFailed": 0,
    "totalTests": 28,
    "totalPassed": 28,
    "totalFailed": 0,
    "overallSuccessRate": 1.0
  },
  "reports": [...]
}
```

### Common Failure Patterns

1. **High Error Rate**: Check connection pooling and retry logic
2. **Slow Recovery**: Review health check intervals and restart policies
3. **Connection Leaks**: Investigate connection management
4. **Timeout Issues**: Adjust timeout configurations

## Integration with CI/CD

### GitHub Actions

```yaml
name: Chaos Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  chaos-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Start Services
        run: |
          cd tests/chaos
          npm run docker:up
          sleep 30
      
      - name: Run Chaos Tests
        run: |
          cd tests/chaos
          npm install
          npm run test:chaos
      
      - name: Generate Report
        if: always()
        run: |
          cd tests/chaos
          npm run test:report
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: chaos-test-report
          path: tests/chaos/CHAOS_TEST_REPORT.md
```

## Best Practices

1. **Run in Non-Production**: Only run chaos tests in staging/test environments
2. **Monitor During Tests**: Watch metrics and logs during chaos injection
3. **Gradual Rollout**: Start with mild failures, increase severity gradually
4. **Document Findings**: Record all failures and improvements
5. **Regular Execution**: Run chaos tests weekly or before major releases
6. **Update Scenarios**: Add new scenarios as system evolves

## Troubleshooting

### Containers Not Found

```bash
# Check running containers
docker ps -a

# Restart chaos environment
cd tests/chaos
npm run docker:down
npm run docker:up
```

### Toxiproxy Connection Issues

```bash
# Check Toxiproxy is running
curl http://localhost:8474/proxies

# Restart Toxiproxy
docker restart bms-toxiproxy
```

### Tests Hanging

- Increase timeout values in `config/config.js`
- Check service logs: `npm run docker:logs`
- Verify all services are healthy

## References

- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Netflix Chaos Monkey](https://netflix.github.io/chaosmonkey/)
- [Toxiproxy Documentation](https://github.com/Shopify/toxiproxy)
- [Docker SDK for Node.js](https://github.com/apocas/dockerode)

## Contributing

When adding new chaos scenarios:

1. Create scenario file in `scenarios/`
2. Follow existing patterns for TestResult and logging
3. Add cleanup logic in `finally` blocks
4. Update `scenarios/runAll.js` to include new scenario
5. Document expected behavior and SLA thresholds
6. Update this README

## License

Part of the Battery Management System - Internal use only.
