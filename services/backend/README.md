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

### ML / AI Insights

Model documentation (architecture, features, training, usage): `../../docs/ML_MODELS.md`.

- `POST /api/v1/ml/predict-maintenance` - Predict maintenance risk (Random Forest)
- `GET /api/v1/ml/model-metrics` - Get predictive maintenance model metrics
- `POST /api/v1/ml/train` - Train/retrain predictive maintenance model
- `GET /api/v1/predictions/:batteryId` - List RUL predictions for a battery
- `GET /api/v1/predictions/:batteryId/latest` - Get latest RUL prediction
- `POST /api/v1/predictions` - Create/persist a new RUL prediction

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Test Coverage

The test suite covers:
- ✅ Authentication/authorization
- ✅ Facility CRUD operations
- ✅ KPI calculations
- ✅ Sensor readings retrieval
- ✅ Time-series data with aggregation
- ✅ Validation and error cases
