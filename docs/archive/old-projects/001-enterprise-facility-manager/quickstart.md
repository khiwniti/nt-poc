# Enterprise Facility Manager - Quick Start Guide

**Last Updated**: 2026-01-08
**Architecture**: Microservices (5 services)
**Target Environment**: Railway Deployment
**Prerequisites**: Node.js 20+, Python 3.11+, Docker, Railway CLI

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Service Configuration](#service-configuration)
5. [Railway Deployment](#railway-deployment)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The Enterprise Facility Manager consists of 5 independent microservices:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Service                         │
│  React 18 + TypeScript + Three.js + Vite                   │
│  Port: 5173 (dev) / 3000 (prod)                            │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│                    Backend Service                          │
│  Node.js 20 + Express + TypeScript                         │
│  Port: 3000                                                 │
└─────────────────────────────────────────────────────────────┘
         ↓                ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   MLOps      │  │   Database   │  │  Simulator   │
│  Service     │  │   Service    │  │  Service     │
│              │  │              │  │              │
│ Python 3.11  │  │ PostgreSQL   │  │ Python 3.11  │
│ + FastAPI    │  │ + TimescaleDB│  │ + FastAPI    │
│ + MLflow     │  │              │  │              │
│ Port: 8000   │  │ Port: 5432   │  │ Port: 8001   │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Service Communication**:
- Frontend → Backend: HTTP + SSE (Server-Sent Events)
- Backend → MLOps: HTTP (internal API)
- Backend → Simulator: HTTP + SSE (replaceable with real sensors)
- Backend → Database: PostgreSQL connection
- All services: Railway internal networking (`.railway.internal` domains)

---

## Prerequisites

### Required Software

- **Node.js**: 20.x or higher
- **Python**: 3.11 or higher
- **Docker**: Latest version (for local development)
- **Docker Compose**: Latest version
- **Git**: Latest version
- **Railway CLI**: `npm install -g @railway/cli` (for deployment)

### Accounts & API Keys

1. **Railway Account**: [https://railway.app](https://railway.app)
2. **MLflow Tracking Server**: Railway managed or self-hosted
3. **LINE Developers**: [https://developers.line.biz](https://developers.line.biz) (for LINE OA integration)
4. **Google AI Studio**: [https://ai.google.dev](https://ai.google.dev) (for Gemini API)
5. **Sentry**: [https://sentry.io](https://sentry.io) (for monitoring)

### Verify Installation

```bash
# Check versions
node --version    # Should be 20.x+
python --version  # Should be 3.11+
docker --version
docker-compose --version
railway --version
```

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd Facility\ 3D\ Manager\ New\ UI
```

### 2. Environment Variables Setup

Create `.env` files for each service:

#### Frontend Service (`.env`)

```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000

# Monitoring
VITE_SENTRY_DSN=<your-sentry-dsn>
VITE_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_3D_PERFORMANCE_MONITOR=true
```

#### Backend Service (`services/backend/.env`)

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/facility_manager
TIMESCALE_ENABLED=true

# External Services
SENSOR_API_URL=http://localhost:8001
MLOPS_API_URL=http://localhost:8000

# Authentication
JWT_SECRET=your-jwt-secret-change-in-production
JWT_EXPIRATION=24h

# LINE OA Integration
LINE_CHANNEL_ACCESS_TOKEN=<your-line-token>
LINE_CHANNEL_SECRET=<your-line-secret>
LINE_WEBHOOK_URL=https://<your-domain>/api/v1/line/webhook

# AI Integration
GEMINI_API_KEY=<your-gemini-api-key>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
SENTRY_ENVIRONMENT=development

# Redis (for SSE pub/sub in production)
REDIS_URL=redis://localhost:6379
```

#### MLOps Service (`services/mlops/.env`)

```env
# Service Configuration
PORT=8000
ENVIRONMENT=development

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_EXPERIMENT_NAME=battery_rul_prediction

# Database (for predictions storage)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/facility_manager

# Model Configuration
MODEL_REGISTRY_PATH=/app/models
PRODUCTION_MODEL_VERSION=latest

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
```

#### Sensor Simulator (`services/simulator/.env`)

```env
# Service Configuration
PORT=8001
ENVIRONMENT=development

# Simulation Configuration
UPDATE_INTERVAL_MS=5000
NOISE_FACTOR=0.1
DRIFT_ENABLED=true
SCENARIO_MODE=normal

# Facilities to Simulate
FACILITY_IDS=7c9e6679-7425-40de-944b-e07fc1f90ae7

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
```

### 3. Install Dependencies

```bash
# Frontend Service
npm install

# Backend Service
cd services/backend
npm install
cd ../..

# MLOps Service
cd services/mlops
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..

# Sensor Simulator
cd services/simulator
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### 4. Database Setup

#### Option A: Docker Compose (Recommended)

```bash
# Start PostgreSQL + TimescaleDB
docker-compose up -d database

# Wait for database to be ready
sleep 10

# Run migrations
cd services/backend
npm run migrate
cd ../..
```

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL 15+ and TimescaleDB extension
# macOS: brew install postgresql timescaledb
# Ubuntu: apt-get install postgresql-15 timescaledb-2-postgresql-15

# Create database
psql -U postgres -c "CREATE DATABASE facility_manager;"
psql -U postgres -d facility_manager -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Run migrations
cd services/backend
npm run migrate
cd ../..
```

### 5. MLflow Tracking Server

```bash
# Start MLflow tracking server
mlflow server \
  --backend-store-uri sqlite:///mlflow.db \
  --default-artifact-root ./mlflow-artifacts \
  --host 0.0.0.0 \
  --port 5000
```

Or use Docker:

```bash
docker run -d \
  -p 5000:5000 \
  -v $(pwd)/mlflow:/mlflow \
  --name mlflow-server \
  ghcr.io/mlflow/mlflow:latest \
  mlflow server \
    --backend-store-uri sqlite:///mlflow/mlflow.db \
    --default-artifact-root /mlflow/artifacts \
    --host 0.0.0.0
```

### 6. Start All Services

#### Option A: Docker Compose (All Services)

```bash
# Start all services
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Option B: Individual Services (Development)

```bash
# Terminal 1: Backend Service
cd services/backend
npm run dev

# Terminal 2: Frontend Service
npm run dev

# Terminal 3: MLOps Service
cd services/mlops
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 4: Sensor Simulator
cd services/simulator
source venv/bin/activate
uvicorn app.main:app --reload --port 8001

# Terminal 5: MLflow Tracking
mlflow server --port 5000
```

### 7. Verify Services

```bash
# Health checks
curl http://localhost:3000/api/health  # Backend
curl http://localhost:5173             # Frontend (opens browser)
curl http://localhost:8000/api/health  # MLOps
curl http://localhost:8001/api/health  # Simulator
curl http://localhost:5000             # MLflow (opens browser)
```

### 8. Seed Test Data

```bash
# Seed facilities, zones, sensors
cd services/backend
npm run seed

# Or manually via PostgreSQL
psql -U postgres -d facility_manager -f seeds/facilities.sql
```

---

## Service Configuration

### Frontend Service

**Location**: `/` (project root)
**Build Tool**: Vite 6.2+
**Key Files**:
- `vite.config.ts` - Vite configuration
- `src/main.tsx` - Application entry point
- `src/stores/` - Zustand state management
- `src/services/` - API clients and SSE connections

**Development Commands**:
```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run Vitest tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking
```

### Backend Service

**Location**: `services/backend/`
**Framework**: Express.js + TypeScript
**Key Files**:
- `src/server.ts` - Express server setup
- `src/routes/` - API route definitions
- `src/services/` - Business logic layer
- `src/db/` - Database models and migrations

**Development Commands**:
```bash
npm run dev          # Start with hot reload (tsx watch)
npm run build        # TypeScript compilation
npm run start        # Production start
npm run migrate      # Run database migrations
npm run seed         # Seed test data
npm run test         # Run Vitest tests
```

### MLOps Service

**Location**: `services/mlops/`
**Framework**: FastAPI + MLflow
**Key Files**:
- `app/main.py` - FastAPI application
- `app/models/` - ML model wrappers
- `app/training/` - Model training pipeline
- `app/monitoring/` - Drift detection

**Development Commands**:
```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8000  # Dev server
python -m app.training.train_xgboost      # Train XGBoost model
python -m app.training.train_lstm         # Train LSTM model
pytest                                     # Run tests
```

**Train Initial Model**:
```bash
cd services/mlops
source venv/bin/activate

# Train XGBoost model (Phase 1 MVP)
python -m app.training.train_xgboost \
  --data-start 2025-01-01 \
  --data-end 2026-01-08 \
  --experiment battery_rul_prediction

# Promote to production
curl -X POST http://localhost:8000/api/v1/models/v1.0.0/promote \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"stage": "production"}'
```

### Sensor Simulator

**Location**: `services/simulator/`
**Framework**: FastAPI
**Key Files**:
- `app/main.py` - FastAPI application
- `app/simulator/` - Sensor data generation logic
- `app/scenarios/` - Predefined simulation scenarios

**Development Commands**:
```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8001  # Dev server
python -m app.scenarios.battery_failure    # Test scenario
pytest                                      # Run tests
```

**Trigger Test Scenario**:
```bash
# Trigger battery degradation scenario
curl -X POST http://localhost:8001/api/v1/simulator/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioId": "battery_degradation",
    "facilityId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "duration": 300
  }'
```

---

## Railway Deployment

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 2. Create Railway Project

```bash
# Initialize Railway project
railway init

# Link to existing project (if already created)
railway link <project-id>
```

### 3. Configure Services

Create `railway.toml` in project root:

```toml
[build]
builder = "NIXPACKS"

[[services]]
name = "frontend"
source = "."
[services.build]
  buildCommand = "npm install && npm run build"
  startCommand = "npm run preview -- --port $PORT --host 0.0.0.0"
[services.deploy]
  numReplicas = 2
  restartPolicyType = "ON_FAILURE"

[[services]]
name = "backend"
source = "./services/backend"
[services.build]
  buildCommand = "npm install && npm run build"
  startCommand = "node dist/server.js"
[services.deploy]
  healthcheckPath = "/api/health"
  healthcheckTimeout = 100
  numReplicas = 2

[[services]]
name = "mlops"
source = "./services/mlops"
[services.build]
  buildCommand = "pip install -r requirements.txt"
  startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
[services.deploy]
  healthcheckPath = "/api/health"
  numReplicas = 1

[[services]]
name = "simulator"
source = "./services/simulator"
[services.build]
  buildCommand = "pip install -r requirements.txt"
  startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
[services.deploy]
  healthcheckPath = "/api/health"
  numReplicas = 1

[[services]]
name = "database"
image = "timescale/timescaledb:latest-pg16"
[services.deploy]
  numReplicas = 1
  restartPolicyType = "ON_FAILURE"
```

### 4. Set Environment Variables

```bash
# Backend Service
railway variables set DATABASE_URL=<railway-postgres-url> --service backend
railway variables set MLOPS_API_URL=https://mlops.railway.internal --service backend
railway variables set SENSOR_API_URL=https://simulator.railway.internal --service backend
railway variables set LINE_CHANNEL_ACCESS_TOKEN=<token> --service backend
railway variables set GEMINI_API_KEY=<key> --service backend
railway variables set SENTRY_DSN=<dsn> --service backend

# MLOps Service
railway variables set MLFLOW_TRACKING_URI=<mlflow-url> --service mlops
railway variables set DATABASE_URL=<railway-postgres-url> --service mlops

# Frontend Service
railway variables set VITE_API_URL=https://api.<your-domain>.com --service frontend
railway variables set VITE_SENTRY_DSN=<dsn> --service frontend
```

### 5. Deploy

```bash
# Deploy all services
railway up

# Deploy specific service
railway up --service backend

# Check deployment status
railway status

# View logs
railway logs --service backend
```

### 6. Database Migration

```bash
# Connect to Railway database
railway connect database

# Or run migrations from backend service
railway run --service backend npm run migrate
```

### 7. Custom Domain (Optional)

```bash
# Add custom domain
railway domain add api.yourdomain.com --service backend
railway domain add app.yourdomain.com --service frontend
```

---

## Testing Guide

### Frontend Tests

```bash
# Unit tests (Vitest + React Testing Library)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Coverage report
npm run test:coverage
```

### Backend Tests

```bash
cd services/backend

# Unit tests
npm run test

# Integration tests (requires database)
npm run test:integration

# Contract tests (Pact)
npm run test:contract

# Coverage
npm run test:coverage
```

### MLOps Tests

```bash
cd services/mlops
source venv/bin/activate

# Unit tests
pytest tests/unit

# Integration tests
pytest tests/integration

# Model tests
pytest tests/models

# Coverage
pytest --cov=app --cov-report=html
```

### API Contract Testing

Verify microservices follow their OpenAPI contracts:

```bash
# Install Pact CLI
npm install -g @pact-foundation/pact-cli

# Generate contract tests
cd services/backend
npm run test:contract

# Publish to Pact Broker (optional)
npm run test:contract:publish
```

---

## Troubleshooting

### Database Connection Issues

**Problem**: `ECONNREFUSED localhost:5432`

**Solution**:
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -U postgres -d facility_manager -c "SELECT 1;"

# Restart database
docker-compose restart database
```

### MLflow Connection Issues

**Problem**: `Connection refused to MLflow tracking server`

**Solution**:
```bash
# Check MLflow is running
curl http://localhost:5000/health

# Restart MLflow
docker-compose restart mlflow

# Or manually
mlflow server --port 5000 --host 0.0.0.0
```

### SSE Connection Drops

**Problem**: SSE connections close after 1-2 minutes

**Solution**:
```typescript
// Frontend: Implement reconnection logic
const eventSource = new EventSource('/api/v1/facilities/123/stream');

eventSource.onerror = () => {
  console.error('SSE error, reconnecting...');
  setTimeout(() => {
    eventSource.close();
    // Recreate connection
  }, 1000);
};
```

**Backend**: Ensure heartbeat every 30 seconds:
```typescript
setInterval(() => {
  res.write(`event: heartbeat\ndata: {"timestamp":"${new Date().toISOString()}"}\n\n`);
}, 30000);
```

### 3D Performance Issues

**Problem**: Low FPS (<30) in 3D visualization

**Solution**:
```typescript
// Enable InstancedMesh for repeated geometries
import { InstancedMesh } from 'three';

// Reduce detail level
<Canvas gl={{ antialias: false, powerPreference: "high-performance" }}>
  <Scene />
</Canvas>

// Monitor performance
import { Stats } from '@react-three/drei';
<Stats />
```

### LINE OA Webhook Not Receiving

**Problem**: LINE webhook returns 404 or timeouts

**Solution**:
1. Verify public URL is accessible: `curl https://your-domain/api/v1/line/webhook`
2. Check LINE Channel settings: Webhook URL must be HTTPS
3. Verify signature validation in backend

### Model Inference Timeout

**Problem**: MLOps service takes >5 seconds for prediction

**Solution**:
```python
# Load model once at startup, not per request
from functools import lru_cache

@lru_cache(maxsize=1)
def load_production_model():
    return mlflow.sklearn.load_model("models:/battery_rul/production")

# Reuse model
model = load_production_model()
prediction = model.predict(features)
```

### Railway Deployment Fails

**Problem**: Railway build fails with "Out of memory"

**Solution**:
```toml
# railway.toml - Increase build resources
[build]
builder = "NIXPACKS"
nixpacksVersion = "1.30.0"

[build.env]
NODE_OPTIONS = "--max-old-space-size=4096"
```

---

## Next Steps

1. **Configure LINE OA**: Set up LINE Official Account and webhook
2. **Train ML Model**: Train initial battery RUL prediction model
3. **Load Test Data**: Import real facility and sensor data
4. **Configure Monitoring**: Set up Sentry error tracking
5. **Performance Testing**: Load test with k6 or Artillery
6. **Security Audit**: Review authentication and authorization

---

## Useful Commands

```bash
# Quick start all services (Docker Compose)
docker-compose up -d && docker-compose logs -f

# Stop all services
docker-compose down

# View service status
docker-compose ps

# Database backup
pg_dump -U postgres facility_manager > backup.sql

# Database restore
psql -U postgres -d facility_manager < backup.sql

# Railway logs (live)
railway logs --service backend --tail

# Railway shell access
railway shell --service backend

# Check Railway costs
railway status --json | jq '.usage'
```

---

## Architecture Decisions

For detailed technical decisions and rationale, see:
- [`research.md`](./research.md) - All Phase 0 research findings
- [`data-model.md`](./data-model.md) - Complete entity model
- [`contracts/`](./contracts/) - API specifications
- [`plan.md`](./plan.md) - Implementation plan

---

## Support & Resources

- **Documentation**: See `docs/` directory
- **API Contracts**: See `contracts/` directory
- **Issue Tracker**: GitHub Issues
- **Railway Dashboard**: https://railway.app/dashboard
- **MLflow UI**: http://localhost:5000 (local) or Railway public URL

---

**Quick Links**:
- [Frontend README](../README.md)
- [Backend Service](./services/backend/README.md)
- [MLOps Service](./services/mlops/README.md)
- [Sensor Simulator](./services/simulator/README.md)
