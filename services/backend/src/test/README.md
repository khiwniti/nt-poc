# Test Data Factories and Fixtures

This directory contains test data factories, fixtures, and utilities for generating consistent, realistic test data across all test suites.

## Overview

- **Factories**: Functions to create individual model instances with realistic data
- **Fixtures**: Pre-configured scenarios combining multiple models
- **Seeds**: Scripts to populate test databases with data
- **Utils**: Cleanup and helper utilities for test management

## Quick Start

### Basic Factory Usage

```typescript
import { createFacility, createBatterySystem, createSensorReading } from './test/factories';

// Create a single facility with default values
const facility = await createFacility();

// Create with custom values
const facility = await createFacility({
  name: 'Custom Facility',
  status: 'active',
  total_zones: 10
});

// Create multiple facilities
const facilities = await createManyFacilities(5);
```

### Using Fixtures for Complex Scenarios

```typescript
import { createCompleteSystemFixture, createDegradedBatteryFixture } from './test/fixtures';

// Create a complete system with facility, batteries, and readings
const { facility, batterySystems, sensorReadings, rulPredictions } = 
  await createCompleteSystemFixture(3, 10);

// Create a degraded battery scenario for testing alerts
const { batterySystem, alerts, rulPrediction } = 
  await createDegradedBatteryFixture();
```

### Test Cleanup

```typescript
import { useTestDatabase, cleanupTestData } from './test/utils';

describe('My Test Suite', () => {
  // Automatically cleanup before and after each test
  useTestDatabase();

  it('should test something', async () => {
    const facility = await createFacility();
    // Test logic...
  });
});
```

## Available Factories

### Facility Factory

```typescript
createFacility(overrides?: FacilityData): Promise<Facility>
buildFacility(overrides?: FacilityData): FacilityData
createManyFacilities(count: number, overrides?: FacilityData): Promise<Facility[]>
```

**Default Values:**
- `name`: Random company name + "Energy Facility"
- `location`: Random city
- `timezone`: Random timezone
- `total_zones`: 1-20
- `status`: 'active', 'inactive', or 'maintenance'

### Battery System Factory

```typescript
createBatterySystem(overrides?: BatterySystemData): Promise<BatterySystem>
buildBatterySystem(overrides?: BatterySystemData): BatterySystemData
createManyBatterySystems(count: number, overrides?: BatterySystemData): Promise<BatterySystem[]>
```

**Default Values:**
- `name`: "Battery System" + random alphanumeric
- `zone`: "Zone-{A-D}-{1-10}"
- `capacity_kwh`: 50-500 kWh
- `status`: 'online', 'offline', 'maintenance', or 'fault'
- `installed_date`: Random date in past 2 years

### Sensor Reading Factory

```typescript
createSensorReading(overrides?: SensorReadingData): Promise<SensorReading>
buildSensorReading(overrides?: SensorReadingData): SensorReadingData
createManySensorReadings(count: number, overrides?: SensorReadingData): Promise<SensorReading[]>
createTimeSeriesReadings(batterySystemId: string, count: number, startTime: Date, intervalMinutes?: number): Promise<SensorReading[]>
```

**Default Values:**
- `voltage`: 3.0-4.2V
- `current`: -50 to 50A
- `temperature`: 15-45°C
- `soc`: 0-100%
- `soh`: 70-100%
- `power`: -100 to 100W

**Special Function:**
- `createTimeSeriesReadings`: Creates evenly-spaced sensor readings for time-series testing

### Alert Factory

```typescript
createAlert(overrides?: AlertData): Promise<Alert>
buildAlert(overrides?: AlertData): AlertData
createManyAlerts(count: number, overrides?: AlertData): Promise<Alert[]>
```

**Default Values:**
- `severity`: 'low', 'medium', 'high', or 'critical'
- `type`: 'temperature', 'voltage', 'current', 'soc', 'soh', or 'power'
- `message`: Random sentence
- `metadata`: Threshold and actual values
- `acknowledged`: Random boolean
- `resolved`: Random boolean

### RUL Prediction Factory

```typescript
createRulPrediction(overrides?: RulPredictionData): Promise<RulPrediction>
buildRulPrediction(overrides?: RulPredictionData): RulPredictionData
createManyRulPredictions(count: number, overrides?: RulPredictionData): Promise<RulPrediction[]>
```

**Default Values:**
- `predicted_rul`: 1-730 days
- `confidence`: 0.5-0.99
- `model_version`: "v{1-5}.{0-9}.0"
- `features`: Realistic battery metrics

### Model Performance Factory

```typescript
createModelPrediction(overrides?: ModelPredictionData): Promise<ModelPrediction>
createModelPerformanceMetrics(overrides?: ModelPerformanceMetricsData): Promise<ModelPerformanceMetrics>
```

**Default Values:**
- Predicted/Actual values for SOC, SOH, temperature, power
- Realistic MAE, RMSE, and R² metrics
- Model version tracking
- Prediction horizons: 5, 15, 30, 60 minutes

### User Factory

```typescript
buildUser(overrides?: UserData): UserData
generateToken(user?: UserData): string
generateAdminToken(): string
generateUserToken(): string
generateOperatorToken(): string
```

**Usage:**
```typescript
const adminToken = generateAdminToken();
const response = await request(app)
  .get('/api/v1/facilities')
  .set('Authorization', `Bearer ${adminToken}`);
```

## Available Fixtures

### Complete System Fixture

Creates a fully operational facility with multiple battery systems, sensor readings, and RUL predictions.

```typescript
const { facility, batterySystems, sensorReadings, rulPredictions } = 
  await createCompleteSystemFixture(numBatterySystems = 3, readingsPerSystem = 10);
```

**Use Cases:**
- Integration testing
- Dashboard testing
- API endpoint testing with related data

### Degraded Battery Fixture

Creates a battery system showing signs of degradation with alerts and low RUL.

```typescript
const { facility, batterySystem, sensorReadings, alerts, rulPrediction } = 
  await createDegradedBatteryFixture();
```

**Use Cases:**
- Alert testing
- Maintenance workflow testing
- RUL prediction validation

### Alert Scenario Fixture

Creates a comprehensive set of alerts at different severity levels and states.

```typescript
const { 
  facility, 
  batterySystem, 
  criticalAlerts, 
  highAlerts, 
  mediumAlerts, 
  lowAlerts,
  acknowledgedAlerts,
  resolvedAlerts 
} = await createAlertScenarioFixture();
```

**Use Cases:**
- Alert filtering and sorting
- Alert workflow testing
- Notification system testing

### Time Series Fixture

Creates realistic time-series data with hourly and daily patterns.

```typescript
const { facility, batterySystem, hourlyReadings, dailyReadings } = 
  await createTimeSeriesFixture(hoursOfData = 24, daysOfData = 30);
```

**Use Cases:**
- Chart and visualization testing
- Trend analysis testing
- Historical data queries

## Cleanup Utilities

### Clean Test Data

```typescript
import { cleanupTestData, cleanupAllTestData, resetTestDatabase } from './test/utils';

// Remove test data with 'test-' prefix
await cleanupTestData();

// Remove ALL data (use with caution!)
await cleanupAllTestData();

// Full reset
await resetTestDatabase();
```

### Command Line Usage

```bash
# Clean test-prefixed data
npm run test:cleanup

# Reset entire test database
npm run test:reset
```

### Auto-cleanup in Tests

```typescript
import { useTestDatabase } from './test/utils';

describe('My Test Suite', () => {
  useTestDatabase(); // Auto cleanup before/after each test

  it('creates facility', async () => {
    const facility = await createFacility();
    expect(facility).toBeDefined();
  });
});
```

## Seeding Test Database

### Programmatic Seeding

```typescript
import { seedTestDatabase, seedMinimalTestData } from './test/seeds/seedTestData';

// Full seed with all fixtures
await seedTestDatabase();

// Minimal seed for quick tests
await seedMinimalTestData();
```

### Command Line Seeding

```bash
# Seed full test data
npm run test:seed

# Seed minimal data
npm run test:seed:minimal
```

## Best Practices

### 1. Use Build vs Create

- `build*()`: Returns data object without database insertion
- `create*()`: Inserts into database and returns the record

```typescript
// When you need the object but not in DB
const facilityData = buildFacility({ name: 'Test' });

// When you need it in the database
const facility = await createFacility({ name: 'Test' });
```

### 2. Prefix Test IDs

All factories automatically prefix IDs with `test-` for easy cleanup:

```typescript
const facility = await createFacility();
// facility.id = "test-fac-uuid..."
```

### 3. Use Fixtures for Complex Scenarios

Instead of creating multiple related entities manually, use fixtures:

```typescript
// ❌ Manual (verbose)
const facility = await createFacility();
const battery = await createBatterySystem({ facility_id: facility.id });
const reading = await createSensorReading({ battery_system_id: battery.id });

// ✅ Using fixture
const { facility, batterySystems, sensorReadings } = 
  await createCompleteSystemFixture();
```

### 4. Clean Up After Tests

Always use `useTestDatabase()` or manual cleanup:

```typescript
describe('Test Suite', () => {
  useTestDatabase(); // Recommended

  // OR manually
  afterEach(async () => {
    await cleanupTestData();
  });
});
```

### 5. Realistic vs Deterministic Data

- For most tests: Use factory defaults (realistic, varied)
- For assertions: Override with specific values

```typescript
// Realistic for general testing
const facility = await createFacility();

// Deterministic for specific assertions
const facility = await createFacility({
  total_zones: 5,
  status: 'active'
});
expect(facility.total_zones).toBe(5);
```

## Examples

### Example 1: Testing API Endpoints

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { createFacility, generateAdminToken } from './test/factories';
import { useTestDatabase } from './test/utils';

describe('Facilities API', () => {
  useTestDatabase();

  it('should return list of facilities', async () => {
    await createFacility({ name: 'Facility A' });
    await createFacility({ name: 'Facility B' });
    
    const token = generateAdminToken();
    const response = await request(app)
      .get('/api/v1/facilities')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
  });
});
```

### Example 2: Testing Time Series Analysis

```typescript
import { createTimeSeriesFixture } from './test/fixtures';

describe('Time Series Analysis', () => {
  it('should calculate daily averages', async () => {
    const { batterySystem, dailyReadings } = 
      await createTimeSeriesFixture(24, 30);

    const avgSoc = dailyReadings.reduce((sum, r) => sum + r.soc, 0) / dailyReadings.length;
    
    expect(avgSoc).toBeGreaterThan(0);
    expect(avgSoc).toBeLessThan(100);
  });
});
```

### Example 3: Testing Alert Workflows

```typescript
import { createAlertScenarioFixture } from './test/fixtures';

describe('Alert Management', () => {
  it('should filter critical unacknowledged alerts', async () => {
    const { criticalAlerts, highAlerts } = await createAlertScenarioFixture();
    
    const unacknowledgedCritical = criticalAlerts.filter(a => !a.acknowledged);
    
    expect(unacknowledgedCritical.length).toBeGreaterThan(0);
  });
});
```

## Extending Factories

To add a new factory:

1. Create the factory file in `src/test/factories/`
2. Export factory functions
3. Add to `src/test/factories/index.ts`

```typescript
// newModelFactory.ts
import { faker } from '@faker-js/faker';
import { pool } from '../../config/database';

export async function createNewModel(overrides = {}) {
  const model = {
    id: `test-new-${faker.string.uuid()}`,
    name: overrides.name || faker.commerce.productName(),
    // ... more fields
  };

  const result = await pool.query(
    'INSERT INTO new_models (...) VALUES (...) RETURNING *',
    [/* values */]
  );

  return result.rows[0];
}
```

## Troubleshooting

### Database Connection Errors

Ensure `.env.test` is configured:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/test_db
```

### Cleanup Not Working

Check that your test IDs have the `test-` prefix:

```typescript
// IDs should automatically be prefixed
const facility = await createFacility();
console.log(facility.id); // "test-fac-..."
```

### Slow Tests

Use minimal fixtures or reduce counts:

```typescript
// Instead of default 10 readings per system
const { batterySystems } = await createCompleteSystemFixture(2, 3);
```

## Support

For issues or questions about test data factories, please refer to the main project documentation or contact the development team.
