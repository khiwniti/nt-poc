# Production Deployment Guide - Complete System

**Fleet Scale**: 1,944 batteries across 9 data centers  
**Last Updated**: 2026-01-17  
**Status**: ✅ All services optimized and ready for deployment  

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Service-by-Service Deployment](#service-by-service-deployment)
3. [Integration Testing](#integration-testing)
4. [Performance Validation](#performance-validation)
5. [Monitoring Setup](#monitoring-setup)
6. [Rollback Procedures](#rollback-procedures)
7. [Production Validation](#production-validation)

---

## 🎯 Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] **PostgreSQL/TimescaleDB**: Version 15+ with TimescaleDB 2.10+
- [ ] **Redis** (optional): For caching predictions and sensor data
- [ ] **Python**: Version 3.10+ for ML services
- [ ] **Node.js**: Version 18+ for backend and frontend
- [ ] **Bun**: Latest version for faster dependency installation (optional)

### Resource Requirements

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Backend | 2-4 cores | 2-4 GB | 10 GB |
| Frontend | 1-2 cores | 1-2 GB | 5 GB |
| MLOps | 2-4 cores | 2-4 GB | 10 GB (model files) |
| Simulator | 1-2 cores | 1-2 GB | 5 GB |
| PostgreSQL | 4-8 cores | 8-16 GB | 100+ GB (time-series data) |
| Redis | 1-2 cores | 2-4 GB | 10 GB |

**Total Recommended**: 12-24 cores, 20-36 GB RAM, 150+ GB storage

### Network Requirements

- [ ] **Internal Network**: All services can communicate on internal network
- [ ] **Load Balancer**: For frontend and backend (HTTPS termination)
- [ ] **Firewall Rules**: 
  - Frontend: Port 80/443 (public)
  - Backend: Port 3000 (internal only)
  - MLOps: Port 8001 (internal only)
  - Simulator: Port 8001 (internal only)
  - PostgreSQL: Port 5432 (internal only)
  - Redis: Port 6379 (internal only)

### Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] Database credentials rotated and secured
- [ ] API authentication tokens generated
- [ ] CORS origins configured for production domains
- [ ] Environment variables secured (no secrets in code)
- [ ] Sentry/error tracking configured
- [ ] Rate limiting configured on public endpoints

---

## 🚀 Service-by-Service Deployment

### 1. PostgreSQL/TimescaleDB Deployment

**Priority**: Deploy FIRST (all services depend on this)

```bash
# Option A: Docker (development/staging)
docker run -d \
  --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=battery_management \
  -v pgdata:/var/lib/postgresql/data \
  timescale/timescaledb:latest-pg15

# Option B: Managed Database (production)
# Use Railway, AWS RDS, Azure Database, or DigitalOcean Managed PostgreSQL
# Ensure TimescaleDB extension is available
```

**Post-deployment**:
```bash
# Verify TimescaleDB extension
psql -h localhost -U postgres -d battery_management \
  -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"

# Check version
psql -h localhost -U postgres -d battery_management \
  -c "SELECT extversion FROM pg_extension WHERE extname='timescaledb';"
```

**Expected**: TimescaleDB version 2.10+ installed

---

### 2. Backend Service Deployment

**Priority**: Deploy SECOND (depends on database)

```bash
cd services/backend

# 1. Install dependencies
npm install

# 2. Configure environment
cat > .env << EOF
# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=battery_management
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_SSL=true

# Server
PORT=3000
NODE_ENV=production

# Background Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5

# Sensor Ingestion
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000
SIMULATOR_URL=http://simulator:8001

# Monitoring
METRICS_AUTH_TOKEN=your-metrics-token
SENTRY_DSN=your-sentry-dsn
EOF

# 3. Run database migrations
npm run migrate

# 4. Seed production data (1,944 batteries)
npm run seed:production

# 5. Build for production
npm run build

# 6. Start service
NODE_ENV=production node dist/index.js

# OR with PM2 for process management
pm2 start dist/index.js --name backend --instances 2
```

**Verification**:
```bash
# Health check
curl http://localhost:3000/api/v1/health
# Expected: {"status": "healthy", "database": "connected"}

# Check background jobs started
curl http://localhost:3000/metrics | grep job_active
# Expected: scheduled_prediction_job_active 1
```

**Database Verification**:
```sql
-- Check facilities
SELECT COUNT(*) FROM facilities;  -- Expected: 9

-- Check battery systems
SELECT COUNT(*) FROM battery_systems;  -- Expected: 1,944

-- Check strings
SELECT COUNT(DISTINCT string_id) FROM battery_systems;  -- Expected: 81

-- Verify hypertable
SELECT * FROM timescaledb_information.hypertables 
WHERE hypertable_name = 'sensor_readings';
```

---

### 3. Simulator Service Deployment

**Priority**: Deploy THIRD (backend depends on this for sensor data)

```bash
cd services/simulator

# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cat > .env << EOF
# Server
PORT=8001
ENVIRONMENT=production

# Production Optimization
SIMULATOR_CACHE_SIZE=500
BATCH_MAX_SIZE=200
BATCH_PARALLEL_WORKERS=10

# Logging
LOG_LEVEL=INFO
EOF

# 4. Start service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2

# OR with systemd
sudo systemctl start simulator
```

**Verification**:
```bash
# Health check
curl http://localhost:8001/health
# Expected: {"status": "healthy", "batteries_tracked": 0, "cache_size": 500}

# Test single reading
curl http://localhost:8001/sensors/readings/BAT-CM-R1-001
# Expected: {"battery_system_id": "BAT-CM-R1-001", "voltage": ..., ...}

# Test batch endpoint
curl -X POST http://localhost:8001/sensors/readings/batch \
  -H "Content-Type: application/json" \
  -d '{"battery_system_ids": ["BAT-CM-R1-001", "BAT-CM-R1-002"]}'
# Expected: {"data": [...], "metadata": {"successful": 2}}
```

---

### 4. MLOps Service Deployment

**Priority**: Deploy FOURTH (backend calls this for predictions)

```bash
cd services/mlops

# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Place trained model
mkdir -p models
# Copy your trained model file to models/rul_lstm_model.h5
ls -lh models/rul_lstm_model.h5  # Should be 50-200 MB

# 4. Configure environment
cat > .env << EOF
# Application
APP_NAME=MLOps Service
ENVIRONMENT=production
PORT=8001

# CORS - Add your production domains
CORS_ORIGINS=["http://localhost:3000","https://your-production-domain.com"]

# Model Configuration
MODELS_DIR=models
RUL_MODEL_PATH=models/rul_lstm_model.h5

# Production Batch Processing
BATCH_MAX_SIZE=500
BATCH_PARALLEL_WORKERS=10
MODEL_CACHE_SIZE=4
PREDICTION_BATCH_SIZE=50
FEATURE_WINDOW_SIZE=10

# Logging
LOG_LEVEL=INFO
EOF

# 5. Start service
uvicorn src.main:app --host 0.0.0.0 --port 8001 --workers 2

# OR with systemd
sudo systemctl start mlops
```

**Verification**:
```bash
# Health check
curl http://localhost:8001/health
# Expected: {"status": "healthy", "model_status": {"loaded": true}}

# Model info
curl http://localhost:8001/ml/model-info
# Expected: {"model_version": "v1.0.0", "loaded": true}

# Test single prediction
curl -X POST http://localhost:8001/ml/predict-rul \
  -H "Content-Type: application/json" \
  -d '{
    "battery_system_id": "BAT-001",
    "sequence": [[95,98,25,13.2,150],[94,97,26,13.1,151]]
  }'
# Expected: {"predicted_rul": 285.3, "confidence": 0.90}
```

---

### 5. Frontend Service Deployment

**Priority**: Deploy LAST (depends on backend API)

```bash
cd services/frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cat > .env << EOF
VITE_API_URL=https://api.your-production-domain.com
VITE_MAPBOX_TOKEN=your-mapbox-token
VITE_GEMINI_API_KEY=your-gemini-api-key
EOF

# 3. Build for production
npm run build

# 4. Deploy static files
# Option A: Serve with nginx
sudo cp -r dist/* /var/www/html/

# Option B: Deploy to Vercel/Netlify/Railway
# Use their CLI or git integration

# Option C: Serve with Node.js
npm install -g serve
serve -s dist -l 80
```

**Nginx Configuration** (if using nginx):
```nginx
server {
    listen 80;
    server_name your-production-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-production-domain.com;
    
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    
    root /var/www/html;
    index index.html;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Verification**:
```bash
# Check build artifacts
ls -lh dist/
# Expected: index.html, assets/, vite.svg

# Test frontend (after deployment)
curl -I https://your-production-domain.com
# Expected: HTTP/2 200

# Test API proxy
curl https://your-production-domain.com/api/v1/health
# Expected: {"status": "healthy"}
```

---

## 🧪 Integration Testing

### End-to-End Test Flow

**1. Sensor Data Flow Test**
```bash
# Step 1: Verify simulator generates data
curl http://localhost:8001/sensors/readings/BAT-CM-R1-001

# Step 2: Verify backend ingests data (wait 10 seconds for ingestion cycle)
sleep 10
curl http://localhost:3000/api/v1/sensor-readings/latest/BAT-CM-R1-001

# Step 3: Check database
psql -d battery_management -c \
  "SELECT COUNT(*) FROM sensor_readings WHERE battery_system_id='BAT-CM-R1-001';"
# Expected: >0
```

**2. Prediction Flow Test**
```bash
# Step 1: Trigger manual prediction
curl -X POST http://localhost:3000/api/v1/ml/predict/BAT-CM-R1-001

# Step 2: Verify prediction stored
curl http://localhost:3000/api/v1/predictions/latest/BAT-CM-R1-001
# Expected: {"predicted_rul": ..., "confidence": ...}

# Step 3: Check database
psql -d battery_management -c \
  "SELECT * FROM rul_predictions WHERE battery_system_id='BAT-CM-R1-001' LIMIT 1;"
```

**3. Batch Prediction Test (Production Scale)**
```bash
# Test batch prediction for all 1,944 batteries
time curl -X POST http://localhost:3000/api/v1/ml/predict-batch \
  -H "Content-Type: application/json" \
  -d '{"battery_ids": ["all"]}' \
  -o batch_results.json

# Expected: Completes in <60 seconds
# Check results
jq '.predictions | length' batch_results.json  # Expected: 1,944
```

**4. Frontend Integration Test**
```bash
# Visit frontend
open https://your-production-domain.com

# Test checklist:
# [ ] Dashboard loads with real battery count (1.9k)
# [ ] Facility grid shows 9 facilities
# [ ] Battery list pagination works (39 pages)
# [ ] Clicking facility filters batteries
# [ ] Real-time updates refresh every 60 seconds
# [ ] 3D battery view renders correctly
# [ ] Map view shows all 9 facilities
```

---

## 📊 Performance Validation

### Load Testing Scripts

**Backend Load Test** (simulate 100 concurrent users):
```bash
# Install hey
go install github.com/rakyll/hey@latest

# Test sensor readings endpoint
hey -n 10000 -c 100 \
  http://localhost:3000/api/v1/sensor-readings/latest/BAT-CM-R1-001

# Expected:
# - Requests/sec: >500
# - 95th percentile: <200ms
# - Error rate: <1%
```

**MLOps Load Test** (batch predictions):
```bash
# Create test payload (500 batteries)
python3 << EOF
import json
import numpy as np

sequences = np.random.rand(500, 10, 5).tolist()
battery_ids = [f"BAT-{i:04d}" for i in range(500)]

with open('batch_payload.json', 'w') as f:
    json.dump({"sequences": sequences, "battery_system_ids": battery_ids}, f)
EOF

# Run load test
hey -n 100 -c 10 \
  -m POST \
  -H "Content-Type: application/json" \
  -D batch_payload.json \
  http://localhost:8001/ml/predict-rul/batch

# Expected:
# - Requests/sec: >2
# - 95th percentile: <5 seconds
# - Error rate: 0%
```

**Database Performance Test**:
```sql
-- Test sensor readings query performance
EXPLAIN ANALYZE
SELECT * FROM sensor_readings 
WHERE battery_system_id = 'BAT-CM-R1-001' 
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC 
LIMIT 10;

-- Expected: Execution time <50ms with index scan

-- Test aggregation performance (all batteries)
EXPLAIN ANALYZE
SELECT battery_system_id, 
       AVG(voltage) as avg_voltage,
       AVG(current) as avg_current
FROM sensor_readings 
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY battery_system_id;

-- Expected: Execution time <500ms with parallel aggregation
```

### Performance Benchmarks

| Test | Target | Acceptance Criteria |
|------|--------|---------------------|
| Backend API latency (p95) | <200ms | Must meet |
| MLOps single prediction (p95) | <100ms | Must meet |
| MLOps batch 500 (p95) | <5s | Must meet |
| Full fleet prediction | <60s | Should meet |
| Database query (single battery) | <50ms | Must meet |
| Database query (all batteries) | <500ms | Should meet |
| Frontend page load | <2s | Should meet |
| Frontend time to interactive | <3s | Should meet |

---

## 📈 Monitoring Setup

### Prometheus Metrics

**Backend metrics** (`http://localhost:3000/metrics`):
```
# Request metrics
http_requests_total{method="GET",endpoint="/api/v1/battery-systems"}
http_request_duration_seconds{method="GET",endpoint="/api/v1/battery-systems",quantile="0.95"}

# Background job metrics
prediction_job_runs_total
prediction_job_duration_seconds
sensor_ingestion_runs_total
sensor_ingestion_batteries_processed_total
```

**MLOps metrics** (`http://localhost:8001/ml/latency`):
```json
{
  "overall": {
    "count": 1250,
    "p50_ms": 45.2,
    "p95_ms": 82.5,
    "p99_ms": 120.3
  },
  "by_path": {
    "/ml/predict-rul": {"p95_ms": 85.0},
    "/ml/predict-rul/batch": {"p95_ms": 4500.0}
  }
}
```

### Alert Configuration

**Critical Alerts** (page on-call):
```yaml
alerts:
  - name: DatabaseDown
    condition: up{job="postgres"} == 0
    duration: 1m
    
  - name: BackendDown
    condition: up{job="backend"} == 0
    duration: 2m
    
  - name: HighErrorRate
    condition: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    duration: 5m
    
  - name: PredictionJobFailed
    condition: prediction_job_runs_total{status="error"} > 0
    duration: 1m
```

**Warning Alerts** (notify team):
```yaml
alerts:
  - name: HighLatency
    condition: http_request_duration_seconds{quantile="0.95"} > 0.5
    duration: 10m
    
  - name: HighMemoryUsage
    condition: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
    duration: 5m
    
  - name: SlowPredictions
    condition: inference_latency_p95_ms > 150
    duration: 10m
```

### Logging

**Log aggregation setup** (Loki, Elasticsearch, or CloudWatch):
```yaml
log_sources:
  - service: backend
    path: /var/log/backend/*.log
    format: json
    retention: 30 days
    
  - service: mlops
    path: /var/log/mlops/*.log
    format: json
    retention: 30 days
    
  - service: nginx
    path: /var/log/nginx/access.log
    format: combined
    retention: 7 days
```

**Important log patterns to monitor**:
```
ERROR: Model not available
ERROR: Database connection failed
WARNING: Batch size exceeds maximum
WARNING: Sensor ingestion failed for battery
INFO: Scheduled prediction job completed successfully
```

---

## 🔄 Rollback Procedures

### Database Rollback
```bash
cd services/backend

# List applied migrations
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Rollback to specific version
npm run migrate:rollback -- --to 20260111000000
```

### Service Rollback
```bash
# Using PM2
pm2 stop backend
pm2 delete backend
# Deploy previous version
pm2 start previous-version/dist/index.js --name backend

# Using Docker
docker stop backend
docker rm backend
docker run -d --name backend previous-version-image

# Using Kubernetes
kubectl rollout undo deployment/backend -n production
kubectl rollout status deployment/backend -n production
```

### Frontend Rollback
```bash
# Nginx
sudo rm -rf /var/www/html/*
sudo cp -r /var/www/html.backup/* /var/www/html/

# Vercel/Netlify
# Use dashboard to rollback to previous deployment
```

---

## ✅ Production Validation

### Day 1 Checklist (First 24 Hours)

- [ ] All services running and healthy
- [ ] No critical errors in logs
- [ ] Background jobs executing on schedule
- [ ] Sensor data flowing to database
- [ ] Predictions generating successfully
- [ ] Frontend loading and displaying data
- [ ] Alerts configured and tested
- [ ] Metrics dashboards created
- [ ] Team has access to logs and metrics
- [ ] Rollback procedure documented and tested

### Week 1 Checklist

- [ ] Performance targets consistently met
- [ ] No memory leaks detected
- [ ] Database growth rate expected (~1GB/day)
- [ ] Backup strategy implemented and tested
- [ ] Disaster recovery plan documented
- [ ] Capacity planning reviewed
- [ ] Cost monitoring established
- [ ] Security audit completed
- [ ] User feedback collected
- [ ] Known issues documented

### Success Criteria

**System Health**:
- ✅ Uptime >99.5% over first week
- ✅ All services healthy 24/7
- ✅ No data loss incidents
- ✅ All background jobs executing successfully

**Performance**:
- ✅ API latency p95 <200ms
- ✅ Page load time <3 seconds
- ✅ Prediction latency within targets
- ✅ Database queries performant

**Data Quality**:
- ✅ Sensor data for all 1,944 batteries
- ✅ Predictions generated hourly
- ✅ No data gaps or anomalies
- ✅ Frontend displays accurate data

**Operational**:
- ✅ Team trained on system
- ✅ Monitoring and alerts working
- ✅ Documentation complete
- ✅ Rollback procedures tested

---

## 📞 Support & Escalation

### On-Call Rotation
- **Primary**: DevOps team (infrastructure issues)
- **Secondary**: Backend team (API/database issues)
- **Tertiary**: ML team (prediction/model issues)

### Escalation Matrix

| Issue Severity | Response Time | Resolution Time | Escalation Path |
|----------------|---------------|-----------------|-----------------|
| Critical (P0) | 15 minutes | 4 hours | DevOps → CTO |
| High (P1) | 1 hour | 24 hours | Team Lead → Engineering Manager |
| Medium (P2) | 4 hours | 7 days | Team Lead |
| Low (P3) | Next business day | 30 days | Team |

### Contact Information

```yaml
teams:
  devops:
    slack: #devops-alerts
    email: devops@company.com
    oncall: +66-xxx-xxx-xxxx
    
  backend:
    slack: #backend-team
    email: backend@company.com
    lead: Backend Lead Name
    
  ml:
    slack: #ml-team
    email: ml@company.com
    lead: ML Lead Name
    
  frontend:
    slack: #frontend-team
    email: frontend@company.com
    lead: Frontend Lead Name
```

---

**Status**: ✅ Deployment Guide Complete  
**Last Reviewed**: 2026-01-17  
**Next Review**: After first production deployment  
**Maintained By**: DevOps Team
