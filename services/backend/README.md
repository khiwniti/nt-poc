# Backend Service

Battery Management System Backend API

## Setup

```bash
npm install
cp .env.example .env
# Configure your database credentials
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

## Test Structure

- `src/routes/__tests__/facilities.test.ts` - Tests for facility endpoints
- `src/routes/__tests__/sensorReadings.test.ts` - Tests for sensor readings endpoints

## API Endpoints

### Facilities
- `GET /api/v1/facilities` - List all facilities
- `GET /api/v1/facilities/:id` - Get facility details
- `GET /api/v1/facilities/:id/kpis` - Get facility KPIs

### Sensor Readings
- `GET /api/v1/sensor-readings/latest` - Get latest reading for a battery system
- `GET /api/v1/sensor-readings/timeseries` - Get time-series data

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Test Coverage

The test suite covers:
- ✅ Authentication/authorization
- ✅ Facility CRUD operations
- ✅ KPI calculations
- ✅ Sensor readings retrieval
- ✅ Time-series data with aggregation
- ✅ Validation and error cases
