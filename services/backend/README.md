# Backend Service

Battery Management System Backend API

## Setup

```bash
npm install  # Automatically runs database migrations
cp .env.example .env
# Configure your database credentials
```

## Database Migrations

This project uses **Knex.js** for database migrations. See [MIGRATIONS.md](./MIGRATIONS.md) for full documentation.

### Quick Commands

```bash
# Run migrations (automatic on npm install)
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last batch
npm run migrate:rollback

# Setup database with sample data
npm run db:setup

# Populate seed data
npm run seed:run
```

### Database Tables

The migration system creates 11 tables:
- Core: facilities, battery_systems, sensor_readings, alerts
- ML: rul_predictions
- MLOps: model_predictions, model_performance_metrics, model_drift_metrics, data_quality_metrics, model_health_alerts, model_health_scores

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

Internal service-to-service endpoints under `/internal/*` require an API key via `x-api-key` header (see `services/backend/.env.example` for `MLOPS_API_KEY`, `SIMULATOR_API_KEY`, `FRONTEND_API_KEY`).

## Test Coverage

The test suite covers:
- ✅ Authentication/authorization
- ✅ Facility CRUD operations
- ✅ KPI calculations
- ✅ Sensor readings retrieval
- ✅ Time-series data with aggregation
- ✅ Validation and error cases
