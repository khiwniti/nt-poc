# T213: Contract Tests (Pact) - Quick Reference

## Overview

Pact contract tests ensure API compatibility between Frontend (consumer) and Backend (provider) services.

## Running Tests

### Consumer Tests (Frontend)
```bash
# Run consumer contract tests
npm run test:pact --workspace=@nt-poc/frontend

# Watch mode
cd services/frontend && npm run test:pact:watch
```

### Provider Verification (Backend)
```bash
# Verify provider against contracts
npm run test:pact:verify --workspace=@nt-poc/backend
```

### Run All Contract Tests
```bash
npm run test:pact  # Runs consumer then provider
```

## Contract Coverage

### Health API
- `GET /api/v1/health` - Health check endpoint

### Facilities API
- `GET /api/v1/facilities` - List facilities
- `GET /api/v1/facilities/:id` - Get single facility
- `GET /api/v1/facilities/:id/kpis` - Get facility KPIs

### Alerts API
- `GET /api/v1/alerts` - List alerts with pagination
- `GET /api/v1/alerts/:id` - Get single alert
- `GET /api/v1/alerts/stats/summary` - Get alert statistics
- `POST /api/v1/alerts/:id/acknowledge` - Acknowledge alert
- `POST /api/v1/alerts/:id/resolve` - Resolve alert

## File Structure

```
services/frontend/
├── src/__tests__/pact/
│   ├── pact.config.ts           # Consumer configuration
│   ├── alerts.consumer.pact.spec.ts
│   ├── facilities.consumer.pact.spec.ts
│   └── health.consumer.pact.spec.ts
└── vitest.pact.config.ts        # Pact-specific vitest config

services/backend/
├── src/test/pact/
│   ├── pact.provider.config.ts  # Provider configuration
│   └── provider.verification.spec.ts
└── vitest.pact.config.ts        # Pact-specific vitest config

pacts/
└── BMS-Frontend-BMS-Backend.json  # Generated contract file

.github/workflows/
└── contract-testing.yml         # CI workflow

docs/
└── PACT_BROKER_SETUP.md         # Broker integration guide
```

## CI/CD Integration

Contract tests run automatically on:
- Pull requests to `main` and `develop`
- Pushes to `main` and `develop`

### Breaking Change Detection

The CI workflow includes:
1. Consumer tests generate contracts
2. Provider verifies against contracts
3. `can-i-deploy` check before production deployments

## Pact Broker Integration

Set these environment variables in CI:
- `PACT_BROKER_BASE_URL` - Pact Broker URL
- `PACT_BROKER_TOKEN` - Authentication token

See `docs/PACT_BROKER_SETUP.md` for detailed setup instructions.

## Adding New Contracts

### 1. Add Consumer Test (Frontend)
```typescript
// services/frontend/src/__tests__/pact/newapi.consumer.pact.spec.ts
import { createPact } from './pact.config';

describe('New API Consumer Contract Tests', () => {
  const pact = createPact();

  it('defines expected interaction', async () => {
    await pact
      .addInteraction()
      .given('precondition state')
      .uponReceiving('description of request')
      .withRequest('GET', '/api/v1/endpoint')
      .willRespondWith(200, (builder) => {
        builder.jsonBody({ /* expected response */ });
      })
      .executeTest(async (mockServer) => {
        // Make request to mockServer.url
      });
  });
});
```

### 2. Update Provider Verification (Backend)
Add state handlers in `provider.verification.spec.ts`:
```typescript
stateHandlers: {
  'precondition state': async () => {
    // Setup test data
  },
}
```

### 3. Regenerate Contracts
```bash
npm run test:pact:consumer
npm run test:pact:provider
```

## Troubleshooting

### Consumer tests fail
- Ensure `node-fetch` is installed
- Check vitest config uses `environment: 'node'`

### Provider verification timeout
- Increase `requestTimeout` in verifier options
- Check mock server endpoints handle all states

### Contract file not generated
- Verify pacts directory exists
- Check consumer test assertions pass
