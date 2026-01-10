# k6 Performance Testing

Performance testing suite for the Battery Management System using k6.

## Overview

This test suite validates that the system meets performance SLAs:
- **API Response Time**: p95 < 200ms
- **Real-time Latency**: < 2s for streaming data
- **Error Rate**: < 1%
- **Concurrent Users**: Support 100, 500, and 1000 concurrent users

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

Or download from: https://k6.io/docs/getting-started/installation/

## Test Scenarios

### 1. Load Tests
Tests system under sustained concurrent load.

**Light load (100 users):**
```bash
npm run test:load:light
# or
k6 run scenarios/load-test.js --env SCENARIO=light --env BASE_URL=http://localhost:3000
```

**Medium load (500 users):**
```bash
npm run test:load:medium
# or
k6 run scenarios/load-test.js --env SCENARIO=medium --env BASE_URL=http://localhost:3000
```

**Heavy load (1000 users):**
```bash
npm run test:load:heavy
# or
k6 run scenarios/load-test.js --env SCENARIO=heavy --env BASE_URL=http://localhost:3000
```

### 2. Stress Test
Gradually increases load to find system breaking point (up to 3000 users).

```bash
npm run test:stress
# or
k6 run scenarios/stress-test.js --env BASE_URL=http://localhost:3000
```

### 3. Spike Test
Tests system behavior during sudden traffic surges (100 → 2000 users in 10s).

```bash
npm run test:spike
# or
k6 run scenarios/spike-test.js --env BASE_URL=http://localhost:3000
```

### 4. Real-time Latency Test
Tests streaming endpoints and real-time data delivery (<2s SLA).

```bash
npm run test:realtime
# or
k6 run scenarios/realtime-test.js --env BASE_URL=http://localhost:3000
```

### 5. Endurance Test (Soak)
Long-running test (2 hours) to detect memory leaks and performance degradation.

```bash
npm run test:endurance
# or
k6 run scenarios/endurance-test.js --env BASE_URL=http://localhost:3000
```

## Configuration

Edit `config.js` to adjust:
- Base URL
- Performance thresholds
- Scenario parameters
- Test data

## Environment Variables

- `BASE_URL`: API base URL (default: `http://localhost:3000`)
- `SCENARIO`: Load test scenario - `light`, `medium`, or `heavy`

## Results

Test results are saved to `results/` directory as JSON files with timestamps.

### Interpreting Results

**Key Metrics:**
- `http_req_duration`: Request duration (p50, p95, p99, max)
- `http_req_failed`: Failed request rate
- `http_reqs`: Total requests
- `vus`: Virtual users
- `checks`: Passed checks percentage

**Example Output:**
```json
{
  "scenario": "medium",
  "metrics": {
    "http_req_duration_p95": 185.3,
    "http_req_duration_p99": 320.7,
    "http_req_failed_rate": 0.0021,
    "checks_passing_rate": 0.998
  },
  "thresholds_passed": true
}
```

## CI/CD Integration

Run lightweight tests in CI:
```bash
npm run test:ci
```

For full test suite:
```bash
npm run test:all
```

## Performance Thresholds

The tests validate these SLA requirements:

| Metric | Threshold | Description |
|--------|-----------|-------------|
| API p95 | < 200ms | 95% of API requests |
| API p99 | < 500ms | 99% of API requests |
| API max | < 2s | Maximum response time |
| Real-time p95 | < 2s | 95% of streaming data |
| Error rate | < 1% | Failed requests |

## Resource Monitoring

The tests include resource utilization monitoring:
- CPU usage
- Memory usage
- Active connections
- Response times

View metrics during test:
```bash
k6 run --out statsd scenarios/load-test.js
```

## Tips

1. **Start services first**: Ensure backend is running before tests
2. **Use realistic data**: Seed database with production-like data
3. **Run incrementally**: Start with light load, then increase
4. **Monitor system**: Watch logs and metrics during tests
5. **Baseline first**: Establish baseline before changes
6. **Isolate environment**: Run on dedicated test environment

## Troubleshooting

**Connection refused:**
- Verify backend is running: `curl http://localhost:3000/api/v1/health`
- Check BASE_URL environment variable

**High error rates:**
- Check backend logs for errors
- Verify database connections
- Monitor resource usage (CPU, memory)
- Review rate limiting configuration

**Slow performance:**
- Check database query performance
- Review backend logging level (set to ERROR for tests)
- Verify adequate resources (CPU, RAM)
- Check for network latency

## Regression Detection

Compare results across runs:

```bash
# Baseline (before changes)
k6 run scenarios/load-test.js --env SCENARIO=medium > baseline.json

# After changes
k6 run scenarios/load-test.js --env SCENARIO=medium > current.json

# Compare metrics
diff baseline.json current.json
```

Look for:
- p95 response time increases > 10%
- Error rate increases
- Throughput decreases
- Resource usage increases

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [API Performance Testing Guide](https://k6.io/docs/testing-guides/api-load-testing/)
