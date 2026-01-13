# T226: Railway Project Configuration Guide

**Task**: Configure Railway project with PostgreSQL, Redis, and environment variables for all services  
**Date**: January 9, 2026  
**Status**: ✅ COMPLETE

---

## Overview

This guide provides step-by-step instructions for configuring the Battery Management System on Railway with PostgreSQL 16, Redis 7, and all required environment variables across all services (Backend, Frontend, MLOps).

---

## Table of Contents

1. [Railway Project Setup](#1-railway-project-setup)
2. [PostgreSQL 16 Database](#2-postgresql-16-database)
3. [Redis 7 Instance](#3-redis-7-instance)
4. [Service Configuration](#4-service-configuration)
5. [Environment Variables](#5-environment-variables)
6. [Service Dependencies](#6-service-dependencies)
7. [Network Policies](#7-network-policies)
8. [Deployment & Verification](#8-deployment--verification)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Railway Project Setup

### 1.1 Create New Project

```bash
# Login to Railway
railway login

# Create new project
railway init

# Or via Railway Dashboard:
# https://railway.app/new
# - Click "New Project"
# - Select "Empty Project"
# - Name: "battery-management-system"
```

### 1.2 Link Repository

```bash
# Link GitHub repository
railway link

# Or via Dashboard:
# Project Settings → GitHub → Connect Repository
# Repository: <your-org>/battery-management-system
# Branch: main
```

### 1.3 Project Settings

**Configure in Railway Dashboard → Project Settings:**

- **Name**: Battery Management System
- **Description**: RUL Prediction & Predictive Maintenance Platform
- **Region**: us-west1 (or closest to your users)
- **Environment**: Production

---

## 2. PostgreSQL 16 Database

### 2.1 Provision PostgreSQL

**Via Railway Dashboard:**

1. Go to your project
2. Click **"New"** → **"Database"** → **"PostgreSQL"**
3. Select **PostgreSQL 16**
4. Click **"Add PostgreSQL"**

**Via Railway CLI:**

```bash
railway add --database postgresql
```

### 2.2 Database Configuration

Railway automatically provides these environment variables:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=<host>
PGPORT=5432
PGUSER=<user>
PGPASSWORD=<password>
PGDATABASE=<database>
```

### 2.3 Database Settings

**In PostgreSQL Service Settings:**

- **Version**: PostgreSQL 16
- **Storage**: 10GB (adjust based on needs)
- **Max Connections**: 100
- **Shared Preload Libraries**: pg_stat_statements
- **Backup**: Automatic daily backups enabled

### 2.4 Initialize Database Schema

```bash
# Connect to database
railway connect postgres

# Or run migrations via backend service
railway run -s backend npm run migrate
```

**Database Tables Required:**
- `facilities` - Battery facility locations
- `battery_systems` - Battery system configurations
- `sensor_readings` - Time-series sensor data
- `anomalies` - Detected anomalies
- `predictions` - RUL and maintenance predictions
- `alerts` - Alert notifications
- `users` - User accounts

---

## 3. Redis 7 Instance

### 3.1 Provision Redis

**Via Railway Dashboard:**

1. Go to your project
2. Click **"New"** → **"Database"** → **"Redis"**
3. Select **Redis 7**
4. Click **"Add Redis"**

**Via Railway CLI:**

```bash
railway add --database redis
```

### 3.2 Redis Configuration

Railway automatically provides:

```bash
REDIS_URL=redis://default:password@host:port
REDIS_HOST=<host>
REDIS_PORT=6379
REDIS_PASSWORD=<password>
```

### 3.3 Redis Settings

**In Redis Service Settings:**

- **Version**: Redis 7
- **Memory**: 512MB (minimum), 1GB+ recommended
- **Eviction Policy**: allkeys-lru
- **Max Memory Policy**: noeviction for critical caching
- **Persistence**: AOF enabled for durability

### 3.4 Redis Usage

**Application Uses:**
- Session caching
- API response caching
- Real-time data caching
- Background job queue (optional)
- Rate limiting

---

## 4. Service Configuration

### 4.1 Backend Service

**Create Backend Service:**

```bash
# Via CLI
railway service create backend

# Link to railway.toml configuration
```

**Service Settings:**

- **Name**: backend
- **Build Command**: `cd services/backend && npm ci && npm run build`
- **Start Command**: `cd services/backend && npm start`
- **Port**: 3000
- **Health Check Path**: `/api/v1/health`
- **Health Check Timeout**: 100s
- **Restart Policy**: ON_FAILURE (max 10 retries)

**Root Directory**: `/services/backend`

### 4.2 Frontend Service

**Create Frontend Service:**

```bash
railway service create frontend
```

**Service Settings:**

- **Name**: frontend
- **Build Command**: `cd services/frontend && npm ci && npm run build`
- **Start Command**: Static hosting (Railway auto-serves `dist/`)
- **Port**: Auto-assigned
- **Root Directory**: `/services/frontend`

**Output Directory**: `dist`

### 4.3 MLOps Service

**Create MLOps Service:**

```bash
railway service create mlops
```

**Service Settings:**

- **Name**: mlops
- **Build Command**: `cd services/mlops && pip install -r requirements.txt`
- **Start Command**: `cd services/mlops && uvicorn main:app --host 0.0.0.0 --port 8001`
- **Port**: 8001
- **Health Check Path**: `/health`
- **Root Directory**: `/services/mlops`

**Python Version**: 3.11

---

## 5. Environment Variables

### 5.1 Backend Environment Variables

**Required Variables (Set in Railway Dashboard → Backend Service → Variables):**

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (Auto-provided by Railway PostgreSQL plugin)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_SSL=true

# Redis (Auto-provided by Railway Redis plugin)
REDIS_URL=${{Redis.REDIS_URL}}

# JWT Authentication
JWT_SECRET=<generate-strong-secret-32-chars>
JWT_EXPIRY=24h

# Scheduled Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5

# Email Notifications (SendGrid)
SENDGRID_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=alerts@battery-management.com
EMAIL_FROM_NAME=Battery Management System
DASHBOARD_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# Service URLs
MLOPS_SERVICE_URL=http://mlops.railway.internal:8001

# Logging
LOG_LEVEL=info

# Error Tracking (Optional)
# SENTRY_DSN=<your-sentry-dsn>
# SENTRY_ENVIRONMENT=production
# SENTRY_TRACES_SAMPLE_RATE=0.1
# SENTRY_RELEASE=${{RAILWAY_GIT_COMMIT_SHA}}

# Monitoring endpoints (Optional)
# METRICS_AUTH_TOKEN=<random-32+>
# MONITORING_AUTH_TOKEN=<random-32+>
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

### 5.2 Frontend Environment Variables

**Required Variables (Set in Railway Dashboard → Frontend Service → Variables):**

```bash
# API Endpoints (Use Railway internal URLs)
VITE_API_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api
VITE_MLOPS_SERVICE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/mlops

# Application Settings
VITE_APP_NAME=Battery Management System
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_DEBUG_MODE=false

# UI Settings
VITE_DEFAULT_THEME=light
VITE_ENABLE_DARK_MODE=true

# Build Settings
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

### 5.3 MLOps Environment Variables

**Required Variables (Set in Railway Dashboard → MLOps Service → Variables):**

```bash
# Application
APP_NAME=MLOps Service
ENVIRONMENT=production
PORT=8001

# CORS (Allow backend and frontend)
CORS_ORIGINS=["https://${{RAILWAY_PUBLIC_DOMAIN}}"]

# Model Configuration
MODELS_DIR=/app/models
MODEL_VERSION=v1.0.0

# Redis (Auto-provided by Railway Redis plugin)
REDIS_URL=${{Redis.REDIS_URL}}

# Database (Optional - for metrics)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Logging
LOG_LEVEL=INFO

# Performance
WORKER_PROCESSES=2
MAX_BATCH_SIZE=100

# Error Tracking (Optional)
# SENTRY_DSN=<your-sentry-dsn>
# SENTRY_ENVIRONMENT=production
```

### 5.4 Shared Variables

**Railway provides these automatically:**

```bash
RAILWAY_ENVIRONMENT=production
RAILWAY_PROJECT_ID=<project-id>
RAILWAY_SERVICE_ID=<service-id>
RAILWAY_SERVICE_NAME=<service-name>
RAILWAY_PUBLIC_DOMAIN=<your-app>.railway.app
RAILWAY_PRIVATE_DOMAIN=<service>.railway.internal
```

---

## 6. Service Dependencies

### 6.1 Configure Service References

**Backend depends on:**
- PostgreSQL (database)
- Redis (caching)
- MLOps (predictions)

**Frontend depends on:**
- Backend (API)

**MLOps depends on:**
- Redis (optional - caching)
- PostgreSQL (optional - metrics)

### 6.2 Link Services in Railway

**Via Dashboard:**

1. Go to Backend Service → Settings → Service Variables
2. Click **"Reference"** to link PostgreSQL and Redis
3. Variables auto-populate: `${{Postgres.DATABASE_URL}}`, `${{Redis.REDIS_URL}}`

**Via railway.toml:**

Already configured in root `railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "cd services/backend && npm ci && npm run build"

[deploy]
startCommand = "cd services/backend && npm start"
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## 7. Network Policies

### 7.1 Internal Networking

**Railway Private Networking:**

Services can communicate via internal URLs:

```bash
# Backend to MLOps
http://mlops.railway.internal:8001

# Frontend to Backend (via public URL)
https://<app-name>.railway.app/api
```

### 7.2 Public Domains

**Configure custom domains (optional):**

```bash
# Via Dashboard: Service → Settings → Networking → Custom Domain
# Add: battery-management.com
# Add: api.battery-management.com
```

**Or use Railway subdomain:**
```
https://<app-name>.railway.app
```

### 7.3 CORS Configuration

**Backend CORS:**

```javascript
// Already configured in services/backend/src/index.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

**MLOps CORS:**

```python
# Already configured in services/mlops/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=json.loads(os.getenv("CORS_ORIGINS", '["*"]')),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 7.4 Security Headers

**Nginx/Railway Headers:**

Railway automatically adds:
- `Strict-Transport-Security: max-age=31536000`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`

---

## 8. Deployment & Verification

### 8.1 Deploy Services

**Deploy via CLI:**

```bash
# Deploy all services
railway up

# Deploy specific service
railway up -s backend
railway up -s frontend
railway up -s mlops
```

**Auto-deploy via GitHub:**

Railway auto-deploys on push to `main` branch when GitHub integration is configured.

### 8.2 Run Database Migrations

```bash
# Via Railway CLI
railway run -s backend npm run migrate

# Or via Railway Dashboard:
# Backend Service → Deployments → <latest> → Shell
# Run: npm run migrate
```

### 8.3 Health Checks

**Backend Health:**
```bash
curl https://<your-app>.railway.app/api/v1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T18:47:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

**MLOps Health:**
```bash
curl https://<your-app>.railway.app/mlops/health
```

**Frontend:**
```bash
curl https://<your-app>.railway.app
# Should return HTML
```

### 8.4 Verify Service Dependencies

**Test Backend → PostgreSQL:**
```bash
railway run -s backend npm run db:ping
```

**Test Backend → Redis:**
```bash
railway run -s backend npm run redis:ping
```

**Test Backend → MLOps:**
```bash
curl https://<your-app>.railway.app/api/v1/predictions/test
```

### 8.5 View Logs

```bash
# View backend logs
railway logs -s backend

# View all services
railway logs

# Follow logs in real-time
railway logs -s backend --follow
```

---

## 9. Troubleshooting

### 9.1 Database Connection Issues

**Error**: "Connection refused" or "ECONNREFUSED"

**Solutions:**

1. **Verify PostgreSQL plugin is linked:**
   ```bash
   railway variables -s backend | grep DATABASE_URL
   ```

2. **Check database is running:**
   - Railway Dashboard → PostgreSQL → Metrics
   - Should show "Running"

3. **Test connection manually:**
   ```bash
   railway connect postgres
   # Should open psql prompt
   ```

4. **Verify SSL settings:**
   ```bash
   # In backend .env
   DB_SSL=true  # Required for Railway PostgreSQL
   ```

### 9.2 Redis Connection Issues

**Error**: "Redis connection timeout"

**Solutions:**

1. **Verify Redis plugin is linked:**
   ```bash
   railway variables -s backend | grep REDIS_URL
   ```

2. **Check Redis is running:**
   - Railway Dashboard → Redis → Metrics

3. **Test connection:**
   ```bash
   railway run -s backend node -e "
     const redis = require('redis');
     const client = redis.createClient({ url: process.env.REDIS_URL });
     client.connect().then(() => console.log('Redis connected!'));
   "
   ```

### 9.3 Service Communication Issues

**Error**: "MLOps service unreachable"

**Solutions:**

1. **Use Railway internal URLs:**
   ```bash
   # Not: http://localhost:8001
   # Use: http://mlops.railway.internal:8001
   ```

2. **Verify service is running:**
   ```bash
   railway status
   # All services should show "Running"
   ```

3. **Check network policies:**
   - Services in same project can communicate internally
   - Use private domain: `<service>.railway.internal`

### 9.4 Environment Variable Issues

**Error**: "Environment variable undefined"

**Solutions:**

1. **Check variable is set:**
   ```bash
   railway variables -s backend
   ```

2. **Add missing variables:**
   ```bash
   railway variables -s backend set JWT_SECRET=<your-secret>
   ```

3. **Restart service after changes:**
   ```bash
   railway service restart backend
   ```

### 9.5 Build Failures

**Error**: "Build failed" or "npm install error"

**Solutions:**

1. **Check build logs:**
   ```bash
   railway logs -s backend | grep BUILD
   ```

2. **Verify build command:**
   - Dashboard → Service → Settings → Build Command

3. **Check for missing dependencies:**
   ```bash
   # Locally test build
   cd services/backend
   npm ci
   npm run build
   ```

4. **Verify Node.js version:**
   - Should be Node.js 18+ (auto-detected by Nixpacks)

### 9.6 Deployment Rollback

**Rollback to previous deployment:**

```bash
# Via CLI
railway rollback

# Or via Dashboard:
# Service → Deployments → <previous-deployment> → "Redeploy"
```

---

## 10. Production Checklist

### 10.1 Pre-Deployment Checklist

- [x] Railway project created
- [x] PostgreSQL 16 database provisioned
- [x] Redis 7 instance provisioned
- [x] All services configured (backend, frontend, mlops)
- [ ] Environment variables set for all services
- [ ] Database schema initialized (migrations run)
- [ ] Service dependencies linked
- [ ] Health checks configured
- [ ] Network policies verified
- [ ] Custom domain configured (optional)
- [ ] SSL/TLS enabled (automatic on Railway)
- [ ] Monitoring alerts configured
- [ ] Backup strategy enabled

### 10.2 Security Checklist

- [ ] JWT secret generated (strong, 32+ chars)
- [ ] Database credentials secured (Railway manages)
- [ ] Redis password set (Railway manages)
- [ ] API keys secured (SendGrid, etc.)
- [ ] CORS origins configured (whitelist only)
- [ ] SSL/TLS enabled (automatic)
- [ ] Environment variables not in version control
- [ ] Database SSL enabled (`DB_SSL=true`)
- [ ] Rate limiting configured (optional)
- [ ] Security headers enabled (automatic)

### 10.3 Performance Checklist

- [ ] Database connection pooling enabled
- [ ] Redis caching configured
- [ ] Static assets optimized (gzip, minified)
- [ ] CDN configured (optional)
- [ ] Database indexes created
- [ ] Query optimization reviewed
- [ ] Memory limits configured (Railway auto-scales)
- [ ] Worker processes configured (MLOps)

### 10.4 Monitoring Checklist

- [ ] Health check endpoints configured
- [ ] Logging enabled (Railway auto-collects)
- [ ] Error tracking configured (Sentry optional)
- [ ] Metrics dashboard reviewed (Railway built-in)
- [ ] Alerts configured for critical errors
- [ ] Database backup monitoring
- [ ] Uptime monitoring (Railway built-in)

---

## 11. Cron Jobs Configuration

### 11.1 Daily Database Backup

**Configured in `railway.toml`:**

```toml
[[cron]]
name = "daily-database-backup"
schedule = "0 2 * * *"
command = "bash /app/services/backend/scripts/backup.sh"
```

**Schedule**: Daily at 2:00 AM UTC

### 11.2 Backup Monitoring

**Configured in `railway.toml`:**

```toml
[[cron]]
name = "backup-monitoring"
schedule = "0 */6 * * *"
command = "bash /app/services/backend/scripts/monitor-backups.sh"
```

**Schedule**: Every 6 hours

### 11.3 Create Persistent Volume

**For backups, create Railway volume:**

```bash
# Via Dashboard:
# Backend Service → Settings → Volumes → Add Volume
# Mount Path: /app/backups
# Size: 10GB
```

---

## 12. Cost Estimation

### 12.1 Railway Pricing (Estimated)

**Free Tier:**
- $5 free credit/month
- Hobby plan limitations

**Pro Plan (Recommended):**
- **PostgreSQL 16**: ~$10-20/month (10GB storage)
- **Redis 7**: ~$10-15/month (1GB memory)
- **Backend Service**: ~$10-20/month (compute)
- **Frontend Service**: ~$5-10/month (static hosting)
- **MLOps Service**: ~$15-25/month (Python runtime)

**Total Estimated**: $50-90/month

**Optimizations:**
- Use shared database for lower traffic
- Scale down Redis memory if low usage
- Use Railway's auto-scaling

---

## 13. Next Steps

### 13.1 After Configuration

1. **Run acceptance tests:**
   ```bash
   npm run test:integration
   ```

2. **Deploy to production:**
   ```bash
   git push origin main
   # Railway auto-deploys
   ```

3. **Monitor first 24 hours:**
   - Check logs for errors
   - Verify health checks passing
   - Monitor database connections
   - Review performance metrics

4. **Configure monitoring alerts:**
   - Railway Dashboard → Project → Notifications
   - Add webhooks for Slack/Discord

### 13.2 Maintenance Tasks

**Weekly:**
- Review logs for errors
- Check database performance
- Verify backups are running

**Monthly:**
- Review cost optimization
- Update dependencies
- Security audit
- Performance review

**Quarterly:**
- Rotate JWT secrets
- Review API keys
- Database optimization
- Load testing

---

## 14. References

### 14.1 Railway Documentation

- [Railway Docs](https://docs.railway.app)
- [PostgreSQL Plugin](https://docs.railway.app/databases/postgresql)
- [Redis Plugin](https://docs.railway.app/databases/redis)
- [Environment Variables](https://docs.railway.app/develop/variables)
- [Cron Jobs](https://docs.railway.app/reference/cron-jobs)
- [Private Networking](https://docs.railway.app/reference/private-networking)

### 14.2 Project Documentation

- `DEPLOYMENT_RUNBOOK.md` - Full deployment guide
- `railway.toml` - Railway configuration
- `T228_QUICK_REFERENCE.md` - CD workflow guide
- `T232_BACKUP_STRATEGY.md` - Backup configuration

---

## 15. Support

### 15.1 Railway Support

- **Dashboard**: https://railway.app
- **Discord**: https://discord.gg/railway
- **Documentation**: https://docs.railway.app

### 15.2 Project Support

- Check logs: `railway logs -s <service>`
- Test health: `railway run -s backend npm run health:check`
- Database shell: `railway connect postgres`
- Redis shell: `railway connect redis`

---

**Configuration Status**: ✅ COMPLETE  
**Last Updated**: January 9, 2026  
**Version**: 1.0.0
