# Battery Management System - Deployment Runbook

**Version:** 1.0.0  
**Last Updated:** January 9, 2026  
**System:** RUL Prediction & Predictive Maintenance Platform

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Pre-Deployment Checklist](#2-pre-deployment-checklist)
3. [Deployment Process](#3-deployment-process)
4. [Rollback Procedures](#4-rollback-procedures)
5. [Troubleshooting Guide](#5-troubleshooting-guide)
6. [Maintenance Tasks](#6-maintenance-tasks)
7. [Emergency Contacts](#7-emergency-contacts)
8. [System Architecture](#8-system-architecture)

---

## 1. System Overview

### 1.1 System Components

The Battery Management System consists of four main services:

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | React 18 + Vite | 3001 | User interface, visualization |
| **Backend** | Node.js + Express + TypeScript | 3000 | REST API, business logic |
| **ML Service** | Python 3.11 + scikit-learn | N/A | Model training pipeline |
| **MLOps Service** | Python 3.11 + FastAPI | 8001 | ML inference, health checks |

### 1.2 Key Features

- **RUL Prediction**: Remaining Useful Life prediction for battery systems
- **Predictive Maintenance**: Risk assessment (7d, 14d, 30d failure windows)
- **Anomaly Detection**: Real-time anomaly detection with 3σ thresholds
- **Interactive Dashboard**: 3D battery visualizations and trend charts
- **Automated Alerts**: Email notifications for critical events

### 1.3 Database

- **Type**: PostgreSQL 12+
- **Purpose**: Persistent storage for facilities, battery systems, sensor readings, predictions
- **Critical Tables**: `facilities`, `battery_systems`, `sensor_readings`, `anomalies`, `predictions`

---

## 2. Pre-Deployment Checklist

### 2.1 Infrastructure Requirements

#### Hardware
- [ ] **CPU**: 4+ cores recommended
- [ ] **RAM**: 8GB minimum, 16GB recommended
- [ ] **Storage**: 50GB available disk space
- [ ] **GPU**: Optional (NVIDIA CUDA-compatible for MLOps)

#### Software
- [ ] **Docker**: v20.10+ with Docker Compose v2.0+
- [ ] **PostgreSQL**: v12+ (or Docker container)
- [ ] **Node.js**: v18+ (for local development)
- [ ] **Python**: v3.11+ (for local development)
- [ ] **Git**: v2.30+

### 2.2 Environment Configuration

#### Backend Environment Variables
```bash
# Database Configuration
DB_HOST=<database-host>
DB_PORT=5432
DB_NAME=battery_management
DB_USER=<db-user>
DB_PASSWORD=<secure-password>

# Authentication
JWT_SECRET=<generate-secure-secret>

# Server Configuration
PORT=3000

# ML Prediction Schedule
PREDICTION_JOB_INTERVAL_MINUTES=60

# Email Notifications (SendGrid)
SENDGRID_API_KEY=<sendgrid-api-key>
EMAIL_FROM=alerts@battery-management.com
EMAIL_FROM_NAME=Battery Management System
DASHBOARD_BASE_URL=<production-url>
```

#### MLOps Environment Variables
```bash
# Application
APP_NAME=MLOps Service
ENVIRONMENT=production
PORT=8001

# CORS
CORS_ORIGINS=["https://yourdomain.com"]

# Model Paths
MODELS_DIR=/app/models

# Logging
LOG_LEVEL=INFO
```

### 2.3 Security Checklist

- [ ] Generate strong JWT secret (min 32 characters)
- [ ] Configure database user with minimal permissions
- [ ] Enable SSL/TLS for database connections
- [ ] Set up firewall rules (limit port access)
- [ ] Configure CORS origins (whitelist only trusted domains)
- [ ] Rotate API keys (SendGrid, etc.)
- [ ] Enable HTTPS for production frontend
- [ ] Review environment variables (no secrets in version control)

### 2.4 Database Preparation

```bash
# Create database
createdb battery_management

# Run migrations (if applicable)
psql -h <host> -U <user> -d battery_management -f schema.sql

# Verify tables exist
psql -h <host> -U <user> -d battery_management -c "\dt"

# Create database backup before deployment
pg_dump -h <host> -U <user> battery_management > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 3. Deployment Process

### 3.1 Deployment Strategy

**Recommended**: Blue-Green deployment with health checks

**Deployment Windows**:
- **Standard Release**: Tuesday/Thursday 10:00-12:00 (off-peak hours)
- **Emergency Hotfix**: Any time with stakeholder approval

### 3.2 Step-by-Step Deployment

#### Phase 1: Pre-Deployment (T-30 minutes)

```bash
# 1. Backup current database
pg_dump -h $DB_HOST -U $DB_USER battery_management > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull latest code
git fetch --all --tags
git checkout <release-tag>

# 3. Verify code integrity
git log -1 --oneline
git status

# 4. Create deployment log
echo "Deployment started: $(date)" > deployment_$(date +%Y%m%d_%H%M%S).log
```

#### Phase 2: Backend Deployment (10 minutes)

```bash
# Navigate to backend service
cd services/backend

# 1. Install dependencies
npm ci --production

# 2. Run tests (smoke tests only in production)
npm run test -- --run

# 3. Build TypeScript
npm run build

# 4. Set environment variables
cp .env.production .env
# Or use environment variable injection

# 5. Start service (with process manager)
pm2 start ecosystem.config.js --env production
# Or
npm run start

# 6. Health check
curl -f http://localhost:3000/api/v1/health || exit 1

# 7. Verify database connection
curl -f http://localhost:3000/api/v1/facilities || exit 1
```

#### Phase 3: MLOps Service Deployment (10 minutes)

```bash
# Navigate to MLOps service
cd services/mlops

# Option A: Docker Deployment (Recommended)
docker build -t mlops-service:latest .
docker stop mlops-service || true
docker rm mlops-service || true
docker run -d \
  --name mlops-service \
  -p 8001:8001 \
  -e ENVIRONMENT=production \
  -e LOG_LEVEL=INFO \
  -v $(pwd)/models:/app/models \
  --restart unless-stopped \
  mlops-service:latest

# Option B: Local Deployment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8001 &

# Health check
sleep 10
curl -f http://localhost:8001/health || exit 1
```

#### Phase 4: Frontend Deployment (15 minutes)

```bash
# Navigate to frontend service
cd services/frontend

# 1. Install dependencies
npm ci --production

# 2. Run build
npm run build

# 3. Configure API endpoints
# Update vite.config.ts or .env.production with backend URL
echo "VITE_API_BASE_URL=https://api.yourdomain.com" > .env.production

# 4. Deploy to web server
# Option A: Copy build to web server
rsync -avz --delete dist/ user@webserver:/var/www/battery-management/

# Option B: Serve with Node.js
npm run preview -- --host 0.0.0.0 --port 3001 &

# Option C: Use Docker
docker build -t frontend-service:latest .
docker run -d -p 3001:80 --name frontend-service frontend-service:latest

# 5. Health check
curl -f http://localhost:3001 || exit 1
```

#### Phase 5: Integration Testing (15 minutes)

```bash
# 1. Test frontend-backend connectivity
curl http://localhost:3001
curl http://localhost:3000/api/v1/health

# 2. Test authentication
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# 3. Test ML prediction endpoint
JWT_TOKEN="<valid-token>"
curl -X POST http://localhost:3000/api/v1/ml/predict-maintenance \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batterySystemId": "test-system-01",
    "features": {
      "sohDelta": -0.05,
      "anomalyCount": 3,
      "tempMax": 45.5,
      "voltageMin": 3.2
    }
  }'

# 4. Test RUL prediction
curl -X POST http://localhost:3000/api/v1/rul/predict \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batterySystemId": "test-system-01",
    "currentSoh": 85.0,
    "currentCycles": 1200,
    "avgTemperature": 35.0,
    "avgCRate": 0.8
  }'

# 5. Verify scheduled jobs
curl http://localhost:3000/api/v1/health/jobs

# 6. Check error logs
tail -n 50 /var/log/backend.log
```

#### Phase 6: Post-Deployment Verification (10 minutes)

- [ ] All services responding to health checks
- [ ] Frontend loads without errors (check browser console)
- [ ] User can log in successfully
- [ ] Dashboard displays battery systems
- [ ] Predictions can be generated
- [ ] Anomaly detection working
- [ ] Alerts configured and testing
- [ ] Database queries executing within SLA (<500ms)
- [ ] No critical errors in logs
- [ ] Monitoring dashboards show green status

---

## 4. Rollback Procedures

### 4.1 When to Rollback

Trigger rollback if:
- Critical functionality broken (login, predictions, dashboard)
- Data corruption detected
- Performance degradation >50%
- Security vulnerability discovered
- Database connection failures
- Service crashes repeatedly (>3 times in 10 minutes)

### 4.2 Rollback Decision Matrix

| Issue Severity | Response Time | Action |
|---------------|---------------|--------|
| **Critical** (System down) | Immediate | Full rollback |
| **High** (Major feature broken) | <15 minutes | Component rollback |
| **Medium** (Minor issues) | <1 hour | Hotfix or rollback |
| **Low** (Cosmetic) | Next release | Document as known issue |

### 4.3 Backend Rollback

```bash
# 1. Stop current service
pm2 stop backend
# Or
pkill -f "node.*backend"

# 2. Checkout previous version
git fetch --tags
git checkout <previous-release-tag>

# 3. Restore dependencies
npm ci --production

# 4. Rebuild
npm run build

# 5. Restart service
pm2 start ecosystem.config.js --env production

# 6. Verify
curl -f http://localhost:3000/api/v1/health

# 7. Check logs
pm2 logs backend --lines 50
```

### 4.4 Database Rollback

⚠️ **WARNING**: Only perform database rollback if absolutely necessary.

```bash
# 1. Stop all services accessing database
pm2 stop all

# 2. Verify backup exists
ls -lh backup_*.sql

# 3. Restore from backup
psql -h $DB_HOST -U $DB_USER -d battery_management < backup_20260109_120000.sql

# 4. Verify restoration
psql -h $DB_HOST -U $DB_USER -d battery_management -c "SELECT COUNT(*) FROM battery_systems;"

# 5. Restart services
pm2 start all
```

### 4.5 Frontend Rollback

```bash
# Option A: Rollback build artifacts
cd services/frontend
git checkout <previous-release-tag>
npm ci --production
npm run build
rsync -avz --delete dist/ user@webserver:/var/www/battery-management/

# Option B: Revert Docker container
docker stop frontend-service
docker rm frontend-service
docker run -d -p 3001:80 --name frontend-service frontend-service:<previous-tag>

# Verify
curl -f http://localhost:3001
```

### 4.6 MLOps Service Rollback

```bash
# Docker rollback
docker stop mlops-service
docker rm mlops-service
docker run -d \
  --name mlops-service \
  -p 8001:8001 \
  -e ENVIRONMENT=production \
  --restart unless-stopped \
  mlops-service:<previous-tag>

# Verify
curl -f http://localhost:8001/health
```

### 4.7 Post-Rollback Checklist

- [ ] All services health checks passing
- [ ] Database queries functioning
- [ ] Frontend accessible
- [ ] User authentication working
- [ ] Predictions generating successfully
- [ ] Logs monitored for errors
- [ ] Incident report created
- [ ] Stakeholders notified

---

## 5. Troubleshooting Guide

### 5.1 Backend Issues

#### Issue: Backend service won't start

**Symptoms**: Service crashes immediately, port binding errors

**Diagnosis**:
```bash
# Check if port is in use
lsof -i :3000

# Check environment variables
env | grep DB_

# Check logs
pm2 logs backend --lines 100
# Or
tail -f /var/log/backend.log
```

**Solutions**:
1. Kill process using port: `kill -9 <PID>`
2. Verify environment variables: `cat .env`
3. Check database connectivity: `psql -h $DB_HOST -U $DB_USER -d battery_management`
4. Verify dependencies: `npm ci --production`

#### Issue: Database connection failures

**Symptoms**: "Connection refused", "Authentication failed"

**Diagnosis**:
```bash
# Test database connection
psql -h $DB_HOST -U $DB_USER -d battery_management

# Check PostgreSQL status
systemctl status postgresql
# Or
docker ps | grep postgres

# Verify credentials
echo $DB_PASSWORD
```

**Solutions**:
1. Check PostgreSQL is running: `systemctl start postgresql`
2. Verify credentials in `.env`
3. Check firewall rules: `sudo ufw status`
4. Verify pg_hba.conf allows connections
5. Check connection pooling limits

#### Issue: JWT authentication failures

**Symptoms**: 401 Unauthorized errors

**Diagnosis**:
```bash
# Check JWT secret is set
echo $JWT_SECRET

# Test token generation
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

**Solutions**:
1. Verify JWT_SECRET is set and consistent
2. Check token expiration settings
3. Verify user exists in database
4. Clear browser cookies/storage

### 5.2 MLOps Service Issues

#### Issue: MLOps service health check failing

**Symptoms**: /health endpoint returns 503 or times out

**Diagnosis**:
```bash
# Check service status
docker ps | grep mlops
# Or
ps aux | grep uvicorn

# Check logs
docker logs mlops-service --tail 100
# Or
tail -f /var/log/mlops.log

# Test endpoint directly
curl -v http://localhost:8001/health
```

**Solutions**:
1. Restart service: `docker restart mlops-service`
2. Check port binding: `lsof -i :8001`
3. Verify Python dependencies: `pip list`
4. Check disk space: `df -h`
5. Review logs for TensorFlow/scikit-learn errors

#### Issue: Model prediction errors

**Symptoms**: Prediction endpoint returns 500 errors

**Diagnosis**:
```bash
# Check model files exist
ls -lh services/mlops/data/models/

# Check model metadata
cat services/mlops/data/models/latest/metadata.json

# Test prediction with curl
curl -X POST http://localhost:3000/api/v1/ml/predict-maintenance \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '<test-payload>'
```

**Solutions**:
1. Verify model files are present
2. Check model version compatibility
3. Validate input features (correct names and types)
4. Review model training logs
5. Retrain model if corrupted

### 5.3 Frontend Issues

#### Issue: Frontend not loading

**Symptoms**: Blank page, HTTP 404, connection refused

**Diagnosis**:
```bash
# Check frontend service
curl -I http://localhost:3001

# Check web server logs
tail -f /var/log/nginx/error.log
# Or browser console (F12)

# Verify build files
ls -lh services/frontend/dist/
```

**Solutions**:
1. Verify web server is running
2. Check build was successful: `npm run build`
3. Verify API endpoint configuration
4. Clear browser cache
5. Check CORS settings in backend

#### Issue: API calls failing from frontend

**Symptoms**: Network errors, CORS errors, 401/403 responses

**Diagnosis**:
```bash
# Check browser console (F12 > Network tab)
# Look for failed requests

# Test API directly
curl http://localhost:3000/api/v1/facilities \
  -H "Authorization: Bearer $JWT_TOKEN"

# Check CORS configuration
grep -r "cors" services/backend/src/
```

**Solutions**:
1. Verify CORS origins in backend configuration
2. Check JWT token is being sent
3. Verify API base URL in frontend config
4. Check network connectivity
5. Review backend logs for errors

### 5.4 Database Issues

#### Issue: Slow database queries

**Symptoms**: API responses >2 seconds, timeout errors

**Diagnosis**:
```bash
# Check active queries
psql -h $DB_HOST -U $DB_USER -d battery_management -c "
  SELECT pid, now() - query_start as duration, state, query 
  FROM pg_stat_activity 
  WHERE state != 'idle' 
  ORDER BY duration DESC;
"

# Check table sizes
psql -h $DB_HOST -U $DB_USER -d battery_management -c "
  SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check missing indexes
psql -h $DB_HOST -U $DB_USER -d battery_management -c "
  SELECT schemaname, tablename, attname, n_distinct, correlation
  FROM pg_stats
  WHERE schemaname = 'public' AND n_distinct > 100;
"
```

**Solutions**:
1. Add indexes on frequently queried columns
2. Run VACUUM ANALYZE
3. Increase connection pool size
4. Optimize slow queries (use EXPLAIN ANALYZE)
5. Archive old data (sensor_readings >90 days)

#### Issue: Database disk full

**Symptoms**: "No space left on device", write failures

**Diagnosis**:
```bash
# Check disk usage
df -h /var/lib/postgresql

# Check database size
psql -h $DB_HOST -U $DB_USER -d battery_management -c "
  SELECT pg_size_pretty(pg_database_size('battery_management'));
"
```

**Solutions**:
1. Delete old logs: `find /var/log -name "*.log" -mtime +30 -delete`
2. Archive old sensor readings
3. Run VACUUM FULL (requires downtime)
4. Add more disk space
5. Configure log rotation

### 5.5 Performance Issues

#### Issue: High CPU usage

**Diagnosis**:
```bash
# Check CPU usage by process
top -o %CPU
# Or
htop

# Check backend process
ps aux | grep node

# Check MLOps process
ps aux | grep python
```

**Solutions**:
1. Identify resource-intensive queries
2. Optimize ML model inference
3. Increase worker processes
4. Add horizontal scaling (load balancer)
5. Enable caching (Redis)

#### Issue: High memory usage

**Diagnosis**:
```bash
# Check memory usage
free -h

# Check process memory
ps aux --sort=-%mem | head -10

# Check for memory leaks
watch -n 5 'ps -eo pid,cmd,%mem --sort=-%mem | head -10'
```

**Solutions**:
1. Restart services to clear memory
2. Optimize database query result sizes
3. Reduce ML model memory footprint
4. Increase system RAM
5. Enable swap space (temporary solution)

---

## 6. Maintenance Tasks

### 6.1 Daily Maintenance

```bash
#!/bin/bash
# daily_maintenance.sh

echo "=== Daily Maintenance: $(date) ===" | tee -a maintenance.log

# 1. Health checks
echo "Running health checks..."
curl -f http://localhost:3000/api/v1/health || echo "Backend health check failed!"
curl -f http://localhost:8001/health || echo "MLOps health check failed!"
curl -f http://localhost:3001 || echo "Frontend health check failed!"

# 2. Check disk space
echo "Checking disk space..."
df -h | grep -E "/$|/var" | awk '{if ($5 > "80%") print "WARNING: "$0}'

# 3. Check logs for errors
echo "Checking logs for errors..."
grep -i "error\|exception\|fatal" /var/log/backend.log | tail -20
grep -i "error\|exception\|fatal" /var/log/mlops.log | tail -20

# 4. Database backup
echo "Creating database backup..."
pg_dump -h $DB_HOST -U $DB_USER battery_management | gzip > backup_$(date +%Y%m%d).sql.gz

# 5. Check service status
echo "Checking service status..."
pm2 status

echo "=== Daily Maintenance Complete ===" | tee -a maintenance.log
```

**Schedule**: Run via cron at 2:00 AM daily
```bash
0 2 * * * /path/to/daily_maintenance.sh
```

### 6.2 Weekly Maintenance

```bash
#!/bin/bash
# weekly_maintenance.sh

echo "=== Weekly Maintenance: $(date) ===" | tee -a maintenance.log

# 1. Database optimization
echo "Optimizing database..."
psql -h $DB_HOST -U $DB_USER -d battery_management -c "VACUUM ANALYZE;"

# 2. Clear old backups (keep 30 days)
echo "Cleaning old backups..."
find /backups -name "backup_*.sql.gz" -mtime +30 -delete

# 3. Archive old sensor readings (>90 days)
echo "Archiving old sensor readings..."
psql -h $DB_HOST -U $DB_USER -d battery_management -c "
  DELETE FROM sensor_readings 
  WHERE created_at < NOW() - INTERVAL '90 days';
"

# 4. Review and rotate logs
echo "Rotating logs..."
logrotate /etc/logrotate.d/battery-management

# 5. Update system packages (with approval)
echo "Checking for system updates..."
apt update && apt list --upgradable

# 6. Security audit
echo "Running security audit..."
npm audit --production --audit-level=high

# 7. Performance metrics review
echo "Reviewing performance metrics..."
psql -h $DB_HOST -U $DB_USER -d battery_management -c "
  SELECT 
    schemaname, 
    tablename, 
    seq_scan, 
    idx_scan, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"

echo "=== Weekly Maintenance Complete ===" | tee -a maintenance.log
```

**Schedule**: Run via cron on Sundays at 3:00 AM
```bash
0 3 * * 0 /path/to/weekly_maintenance.sh
```

### 6.3 Monthly Maintenance

- [ ] Review and update SSL certificates
- [ ] Review access logs and user activity
- [ ] Review and update security policies
- [ ] Performance benchmarking and capacity planning
- [ ] Review ML model performance metrics
- [ ] Retrain ML models if performance degrades
- [ ] Review and update documentation
- [ ] Disaster recovery drill
- [ ] Review and update emergency contacts
- [ ] System vulnerability scanning
- [ ] Rotate API keys and secrets
- [ ] Review backup and restore procedures

### 6.4 Quarterly Maintenance

- [ ] Major version upgrades (Node.js, Python, PostgreSQL)
- [ ] Architecture review and optimization
- [ ] Security penetration testing
- [ ] Load testing and performance benchmarking
- [ ] Disaster recovery full test
- [ ] Review SLAs and adjust resources
- [ ] Cost optimization review
- [ ] Update deployment runbook

---

## 7. Emergency Contacts

### 7.1 Escalation Matrix

| Level | Role | Contact Method | Response Time |
|-------|------|----------------|---------------|
| **L1** | DevOps Engineer | Slack: @devops-oncall<br>Phone: +1-555-0101 | 15 minutes |
| **L2** | Senior Backend Engineer | Slack: @backend-lead<br>Phone: +1-555-0102 | 30 minutes |
| **L3** | ML Engineer | Slack: @ml-engineer<br>Phone: +1-555-0103 | 30 minutes |
| **L4** | Engineering Manager | Phone: +1-555-0104<br>Email: eng-manager@company.com | 1 hour |
| **L5** | CTO | Phone: +1-555-0105 | 2 hours |

### 7.2 Vendor Contacts

| Vendor | Service | Contact | SLA |
|--------|---------|---------|-----|
| **AWS** | Cloud Infrastructure | support@aws.amazon.com<br>Enterprise Support Portal | 24/7, <1hr |
| **SendGrid** | Email Delivery | support@sendgrid.com<br>Support Portal | Business hours, <4hr |
| **PostgreSQL** | Database Support | Community Forums<br>Enterprise: support@postgresql.org | Best effort |

### 7.3 Incident Response Procedure

1. **Detect**: Monitoring alerts, user reports, health checks
2. **Assess**: Determine severity (Critical/High/Medium/Low)
3. **Notify**: Alert on-call engineer via Slack/phone
4. **Investigate**: Review logs, metrics, recent changes
5. **Mitigate**: Apply immediate fix or rollback
6. **Communicate**: Update status page, notify stakeholders
7. **Resolve**: Implement permanent fix
8. **Document**: Create incident report with root cause analysis
9. **Review**: Post-mortem meeting within 72 hours

### 7.4 Incident Severity Definitions

| Severity | Definition | Examples | Response |
|----------|-----------|----------|----------|
| **Critical** | System down, data loss | Database corruption, all services down | Immediate, all hands on deck |
| **High** | Major feature broken | Login failures, predictions not working | <15 minutes response |
| **Medium** | Minor feature degraded | Slow dashboards, email delays | <1 hour response |
| **Low** | Cosmetic issue | UI glitches, typos | Next business day |

---

## 8. System Architecture

### 8.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
│                        (Nginx/AWS ALB)                           │
└───────────────┬────────────────────────────┬────────────────────┘
                │                            │
                ▼                            ▼
┌───────────────────────────┐  ┌────────────────────────────────┐
│     Frontend Service      │  │      Backend Service           │
│   React 18 + Vite         │  │   Node.js + Express + TS       │
│   Port: 3001              │  │   Port: 3000                   │
│                           │  │                                │
│ - Dashboard UI            │  │ - REST API                     │
│ - 3D Visualization        │  │ - JWT Authentication           │
│ - Charts & Graphs         │  │ - Business Logic               │
│ - User Management         │◄─┤ - Scheduled Jobs               │
└───────────────────────────┘  │ - Email Notifications          │
                               └───────┬────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
        ┌───────────────────┐ ┌──────────────┐ ┌─────────────────┐
        │  MLOps Service    │ │  PostgreSQL  │ │   ML Service    │
        │  Python + FastAPI │ │  Database    │ │   Python 3.11   │
        │  Port: 8001       │ │  Port: 5432  │ │                 │
        │                   │ │              │ │ - Training      │
        │ - Model Serving   │ │ - Facilities │ │ - Preprocessing │
        │ - Predictions     │ │ - Batteries  │ │ - Feature Eng   │
        │ - Health Checks   │ │ - Sensors    │ │ - Versioning    │
        │ - TensorFlow      │ │ - Anomalies  │ │                 │
        │ - scikit-learn    │ │ - Predictions│ │                 │
        └───────────────────┘ └──────────────┘ └─────────────────┘
```

### 8.2 Data Flow

#### 8.2.1 User Authentication Flow
```
User → Frontend → Backend /auth/login → JWT Token → Frontend (Store) → Authorized Requests
```

#### 8.2.2 Prediction Request Flow
```
User → Frontend → Backend /ml/predict-maintenance → ML Model (Random Forest) → Backend → Frontend (Display)
```

#### 8.2.3 Sensor Data Ingestion Flow
```
IoT Device → Backend /sensor-readings → Anomaly Detection → Database → Dashboard (Real-time)
```

#### 8.2.4 Scheduled Prediction Job Flow
```
Cron Job → Backend → Fetch Battery Systems → ML Prediction → Store Results → Email Alerts (if critical)
```

### 8.3 Database Schema

#### Key Tables

**facilities**
- `id` (UUID, PK)
- `name` (VARCHAR)
- `location` (VARCHAR)
- `created_at` (TIMESTAMP)

**battery_systems**
- `id` (UUID, PK)
- `facility_id` (UUID, FK)
- `name` (VARCHAR)
- `state_of_health` (DECIMAL)
- `cycles_completed` (INTEGER)
- `status` (ENUM: healthy, warning, critical, maintenance)

**sensor_readings**
- `id` (UUID, PK)
- `battery_system_id` (UUID, FK)
- `temperature` (DECIMAL)
- `voltage` (DECIMAL)
- `current` (DECIMAL)
- `state_of_charge` (DECIMAL)
- `timestamp` (TIMESTAMP)

**anomalies**
- `id` (UUID, PK)
- `battery_system_id` (UUID, FK)
- `anomaly_type` (ENUM: temperature, voltage, current, soc)
- `severity` (ENUM: warning, critical)
- `detected_at` (TIMESTAMP)

**predictions**
- `id` (UUID, PK)
- `battery_system_id` (UUID, FK)
- `predicted_rul_days` (INTEGER)
- `confidence` (DECIMAL)
- `risk_level` (ENUM: safe, 30d, 14d, 7d)
- `created_at` (TIMESTAMP)

### 8.4 Network Ports

| Service | Port | Protocol | Firewall Rule |
|---------|------|----------|---------------|
| Frontend | 3001 | HTTP/HTTPS | Public (0.0.0.0/0) |
| Backend | 3000 | HTTP | Internal + Frontend |
| MLOps | 8001 | HTTP | Internal + Backend |
| PostgreSQL | 5432 | TCP | Internal only |
| SSH | 22 | TCP | Admin IPs only |

### 8.5 Technology Stack Summary

#### Frontend
- **Framework**: React 18.2
- **Build Tool**: Vite
- **State Management**: Zustand
- **3D Graphics**: Three.js + React Three Fiber
- **Charts**: Recharts
- **Storage**: IndexedDB (Dexie)

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript 5.3
- **Authentication**: JWT (jsonwebtoken)
- **Database Client**: pg (PostgreSQL)
- **Scheduling**: node-cron
- **ML Library**: ml-random-forest

#### MLOps
- **Language**: Python 3.11
- **Framework**: FastAPI 0.109
- **ML Frameworks**: TensorFlow 2.15, scikit-learn 1.4
- **Data Processing**: pandas 2.2, numpy 1.26
- **Server**: Uvicorn

#### ML Training
- **Language**: Python 3.11
- **ML Library**: scikit-learn 1.4
- **Data Processing**: pandas 2.2
- **Model Versioning**: Custom (joblib)

#### Database
- **Type**: PostgreSQL 12+
- **Connection Pooling**: pg-pool
- **Backup**: pg_dump

---

## 9. Appendix

### 9.1 Environment Setup Scripts

#### 9.1.1 Backend Environment Setup

```bash
#!/bin/bash
# setup_backend.sh

set -e

echo "Setting up Backend service..."

cd services/backend

# Create .env file
cat > .env << EOF
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-battery_management}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
PORT=3000
PREDICTION_JOB_INTERVAL_MINUTES=60
SENDGRID_API_KEY=${SENDGRID_API_KEY}
EMAIL_FROM=alerts@battery-management.com
EMAIL_FROM_NAME=Battery Management System
DASHBOARD_BASE_URL=${DASHBOARD_BASE_URL:-http://localhost:3001}
EOF

# Install dependencies
npm ci --production

# Build
npm run build

echo "Backend setup complete!"
```

#### 9.1.2 MLOps Environment Setup

```bash
#!/bin/bash
# setup_mlops.sh

set -e

echo "Setting up MLOps service..."

cd services/mlops

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
APP_NAME=MLOps Service
ENVIRONMENT=production
PORT=8001
CORS_ORIGINS=["${DASHBOARD_BASE_URL:-http://localhost:3001}"]
MODELS_DIR=/app/models
LOG_LEVEL=INFO
EOF

echo "MLOps setup complete!"
```

### 9.2 Monitoring Setup

#### 9.2.1 Health Check Script

```bash
#!/bin/bash
# health_check.sh

# Check all services and send alerts if down

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

check_service() {
    local service_name=$1
    local url=$2
    
    if curl -f -s -o /dev/null "$url"; then
        echo "✅ $service_name is healthy"
        return 0
    else
        echo "❌ $service_name is DOWN"
        
        # Send Slack alert
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 ALERT: $service_name is DOWN at $(date)\"}"
        
        return 1
    fi
}

# Check all services
check_service "Backend" "http://localhost:3000/api/v1/health"
check_service "MLOps" "http://localhost:8001/health"
check_service "Frontend" "http://localhost:3001"

# Check database
if pg_isready -h "$DB_HOST" -p 5432; then
    echo "✅ Database is healthy"
else
    echo "❌ Database is DOWN"
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"🚨 ALERT: Database is DOWN at $(date)\"}"
fi
```

**Schedule**: Run every 5 minutes
```bash
*/5 * * * * /path/to/health_check.sh
```

### 9.3 Performance Benchmarks

#### 9.3.1 Expected Response Times

| Endpoint | Expected | Acceptable | Critical |
|----------|----------|------------|----------|
| GET /health | <50ms | <200ms | >500ms |
| GET /facilities | <100ms | <500ms | >1000ms |
| POST /ml/predict-maintenance | <200ms | <1000ms | >2000ms |
| POST /rul/predict | <300ms | <1500ms | >3000ms |
| GET /sensor-readings/timeseries | <500ms | <2000ms | >5000ms |

#### 9.3.2 Resource Utilization Targets

| Resource | Target | Warning | Critical |
|----------|--------|---------|----------|
| CPU Usage | <60% | 60-80% | >80% |
| Memory Usage | <70% | 70-85% | >85% |
| Disk Usage | <70% | 70-85% | >85% |
| Database Connections | <50 | 50-80 | >80 |

---

## Document Control

**Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-09 | DevOps Team | Initial release |

**Review Schedule**: Quarterly or after major incidents

**Next Review**: April 9, 2026

**Approval**: 
- Engineering Manager: _________________ Date: _________
- DevOps Lead: _________________ Date: _________
- CTO: _________________ Date: _________

---

**END OF RUNBOOK**
