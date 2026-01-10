# T214: k6 Performance Tests - Quick Reference

## Quick Start

### Install k6
```bash
# macOS
brew install k6

# Linux (Ubuntu/Debian)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Run Tests
```bash
cd tests/performance

# Quick CI test (light load)
npm run test:ci

# Load tests
npm run test:load:light    # 100 users, 5min
npm run test:load:medium   # 500 users, 10min
npm run test:load:heavy    # 1000 users, 15min

# Other scenarios
npm run test:stress        # Find breaking point
npm run test:spike         # Traffic surge
npm run test:realtime      # Streaming latency
npm run test:endurance     # 2-hour soak test

# All tests
npm run test:all
```

### Direct k6 Commands
```bash
# Custom base URL
k6 run scenarios/load-test.js --env BASE_URL=http://localhost:3000 --env SCENARIO=light

# With output to file
k6 run scenarios/load-test.js --out json=results/my-test.json

# Specific scenario
k6 run scenarios/stress-test.js --env BASE_URL=https://staging.example.com
```

---

## Test Scenarios

| Scenario | Users | Duration | Purpose |
|----------|-------|----------|---------|
| Light | 100 | 5m | Baseline, CI/CD |
| Medium | 500 | 10m | Normal load |
| Heavy | 1000 | 15m | Peak load |
| Stress | 100→3000 | 20m | Find limits |
| Spike | 100→2000 | 5m | Traffic surge |
| Realtime | 50→200 | 7m | Streaming SLA |
| Endurance | 200 | 2h | Stability |

---

## Performance Thresholds

### API Response Times
- **p50**: < 100ms
- **p95**: < 200ms (SLA)
- **p99**: < 500ms
- **Max**: < 2000ms

### Real-time Latency
- **p95**: < 2000ms (SLA)
- **p99**: < 3000ms

### Error Rate
- **Target**: < 1% (SLA)
- **Warning**: 1-5%
- **Critical**: > 5%

---

## Key Metrics

| Metric | Description | Good | Warning | Critical |
|--------|-------------|------|---------|----------|
| `http_req_duration` p95 | 95th percentile response time | <200ms | 200-300ms | >300ms |
| `http_req_duration` p99 | 99th percentile response time | <500ms | 500-750ms | >750ms |
| `http_req_failed` rate | Failed request rate | <1% | 1-5% | >5% |
| `checks` rate | Passed checks percentage | >99% | 95-99% | <95% |
| `http_reqs` count | Total requests | Varies | - | - |
| `realtime_latency` p95 | Real-time data latency | <1500ms | 1500-2000ms | >2000ms |

---

## Files Structure

```
tests/performance/
├── config.js              # Thresholds and test data
├── package.json           # NPM scripts
├── run-tests.sh          # Automated test runner
├── scenarios/
│   ├── load-test.js      # Main load test (3 scenarios)
│   ├── stress-test.js    # Breaking point
│   ├── spike-test.js     # Traffic surge
│   ├── realtime-test.js  # Streaming latency
│   └── endurance-test.js # Long-running stability
├── utils/
│   ├── api.js           # API utilities
│   └── monitoring.js    # Resource monitoring
└── results/             # Test results (JSON)
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | API base URL |
| `SCENARIO` | `light` | Load test scenario (light/medium/heavy) |

---

## Common Tasks

### Compare Results
```bash
# Baseline
k6 run scenarios/load-test.js --env SCENARIO=medium > baseline.txt

# After changes
k6 run scenarios/load-test.js --env SCENARIO=medium > current.txt

# Compare
diff baseline.txt current.txt
```

### View Results
```bash
# Latest result
ls -t results/*.json | head -1 | xargs cat | jq .

# Specific metrics
cat results/load-test-*.json | jq '.metrics.http_req_duration'
```

### CI/CD
```bash
# Trigger workflow (requires gh CLI)
gh workflow run performance.yml -f scenario=light

# View workflow runs
gh run list --workflow=performance.yml

# Download artifacts
gh run download <run-id>
```

---

## Troubleshooting

### Backend not responding
```bash
# Check if running
curl http://localhost:3000/api/v1/health

# Start backend
cd services/backend
npm run dev
```

### High error rates
1. Check backend logs
2. Verify database connections
3. Review rate limiting
4. Check resource usage (CPU, memory)

### Slow performance
1. Check database query performance
2. Reduce logging level (set to ERROR)
3. Verify adequate resources
4. Check for N+1 queries

### k6 installation issues
```bash
# Verify installation
k6 version

# Re-install (macOS)
brew reinstall k6
```

---

## CI/CD Workflow

### Trigger Performance Test
1. Go to Actions tab in GitHub
2. Select "Performance Tests" workflow
3. Click "Run workflow"
4. Choose scenario (light/medium/heavy/stress/spike/realtime/all)
5. Click "Run workflow"

### View Results
1. Wait for workflow to complete
2. Click on workflow run
3. Download artifacts (performance-results-*)
4. View JSON results

### PR Comments
Performance results are automatically posted to PRs when:
- PR modifies `services/backend/**`
- PR modifies `tests/performance/**`

---

## Example Output

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

**Interpretation:**
- ✅ p95 (185ms) is under 200ms threshold
- ✅ p99 (320ms) is under 500ms threshold
- ✅ Error rate (0.21%) is under 1% threshold
- ✅ 99.8% of checks passed

---

## Best Practices

1. **Start small**: Run light load first
2. **Establish baseline**: Run tests before changes
3. **Use realistic data**: Seed with production-like data
4. **Monitor system**: Watch logs and metrics during tests
5. **Run incrementally**: light → medium → heavy
6. **Isolate environment**: Use dedicated test environment
7. **Regular testing**: Run nightly in CI/CD

---

## Quick Commands Cheatsheet

```bash
# Install k6 (macOS)
brew install k6

# Go to test directory
cd tests/performance

# Run light load (100 users, 5min)
npm run test:load:light

# Run against staging
BASE_URL=https://staging.example.com npm run test:load:medium

# Run all tests
./run-tests.sh

# Check latest results
cat results/*.json | tail -1 | jq .

# View specific metrics
cat results/*.json | jq '.metrics.http_req_duration_p95'

# Trigger CI workflow
gh workflow run performance.yml -f scenario=light

# View health
curl http://localhost:3000/api/v1/health
```

---

## References

- **Full Documentation**: `tests/performance/README.md`
- **Acceptance Criteria**: `T214_ACCEPTANCE_CHECKLIST.md`
- **k6 Docs**: https://k6.io/docs/
- **CI Workflow**: `.github/workflows/performance.yml`

---

**Quick Reference Version**: 1.0  
**Last Updated**: 2026-01-10
