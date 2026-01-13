# Chaos Testing - Quick Reference

## T220: Add Chaos Testing with Chaos Monkey

Quick commands and validation checklist for chaos testing implementation.

## Quick Start

```bash
# Navigate to chaos tests
cd tests/chaos

# Install dependencies
npm install

# Start chaos testing environment
npm run docker:up

# Wait for services to be ready (30 seconds)
sleep 30

# Run all chaos tests
npm run test:chaos

# Generate report
npm run test:report

# View report
cat CHAOS_TEST_REPORT.md

# Cleanup
npm run docker:down
```

## Individual Scenario Tests

```bash
# Service failure simulation
npm run test:service-failure

# Network latency injection
npm run test:network-latency

# Database connection failures
npm run test:database-failure

# Redis unavailability
npm run test:redis-failure

# Recovery validation
npm run test:recovery
```

## Key Files

- `tests/chaos/README.md` - Full documentation
- `tests/chaos/package.json` - Test scripts
- `tests/chaos/config/config.js` - Configuration
- `tests/chaos/docker-compose.chaos.yml` - Infrastructure
- `tests/chaos/chaos-monkey/index.js` - Chaos Monkey implementation
- `tests/chaos/scenarios/*.js` - Test scenarios

## Acceptance Criteria

### ✅ Chaos Monkey Integration
- [x] Chaos Monkey service implemented
- [x] Docker container-based failure injection
- [x] Configurable failure intervals
- [x] Kill, pause, restart capabilities

### ✅ Service Failure Simulation
- [x] Backend service crash simulation
- [x] Container stop/start testing
- [x] Recovery time validation
- [x] Success rate measurement

### ✅ Network Latency Injection
- [x] Toxiproxy integration
- [x] Configurable latency (1000ms ±500ms)
- [x] Baseline latency measurement
- [x] Recovery validation

### ✅ Database Connection Failures
- [x] Database pause/unpause
- [x] Connection timeout testing
- [x] Connection pool validation
- [x] Automatic recovery testing

### ✅ Redis Unavailability Tests
- [x] Redis stop/start scenarios
- [x] Graceful degradation validation
- [x] Reconnection logic testing
- [x] Non-critical dependency validation

### ✅ System Recovery Validation
- [x] Health endpoint validation
- [x] Response time measurement
- [x] Error rate tracking
- [x] Stability testing (40s)
- [x] Load handling (100 concurrent)

## Expected Results

### SLA Thresholds

| Metric | Threshold | Test |
|--------|-----------|------|
| Error Rate | <5% | ✓ Validated |
| P95 Latency | <2000ms | ✓ Validated |
| Success Rate | >95% | ✓ Validated |
| Recovery Time | <30s | ✓ Validated |
| Stability | >95% | ✓ Validated |

### Test Scenarios

| Scenario | Tests | Expected Result |
|----------|-------|----------------|
| Service Failure | 4 | System recovers within 30s |
| Network Latency | 5 | >90% success under latency |
| Database Failure | 6 | Graceful error handling |
| Redis Failure | 6 | >70% success without Redis |
| Recovery | 5 | All SLA thresholds met |

## Chaos Monkey Configuration

```bash
# Enable/disable chaos monkey
CHAOS_ENABLED=true

# Target services for chaos injection
TARGET_SERVICES=backend,postgres,redis

# Failure interval range (seconds)
FAILURE_INTERVAL_MIN=60
FAILURE_INTERVAL_MAX=300

# Failure duration range (seconds)
FAILURE_DURATION_MIN=10
FAILURE_DURATION_MAX=60
```

## Common Commands

```bash
# Check container status
docker ps | grep chaos

# View chaos monkey logs
docker logs bms-chaos-monkey -f

# View backend logs during test
docker logs bms-backend-chaos -f

# Restart a specific service
docker restart bms-backend-chaos

# Check Toxiproxy status
curl http://localhost:8474/proxies

# Clean up everything
docker-compose -f tests/chaos/docker-compose.chaos.yml down -v
```

## Validation Checklist

### Pre-Test Validation
- [ ] Docker daemon running
- [ ] Ports available (3000, 5432, 6379, 8474)
- [ ] Backend service builds successfully
- [ ] Database migrations run
- [ ] Redis accessible

### Post-Test Validation
- [ ] All scenarios executed
- [ ] Report generated (`CHAOS_TEST_REPORT.md`)
- [ ] JSON report exists (`chaos-test-report.json`)
- [ ] Success rate ≥95%
- [ ] All containers stopped and cleaned up

## Troubleshooting

### Container Not Found
```bash
# Rebuild and restart
cd tests/chaos
npm run docker:down
docker system prune -f
npm run docker:up
```

### Port Already in Use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
lsof -ti:5432 | xargs kill -9
```

### Tests Timeout
```bash
# Increase timeouts in config/config.js
timeouts: {
  healthCheck: 10000,    # Increase from 5000
  recovery: 60000,       # Increase from 30000
}
```

### Toxiproxy Errors
```bash
# Check Toxiproxy is running
docker logs bms-toxiproxy

# Restart Toxiproxy
docker restart bms-toxiproxy
```

## Integration

### CI/CD Integration

Add to `.github/workflows/chaos-tests.yml`:

```yaml
- name: Run Chaos Tests
  run: |
    cd tests/chaos
    npm install
    npm run docker:up
    sleep 30
    npm run test:chaos
```

### Manual Testing

```bash
# Run before major releases
cd tests/chaos
npm run docker:up
sleep 30
npm run test:chaos
npm run test:report

# Review results
cat CHAOS_TEST_REPORT.md

# Cleanup
npm run docker:down
```

## Report Location

- **JSON Report**: `tests/chaos/chaos-test-report.json`
- **Markdown Report**: `tests/chaos/CHAOS_TEST_REPORT.md`
- **Console Output**: Real-time during test execution

## Success Criteria

✅ **Implementation Complete When:**
1. All 5 chaos scenarios implemented
2. Chaos Monkey service functional
3. Docker Compose environment working
4. All tests passing (≥95% success rate)
5. Documentation complete
6. Reports generated successfully

## Next Steps

1. Run chaos tests weekly in CI/CD
2. Add new scenarios for specific failure modes
3. Integrate with monitoring/alerting
4. Document lessons learned
5. Update runbooks based on findings

## Related Documentation

- [Full README](./README.md)
- [TESTING_STRATEGY.md](../../TESTING_STRATEGY.md)
- [T220_ACCEPTANCE_CHECKLIST.md](../../T220_ACCEPTANCE_CHECKLIST.md)
- [T220_IMPLEMENTATION_COMPLETE.md](../../T220_IMPLEMENTATION_COMPLETE.md)
