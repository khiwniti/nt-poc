# T226: Railway Configuration - Quick Reference

**Task**: Configure Railway project with PostgreSQL, Redis, and environment variables  
**Version**: 1.0.0  
**Date**: January 9, 2026

---

## Quick Setup

### 1. Create Railway Project

```bash
# Login and initialize
railway login
railway init

# Link repository
railway link
```

### 2. Add Databases

```bash
# Add PostgreSQL 16
railway add --database postgresql

# Add Redis 7
railway add --database redis
```

### 3. Create Services

```bash
# Create backend service
railway service create backend

# Create frontend service
railway service create frontend

# Create MLOps service
railway service create mlops
```

---

## Environment Variables Cheat Sheet

### Backend (20+ vars)

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (auto-provided)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_SSL=true

# Redis (auto-provided)
REDIS_URL=${{Redis.REDIS_URL}}

# JWT
JWT_SECRET=<generate-with: openssl rand -base64 32>
JWT_EXPIRY=24h

# Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5

# Email
SENDGRID_API_KEY=<your-key>
EMAIL_FROM=alerts@battery-management.com
EMAIL_FROM_NAME=Battery Management System
DASHBOARD_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# Services
MLOPS_SERVICE_URL=http://mlops.railway.internal:8001

# Logging
LOG_LEVEL=info
```

### Frontend (11+ vars)

```bash
# API
VITE_API_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api
VITE_MLOPS_SERVICE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/mlops

# App
VITE_APP_NAME=Battery Management System
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_DEBUG_MODE=false

# UI
VITE_DEFAULT_THEME=light
VITE_ENABLE_DARK_MODE=true

# Build
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

### MLOps (11+ vars)

```bash
# Application
APP_NAME=MLOps Service
ENVIRONMENT=production
PORT=8001

# CORS
CORS_ORIGINS=["https://${{RAILWAY_PUBLIC_DOMAIN}}"]

# Models
MODELS_DIR=/app/models
MODEL_VERSION=v1.0.0

# Redis (auto-provided)
REDIS_URL=${{Redis.REDIS_URL}}

# Database (optional)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Logging
LOG_LEVEL=INFO

# Performance
WORKER_PROCESSES=2
MAX_BATCH_SIZE=100
```

---

## Service Configuration

### Backend Service

```bash
# Settings
Name: backend
Build: cd services/backend && npm ci && npm run build
Start: cd services/backend && npm start
Port: 3000
Health: /api/v1/health
Restart: ON_FAILURE (max 10)
```

### Frontend Service

```bash
# Settings
Name: frontend
Build: cd services/frontend && npm ci && npm run build
Start: Static hosting (auto-served)
Port: Auto-assigned
Output: dist/
```

### MLOps Service

```bash
# Settings
Name: mlops
Build: cd services/mlops && pip install -r requirements.txt
Start: cd services/mlops && uvicorn main:app --host 0.0.0.0 --port 8001
Port: 8001
Health: /health
Python: 3.11
```

---

## Common Commands

### Deploy

```bash
# Deploy all services
railway up

# Deploy specific service
railway up -s backend
railway up -s frontend
railway up -s mlops
```

### Environment Variables

```bash
# List variables
railway variables -s backend

# Set variable
railway variables -s backend set JWT_SECRET=<value>

# Remove variable
railway variables -s backend delete OLD_VAR
```

### Database

```bash
# Connect to PostgreSQL
railway connect postgres

# Connect to Redis
railway connect redis

# Run migrations
railway run -s backend npm run migrate
```

### Logs

```bash
# View logs
railway logs -s backend

# Follow logs
railway logs -s backend --follow

# View all services
railway logs
```

### Service Management

```bash
# Check status
railway status

# Restart service
railway service restart backend

# Rollback deployment
railway rollback
```

---

## Health Check Endpoints

```bash
# Backend
curl https://<app>.railway.app/api/v1/health

# Frontend
curl https://<app>.railway.app

# MLOps
curl https://<app>.railway.app/mlops/health
```

---

## Internal Service URLs

```bash
# Backend → MLOps
http://mlops.railway.internal:8001

# Format
http://<service-name>.railway.internal:<port>
```

---

## Database Info

### PostgreSQL 16
- **Auto-Generated Variables**: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- **SSL**: Required (`DB_SSL=true`)
- **Max Connections**: 100
- **Backups**: Automatic daily

### Redis 7
- **Auto-Generated Variables**: `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- **Memory**: 512MB-1GB (configurable)
- **Eviction**: allkeys-lru
- **Persistence**: AOF enabled

---

## Cron Jobs

### Daily Backup (2:00 AM UTC)
```bash
# Configured in railway.toml
[[cron]]
name = "daily-database-backup"
schedule = "0 2 * * *"
command = "bash /app/services/backend/scripts/backup.sh"
```

### Backup Monitoring (Every 6 hours)
```bash
[[cron]]
name = "backup-monitoring"
schedule = "0 */6 * * *"
command = "bash /app/services/backend/scripts/monitor-backups.sh"
```

---

## Troubleshooting

### Database Connection Failed
```bash
# Check variables
railway variables -s backend | grep DATABASE_URL

# Test connection
railway connect postgres
```

### Redis Connection Failed
```bash
# Check variables
railway variables -s backend | grep REDIS_URL

# Test connection
railway connect redis
```

### Service Not Responding
```bash
# Check status
railway status

# View logs
railway logs -s backend --follow

# Restart service
railway service restart backend
```

### Build Failed
```bash
# View build logs
railway logs -s backend | grep BUILD

# Test locally
cd services/backend
npm ci
npm run build
```

### Deployment Rollback
```bash
# Rollback via CLI
railway rollback

# Or via Dashboard
# Service → Deployments → Previous → Redeploy
```

---

## Quick Verification

```bash
# 1. Check project
railway status

# 2. Check databases
railway variables | grep -E "DATABASE_URL|REDIS_URL"

# 3. Check services
railway service list

# 4. Test health
curl https://<app>.railway.app/api/v1/health

# 5. View logs
railway logs
```

---

## Security Checklist

- [ ] JWT secret generated (32+ chars)
- [ ] Database SSL enabled (`DB_SSL=true`)
- [ ] API keys secured (SendGrid, etc.)
- [ ] CORS origins whitelisted
- [ ] Environment variables not in Git
- [ ] Security headers enabled (auto)
- [ ] HTTPS enforced (auto)

---

## Service Dependencies

| Service | PostgreSQL | Redis | Backend | MLOps |
|---------|-----------|-------|---------|-------|
| Backend | ✅ | ✅ | - | ✅ |
| Frontend | ❌ | ❌ | ✅ | ✅ |
| MLOps | ⚠️ Optional | ⚠️ Optional | ❌ | - |

---

## Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| PostgreSQL 16 | $10-20 |
| Redis 7 | $10-15 |
| Backend | $10-20 |
| Frontend | $5-10 |
| MLOps | $15-25 |
| **Total** | **$50-90** |

---

## Files Reference

- **Configuration**: `railway.toml`
- **Backend Config**: `services/backend/scripts/railway.json`
- **CD Workflow**: `.github/workflows/cd-railway.yml`
- **Full Guide**: `T226_RAILWAY_CONFIGURATION.md`
- **Acceptance**: `T226_ACCEPTANCE_CHECKLIST.md`

---

## Railway Dashboard URLs

- **Project**: https://railway.app/project/<project-id>
- **PostgreSQL**: https://railway.app/project/<project-id>/service/postgres
- **Redis**: https://railway.app/project/<project-id>/service/redis
- **Backend**: https://railway.app/project/<project-id>/service/backend
- **Frontend**: https://railway.app/project/<project-id>/service/frontend
- **MLOps**: https://railway.app/project/<project-id>/service/mlops

---

## Support

**Railway Docs**: https://docs.railway.app  
**PostgreSQL Plugin**: https://docs.railway.app/databases/postgresql  
**Redis Plugin**: https://docs.railway.app/databases/redis  
**Cron Jobs**: https://docs.railway.app/reference/cron-jobs  
**Private Networking**: https://docs.railway.app/reference/private-networking

---

**Version**: 1.0.0  
**Last Updated**: January 9, 2026
