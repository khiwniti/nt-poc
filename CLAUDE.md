# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NT-POC is a Battery Management System with ML-powered predictive maintenance. It's a TypeScript/Python monorepo containing:
- **Backend**: Express API with TimescaleDB for time-series sensor data
- **Frontend**: React + Vite with 3D visualization (Three.js) and geospatial features (Mapbox/Leaflet)
- **ML**: TensorFlow-based RUL (Remaining Useful Life) prediction with LSTM models
- **MLOps**: FastAPI model serving with SHAP explainability
- **Simulator**: Battery sensor data generator for testing

## Development Commands

### Daily Development

```bash
# Start development (backend + frontend concurrently)
npm run dev

# Run individual services
npm run dev:backend   # Port 3001
npm run dev:frontend  # Port 5173

# Build all services
npm run build

# Quality checks (typecheck + lint + format check)
npm run quality
```

### Backend Development

```bash
cd services/backend

# Database migrations
npm run migrate                # Run migrations
npm run migrate:rollback       # Rollback last migration
npm run migrate:status         # Check migration status
npm run migrate:make <name>    # Create new migration

# Testing
npm test                       # Run all tests with Vitest
npm run test:coverage          # Generate coverage report
npm run test:migrations        # Test database migrations

# Test data management
npm run test:seed              # Seed test data
npm run test:seed:minimal      # Seed minimal test data
npm run test:cleanup           # Clean test data
npm run test:reset             # Reset test database

# Type checking and linting
npm run typecheck              # TypeScript type checking
npm run lint                   # ESLint
npm run lint:fix               # Auto-fix linting issues
```

### Frontend Development

```bash
cd services/frontend

# Testing
npm test                       # Run unit tests (Vitest)
npm run test:coverage          # Coverage report
npm run test:e2e               # Playwright E2E tests
npm run test:e2e:ui            # E2E with Playwright UI
npm run test:e2e:headed        # E2E in headed browser

# Smoke tests
npm run test:smoke             # Quick production health checks
npm run test:smoke:ui          # Smoke tests with UI

# Accessibility testing
npm run test:a11y              # Run all accessibility tests
npm run test:a11y:axe          # Axe accessibility tests
npm run test:a11y:keyboard     # Keyboard navigation tests

# Performance
npm run lighthouse             # Run Lighthouse audits
npm run analyze                # Bundle size analysis

# Quality
npm run typecheck
npm run lint
npm run lint:fix
```

### Python ML Services

```bash
# ML service (model training)
cd services/ml
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m pytest               # Run tests

# MLOps service (model serving)
cd services/mlops
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Simulator (data generation)
cd services/simulator
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Kubernetes Deployment

```bash
# Local development with KIND
./k8s/scripts/setup-kind.sh    # Setup KIND cluster
./k8s/scripts/deploy.sh development

# Access services
kubectl get pods -n facility-manager
kubectl logs -f deployment/backend -n facility-manager
kubectl port-forward svc/frontend 8080:80 -n facility-manager

# Monitor auto-scaling
kubectl get hpa -n facility-manager
kubectl top pods -n facility-manager
```

## Architecture Patterns

### Backend Architecture

**Service Layer Pattern**: Business logic in `services/`, routes handle HTTP only
- Routes (`src/routes/`): HTTP request/response handling, validation
- Services (`src/services/`): Business logic, database operations
- Repositories (`src/repositories/`): Data access layer (optional pattern, some services access DB directly)
- Middleware (`src/middleware/`): Auth, logging, metrics, error handling

**Background Jobs**: Scheduled jobs run at server startup
- `scheduledPredictionJob.ts`: Periodic RUL predictions (default 60min interval)
- `alertEscalationJob.ts`: Alert escalation logic (default 5min interval)
- `sensorIngestionService.ts`: Polls simulator for sensor data (default 10sec interval)

**Database**: TimescaleDB (PostgreSQL extension) for time-series sensor data
- Migrations in `migrations/` directory using Knex.js
- Hypertable: `sensor_readings` (optimized for time-series queries)
- Standard tables: `facilities`, `battery_systems`, `alerts`, `rul_predictions`, etc.

**API Endpoints**: All routes prefixed with `/api/v1/`
- `/facilities` - Facility management
- `/sensor-readings` - Real-time sensor data
- `/predictions` - RUL predictions
- `/alerts` - Alert management with escalation
- `/ml` - ML model training triggers
- `/model-performance` - Model metrics and evaluation
- `/explainability` - SHAP explanations for predictions
- `/geospatial` - Geospatial queries (facilities, weather)
- `/battery-health` - Battery health scoring
- `/weather` - Weather data integration
- `/report-analytics` - Report generation

**Observability**:
- Structured logging with Winston (JSON format)
- Prometheus metrics (accessible at `/metrics`)
- Sentry error tracking
- Custom middleware for request logging and metrics collection

### Frontend Architecture

**Component Organization**:
- `pages/`: Top-level route components (Dashboard, Login, GeospatialView, etc.)
- `components/`: Reusable UI components organized by feature
  - `Dashboard/`: Main dashboard widgets
  - `Map/`: Map-based visualizations (ThailandMap, facility markers)
  - `Chat/`: AI chat widget with Gemini integration
  - `3D/`: Three.js 3D battery and facility visualizations
  - `ui/`: Generic UI components (buttons, alerts, modals)
- `hooks/`: Custom React hooks
  - `useSensorData.ts`: Real-time sensor data with auto-polling
  - `useRealtimeFacilityMap.ts`: Real-time facility updates
- `stores/`: Zustand state management (lightweight, no Redux)
- `services/`: API clients and external service integrations
  - `geminiService.ts`: Google Gemini AI integration
  - `sensorDataService.ts`: Sensor data API calls
- `geospatial/`: Geospatial utilities and map export functionality
- `types/`: TypeScript type definitions

**Real-time Data Pattern**: Auto-polling with `useSensorData` hook
```typescript
const { data, loading, error } = useSensorData(batteryId, token);
// Auto-polls every 10 seconds, returns latest sensor reading
```

**3D Visualization**: Battery and facility 3D views using Three.js + React Three Fiber
- `Battery3DView.tsx`: 3D battery cell visualization with thermal mapping
- `Mall3DView.tsx`: 3D facility/building visualization
- Uses `@react-three/fiber` and `@react-three/drei` for declarative 3D

**Geospatial Features**:
- Mapbox GL JS for primary mapping
- Leaflet as fallback for offline/lightweight scenarios
- Satellite view, street view integration
- Real-time facility markers with status updates

**AI Integration**: Google Gemini for report generation and analysis
- `geminiService.ts`: Handles API calls to Gemini
- Generates ISO-compliant reports from alerts
- Provides AI-powered insights and recommendations

### ML Architecture

**Training Pipeline** (`services/ml/`):
- `preprocessing/`: Data cleaning and normalization
- `feature_engineering/`: Time-series feature extraction
- `models/`: LSTM-based RUL prediction model
- `training/`: Training pipeline with validation
- `explainability/`: SHAP values for model interpretability
- `anomaly_detection/`: Isolation Forest for anomaly detection

**Model Serving** (`services/mlops/`):
- FastAPI service exposing prediction endpoints
- `/predict` - Single prediction
- `/batch-predict` - Batch predictions
- `/explain` - SHAP explanation for prediction
- Model versioning and A/B testing support

**Data Flow**:
1. Simulator generates sensor data → Backend ingestion service
2. Backend stores in TimescaleDB (sensor_readings hypertable)
3. Scheduled job triggers batch predictions via MLOps API
4. Predictions stored in `rul_predictions` table
5. Frontend displays real-time predictions and explanations

## Key Database Tables

**Core Tables**:
- `facilities`: Physical locations with geospatial data (lat/lng)
- `battery_systems`: Battery units linked to facilities
- `sensor_readings`: Time-series sensor data (TimescaleDB hypertable)
- `rul_predictions`: ML model predictions with confidence scores
- `alerts`: System alerts with severity and escalation logic
- `alert_escalation_history`: Escalation audit trail

**ML Tables**:
- `model_performance`: Model accuracy metrics over time
- `shap_explanations`: Feature importance explanations
- `what_if_scenarios`: Scenario analysis results

**Analytics Tables**:
- `comparative_analysis`: Multi-facility comparisons
- `report_analytics`: Generated report metadata

## Environment Variables

### Backend (.env)
```bash
# Database (TimescaleDB)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=battery_management
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Server
PORT=3000
NODE_ENV=development

# Background Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5

# Sensor Ingestion
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000  # 10 seconds
SIMULATOR_URL=http://localhost:8001

# Monitoring
METRICS_AUTH_TOKEN=your-secret-token
SENTRY_DSN=your-sentry-dsn
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=your-mapbox-token
VITE_GEMINI_API_KEY=your-gemini-api-key
```

## Testing Strategy

**Backend Tests**:
- Unit tests with Vitest for services and utilities
- Integration tests for API endpoints using Supertest
- Migration tests to ensure schema consistency
- Factory pattern for test data generation (see `src/test/factories/`)

**Frontend Tests**:
- Unit tests with Vitest + Testing Library
- E2E tests with Playwright (see `e2e/` directory)
- Smoke tests for critical user journeys
- Accessibility tests with axe-core
- Visual regression tests with Percy (configured)

**Testing Conventions**:
- Test files: `*.test.ts` or `*.spec.ts`
- Backend tests: Co-located in `__tests__/` folders or next to source files
- Frontend E2E tests: `e2e/` directory with page object pattern
- Factories for test data: `src/test/factories/` (backend)

## Common Pitfalls & Solutions

**Database Connection Issues**:
- Always check PostgreSQL is running: `docker-compose up -d postgres`
- Verify TimescaleDB extension: `\dx` in psql
- Run migrations after schema changes: `npm run migrate`

**Real-time Data Not Updating**:
- Ensure simulator is running on port 8001
- Check backend logs for `sensor_ingestion_run_completed`
- Verify `useSensorData` hook is receiving valid token
- Check browser console for API errors

**3D Visualization Performance**:
- Three.js uses WebGL - check browser support
- Reduce polygon count in 3D models for mobile
- Use `useMemo` and `React.memo` to prevent re-renders
- Monitor frame rate with Chrome DevTools

**Background Jobs Not Running**:
- Jobs start at server startup in `src/index.ts`
- Check environment variables for intervals
- Look for startup logs: `scheduled_prediction_job_active`
- Jobs use node-cron for scheduling

**TypeScript Errors After Dependency Update**:
- Run `npm run typecheck` to see all errors
- Check `tsconfig.json` compatibility
- Ensure `@types/*` packages match runtime versions
- Clear cache: `rm -rf node_modules/.cache`

## Deployment

**Docker Development**:
```bash
docker-compose up -d  # Start all services
docker-compose logs -f backend  # View logs
docker-compose down  # Stop all services
```

**Kubernetes (Production)**:
- See `KUBERNETES_QUICKSTART.md` for detailed setup
- Horizontal Pod Autoscaling (HPA) configured for backend, frontend, mlops
- StatefulSets for PostgreSQL and Redis
- NGINX Ingress Controller for routing
- Metrics Server for resource monitoring

**Railway/Cloud Deployment**:
- Railway config in `railway.toml`
- Environment variables managed via Railway dashboard
- Automatic deployments on git push
- Health check endpoint: `/api/v1/health`

## Code Style & Conventions

**TypeScript/JavaScript**:
- ESLint with TypeScript rules
- Prettier for formatting (check: `npm run format:check`)
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- Use absolute imports where possible (configured in `tsconfig.json`)

**Python**:
- Black for formatting
- Type hints for function signatures
- Pytest for testing
- Follow PEP 8 style guide

**Git Workflow**:
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit with conventional format
3. Run quality checks: `npm run quality`
4. Push and create PR
5. Husky pre-commit hooks enforce linting

## Important Files & Directories

```
nt-poc/
├── services/backend/
│   ├── src/
│   │   ├── app.ts              # Express app setup with routes
│   │   ├── index.ts            # Server entry + background jobs
│   │   ├── routes/             # API route handlers
│   │   ├── services/           # Business logic layer
│   │   ├── middleware/         # Auth, logging, metrics
│   │   ├── config/             # DB, logger, metrics config
│   │   └── test/               # Test utilities and factories
│   ├── migrations/             # Knex database migrations
│   └── knexfile.ts             # Database configuration
├── services/frontend/
│   ├── src/
│   │   ├── App.tsx             # Main app component
│   │   ├── pages/              # Route pages
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API clients (Gemini, sensors)
│   │   ├── stores/             # Zustand state management
│   │   └── geospatial/         # Map utilities
│   └── e2e/                    # Playwright E2E tests
├── services/ml/
│   └── src/                    # ML model training pipeline
├── services/mlops/
│   └── src/                    # FastAPI model serving
├── services/simulator/
│   └── app/                    # Battery data simulator
├── k8s/                        # Kubernetes manifests
│   ├── base/                   # Base configs (deployments, services)
│   ├── overlays/               # Environment-specific (dev, staging, prod)
│   └── scripts/                # Setup and deployment scripts
├── infrastructure/             # Docker configs, nginx
├── REAL_DATA_QUICK_START.md   # Real sensor data integration guide
├── KUBERNETES_QUICKSTART.md   # K8s deployment guide
└── docker-compose.yml          # Local development services
```

## Additional Resources

- **Backend API Docs**: See route files in `services/backend/src/routes/`
- **Frontend Components**: Check Storybook (if configured) or component source
- **ML Model Details**: `services/ml/README.md` (if exists)
- **Database Schema**: Check migration files in `services/backend/migrations/`
- **Deployment Runbook**: `DEPLOYMENT_RUNBOOK.md`
- **Production Guide**: `PRODUCTION_ENV_GUIDE.md`
