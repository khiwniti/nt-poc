# Microservices Testing Strategy - Executive Summary

**Created**: 2026-01-08
**Status**: Production-Ready Strategy

## Quick Reference

### Testing Pyramid

```
E2E (5%) - Playwright → Critical user journeys
Contract (15%) - Pact → API boundaries
Integration (30%) - Docker Compose → Service interactions
Unit (50%) - Vitest/Pytest → Business logic
```

### Coverage Targets

| Service | Unit | Integration | Contract | Total |
|---------|------|-------------|----------|-------|
| Frontend | 70% | 60% | API clients | 80%+ |
| Backend | 80% | 70% | All endpoints | 85%+ |
| MLOps | 85% | 75% | Prediction API | 90%+ |
| Simulator | 70% | 60% | Event stream | 75%+ |

---

## Tool Stack

### 1. Contract Testing: **Pact**
- **Frontend ↔ Backend**: API contract validation
- **Backend ↔ MLOps**: Prediction API contracts
- **Backend ↔ Simulator**: Event stream contracts

**Setup Time**: 16 hours
**Cost**: $50/month (Pact Broker hosting)

### 2. Frontend Testing: **Vitest + React Testing Library**
- **Unit Tests**: Component logic, hooks, utilities
- **Integration Tests**: API clients, IndexedDB, SSE mocking
- **Three.js Mocking**: Fast, deterministic 3D tests

**Performance**: 150 tests in 3-5 seconds

### 3. Backend Testing: **Pytest (Python) + Jest (Node.js)**
- **Unit Tests**: Business logic, calculations, utilities
- **Integration Tests**: Database operations, API endpoints
- **SSE Testing**: Stream validation, reconnection logic

**Performance**: 200 tests in 8-12 seconds

### 4. MLOps Testing: **Pytest**
- **Model Tests**: Accuracy, precision, recall validation
- **Prediction API**: Integration tests for endpoints
- **Drift Detection**: Data/model drift monitoring

**Performance**: 80 tests in 5-8 seconds

### 5. Integration Testing: **Docker Compose**
- **Multi-Service**: Backend + Database + MLOps
- **Cross-Service**: Full data flow validation
- **SSE Streaming**: Real-time update testing

**Performance**: 60 tests in 45-60 seconds

### 6. E2E Testing: **Playwright**
- **User Journeys**: Login → Dashboard → 3D → Alerts
- **Performance**: Lighthouse CI integration
- **Visual Regression**: Screenshot comparison

**Performance**: 25 tests in 3-5 minutes

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
Stage 1: Unit Tests (Parallel) - 3-12s per service
  ├─ Frontend Unit (Vitest)
  ├─ Backend Unit (Pytest)
  └─ MLOps Unit (Pytest)

Stage 2: Contract Tests - 15-20s
  ├─ Frontend publishes contracts
  ├─ Backend verifies contracts
  ├─ Backend publishes MLOps contracts
  └─ MLOps verifies contracts

Stage 3: Integration Tests - 45-60s
  ├─ Docker Compose environment
  ├─ Backend + Database tests
  ├─ MLOps + Database tests
  └─ Cross-service tests

Stage 4: E2E Tests - 3-5 minutes
  ├─ Playwright user journeys
  ├─ Performance testing (Lighthouse)
  └─ Visual regression

Stage 5: Can-I-Deploy Check
  └─ Pact Broker validation for production

Total Pipeline: 10-15 minutes
```

### Deployment Gates

✅ **Pass Criteria**:
- Unit tests: 100% pass
- Contract tests: 100% pass
- Integration tests: 100% pass
- E2E tests: 95%+ pass
- Coverage: Meet service thresholds

❌ **Block Deployment If**:
- Contract breaking changes
- Integration test failures
- E2E critical path failures
- Coverage below thresholds

---

## Quick Start Guide

### 1. Local Development

**Run Unit Tests**:
```bash
# Frontend
cd frontend && npm run test

# Backend
cd backend && pytest tests/unit/

# MLOps
cd mlops && pytest tests/unit/
```

**Run Contract Tests**:
```bash
# Frontend generates contracts
cd frontend && npm run test:contract

# Backend verifies contracts
cd backend && pytest tests/contract/
```

**Run Integration Tests**:
```bash
# Start test environment
./scripts/run-integration-tests.sh
```

**Run E2E Tests**:
```bash
cd frontend && npx playwright test
```

### 2. CI/CD Setup

**Required Secrets**:
- `PACT_BROKER_URL`: https://your-pact-broker.com
- `PACT_BROKER_TOKEN`: Your Pact Broker token
- `CODECOV_TOKEN`: Your Codecov token (optional)

**Configure Workflows**:
1. Copy `.github/workflows/contract-tests.yml`
2. Copy `.github/workflows/test-microservices.yml`
3. Push to repository

### 3. Pact Broker Setup

**Option A: Docker Compose (Self-Hosted)**:
```bash
docker-compose -f docker-compose.pact-broker.yml up -d
```

**Option B: Cloud Hosted**:
- PactFlow: https://pactflow.io (Free tier available)
- Pact Broker on Railway/Heroku

---

## Test Examples

### Frontend Contract Test
```typescript
// Defines API expectations
it('should get facility by ID', async () => {
  await provider
    .given('facility with ID 123 exists')
    .uponReceiving('a request for facility 123')
    .withRequest({ method: 'GET', path: '/api/v1/facilities/123' })
    .willRespondWith({
      status: 200,
      body: { id: '123', name: 'Building A' }
    })
    .executeTest(async (mockServer) => {
      const result = await getFacilityById('123', mockServer.url);
      expect(result.name).toBe('Building A');
    });
});
```

### Backend Contract Verification
```python
# Verifies backend implements contracts
def test_facility_api_contract():
    verifier = Verifier(provider='FacilityBackendAPI')
    success, logs = verifier.verify_with_broker(
        broker_url=PACT_BROKER_URL,
        publish_verification_results=True
    )
    assert success
```

### Integration Test
```python
# Tests full data flow
def test_backend_calls_mlops_prediction():
    response = requests.post('/api/v1/facilities/123/analyze', json={
        'temperature': 35.5,
        'humidity': 65.0
    })

    assert response.status_code == 200
    assert 'risk_assessment' in response.json()
```

### E2E Test
```typescript
// Tests user journey
test('should view facility and see 3D visualization', async ({ page }) => {
  await page.goto('/facilities/123');
  await expect(page.locator('canvas')).toBeVisible();
  await page.locator('canvas').click({ position: { x: 200, y: 200 } });
  await expect(page.getByRole('dialog')).toBeVisible();
});
```

---

## Implementation Timeline

### Week 1: Foundation (16 hours)
- [ ] Configure Vitest + RTL for frontend
- [ ] Set up Pytest for backend + MLOps
- [ ] Install Playwright for E2E
- [ ] Set up MSW for API mocking
- [ ] Configure test databases

### Week 2: Contract Testing (16 hours)
- [ ] Implement Pact for frontend contracts
- [ ] Set up backend contract verification
- [ ] Configure Pact Broker
- [ ] Create provider states

### Week 3: Integration (18 hours)
- [ ] Create Docker Compose test environment
- [ ] Write backend integration tests
- [ ] Write MLOps integration tests
- [ ] Set up test data seeding

### Week 4: E2E + CI/CD (12 hours)
- [ ] Write critical user journey tests
- [ ] Configure GitHub Actions pipeline
- [ ] Set up Lighthouse CI
- [ ] Add deployment gates

**Total**: ~62 hours (1.5 engineer-months)

---

## Troubleshooting

### Contract Tests Failing

**Problem**: "Pact verification failed"

**Solutions**:
1. Check provider states are correctly set up
2. Verify API responses match expected format
3. Review Pact Broker logs
4. Run provider verification locally

### Integration Tests Timing Out

**Problem**: "Service not responding"

**Solutions**:
1. Check Docker Compose service health
2. Increase timeout values
3. Review service logs: `docker-compose logs service-name`
4. Verify network connectivity between services

### E2E Tests Flaky

**Problem**: "Intermittent test failures"

**Solutions**:
1. Add explicit waits: `await page.waitForSelector()`
2. Check for race conditions in async operations
3. Increase timeout for slow operations
4. Use `page.waitForLoadState('networkidle')`

### CI Pipeline Slow

**Problem**: "Tests taking >20 minutes"

**Solutions**:
1. Run unit tests in parallel per service
2. Use test result caching
3. Optimize Docker layer caching
4. Split E2E tests across multiple runners

---

## Key Metrics

### Performance Targets
- **Unit Tests**: <10 seconds per service
- **Contract Tests**: <20 seconds
- **Integration Tests**: <60 seconds
- **E2E Tests**: <5 minutes
- **Total CI Pipeline**: <15 minutes

### Quality Gates
- **Unit Coverage**: 70-90% depending on service
- **Contract Pass Rate**: 100%
- **Integration Pass Rate**: 100%
- **E2E Pass Rate**: 95%+

### Cost Summary
- **Testing Tools**: $0 (all open-source)
- **Pact Broker Hosting**: ~$50/month
- **CI/CD Minutes**: Included in GitHub free tier
- **Total Monthly Cost**: ~$50

---

## Resources

### Documentation
- **Full Research**: `/specs/001-enterprise-facility-manager/research-microservices-testing.md`
- **Pact Docs**: https://docs.pact.io
- **Vitest Docs**: https://vitest.dev
- **Playwright Docs**: https://playwright.dev

### Scripts
- `/scripts/run-integration-tests.sh` - Run integration tests locally
- `/scripts/test-data.sql` - Seed test database

### Configuration Files
- `/docker-compose.test.yml` - Test environment setup
- `/.github/workflows/contract-tests.yml` - Contract testing pipeline
- `/.github/workflows/test-microservices.yml` - Full testing pipeline

---

**Status**: ✅ Production-Ready Strategy
**Confidence**: High (Industry best practices)
**Maintenance**: Low (Stable tooling)
**Team Training**: 2-3 days for full proficiency
