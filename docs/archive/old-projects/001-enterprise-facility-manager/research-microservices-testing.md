# Microservices Testing Strategy Research

**Feature**: Enterprise Facility Manager - Production-Grade Testing
**Created**: 2026-01-08
**Status**: Research Complete

This document provides comprehensive testing strategies for microservices architecture with Frontend (React), Backend (Python/Node), MLOps (Python), Database (PostgreSQL), and Sensor Simulator.

---

## Executive Summary

### Testing Architecture Decision

**Multi-Layer Testing Pyramid with Contract Validation**

```
         /\
        /  \  E2E Tests (5%)
       /────\  - Playwright full-stack tests
      /      \ - User journey validation
     /────────\ Contract Tests (15%)
    /          \ - Pact consumer/provider
   /────────────\ - API boundary validation
  /              \ Integration Tests (30%)
 /────────────────\ - Service + Database
/                  \ - Service + External APIs
──────────────────── Unit Tests (50%)
                     - Business logic
                     - Component tests
```

### Coverage Targets by Service

| Service | Unit | Integration | Contract | E2E | Total Target |
|---------|------|-------------|----------|-----|--------------|
| Frontend | 70% | 60% | API clients | Critical paths | 80%+ |
| Backend | 80% | 70% | All endpoints | N/A | 85%+ |
| MLOps | 85% | 75% | Prediction API | N/A | 90%+ |
| Simulator | 70% | 60% | Event stream | N/A | 75%+ |

### Total Implementation Time
**~62 hours (1.5 engineer-months)**

---

## 1. Contract Testing Strategy

### Decision: Pact for Consumer-Driven Contracts

**Why Pact?**
- Industry standard for microservices contract testing
- Bi-directional validation (consumer expectations + provider implementation)
- CI/CD integration with Pact Broker
- Language support: JavaScript (Frontend), Python (Backend/MLOps), Node.js (Backend)

### Contract Testing Architecture

```
Frontend (Consumer)           Backend (Provider)
      ↓                              ↓
  Write Pact                    Verify Pact
      ↓                              ↓
  Publish to Pact Broker ←────────→ Fetch Contract
      ↓                              ↓
  Validate against Provider ←────── Run Provider Tests
```

### 1.1 Frontend Contract Tests (Pact Consumer)

**Setup** (`frontend/package.json`):
```json
{
  "devDependencies": {
    "@pact-foundation/pact": "^12.0.0",
    "@pact-foundation/pact-web": "^10.0.0"
  },
  "scripts": {
    "test:contract": "vitest run --config vitest.contract.config.ts",
    "pact:publish": "pact-broker publish ./pacts --consumer-app-version=$npm_package_version"
  }
}
```

**Example: Facility API Contract** (`frontend/src/api/__tests__/facility.contract.test.ts`):
```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { getFacilityById, getFacilityMetrics } from '../facilityClient';

const provider = new PactV3({
  consumer: 'FacilityManagerFrontend',
  provider: 'FacilityBackendAPI',
  dir: './pacts'
});

describe('Facility API Contract', () => {
  describe('GET /api/v1/facilities/:id', () => {
    it('should get facility by ID with zone details', async () => {
      await provider
        .given('facility with ID 123 exists with 3 zones')
        .uponReceiving('a request for facility 123')
        .withRequest({
          method: 'GET',
          path: '/api/v1/facilities/123',
          headers: {
            'Authorization': MatchersV3.like('Bearer token'),
            'Content-Type': 'application/json'
          }
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: MatchersV3.string('123'),
            name: MatchersV3.string('Building A'),
            status: MatchersV3.regex('operational|maintenance|offline', 'operational'),
            location: {
              latitude: MatchersV3.decimal(37.7749),
              longitude: MatchersV3.decimal(-122.4194)
            },
            zones: MatchersV3.eachLike({
              id: MatchersV3.string(),
              name: MatchersV3.string('Zone 1'),
              temperature: MatchersV3.decimal(22.5),
              humidity: MatchersV3.decimal(45.0),
              sensorStatus: MatchersV3.regex('active|inactive|error', 'active'),
              lastUpdate: MatchersV3.iso8601DateTime()
            }, { min: 1 })
          }
        })
        .executeTest(async (mockServer) => {
          const result = await getFacilityById('123', mockServer.url);

          expect(result.name).toBe('Building A');
          expect(result.zones).toHaveLength(1);
          expect(result.zones[0]).toHaveProperty('temperature');
          expect(result.zones[0].sensorStatus).toMatch(/active|inactive|error/);
        });
    });

    it('should handle 404 for non-existent facility', async () => {
      await provider
        .given('facility with ID 999 does not exist')
        .uponReceiving('a request for facility 999')
        .withRequest({
          method: 'GET',
          path: '/api/v1/facilities/999',
          headers: { 'Authorization': MatchersV3.like('Bearer token') }
        })
        .willRespondWith({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: MatchersV3.string('Facility not found'),
            code: MatchersV3.string('FACILITY_NOT_FOUND')
          }
        })
        .executeTest(async (mockServer) => {
          await expect(getFacilityById('999', mockServer.url))
            .rejects.toThrow('Facility not found');
        });
    });
  });

  describe('GET /api/v1/facilities/:id/metrics', () => {
    it('should get real-time metrics for facility', async () => {
      await provider
        .given('facility 123 has recent metrics')
        .uponReceiving('a request for facility 123 metrics')
        .withRequest({
          method: 'GET',
          path: '/api/v1/facilities/123/metrics',
          query: {
            timeRange: '1h',
            resolution: '1m'
          }
        })
        .willRespondWith({
          status: 200,
          body: {
            facilityId: MatchersV3.string('123'),
            metrics: MatchersV3.eachLike({
              timestamp: MatchersV3.iso8601DateTime(),
              temperature: MatchersV3.decimal(22.5),
              humidity: MatchersV3.decimal(45.0),
              powerConsumption: MatchersV3.decimal(150.5)
            }, { min: 1 })
          }
        })
        .executeTest(async (mockServer) => {
          const result = await getFacilityMetrics('123', { timeRange: '1h' }, mockServer.url);

          expect(result.metrics.length).toBeGreaterThan(0);
          expect(result.metrics[0]).toHaveProperty('timestamp');
          expect(result.metrics[0]).toHaveProperty('temperature');
        });
    });
  });
});
```

**Contract for SSE Streaming** (`frontend/src/api/__tests__/sse.contract.test.ts`):
```typescript
describe('SSE Stream Contract', () => {
  it('should define SSE stream event format', async () => {
    await provider
      .given('facility 123 has active sensors streaming data')
      .uponReceiving('SSE connection for facility 123')
      .withRequest({
        method: 'GET',
        path: '/api/v1/facilities/123/stream',
        headers: {
          'Accept': 'text/event-stream'
        }
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
      .executeTest(async (mockServer) => {
        // Contract test only validates headers and connection
        // Actual streaming tested in integration tests
        const response = await fetch(`${mockServer.url}/api/v1/facilities/123/stream`, {
          headers: { 'Accept': 'text/event-stream' }
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      });
  });
});
```

### 1.2 Backend Contract Verification (Pact Provider)

**Python Backend** (`backend/tests/contract/test_facility_contract.py`):
```python
import pytest
from pact import Verifier
from app import create_app
from database import db, setup_test_db
from app.models import Facility, Zone

@pytest.fixture(scope="module")
def app():
    """Create test Flask app"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def provider_states(app):
    """Set up provider states for contract verification"""

    def setup_state(provider_state: str):
        with app.app_context():
            db.session.query(Facility).delete()
            db.session.query(Zone).delete()

            if provider_state == 'facility with ID 123 exists with 3 zones':
                facility = Facility(
                    id='123',
                    name='Building A',
                    status='operational',
                    location={'latitude': 37.7749, 'longitude': -122.4194}
                )
                db.session.add(facility)

                zones = [
                    Zone(id='z1', facility_id='123', name='Zone 1', temperature=22.5, humidity=45.0),
                    Zone(id='z2', facility_id='123', name='Zone 2', temperature=23.0, humidity=47.0),
                    Zone(id='z3', facility_id='123', name='Zone 3', temperature=21.5, humidity=44.0)
                ]
                db.session.add_all(zones)
                db.session.commit()

            elif provider_state == 'facility with ID 999 does not exist':
                # Ensure no facility with ID 999
                pass

            elif provider_state == 'facility 123 has recent metrics':
                # Set up metrics data
                facility = Facility(id='123', name='Building A', status='operational')
                db.session.add(facility)
                db.session.commit()
                # Metrics would be added to time-series DB or cache

    return setup_state

def test_facility_api_contract(app, provider_states):
    """Verify all consumer contracts against this provider"""

    verifier = Verifier(
        provider='FacilityBackendAPI',
        provider_base_url='http://localhost:5000'
    )

    # Start Flask test server
    from threading import Thread
    import time

    server_thread = Thread(target=app.run, kwargs={'port': 5000})
    server_thread.daemon = True
    server_thread.start()
    time.sleep(1)  # Wait for server to start

    # Verify contracts from Pact Broker
    success, logs = verifier.verify_with_broker(
        broker_url=os.getenv('PACT_BROKER_URL', 'https://pact-broker.example.com'),
        broker_username=os.getenv('PACT_BROKER_USERNAME'),
        broker_password=os.getenv('PACT_BROKER_PASSWORD'),
        publish_version=os.getenv('GIT_COMMIT', '1.0.0'),
        publish_verification_results=True,
        provider_states_setup_url='http://localhost:5000/_pact/provider-states',
        verbose=True
    )

    assert success, f"Contract verification failed:\n{logs}"
```

**Provider States Endpoint** (`backend/app/routes/pact.py`):
```python
from flask import Blueprint, request, jsonify
from database import db
from app.models import Facility, Zone

pact_bp = Blueprint('pact', __name__, url_prefix='/_pact')

@pact_bp.route('/provider-states', methods=['POST'])
def provider_states():
    """Endpoint for Pact to set up provider states during verification"""

    state = request.json.get('state')
    params = request.json.get('params', {})

    # Clear existing data
    Zone.query.delete()
    Facility.query.delete()
    db.session.commit()

    # Set up requested state
    if state == 'facility with ID 123 exists with 3 zones':
        facility = Facility(
            id='123',
            name='Building A',
            status='operational',
            location={'latitude': 37.7749, 'longitude': -122.4194}
        )
        db.session.add(facility)

        zones = [
            Zone(id='z1', facility_id='123', name='Zone 1',
                 temperature=22.5, humidity=45.0, sensor_status='active'),
            Zone(id='z2', facility_id='123', name='Zone 2',
                 temperature=23.0, humidity=47.0, sensor_status='active'),
            Zone(id='z3', facility_id='123', name='Zone 3',
                 temperature=21.5, humidity=44.0, sensor_status='active')
        ]
        db.session.add_all(zones)
        db.session.commit()

    elif state == 'facility 123 has recent metrics':
        facility = Facility(id='123', name='Building A', status='operational')
        db.session.add(facility)
        db.session.commit()
        # Add metrics to cache or time-series DB

    return jsonify({'result': 'success'}), 200
```

### 1.3 Backend ↔ MLOps Contract Testing

**Backend as Consumer** (`backend/tests/contract/test_mlops_contract.py`):
```python
from pact import Consumer, Provider, Like, EachLike, Format
import pytest

pact = Consumer('FacilityBackendAPI').has_pact_with(
    Provider('MLOpsPredictionService'),
    pact_dir='./pacts'
)

@pytest.fixture(scope='module')
def mlops_pact():
    pact.start_service()
    yield pact
    pact.stop_service()

def test_prediction_request(mlops_pact):
    """Contract for failure prediction API"""

    expected = {
        'prediction': Like('high_risk'),
        'confidence': Like(0.85),
        'risk_score': Like(78.5),
        'features': EachLike({
            'name': Like('temperature'),
            'value': Like(35.5),
            'importance': Like(0.75),
            'contribution': Like(12.3)
        }),
        'model_version': Like('1.2.3'),
        'timestamp': Format().iso_8601_datetime()
    }

    (pact
     .given('model is trained and available')
     .upon_receiving('a request for failure prediction')
     .with_request(
         method='POST',
         path='/api/v1/predict',
         headers={'Content-Type': 'application/json'},
         body={
             'facility_id': Like('123'),
             'sensor_data': {
                 'temperature': Like(35.5),
                 'humidity': Like(65.0),
                 'vibration': Like(12.3),
                 'pressure': Like(101.3)
             },
             'timestamp': Format().iso_8601_datetime()
         }
     )
     .will_respond_with(status=200, body=expected))

    with pact:
        from app.services.mlops_client import MLOpsClient

        client = MLOpsClient(base_url=pact.uri)
        result = client.get_prediction(
            facility_id='123',
            sensor_data={
                'temperature': 35.5,
                'humidity': 65.0,
                'vibration': 12.3,
                'pressure': 101.3
            }
        )

        assert result['prediction'] == 'high_risk'
        assert 0 <= result['confidence'] <= 1
        assert 'features' in result
        assert len(result['features']) > 0

def test_batch_prediction_request(mlops_pact):
    """Contract for batch prediction API"""

    expected = {
        'predictions': EachLike({
            'facility_id': Like('123'),
            'prediction': Like('high_risk'),
            'confidence': Like(0.85),
            'risk_score': Like(78.5)
        }),
        'batch_id': Like('batch_20260108_001'),
        'processed_at': Format().iso_8601_datetime()
    }

    (pact
     .given('model is trained and available')
     .upon_receiving('a batch prediction request')
     .with_request(
         method='POST',
         path='/api/v1/predict/batch',
         body={
             'requests': EachLike({
                 'facility_id': Like('123'),
                 'sensor_data': {
                     'temperature': Like(35.5),
                     'humidity': Like(65.0),
                     'vibration': Like(12.3)
                 }
             })
         }
     )
     .will_respond_with(status=200, body=expected))

    with pact:
        from app.services.mlops_client import MLOpsClient

        client = MLOpsClient(base_url=pact.uri)
        result = client.get_batch_predictions([
            {'facility_id': '123', 'sensor_data': {...}},
            {'facility_id': '456', 'sensor_data': {...}}
        ])

        assert 'predictions' in result
        assert len(result['predictions']) > 0
```

**MLOps Provider Verification** (`mlops/tests/contract/test_provider.py`):
```python
import pytest
from pact import Verifier
from src.api import create_app

@pytest.fixture(scope="module")
def app():
    """Create test FastAPI app"""
    app = create_app()
    return app

def test_mlops_contract_verification(app):
    """Verify MLOps provider against backend consumer contracts"""

    verifier = Verifier(
        provider='MLOpsPredictionService',
        provider_base_url='http://localhost:8000'
    )

    # Start FastAPI test server
    import uvicorn
    from threading import Thread

    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="error")
    server = uvicorn.Server(config)
    server_thread = Thread(target=server.run)
    server_thread.daemon = True
    server_thread.start()

    import time
    time.sleep(2)  # Wait for server to start

    # Verify contracts
    success, logs = verifier.verify_with_broker(
        broker_url=os.getenv('PACT_BROKER_URL'),
        broker_username=os.getenv('PACT_BROKER_USERNAME'),
        broker_password=os.getenv('PACT_BROKER_PASSWORD'),
        publish_version=os.getenv('GIT_COMMIT', '1.0.0'),
        publish_verification_results=True,
        provider_states_setup_url='http://localhost:8000/_pact/provider-states',
        verbose=True
    )

    assert success, f"Contract verification failed:\n{logs}"
```

### 1.4 Contract Testing CI/CD Flow

**GitHub Actions** (`.github/workflows/contract-tests.yml`):
```yaml
name: Contract Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # Stage 1: Frontend generates and publishes contracts
  frontend-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run contract tests
        run: npm run test:contract

      - name: Publish Pacts to Broker
        if: success()
        run: |
          npm run pact:publish -- \
            --consumer-app-version=${{ github.sha }} \
            --tag=${{ github.ref_name }} \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}

  # Stage 2: Backend verifies frontend contracts
  backend-contract-verification:
    needs: frontend-contract
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -r backend/requirements.txt

      - name: Run provider verification
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          GIT_COMMIT: ${{ github.sha }}
        run: pytest backend/tests/contract/ -v

      - name: Publish verification results
        if: always()
        run: |
          pact-verifier publish \
            --provider-app-version=${{ github.sha }} \
            --tag=${{ github.ref_name }} \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}

  # Stage 3: Backend publishes MLOps contracts
  backend-mlops-contract:
    needs: backend-contract-verification
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5

      - name: Run MLOps contract tests
        run: pytest backend/tests/contract/test_mlops_contract.py -v

      - name: Publish MLOps contracts
        run: |
          pact-broker publish ./backend/pacts \
            --consumer-app-version=${{ github.sha }} \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}

  # Stage 4: MLOps verifies backend contracts
  mlops-contract-verification:
    needs: backend-mlops-contract
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5

      - name: Install MLOps dependencies
        run: pip install -r mlops/requirements.txt

      - name: Verify MLOps provider contracts
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          GIT_COMMIT: ${{ github.sha }}
        run: pytest mlops/tests/contract/ -v

  # Stage 5: Can-I-Deploy check
  can-i-deploy:
    needs: [backend-contract-verification, mlops-contract-verification]
    runs-on: ubuntu-latest
    steps:
      - name: Check if safe to deploy
        run: |
          pact-broker can-i-deploy \
            --pacticipant FacilityManagerFrontend \
            --version ${{ github.sha }} \
            --to-environment production \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}
```

**Pact Broker Setup** (`docker-compose.pact-broker.yml`):
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: pact_broker
      POSTGRES_PASSWORD: pact_broker_password
      POSTGRES_DB: pact_broker
    volumes:
      - pact-broker-db:/var/lib/postgresql/data

  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgresql://pact_broker:pact_broker_password@postgres/pact_broker
      PACT_BROKER_BASIC_AUTH_USERNAME: pact_user
      PACT_BROKER_BASIC_AUTH_PASSWORD: ${PACT_BROKER_PASSWORD}
      PACT_BROKER_ALLOW_PUBLIC_READ: 'true'
    depends_on:
      - postgres

volumes:
  pact-broker-db:
```

---

## 2. Integration Testing with Docker Compose

### Test Environment Setup

**Docker Compose for Testing** (`docker-compose.test.yml`):
```yaml
version: '3.9'

services:
  postgres-test:
    image: postgres:16
    environment:
      POSTGRES_DB: facility_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - ./scripts/test-data.sql:/docker-entrypoint-initdb.d/init.sql

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend-test:
    build:
      context: ./backend
      dockerfile: Dockerfile.test
    environment:
      DATABASE_URL: postgresql://test_user:test_password@postgres-test:5432/facility_test
      REDIS_URL: redis://redis-test:6379
      MLOPS_API_URL: http://mlops-test:8000
      LINE_CHANNEL_SECRET: test_secret
      LINE_CHANNEL_ACCESS_TOKEN: test_token
      GEMINI_API_KEY: test_api_key
    depends_on:
      postgres-test:
        condition: service_healthy
      redis-test:
        condition: service_healthy
    ports:
      - "5001:5000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  mlops-test:
    build:
      context: ./mlops
      dockerfile: Dockerfile.test
    environment:
      MODEL_PATH: /app/models/test_model.pkl
      DATABASE_URL: postgresql://test_user:test_password@postgres-test:5432/facility_test
    volumes:
      - ./mlops/tests/fixtures:/app/models
    ports:
      - "8001:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  simulator-test:
    build:
      context: ./simulator
      dockerfile: Dockerfile.test
    environment:
      BACKEND_URL: http://backend-test:5000
      SIMULATION_MODE: test
      FACILITY_COUNT: 5
      UPDATE_INTERVAL: 1
    depends_on:
      backend-test:
        condition: service_healthy
    ports:
      - "9001:9000"

  frontend-test:
    build:
      context: ./frontend
      dockerfile: Dockerfile.test
    environment:
      VITE_API_URL: http://backend-test:5000
      VITE_ENABLE_MOCKS: "false"
    ports:
      - "5173:5173"
    depends_on:
      - backend-test
```

### Integration Test Runner Script

**Script** (`scripts/run-integration-tests.sh`):
```bash
#!/bin/bash
set -e

echo "🚀 Starting microservices test environment..."
docker-compose -f docker-compose.test.yml up -d

echo "⏳ Waiting for services to be healthy..."
MAX_WAIT=60
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker-compose -f docker-compose.test.yml ps | grep -q "unhealthy"; then
        echo "  Services still starting... ($ELAPSED/${MAX_WAIT}s)"
        sleep 5
        ELAPSED=$((ELAPSED + 5))
    else
        echo "✅ All services are healthy!"
        break
    fi
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "❌ Services failed to become healthy within ${MAX_WAIT}s"
    docker-compose -f docker-compose.test.yml logs
    docker-compose -f docker-compose.test.yml down -v
    exit 1
fi

echo ""
echo "🧪 Running Backend Integration Tests..."
docker-compose -f docker-compose.test.yml exec -T backend-test \
    pytest tests/integration/ -v --cov=app --cov-report=term-missing

echo ""
echo "🤖 Running MLOps Integration Tests..."
docker-compose -f docker-compose.test.yml exec -T mlops-test \
    pytest tests/integration/ -v --cov=src --cov-report=term-missing

echo ""
echo "📊 Running Cross-Service Integration Tests..."
docker-compose -f docker-compose.test.yml exec -T backend-test \
    pytest tests/integration/test_cross_service.py -v

echo ""
echo "✅ All integration tests passed!"

echo ""
echo "🧹 Cleaning up test environment..."
docker-compose -f docker-compose.test.yml down -v

echo "✨ Integration test suite complete!"
```

### Cross-Service Integration Tests

**Example** (`backend/tests/integration/test_cross_service.py`):
```python
import pytest
import requests
import time
from typing import Dict

# Assumes Docker Compose test environment is running

BASE_URL = 'http://localhost:5001'
MLOPS_URL = 'http://localhost:8001'
SIMULATOR_URL = 'http://localhost:9001'

@pytest.mark.integration
class TestBackendMLOpsIntegration:
    """Test backend communication with MLOps service"""

    def test_backend_requests_prediction_from_mlops(self):
        """Backend should call MLOps and return prediction"""

        # 1. Send sensor data to backend
        response = requests.post(f'{BASE_URL}/api/v1/facilities/123/analyze', json={
            'sensor_data': {
                'temperature': 35.5,
                'humidity': 65.0,
                'vibration': 12.3,
                'pressure': 101.3
            }
        }, timeout=10)

        assert response.status_code == 200
        data = response.json()

        # 2. Verify backend called MLOps and returned prediction
        assert 'risk_assessment' in data
        assert data['risk_assessment']['prediction'] in ['low_risk', 'medium_risk', 'high_risk']
        assert 0 <= data['risk_assessment']['confidence'] <= 1
        assert 'features' in data['risk_assessment']

    def test_backend_handles_mlops_failure_gracefully(self):
        """Backend should handle MLOps service failures"""

        # Stop MLOps service temporarily
        import subprocess
        subprocess.run(['docker-compose', '-f', 'docker-compose.test.yml', 'stop', 'mlops-test'])

        try:
            response = requests.post(f'{BASE_URL}/api/v1/facilities/123/analyze', json={
                'sensor_data': {'temperature': 25.0}
            }, timeout=10)

            # Backend should return 503 or fallback response
            assert response.status_code in [200, 503]

            if response.status_code == 200:
                data = response.json()
                assert 'risk_assessment' in data
                assert data['risk_assessment']['prediction'] == 'unknown'

        finally:
            # Restart MLOps service
            subprocess.run(['docker-compose', '-f', 'docker-compose.test.yml', 'start', 'mlops-test'])
            time.sleep(5)  # Wait for service to be ready

@pytest.mark.integration
class TestSimulatorBackendIntegration:
    """Test simulator communication with backend"""

    def test_simulator_sends_sensor_data_to_backend(self):
        """Simulator should send sensor data that backend receives"""

        # 1. Trigger simulator to send data
        response = requests.post(f'{SIMULATOR_URL}/api/simulate', json={
            'facility_id': '123',
            'duration': 5,  # 5 seconds
            'frequency': 1  # 1 update per second
        }, timeout=10)

        assert response.status_code == 200

        # 2. Wait for data to be sent
        time.sleep(6)

        # 3. Verify backend received data
        response = requests.get(f'{BASE_URL}/api/v1/facilities/123/metrics',
                               params={'timeRange': '1m'},
                               timeout=10)

        assert response.status_code == 200
        data = response.json()
        assert len(data['metrics']) >= 5  # Should have at least 5 data points

@pytest.mark.integration
class TestFullStackIntegration:
    """Test complete data flow: Simulator → Backend → MLOps → Database"""

    def test_sensor_data_flow_end_to_end(self):
        """Test complete sensor data pipeline"""

        facility_id = '123'

        # 1. Simulator sends sensor data
        response = requests.post(f'{SIMULATOR_URL}/api/simulate', json={
            'facility_id': facility_id,
            'sensor_data': {
                'temperature': 35.5,
                'humidity': 65.0,
                'vibration': 12.3
            }
        }, timeout=10)
        assert response.status_code == 200

        # 2. Backend receives and processes data
        time.sleep(2)  # Wait for processing

        # 3. Backend calls MLOps for prediction
        response = requests.get(f'{BASE_URL}/api/v1/facilities/{facility_id}/risk', timeout=10)
        assert response.status_code == 200
        risk_data = response.json()
        assert 'prediction' in risk_data

        # 4. Verify data is stored in database
        response = requests.get(f'{BASE_URL}/api/v1/facilities/{facility_id}', timeout=10)
        assert response.status_code == 200
        facility_data = response.json()
        assert facility_data['zones'][0]['temperature'] == 35.5

        # 5. Verify alert was generated if high risk
        if risk_data['prediction'] == 'high_risk':
            response = requests.get(f'{BASE_URL}/api/v1/alerts',
                                   params={'facility_id': facility_id},
                                   timeout=10)
            assert response.status_code == 200
            alerts = response.json()
            assert len(alerts) > 0
            assert alerts[0]['severity'] == 'high'

@pytest.mark.integration
class TestDatabaseIntegration:
    """Test database operations across services"""

    def test_backend_writes_and_reads_facility_data(self):
        """Test CRUD operations on facility data"""

        # Create facility
        response = requests.post(f'{BASE_URL}/api/v1/facilities', json={
            'name': 'Test Building',
            'location': {'latitude': 37.7749, 'longitude': -122.4194},
            'zones': [
                {'name': 'Zone 1', 'area': 100.0},
                {'name': 'Zone 2', 'area': 150.0}
            ]
        }, timeout=10)

        assert response.status_code == 201
        facility = response.json()
        facility_id = facility['id']

        # Read facility
        response = requests.get(f'{BASE_URL}/api/v1/facilities/{facility_id}', timeout=10)
        assert response.status_code == 200
        assert response.json()['name'] == 'Test Building'

        # Update facility
        response = requests.patch(f'{BASE_URL}/api/v1/facilities/{facility_id}', json={
            'status': 'maintenance'
        }, timeout=10)
        assert response.status_code == 200

        # Verify update
        response = requests.get(f'{BASE_URL}/api/v1/facilities/{facility_id}', timeout=10)
        assert response.json()['status'] == 'maintenance'

        # Delete facility
        response = requests.delete(f'{BASE_URL}/api/v1/facilities/{facility_id}', timeout=10)
        assert response.status_code == 204

        # Verify deletion
        response = requests.get(f'{BASE_URL}/api/v1/facilities/{facility_id}', timeout=10)
        assert response.status_code == 404

@pytest.mark.integration
class TestSSEStreamIntegration:
    """Test Server-Sent Events streaming"""

    def test_sse_stream_receives_real_time_updates(self):
        """Test SSE stream for real-time sensor updates"""

        import sseclient  # pip install sseclient-py

        facility_id = '123'

        # Connect to SSE stream
        response = requests.get(
            f'{BASE_URL}/api/v1/facilities/{facility_id}/stream',
            stream=True,
            headers={'Accept': 'text/event-stream'},
            timeout=30
        )

        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'text/event-stream'

        client = sseclient.SSEClient(response)
        events_received = []

        # Collect events for 10 seconds
        import threading

        def collect_events():
            for event in client.events():
                events_received.append(event)
                if len(events_received) >= 5:
                    break

        thread = threading.Thread(target=collect_events)
        thread.start()

        # Send sensor data while stream is active
        time.sleep(1)
        requests.post(f'{SIMULATOR_URL}/api/simulate', json={
            'facility_id': facility_id,
            'duration': 5,
            'frequency': 1
        })

        thread.join(timeout=12)

        # Verify events received
        assert len(events_received) >= 3
        assert any(event.event == 'sensor_update' for event in events_received)
```

### Test Data Seeding

**SQL Script** (`scripts/test-data.sql`):
```sql
-- Seed test data for integration tests

INSERT INTO facilities (id, name, status, location, created_at) VALUES
('123', 'Building A', 'operational', '{"latitude": 37.7749, "longitude": -122.4194}', NOW()),
('456', 'Building B', 'maintenance', '{"latitude": 37.7849, "longitude": -122.4294}', NOW()),
('789', 'Building C', 'operational', '{"latitude": 37.7949, "longitude": -122.4394}', NOW());

INSERT INTO zones (id, facility_id, name, area, temperature, humidity, sensor_status) VALUES
('z1', '123', 'Zone 1', 100.0, 22.5, 45.0, 'active'),
('z2', '123', 'Zone 2', 150.0, 23.0, 47.0, 'active'),
('z3', '123', 'Zone 3', 120.0, 21.5, 44.0, 'active'),
('z4', '456', 'Zone 1', 200.0, 20.0, 40.0, 'inactive'),
('z5', '789', 'Zone 1', 180.0, 24.0, 50.0, 'active');

INSERT INTO alerts (id, facility_id, severity, message, status, created_at) VALUES
('a1', '123', 'high', 'High temperature detected in Zone 1', 'active', NOW() - INTERVAL '1 hour'),
('a2', '456', 'medium', 'Sensor offline in Zone 1', 'acknowledged', NOW() - INTERVAL '2 hours'),
('a3', '789', 'low', 'Humidity above normal in Zone 1', 'active', NOW() - INTERVAL '30 minutes');
```

---

## Testing Timeline & Resources

### Implementation Phases

#### Phase 1: Foundation (Week 1) - 16 hours
- Configure Vitest + RTL for frontend (4 hours)
- Set up Pytest for backend + MLOps (4 hours)
- Install Playwright for E2E (2 hours)
- Set up MSW for API mocking (3 hours)
- Configure test databases (3 hours)

#### Phase 2: Contract Testing (Week 2) - 16 hours
- Implement Pact for frontend contracts (6 hours)
- Set up backend contract verification (6 hours)
- Configure Pact Broker (4 hours)

#### Phase 3: Integration (Week 3) - 18 hours
- Create Docker Compose test environment (6 hours)
- Write backend integration tests (6 hours)
- Write MLOps integration tests (3 hours)
- Set up test data seeding (3 hours)

#### Phase 4: E2E + CI/CD (Week 4) - 12 hours
- Write critical user journey tests (6 hours)
- Configure GitHub Actions pipeline (4 hours)
- Set up Lighthouse CI (2 hours)

**Total Setup Time**: ~62 hours (~1.5 engineer-months)

### Performance Benchmarks

| Test Suite | Test Count | Duration | Pass Threshold |
|------------|------------|----------|----------------|
| Frontend Unit | 150 | 3-5s | 100% |
| Backend Unit | 200 | 8-12s | 100% |
| MLOps Unit | 80 | 5-8s | 100% |
| Contract Tests | 40 | 15-20s | 100% |
| Integration Tests | 60 | 45-60s | 100% |
| E2E Tests | 25 | 3-5min | 95%+ |
| **Total CI Pipeline** | **555** | **~10-15min** | **98%+** |

---

## Next Steps

1. **Immediate Actions**:
   - Set up Pact Broker infrastructure
   - Configure test databases (PostgreSQL + Redis)
   - Install testing dependencies in all services

2. **Phase 1 Implementation**:
   - Begin with frontend unit tests and contract tests
   - Set up backend pytest configuration
   - Create Docker Compose test environment

3. **CI/CD Integration**:
   - Configure GitHub Actions workflows
   - Set up contract testing pipeline
   - Add deployment gates based on test results

4. **Documentation**:
   - Create testing guidelines for team
   - Document test data management
   - Write runbooks for test debugging

---

**Research Status**: ✅ Complete
**Implementation Ready**: Yes
**Estimated Setup Time**: ~62 hours (1.5 engineer-months)
**Monthly Costs**: $0 (all open-source tools) + Pact Broker hosting (~$50/month for cloud hosting)
