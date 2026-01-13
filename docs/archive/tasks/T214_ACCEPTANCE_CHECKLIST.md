# T214: Add Performance Tests - Acceptance Checklist

## Overview
Phase 9: Add performance testing with k6 to validate system meets latency and throughput requirements.

**Status**: ✅ COMPLETE

---

## Acceptance Criteria

### ✅ 1. k6 Load Testing Scripts
- [x] k6 project structure created (`tests/performance/`)
- [x] Configuration file with thresholds (`config.js`)
- [x] Shared utilities for API testing (`utils/api.js`)
- [x] Resource monitoring utilities (`utils/monitoring.js`)
- [x] Package.json with test scripts

**Evidence:**
```
tests/performance/
├── config.js
├── package.json
├── scenarios/
│   ├── load-test.js
│   ├── stress-test.js
│   ├── spike-test.js
│   ├── realtime-test.js
│   └── endurance-test.js
└── utils/
    ├── api.js
    └── monitoring.js
```

### ✅ 2. Test Scenarios: 100, 500, 1000 Concurrent Users
- [x] Light load test (100 users, 5 minutes)
- [x] Medium load test (500 users, 10 minutes)
- [x] Heavy load test (1000 users, 15 minutes)
- [x] Configurable via environment variable

**Test Scenarios Implemented:**
- `scenarios/load-test.js` - Supports light/medium/heavy scenarios
- Ramp-up/sustain/ramp-down stages
- Realistic user behavior with sleep intervals
- Multiple endpoint coverage

**Run Commands:**
```bash
npm run test:load:light   # 100 users
npm run test:load:medium  # 500 users  
npm run test:load:heavy   # 1000 users
```

### ✅ 3. API Response Time Validation (<200ms p95)
- [x] p95 threshold: < 200ms
- [x] p99 threshold: < 500ms
- [x] Max response time: < 2s
- [x] Per-endpoint thresholds
- [x] Custom metrics tracking

**Thresholds Configured:**
```javascript
thresholds: {
  'http_req_duration': ['p(95)<200'],
  'http_req_duration{endpoint:/api/v1/facilities}': ['p(95)<200'],
  'http_req_duration{endpoint:/api/v1/predictions}': ['p(95)<300'],
  'http_req_duration{endpoint:/api/v1/alerts}': ['p(95)<200'],
  'http_req_failed': ['rate<0.01'],
}
```

### ✅ 4. Real-time Latency Testing (<2s)
- [x] Real-time test scenario (`realtime-test.js`)
- [x] Sensor data streaming validation
- [x] SSE endpoint testing
- [x] Alert notifications latency
- [x] p95 < 2s threshold
- [x] Custom real-time latency metrics

**Real-time Endpoints Tested:**
- `/api/v1/sensor-readings?realtime=true`
- `/api/v1/stream` (SSE)
- `/api/v1/alerts?status=active`
- `/api/v1/predictions?latest=true`

### ✅ 5. Resource Utilization Monitoring
- [x] CPU usage tracking
- [x] Memory usage monitoring
- [x] Active connections tracking
- [x] Response time trends
- [x] Prometheus metrics integration
- [x] Health check monitoring

**Monitoring Features:**
```javascript
// utils/monitoring.js
- cpuUsage (Gauge)
- memoryUsage (Gauge)
- activeConnections (Gauge)
- responseTime (Trend)
```

### ✅ 6. Performance Regression Detection
- [x] Test result JSON output with timestamps
- [x] Summary metrics extraction
- [x] Baseline comparison structure
- [x] CI/CD workflow with regression checks
- [x] PR comments with results
- [x] Artifact retention (30 days)

**Regression Detection:**
- Results saved to `results/*.json`
- Automated comparison in CI
- Alerts on >10% degradation
- Historical baseline tracking

---

## Additional Test Scenarios

### ✅ Stress Test
- [x] Gradually increases load to 3000 users
- [x] Identifies system breaking point
- [x] Monitors error rate under stress
- [x] Recovery validation

### ✅ Spike Test
- [x] Sudden load surge (100 → 2000 users in 10s)
- [x] Auto-scaling validation
- [x] Degradation tracking
- [x] Recovery time measurement

### ✅ Endurance Test (Soak)
- [x] 2-hour sustained load (200 users)
- [x] Memory leak detection
- [x] Performance degradation tracking
- [x] Long-term stability validation

---

## Documentation

### ✅ README
- [x] Installation instructions
- [x] Test scenario descriptions
- [x] Usage examples
- [x] Configuration guide
- [x] Results interpretation
- [x] Troubleshooting guide
- [x] CI/CD integration

### ✅ Quick Reference
- [x] Common commands
- [x] Environment variables
- [x] Key metrics explanation
- [x] Threshold definitions

---

## CI/CD Integration

### ✅ GitHub Actions Workflow
- [x] `.github/workflows/performance.yml`
- [x] Manual trigger with scenario selection
- [x] Scheduled nightly runs
- [x] PR-triggered on backend changes
- [x] Backend setup (PostgreSQL, migrations, seed)
- [x] Test execution with results
- [x] Artifact upload
- [x] PR comments with results

**Workflow Features:**
- Multiple scenario support
- Database setup and seeding
- Backend server startup
- Configurable test execution
- Result artifact retention
- Automated PR feedback

---

## File Manifest

```
tests/performance/
├── .gitignore                     # Ignore test results
├── README.md                      # Comprehensive documentation
├── package.json                   # NPM scripts
├── config.js                      # Test configuration & thresholds
├── run-tests.sh                   # Test runner script
├── docker-compose.perf.yml        # Docker setup (optional)
├── scenarios/
│   ├── load-test.js              # 100/500/1000 concurrent users
│   ├── stress-test.js            # Breaking point test
│   ├── spike-test.js             # Traffic surge test
│   ├── realtime-test.js          # Streaming latency test
│   └── endurance-test.js         # Long-running stability test
├── utils/
│   ├── api.js                    # API testing utilities
│   └── monitoring.js             # Resource monitoring
└── results/
    └── .gitkeep                  # Results directory placeholder

.github/workflows/
└── performance.yml                # CI/CD workflow
```

---

## Verification Steps

### 1. Local Test Execution
```bash
cd tests/performance

# Install k6
brew install k6  # macOS

# Start backend
cd ../../services/backend
npm run dev

# Run tests
cd ../../tests/performance
npm run test:load:light
npm run test:realtime
```

### 2. Verify Thresholds
- Check that p95 < 200ms for API endpoints
- Verify real-time latency < 2s
- Confirm error rate < 1%
- Validate all checks passing

### 3. CI/CD Test
- Trigger workflow manually
- Check workflow execution
- Review PR comments
- Download artifacts

### 4. Results Analysis
```bash
# View latest results
cat tests/performance/results/*.json | jq .

# Check metrics
# - http_req_duration_p95
# - http_req_duration_p99  
# - http_req_failed_rate
# - realtime_latency
```

---

## Performance Baselines

### Expected Performance (Light Load - 100 users)
- **p50**: < 100ms
- **p95**: < 200ms
- **p99**: < 500ms
- **Error Rate**: < 0.1%
- **Real-time Latency p95**: < 1000ms

### Expected Performance (Medium Load - 500 users)
- **p50**: < 150ms
- **p95**: < 250ms
- **p99**: < 750ms
- **Error Rate**: < 0.5%
- **Real-time Latency p95**: < 1500ms

### Expected Performance (Heavy Load - 1000 users)
- **p50**: < 200ms
- **p95**: < 300ms
- **p99**: < 1000ms
- **Error Rate**: < 1%
- **Real-time Latency p95**: < 2000ms

---

## Success Criteria Met ✅

- ✅ All test scenarios implemented and functional
- ✅ Performance thresholds configured and validated
- ✅ Real-time latency requirements tested
- ✅ Resource monitoring integrated
- ✅ Regression detection framework in place
- ✅ Comprehensive documentation provided
- ✅ CI/CD workflow configured
- ✅ Test results captured and retained

---

## References

- **Spec**: spec.md (Testing requirements)
- **Plan**: plan.md (3.3.4 - Performance testing)
- **k6 Docs**: https://k6.io/docs/
- **Workflow**: `.github/workflows/performance.yml`

---

**Acceptance Status**: ✅ **ACCEPTED**

All acceptance criteria have been met. The k6 performance testing infrastructure is complete and ready for use.
