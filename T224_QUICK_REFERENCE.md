# T224: Test Data Factories - Quick Reference

## Summary

Comprehensive test data factories and fixtures implemented for consistent test data generation across all test suites.

## Files Created

### Factories (src/test/factories/)
- `index.ts` - Factory exports
- `facilityFactory.ts` - Facility model factory
- `batterySystemFactory.ts` - Battery system factory
- `sensorReadingFactory.ts` - Sensor reading factory with time series support
- `alertFactory.ts` - Alert factory
- `rulPredictionFactory.ts` - RUL prediction factory
- `modelPerformanceFactory.ts` - Model prediction and metrics factories
- `userFactory.ts` - User and auth token factory

### Fixtures (src/test/fixtures/)
- `index.ts` - Fixture exports
- `completeSystemFixture.ts` - Complete operational system
- `degradedBatteryFixture.ts` - Degraded battery with alerts
- `alertScenarioFixture.ts` - Comprehensive alert scenarios
- `timeSeriesFixture.ts` - Time-series data with patterns

### Utilities (src/test/utils/)
- `index.ts` - Utility exports
- `cleanup.ts` - Test data cleanup functions
- `testHelpers.ts` - Test environment setup helpers

### Seeds (src/test/seeds/)
- `seedTestData.ts` - Database seeding scripts

### Documentation
- `README.md` - Comprehensive documentation
- `factories.example.test.ts` - Example test file

## Quick Usage

### Create Individual Models

```typescript
import { createFacility, createBatterySystem, createSensorReading } from './test/factories';

// With defaults
const facility = await createFacility();

// With custom values
const facility = await createFacility({ name: 'Test Facility', status: 'active' });

// Create many
const facilities = await createManyFacilities(5);
```

### Use Fixtures

```typescript
import { createCompleteSystemFixture } from './test/fixtures';

const { facility, batterySystems, sensorReadings, rulPredictions } = 
  await createCompleteSystemFixture(3, 10);
```

### Authentication

```typescript
import { generateAdminToken } from './test/factories';

const token = generateAdminToken();
const response = await request(app)
  .get('/api/v1/facilities')
  .set('Authorization', `Bearer ${token}`);
```

### Cleanup

```typescript
import { useTestDatabase } from './test/utils';

describe('My Tests', () => {
  useTestDatabase(); // Auto cleanup before/after each test
});
```

## NPM Scripts

```bash
# Seed test database
npm run test:seed

# Seed minimal data
npm run test:seed:minimal

# Cleanup test data
npm run test:cleanup

# Reset test database
npm run test:reset

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Available Factories

| Factory | Create Function | Build Function | Create Many |
|---------|----------------|----------------|-------------|
| Facility | `createFacility()` | `buildFacility()` | `createManyFacilities()` |
| Battery System | `createBatterySystem()` | `buildBatterySystem()` | `createManyBatterySystems()` |
| Sensor Reading | `createSensorReading()` | `buildSensorReading()` | `createManySensorReadings()` |
| Alert | `createAlert()` | `buildAlert()` | `createManyAlerts()` |
| RUL Prediction | `createRulPrediction()` | `buildRulPrediction()` | `createManyRulPredictions()` |
| Model Prediction | `createModelPrediction()` | - | - |
| Performance Metrics | `createModelPerformanceMetrics()` | - | - |
| User/Token | - | `buildUser()` | - |

## Available Fixtures

| Fixture | Function | Description |
|---------|----------|-------------|
| Complete System | `createCompleteSystemFixture()` | Facility + batteries + readings + predictions |
| Degraded Battery | `createDegradedBatteryFixture()` | Aging battery with alerts |
| Alert Scenario | `createAlertScenarioFixture()` | Various alert types and states |
| Time Series | `createTimeSeriesFixture()` | Hourly and daily patterns |

## Testing Best Practices

1. **Always cleanup**: Use `useTestDatabase()` in test suites
2. **Prefix test data**: All IDs automatically prefixed with `test-`
3. **Use fixtures for complex scenarios**: Avoid manual setup of related data
4. **Use realistic data**: Let factories generate varied data
5. **Override when needed**: Specify values for assertions

## Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { createFacility, generateAdminToken } from './test/factories';
import { useTestDatabase } from './test/utils';

describe('Facilities', () => {
  useTestDatabase();

  it('should list facilities', async () => {
    await createFacility({ name: 'Test A' });
    await createFacility({ name: 'Test B' });
    
    const token = generateAdminToken();
    const response = await request(app)
      .get('/api/v1/facilities')
      .set('Authorization', `Bearer ${token}`);

    expect(response.body.data).toHaveLength(2);
  });
});
```

## Key Features

✅ **Factory functions** for all models  
✅ **Test fixtures** for common scenarios  
✅ **Seeding scripts** for test databases  
✅ **Realistic test data** generation with Faker  
✅ **Cleanup utilities** for test isolation  
✅ **Comprehensive documentation** with examples  
✅ **Auto-prefixed IDs** for safe cleanup  
✅ **Time-series support** for sensor data  
✅ **Auth helpers** for protected endpoints  
✅ **Transaction helpers** for rollback tests  

## Dependencies

- `@faker-js/faker` - Realistic data generation
- `vitest` - Test framework
- `supertest` - HTTP testing

## Acceptance Criteria

- [x] Factory functions for all models
- [x] Test fixtures for common scenarios
- [x] Seeding scripts for test databases
- [x] Realistic test data generation
- [x] Cleanup utilities
- [x] Documentation for test data

## Files Modified

- `package.json` - Added test scripts

## Migration Notes

Existing tests can be updated to use factories:

```typescript
// Before
await pool.query(`
  INSERT INTO facilities (id, name, location)
  VALUES ('fac-001', 'Test', 'Bangkok')
`);

// After
const facility = await createFacility({ 
  name: 'Test', 
  location: 'Bangkok' 
});
```

## Next Steps

1. Update existing tests to use new factories
2. Add more specialized fixtures as needed
3. Consider adding factories for additional models
4. Expand documentation with more examples
