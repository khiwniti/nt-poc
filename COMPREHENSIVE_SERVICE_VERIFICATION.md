# Comprehensive Service Verification Guide

## Overview

This document provides a complete verification process for all services in the NT-POC Battery Management System, including validation of service architecture, dependency resolution, configuration completeness, endpoint availability, database connectivity, authentication mechanisms, API integration points, error handling, logging, monitoring, security, performance, documentation, testing, containerization, and deployment pipeline status.

---

## Table of Contents

1. [Service Architecture Validation](#1-service-architecture-validation)
2. [Dependency Resolution](#2-dependency-resolution)
3. [Configuration Completeness](#3-configuration-completeness)
4. [Endpoint Availability](#4-endpoint-availability)
5. [Database Connectivity](#5-database-connectivity)
6. [Authentication Mechanisms](#6-authentication-mechanisms)
7. [API Integration Points](#7-api-integration-points)
8. [Error Handling Implementation](#8-error-handling-implementation)
9. [Logging Functionality](#9-logging-functionality)
10. [Monitoring Setup](#10-monitoring-setup)
11. [Security Configurations](#11-security-configurations)
12. [Performance Optimization](#12-performance-optimization)
13. [Documentation Accuracy](#13-documentation-accuracy)
14. [Testing Coverage](#14-testing-coverage)
15. [Containerization](#15-containerization)
16. [Deployment Pipeline Status](#16-deployment-pipeline-status)
17. [Quick Verification Script](#17-quick-verification-script)

---

## 1. Service Architecture Validation

### 1.1 Service Inventory

| Service | Status | URL | Internal URL | Purpose |
|---------|--------|-----|--------------|---------|
| Backend | ✅ Active | https://backend-production-77f7.up.railway.app | backend.railway.internal:3000 | REST API, Business Logic |
| Frontend | ✅ Active | https://frontend-production-ed3d.up.railway.app | frontend.railway.internal:3000 | React UI |
| Simulator | ✅ Active | https://simulator-production-a018.up.railway.app | simulator.railway.internal:8001 | Sensor Data Simulation |
| MLOps | ❌ Down | https://mlops-production-3b39.up.railway.app | mlops.railway.internal:8000 | ML Model Serving |
| MLflow | 🔄 Deploying | TBD | mlflow-tracking.railway.internal:5000 | ML Experiment Tracking |
| TimescaleDB | ✅ Active | timescaledb.railway.internal:5432 | - | Time-series Database |
| Redis | ✅ Active | redis.railway.internal:6379 | - | Caching & Queue |
| LINE Bot | ✅ Active | https://line-bot-production-8114.up.railway.app | line-bot.railway.internal:3000 | LINE Messaging Integration |

### 1.2 Architecture Verification Commands

```bash
# Check all services status
railway status

# List all services in project
railway service list

# View service details
for service in backend frontend simulator mlops line-bot; do
  echo "=== $service ==="
  railway variables --service $service | grep RAILWAY_SERVICE_NAME
done
```

### 1.3 Service Dependencies Graph

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│   Backend   │────▶│ TimescaleDB  │
└──────┬──────┘     └──────────────┘
       │
       ├────▶ Redis
       │
       ├────▶ Simulator
       │
       ├────▶ MLOps ────▶ MLflow
       │
       └────▶ LINE Bot

```

---

## 2. Dependency Resolution

### 2.1 Backend Dependencies

```bash
cd services/backend

# Check package.json dependencies
cat package.json | jq '.dependencies'

# Verify node_modules installed
ls -la node_modules | wc -l

# Check for security vulnerabilities
npm audit

# Verify TypeScript compilation
npm run typecheck
```

**Expected Dependencies:**
- express: ^4.18.2
- pg: ^8.11.3
- redis: ^4.6.10
- winston: ^3.11.0
- jsonwebtoken: ^9.0.2
- zod: ^3.22.4

### 2.2 Frontend Dependencies

```bash
cd services/frontend

# Check dependencies
cat package.json | jq '.dependencies'

# Verify build
npm run build

# Check bundle size
ls -lh dist/assets/*.js
```

**Expected Dependencies:**
- react: ^18.2.0
- @tanstack/react-query: ^5.17.9
- zustand: ^4.4.7
- recharts: ^2.10.3
- axios: ^1.6.5

### 2.3 Python Services Dependencies

```bash
# Simulator
cd services/simulator
pip list | grep -E "fastapi|pydantic|uvicorn"

# MLOps
cd services/mlops
pip list | grep -E "fastapi|tensorflow|numpy"

# MLflow (when deployed)
cd services/mlflow-tracking
pip list | grep -E "mlflow|psycopg2"
```

---

## 3. Configuration Completeness

### 3.1 Environment Variables Checklist

#### Backend Service
```bash
railway variables --service backend --json | jq -r 'to_entries[] | "\(.key)=\(.value)"' | grep -E "^(DB_|JWT_|MLOPS_|SIMULATOR_|NODE_ENV|PORT)"
```

**Required Variables:**
- [x] DB_HOST
- [x] DB_NAME
- [x] DB_PASSWORD
- [x] DB_PORT
- [x] DB_USER
- [x] JWT_SECRET
- [x] JWT_EXPIRY
- [x] NODE_ENV
- [x] PORT
- [x] MLOPS_SERVICE_URL
- [x] SIMULATOR_URL
- [x] REDIS_URL

#### Frontend Service
```bash
railway variables --service frontend --json
```

**Required Variables:**
- [x] VITE_API_BASE_URL
- [x] VITE_SIMULATOR_URL
- [x] VITE_MLOPS_URL

#### Simulator Service
```bash
railway variables --service simulator --json
```

**Required Variables:**
- [x] PORT
- [x] ENVIRONMENT

#### MLOps Service (NEEDS FIX)
```bash
railway variables --service mlops --json
```

**Required Variables:**
- [ ] PORT (currently 8000, Dockerfile uses 8001)
- [x] ENVIRONMENT
- [x] MODELS_DIR
- [ ] MLFLOW_TRACKING_URI (to be added)

### 3.2 Configuration Validation Script

```bash
#!/bin/bash
# verify-config.sh

echo "=== Configuration Verification ==="

# Backend
echo "Backend PORT: $(railway variables --service backend | grep ^PORT= | cut -d= -f2)"
echo "Backend DB: $(railway variables --service backend | grep ^DB_NAME= | cut -d= -f2)"

# Frontend
echo "Frontend API URL: $(railway variables --service frontend | grep VITE_API_BASE_URL | cut -d= -f2)"

# Simulator
echo "Simulator PORT: $(railway variables --service simulator | grep ^PORT= | cut -d= -f2)"

# MLOps
echo "MLOps PORT: $(railway variables --service mlops | grep ^PORT= | cut -d= -f2)"
```

---

## 4. Endpoint Availability

### 4.1 Health Check Endpoints

```bash
# Backend Health
curl -s https://backend-production-77f7.up.railway.app/health | jq .
# Expected: {"status": "healthy", "timestamp": "...", "services": {...}}

# Frontend (serves HTML)
curl -s -o /dev/null -w "%{http_code}" https://frontend-production-ed3d.up.railway.app/
# Expected: 200

# Simulator Health
curl -s https://simulator-production-a018.up.railway.app/api/health | jq .
# Expected: {"status": "healthy", "service": "simulator", ...}

# MLOps Health (CURRENTLY FAILING)
curl -s https://mlops-production-3b39.up.railway.app/health | jq .
# Current: 502 error
# Expected: {"status": "healthy", "model_loaded": true, ...}

# LINE Bot Health
curl -s https://line-bot-production-8114.up.railway.app/health | jq .
# Expected: {"status": "healthy", ...}
```

### 4.2 API Endpoint Validation

#### Backend Endpoints
```bash
BASE_URL="https://backend-production-77f7.up.railway.app"

# Test authentication (should require token)
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/facilities
# Expected: 401 (Unauthorized without token)

# Test public endpoint
curl -s $BASE_URL/health | jq .status
# Expected: "healthy"
```

#### Simulator Endpoints
```bash
SIM_URL="https://simulator-production-a018.up.railway.app"

# Get single reading
curl -s "$SIM_URL/api/sensors/reading/BAT-001" | jq '.success'
# Expected: true

# Get batch readings
curl -s -X POST "$SIM_URL/api/sensors/readings/batch" \
  -H "Content-Type: application/json" \
  -d '{"battery_system_ids": ["BAT-001", "BAT-002"]}' | jq '.count'
# Expected: 2

# Get metrics
curl -s "$SIM_URL/api/sensors/metrics/BAT-001" | jq '.success'
# Expected: true
```

#### MLOps Endpoints (When Fixed)
```bash
MLOPS_URL="https://mlops-production-3b39.up.railway.app"

# Model info
curl -s "$MLOPS_URL/ml/model-info" | jq .

# Predict (requires valid input)
curl -s -X POST "$MLOPS_URL/ml/predict" \
  -H "Content-Type: application/json" \
  -d '{"battery_system_id": "BAT-001", "features": [...]}' | jq .
```

### 4.3 OpenAPI Documentation

```bash
# Backend API docs
open https://backend-production-77f7.up.railway.app/api-docs

# Simulator API docs
open https://simulator-production-a018.up.railway.app/docs

# MLOps API docs (when working)
open https://mlops-production-3b39.up.railway.app/docs
```

---

## 5. Database Connectivity

### 5.1 TimescaleDB Connection Test

```bash
# From backend service
railway run --service backend -- node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Connection failed:', err);
  else console.log('Connected! Server time:', res.rows[0].now);
  process.exit(0);
});
"
```

### 5.2 Database Schema Validation

```bash
# Check migrations status
cd services/backend
npm run migrate:status

# List all tables
railway run --service backend -- npx knex migrate:currentVersion
```

**Expected Tables:**
- facilities
- battery_systems
- sensor_readings
- rul_predictions
- alerts
- users
- audit_logs

### 5.3 Database Performance Check

```bash
# Check database size
railway run --service backend -- psql $DATABASE_URL -c "
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as db_size,
  (SELECT count(*) FROM sensor_readings) as reading_count,
  (SELECT count(*) FROM battery_systems) as battery_count;
"

# Check TimescaleDB hypertables
railway run --service backend -- psql $DATABASE_URL -c "
SELECT hypertable_name, compression_enabled 
FROM timescaledb_information.hypertables;
"
```

### 5.4 Redis Connectivity

```bash
# Test Redis connection
railway run --service backend -- node -e "
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect().then(() => {
  console.log('Redis connected!');
  return client.ping();
}).then((res) => {
  console.log('PING response:', res);
  client.quit();
});
"
```

---

## 6. Authentication Mechanisms

### 6.1 JWT Token Validation

```bash
# Test JWT generation (from backend)
railway run --service backend -- node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 1, email: 'test@example.com' },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRY }
);
console.log('Generated token:', token);
"
```

### 6.2 Authentication Flow Test

```bash
# 1. Login (would need real credentials)
curl -s -X POST https://backend-production-77f7.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}' | jq .

# 2. Use token for authenticated request
TOKEN="<token-from-login>"
curl -s https://backend-production-77f7.up.railway.app/api/facilities \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 6.3 LINE Bot Authentication

```bash
# Check LINE Bot webhook signature validation
railway logs --service line-bot --lines 20 | grep -i "signature"
```

---

## 7. API Integration Points

### 7.1 Inter-Service Communication

```bash
# Backend -> Simulator
railway run --service backend -- curl -s http://simulator.railway.internal:8001/api/health | jq .

# Backend -> MLOps (when working)
railway run --service backend -- curl -s http://mlops.railway.internal:8000/health | jq .

# Backend -> Redis
railway run --service backend -- curl -s http://redis.railway.internal:6379
```

### 7.2 Frontend -> Backend Integration

```bash
# Check CORS configuration
curl -s -H "Origin: https://frontend-production-ed3d.up.railway.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://backend-production-77f7.up.railway.app/health \
  -I | grep -i "access-control"
```

### 7.3 External API Integrations

```bash
# LINE Messaging API
curl -s https://api.line.me/v2/bot/info \
  -H "Authorization: Bearer <LINE_CHANNEL_ACCESS_TOKEN>"
```

---

## 8. Error Handling Implementation

### 8.1 Backend Error Handling

```bash
# Test 404 handling
curl -s https://backend-production-77f7.up.railway.app/nonexistent | jq .
# Expected: {"error": "Not Found", "statusCode": 404}

# Test validation errors
curl -s -X POST https://backend-production-77f7.up.railway.app/api/battery-systems \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' | jq .
# Expected: validation error with details
```

### 8.2 Error Logging Verification

```bash
# Check for error logs in backend
railway logs --service backend --lines 50 | grep -i error

# Check for error logs in simulator
railway logs --service simulator --lines 50 | grep -i error

# Check for error logs in mlops
railway logs --service mlops --lines 50 | grep -i error
```

### 8.3 Error Response Format Validation

All services should return consistent error formats:

```json
{
  "success": false,
  "error": "Error message",
  "details": {},
  "statusCode": 400
}
```

---

## 9. Logging Functionality

### 9.1 Log Level Configuration

```bash
# Check backend log level
railway variables --service backend | grep LOG_LEVEL
# Should be: info

# Check logs are being produced
railway logs --service backend --lines 10
```

### 9.2 Structured Logging Verification

```bash
# Backend Winston logs (structured JSON)
railway logs --service backend --json --lines 5 | jq .

# Check log fields
railway logs --service backend --lines 20 | grep -E "timestamp|level|message|service"
```

### 9.3 Log Aggregation

```bash
# Get logs from all services
for service in backend frontend simulator mlops line-bot; do
  echo "=== $service Logs ==="
  railway logs --service $service --lines 5
  echo ""
done
```

---

## 10. Monitoring Setup

### 10.1 Prometheus Metrics (if enabled)

```bash
# Backend metrics endpoint
curl -s https://backend-production-77f7.up.railway.app/metrics

# Check specific metrics
curl -s https://backend-production-77f7.up.railway.app/metrics | grep http_request_duration
```

### 10.2 Service Health Monitoring

```bash
#!/bin/bash
# monitor-services.sh

SERVICES=("backend" "frontend" "simulator" "mlops" "line-bot")
URLS=(
  "https://backend-production-77f7.up.railway.app/health"
  "https://frontend-production-ed3d.up.railway.app/"
  "https://simulator-production-a018.up.railway.app/api/health"
  "https://mlops-production-3b39.up.railway.app/health"
  "https://line-bot-production-8114.up.railway.app/health"
)

for i in "${!SERVICES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URLS[$i]}")
  if [ "$STATUS" = "200" ]; then
    echo "✅ ${SERVICES[$i]}: Healthy ($STATUS)"
  else
    echo "❌ ${SERVICES[$i]}: Unhealthy ($STATUS)"
  fi
done
```

### 10.3 Performance Metrics

```bash
# Response time test
for service in backend simulator; do
  echo "=== $service Response Time ==="
  time curl -s https://$service-production-*.up.railway.app/health > /dev/null
done
```

---

## 11. Security Configurations

### 11.1 HTTPS/TLS Verification

```bash
# Check SSL certificate
openssl s_client -connect backend-production-77f7.up.railway.app:443 -servername backend-production-77f7.up.railway.app < /dev/null 2>/dev/null | openssl x509 -text | grep -A2 "Validity"
```

### 11.2 Security Headers

```bash
# Check security headers
curl -s -I https://backend-production-77f7.up.railway.app/health | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"
```

### 11.3 Environment Variables Security

```bash
# Ensure no secrets in logs
railway logs --service backend --lines 100 | grep -iE "(password|secret|key|token)" || echo "✅ No secrets exposed in logs"
```

### 11.4 Database Connection Security

```bash
# Check SSL mode
railway variables --service backend | grep DB_SSL
# Should be: true or require
```

---

## 12. Performance Optimization

### 12.1 Response Time Benchmarks

```bash
# Benchmark backend
ab -n 100 -c 10 https://backend-production-77f7.up.railway.app/health

# Benchmark simulator
ab -n 100 -c 10 https://simulator-production-a018.up.railway.app/api/health
```

### 12.2 Database Query Performance

```bash
# Check slow queries
railway run --service backend -- psql $DATABASE_URL -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"
```

### 12.3 Cache Hit Rate

```bash
# Redis cache stats
railway run --service backend -- redis-cli -u $REDIS_URL INFO stats | grep keyspace_hits
```

### 12.4 Resource Usage

```bash
# Check Railway resource metrics in dashboard
open https://railway.app/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
```

---

## 13. Documentation Accuracy

### 13.1 API Documentation

- [ ] Backend API docs match implementation: `/api-docs`
- [ ] Simulator API docs match implementation: `/docs`
- [ ] MLOps API docs match implementation: `/docs`

### 13.2 README Files

```bash
# Check README files exist
find services -name "README.md" -type f

# Verify README content matches service
for dir in services/*/; do
  echo "=== $(basename $dir) ==="
  head -5 "$dir/README.md" 2>/dev/null || echo "No README"
done
```

### 13.3 Environment Variable Documentation

```bash
# Compare documented vs actual env vars
diff <(grep "^- " PRODUCTION_ENV_GUIDE.md | cut -d'`' -f2 | sort) \
     <(railway variables --service backend | cut -d= -f1 | sort)
```

---

## 14. Testing Coverage

### 14.1 Backend Tests

```bash
cd services/backend

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Expected: >80% coverage
```

### 14.2 Frontend Tests

```bash
cd services/frontend

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run accessibility tests
npm run test:a11y
```

### 14.3 Integration Tests

```bash
# Run contract tests
npm run test:pact

# Run integration tests
cd services/backend
npm run test -- --grep "integration"
```

### 14.4 Test Results Summary

```bash
# Generate test report
cd services/backend && npm test -- --reporter=json > test-results.json
cd services/frontend && npm test -- --reporter=json > test-results.json

# Check test counts
echo "Backend tests:" $(jq '.numTotalTests' services/backend/test-results.json)
echo "Frontend tests:" $(jq '.numTotalTests' services/frontend/test-results.json)
```

---

## 15. Containerization

### 15.1 Dockerfile Validation

```bash
# Lint Dockerfiles
for dockerfile in services/*/Dockerfile; do
  echo "=== Checking $dockerfile ==="
  docker run --rm -i hadolint/hadolint < "$dockerfile"
done
```

### 15.2 Image Build Test

```bash
# Build backend image
docker build -f services/backend/Dockerfile -t backend-test .

# Build simulator image
docker build -f services/simulator/Dockerfile -t simulator-test .

# Build mlops image
docker build -f services/mlops/Dockerfile -t mlops-test .
```

### 15.3 Container Security Scan

```bash
# Scan images for vulnerabilities
docker scout cves backend-test
docker scout cves simulator-test
docker scout cves mlops-test
```

### 15.4 Multi-stage Build Optimization

```bash
# Check image sizes
docker images | grep -E "(backend|simulator|mlops)-test"

# Verify no development dependencies in production
docker run --rm backend-test npm list --prod
```

---

## 16. Deployment Pipeline Status

### 16.1 Railway Deployment Status

```bash
# Check all deployments
railway list-deployments --json | jq -r '.[] | "\(.service): \(.status) - \(.createdAt)"'

# Check latest deployment per service
for service in backend frontend simulator mlops line-bot; do
  echo "=== $service ==="
  railway list-deployments --service $service --limit 1
done
```

### 16.2 Build Logs Review

```bash
# Get build logs for each service
for service in backend frontend simulator mlops; do
  echo "=== $service Build Logs ==="
  railway logs --service $service --deployment <deployment-id> --log-type build
done
```

### 16.3 Deployment Health Check

```bash
# Automated deployment verification
#!/bin/bash

check_deployment() {
  SERVICE=$1
  URL=$2
  
  echo "Checking $SERVICE..."
  
  # Check if deployed
  STATUS=$(railway status --service $SERVICE 2>&1)
  echo "$STATUS"
  
  # Check if reachable
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $URL)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ $SERVICE is healthy"
  else
    echo "❌ $SERVICE returned $HTTP_CODE"
  fi
}

check_deployment backend https://backend-production-77f7.up.railway.app/health
check_deployment simulator https://simulator-production-a018.up.railway.app/api/health
check_deployment mlops https://mlops-production-3b39.up.railway.app/health
```

### 16.4 Rollback Capability

```bash
# List previous deployments
railway list-deployments --service backend --limit 5

# Rollback if needed (manual via dashboard)
echo "To rollback, visit: https://railway.app/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
```

---

## 17. Quick Verification Script

### 17.1 Complete Health Check Script

```bash
#!/bin/bash
# complete-health-check.sh

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        NT-POC Battery Management System Health Check          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Service URLs
declare -A SERVICES=(
  [backend]="https://backend-production-77f7.up.railway.app/health"
  [frontend]="https://frontend-production-ed3d.up.railway.app/"
  [simulator]="https://simulator-production-a018.up.railway.app/api/health"
  [mlops]="https://mlops-production-3b39.up.railway.app/health"
  [line-bot]="https://line-bot-production-8114.up.railway.app/health"
)

echo "1. Service Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for service in "${!SERVICES[@]}"; do
  url="${SERVICES[$service]}"
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  
  if [ "$http_code" -eq 200 ]; then
    echo "✅ $service: Healthy (HTTP $http_code)"
  else
    echo "❌ $service: Unhealthy (HTTP $http_code)"
  fi
done

echo ""
echo "2. Database Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check database via backend
DB_CHECK=$(curl -s https://backend-production-77f7.up.railway.app/health | jq -r '.services.database.status' 2>/dev/null || echo "unknown")
if [ "$DB_CHECK" = "connected" ] || [ "$DB_CHECK" = "healthy" ]; then
  echo "✅ TimescaleDB: Connected"
else
  echo "❌ TimescaleDB: $DB_CHECK"
fi

# Check Redis via backend
REDIS_CHECK=$(curl -s https://backend-production-77f7.up.railway.app/health | jq -r '.services.redis.status' 2>/dev/null || echo "unknown")
if [ "$REDIS_CHECK" = "connected" ] || [ "$REDIS_CHECK" = "healthy" ]; then
  echo "✅ Redis: Connected"
else
  echo "❌ Redis: $REDIS_CHECK"
fi

echo ""
echo "3. API Endpoint Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test simulator reading
SIM_READING=$(curl -s https://simulator-production-a018.up.railway.app/api/sensors/reading/BAT-001 | jq -r '.success' 2>/dev/null)
if [ "$SIM_READING" = "true" ]; then
  echo "✅ Simulator: Data generation working"
else
  echo "❌ Simulator: Data generation failed"
fi

# Test backend API
BACKEND_API=$(curl -s -o /dev/null -w "%{http_code}" https://backend-production-77f7.up.railway.app/api/facilities)
if [ "$BACKEND_API" -eq 401 ]; then
  echo "✅ Backend API: Protected endpoints working (401 expected)"
else
  echo "⚠️  Backend API: Unexpected response ($BACKEND_API)"
fi

echo ""
echo "4. Inter-Service Communication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if backend can reach simulator
BACKEND_VARS=$(railway variables --service backend 2>/dev/null | grep SIMULATOR_URL || echo "not set")
if [ "$BACKEND_VARS" != "not set" ]; then
  echo "✅ Backend->Simulator: URL configured"
else
  echo "❌ Backend->Simulator: URL not configured"
fi

# Check if backend can reach MLOps
MLOPS_VARS=$(railway variables --service backend 2>/dev/null | grep MLOPS_SERVICE_URL || echo "not set")
if [ "$MLOPS_VARS" != "not set" ]; then
  echo "✅ Backend->MLOps: URL configured"
else
  echo "❌ Backend->MLOps: URL not configured"
fi

echo ""
echo "5. Security Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check HTTPS
if curl -s -I https://backend-production-77f7.up.railway.app | grep -q "HTTP/2 200"; then
  echo "✅ HTTPS: Enabled (HTTP/2)"
else
  echo "⚠️  HTTPS: Check required"
fi

# Check for security headers
SECURITY_HEADERS=$(curl -s -I https://backend-production-77f7.up.railway.app | grep -c -E "(X-Frame-Options|X-Content-Type-Options)" || echo "0")
if [ "$SECURITY_HEADERS" -gt 0 ]; then
  echo "✅ Security Headers: Present"
else
  echo "⚠️  Security Headers: Missing"
fi

echo ""
echo "6. Performance Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Measure response times
BACKEND_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' https://backend-production-77f7.up.railway.app/health)
echo "Backend response time: ${BACKEND_TIME}s"

SIM_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' https://simulator-production-a018.up.railway.app/api/health)
echo "Simulator response time: ${SIM_TIME}s"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "                    Health Check Complete                          "
echo "═══════════════════════════════════════════════════════════════════"
```

### 17.2 Save and Run Script

```bash
# Save script
cat > complete-health-check.sh << 'EOF'
[paste script from above]
EOF

# Make executable
chmod +x complete-health-check.sh

# Run
./complete-health-check.sh
```

---

## Current Issues and Fixes Needed

### Priority 1: MLOps Service Down (502 Error)

**Issue**: MLOps service returning 502 errors

**Diagnosis Steps**:
```bash
# Check logs
railway logs --service mlops --lines 100

# Check environment variables
railway variables --service mlops

# Check port configuration
railway variables --service mlops | grep PORT
```

**Likely Causes**:
1. Port mismatch (Dockerfile uses 8001, env has 8000)
2. Missing model files
3. Import errors
4. Database connection issues

**Fix**:
```bash
# Option 1: Update environment to match Dockerfile
railway variables --service mlops --set "PORT=8001"

# Option 2: Update Dockerfile to use env PORT
# Edit services/mlops/Dockerfile
# Change: CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
# To: CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "$PORT"]

# Redeploy
railway up --service mlops
```

### Priority 2: Deploy MLflow Tracking Server

**Status**: Infrastructure created, needs deployment

**Steps**:
```bash
# 1. Create service on Railway
railway service create mlflow-tracking

# 2. Link to service
railway link --service mlflow-tracking

# 3. Set environment variables
railway variables --service mlflow-tracking --set \
  "PORT=5000" \
  "POSTGRES_HOST=timescaledb.railway.internal" \
  "POSTGRES_PORT=5432" \
  "POSTGRES_USER=postgres" \
  "POSTGRES_PASSWORD=cQGmOZHklTOlcLfSrhACSyaRECIjCOqb" \
  "POSTGRES_DB=mlflow"

# 4. Deploy
railway up --service mlflow-tracking

# 5. Generate domain
railway domain --service mlflow-tracking

# 6. Verify
curl https://mlflow-tracking-production-xxxx.up.railway.app/
```

### Priority 3: Update MLOps to Use MLflow

Once MLflow is deployed:

```bash
# Add MLflow tracking URI to MLOps
railway variables --service mlops --set \
  "MLFLOW_TRACKING_URI=http://mlflow-tracking.railway.internal:5000"

# Redeploy MLOps
railway up --service mlops
```

---

## Verification Checklist

Use this checklist to track verification progress:

### Architecture & Dependencies
- [x] All services listed and documented
- [x] Service dependencies mapped
- [x] Node.js dependencies installed (backend/frontend)
- [x] Python dependencies installed (simulator/mlops)
- [ ] Dependency vulnerabilities checked

### Configuration
- [x] Backend environment variables complete
- [x] Frontend environment variables complete
- [x] Simulator environment variables complete
- [ ] MLOps environment variables complete (needs MLflow URI)
- [x] Database credentials configured
- [x] Redis URL configured

### Endpoints & APIs
- [x] Backend health endpoint working
- [x] Frontend accessible
- [x] Simulator health endpoint working
- [x] Simulator data endpoints working
- [ ] MLOps health endpoint working (DOWN)
- [ ] MLOps prediction endpoint working
- [x] LINE Bot health endpoint working

### Database & Storage
- [x] TimescaleDB connectivity verified
- [x] Redis connectivity verified
- [x] Database migrations applied
- [x] Hypertables created
- [ ] MLflow database created

### Security
- [x] HTTPS enabled on all services
- [x] JWT authentication configured
- [x] Environment variables secured
- [x] No secrets in logs
- [ ] Security headers validated

### Testing
- [x] Backend unit tests exist
- [x] Frontend unit tests exist
- [x] Integration tests exist
- [x] E2E tests exist
- [ ] Contract tests validated

### Deployment
- [x] Backend deployed successfully
- [x] Frontend deployed successfully
- [x] Simulator deployed successfully
- [ ] MLOps deployed successfully (NEEDS FIX)
- [ ] MLflow deployed successfully (IN PROGRESS)
- [x] LINE Bot deployed successfully

### Monitoring & Logging
- [x] Structured logging implemented
- [x] Log aggregation working
- [x] Health checks implemented
- [ ] Metrics endpoint exposed
- [ ] Alerting configured

---

## Continuous Verification

Set up automated checks:

```bash
# Add to cron or CI/CD
0 */6 * * * /path/to/complete-health-check.sh | tee -a health-check.log
```

---

## Support & Troubleshooting

### Getting Help

1. Check service logs: `railway logs --service <service-name> --lines 100`
2. Review environment variables: `railway variables --service <service-name>`
3. Check deployment status: `railway list-deployments --service <service-name>`
4. View Railway dashboard: https://railway.app/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4

### Common Issues

**Issue**: Service returns 502
**Solution**: Check logs for startup errors, verify PORT configuration matches Dockerfile

**Issue**: Database connection fails
**Solution**: Verify DB credentials, check if TimescaleDB service is running

**Issue**: Inter-service communication fails
**Solution**: Use internal Railway URLs (*.railway.internal), not external HTTPS URLs

---

## Document Version

- **Version**: 1.0.0
- **Last Updated**: 2026-01-18
- **Author**: NT-POC Team
- **Status**: MLOps needs fix, MLflow deployment in progress