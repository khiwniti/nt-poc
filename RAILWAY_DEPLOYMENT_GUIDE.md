# Railway Deployment Guide

**Date:** 2026-01-15
**Status:** Complete deployment guide for all NT-POC services

## Prerequisites

1. ✅ Railway CLI installed (verified: `/usr/local/bin/railway`)
2. ⏳ Railway account at https://railway.app
3. ⏳ GitHub repository connected (optional but recommended)

## Quick Deployment Steps

### 1. Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### 2. Initialize Railway Project

```bash
# From project root
railway init

# Link to existing project (if you have one)
railway link

# OR create new project
railway init --name nt-poc-battery-management
```

### 3. Add PostgreSQL Database

```bash
# Add PostgreSQL with TimescaleDB
railway add --database postgres

# Note the database service name (usually "Postgres")
railway variables --service Postgres
```

**Important:** After adding PostgreSQL, you need to enable TimescaleDB extension:

```bash
# Connect to your Railway PostgreSQL
railway connect Postgres

# In psql prompt:
CREATE EXTENSION IF NOT EXISTS timescaledb;
\dx  # Verify extension is installed
\q
```

### 4. Add Redis Cache

```bash
railway add --database redis
```

### 5. Deploy All Services

Use the automated deployment script:

```bash
./deploy-railway.sh
```

Or deploy services individually:

```bash
# Deploy Backend
railway up --service backend

# Deploy Frontend
railway up --service frontend

# Deploy MLOps
railway up --service mlops

# Deploy Simulator
railway up --service simulator

# Deploy LINE Bot
railway up --service line-bot
```

## Environment Variables Configuration

### Backend Service

Set these via Railway Dashboard or CLI:

```bash
railway variables --service backend

# Database (auto-linked if you used railway add)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_SSL=true

# Redis (auto-linked)
REDIS_URL=${{Redis.REDIS_URL}}

# Application
NODE_ENV=production
PORT=3000

# Authentication
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRY=24h

# Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000
SIMULATOR_URL=http://simulator.railway.internal:8001

# Email (SendGrid)
SENDGRID_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=alerts@yourdomain.com
EMAIL_FROM_NAME=Battery Management System

# Service URLs
MLOPS_SERVICE_URL=http://mlops.railway.internal:8000

# Logging
LOG_LEVEL=info

# Monitoring (optional)
SENTRY_DSN=<your-sentry-dsn>
```

### Frontend Service

```bash
railway variables --service frontend

# API Endpoints
VITE_API_BASE_URL=https://backend-production.railway.app/api
VITE_MLOPS_SERVICE_URL=https://mlops-production.railway.app

# Application
VITE_APP_NAME=Battery Management System
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_OFFLINE_MODE=false

# UI
VITE_DEFAULT_THEME=light
VITE_ENABLE_DARK_MODE=true

# Build
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

### MLOps Service

```bash
railway variables --service mlops

# Application
APP_NAME=MLOps Service
ENVIRONMENT=production
PORT=8000

# Database (optional, for metrics)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}

# CORS
CORS_ORIGINS=["https://backend-production.railway.app","https://frontend-production.railway.app"]

# Models
MODELS_DIR=/app/models
MODEL_VERSION=v1.0.0

# Redis (optional)
REDIS_URL=${{Redis.REDIS_URL}}

# Logging
LOG_LEVEL=INFO
```

### Simulator Service

```bash
railway variables --service simulator

# Application
APP_NAME=Sensor Simulator
PORT=8001
SENSOR_BACKEND=simulator

# Simulation
SIMULATOR_NOISE_LEVEL=0.02
SIMULATOR_DRIFT_ENABLED=true
SIMULATOR_UPDATE_INTERVAL_MS=1000
SIMULATOR_SOC_DECAY_RATE=0.1
SIMULATOR_SOH_DECAY_RATE=0.0001

# CORS
CORS_ORIGINS=["http://backend.railway.internal:3000"]
```

### LINE Bot Service

```bash
railway variables --service line-bot

# Application
PORT=3002
NODE_ENV=production

# LINE API
LINE_CHANNEL_ACCESS_TOKEN=<your-line-channel-access-token>
LINE_CHANNEL_SECRET=<your-line-channel-secret>

# AI Integration
AI_BASE_URL=http://localhost:4141/v1  # Update if using cloud Claude API
AI_MODEL=claude-sonnet-4.5

# Backend Integration
BACKEND_API_URL=http://backend.railway.internal:3000
```

## Setting Variables via CLI

### Bulk Set Variables

```bash
# Backend
railway variables set --service backend \
  NODE_ENV=production \
  PORT=3000 \
  DB_SSL=true \
  JWT_EXPIRY=24h \
  LOG_LEVEL=info

# Generate and set JWT_SECRET
railway variables set --service backend \
  JWT_SECRET=$(openssl rand -base64 32)

# Frontend
railway variables set --service frontend \
  VITE_APP_NAME="Battery Management System" \
  VITE_ENVIRONMENT=production \
  NODE_ENV=production

# MLOps
railway variables set --service mlops \
  PORT=8000 \
  ENVIRONMENT=production \
  LOG_LEVEL=INFO

# Simulator
railway variables set --service simulator \
  PORT=8001 \
  SENSOR_BACKEND=simulator

# LINE Bot
railway variables set --service line-bot \
  PORT=3002 \
  NODE_ENV=production
```

### Link Database Variables

```bash
# Backend - Link PostgreSQL
railway variables set --service backend \
  DATABASE_URL='${{Postgres.DATABASE_URL}}' \
  DB_HOST='${{Postgres.PGHOST}}' \
  DB_PORT='${{Postgres.PGPORT}}' \
  DB_NAME='${{Postgres.PGDATABASE}}' \
  DB_USER='${{Postgres.PGUSER}}' \
  DB_PASSWORD='${{Postgres.PGPASSWORD}}'

# MLOps - Link PostgreSQL (optional)
railway variables set --service mlops \
  DATABASE_URL='${{Postgres.DATABASE_URL}}' \
  DB_HOST='${{Postgres.PGHOST}}' \
  DB_PORT='${{Postgres.PGPORT}}' \
  DB_NAME='${{Postgres.PGDATABASE}}' \
  DB_USER='${{Postgres.PGUSER}}' \
  DB_PASSWORD='${{Postgres.PGPASSWORD}}'

# Backend & MLOps - Link Redis
railway variables set --service backend \
  REDIS_URL='${{Redis.REDIS_URL}}'

railway variables set --service mlops \
  REDIS_URL='${{Redis.REDIS_URL}}'
```

## Database Migrations

After first deployment, run migrations:

```bash
# Option 1: Via Railway CLI
railway run --service backend npm run migrate

# Option 2: Connect and run manually
railway shell backend
npm run migrate
exit
```

## Deployment Verification

### 1. Check Service Status

```bash
railway status
```

### 2. View Logs

```bash
# All services
railway logs

# Specific service
railway logs --service backend
railway logs --service frontend
railway logs --service mlops
railway logs --service simulator
railway logs --service line-bot
```

### 3. Test Endpoints

```bash
# Get your Railway domains
railway domain

# Test health endpoints
curl https://backend-production.railway.app/api/v1/health
curl https://mlops-production.railway.app/health
curl https://simulator-production.railway.app/api/health
curl https://line-bot-production.railway.app/health
```

### 4. Test Frontend

Open browser to: `https://frontend-production.railway.app`

## Internal Service Communication

Railway services can communicate via internal networking:

```bash
# Backend → MLOps
http://mlops.railway.internal:8000

# Backend → Simulator
http://simulator.railway.internal:8001

# LINE Bot → Backend
http://backend.railway.internal:3000
```

These URLs work **only between Railway services** in the same project.

## Troubleshooting

### Issue: Build Fails

**Check logs:**
```bash
railway logs --service <service-name>
```

**Common fixes:**
- Verify `railway.toml` configuration
- Check package.json scripts exist
- Ensure dependencies are in package.json/requirements.txt

### Issue: Database Connection Failed

**Check:**
1. PostgreSQL plugin is added: `railway add --plugin postgresql`
2. TimescaleDB extension enabled: `CREATE EXTENSION timescaledb;`
3. Migrations ran: `railway run --service backend npm run migrate`
4. Variables linked: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

### Issue: Service Not Starting

**Check:**
1. Health check path correct in `railway.toml`
2. Port matches: Service listens on `$PORT` or hardcoded port
3. Start command correct: Check `railway.toml` startCommand

### Issue: Internal Service Communication Fails

**Use `.railway.internal` domains:**
```bash
# ✅ Correct
http://mlops.railway.internal:8000

# ❌ Wrong
http://mlops-production.railway.app
```

Internal networking uses service name from `railway.toml`.

## Cost Optimization

### 1. Use Hobby Plan Features
- **Free $5/month credits** for Hobby plan
- **Always-on for critical services** (backend, database)
- **Sleep inactive services** (simulator, line-bot if not used)

### 2. Scale Based on Usage
```bash
# Scale down non-critical services
railway service scale --service simulator --replicas 1 --memory 512MB

# Scale up critical services
railway service scale --service backend --replicas 2 --memory 1GB
```

### 3. Monitor Usage
```bash
railway metrics --service backend
```

## Continuous Deployment

### GitHub Integration (Recommended)

1. **Connect GitHub repo:**
   ```bash
   railway connect github
   ```

2. **Configure auto-deploy:**
   - Push to `main` branch → auto-deploys to production
   - Push to `develop` branch → auto-deploys to staging (if configured)

3. **Manual trigger:**
   ```bash
   railway up
   ```

### GitLab/Bitbucket

Use Railway CLI in CI/CD pipeline:

```yaml
# .gitlab-ci.yml or bitbucket-pipelines.yml
deploy:
  script:
    - railway login --token $RAILWAY_TOKEN
    - railway up --service backend
    - railway up --service frontend
```

## Production Checklist

- [ ] PostgreSQL added with TimescaleDB extension
- [ ] Redis added for caching
- [ ] All environment variables configured
- [ ] JWT_SECRET generated securely
- [ ] Database migrations ran successfully
- [ ] Health checks passing for all services
- [ ] Internal networking tested (service → service)
- [ ] Frontend can reach backend API
- [ ] Backend can reach MLOps and Simulator
- [ ] LINE webhook configured (update LINE Console with Railway domain)
- [ ] Monitoring/logging configured (Sentry, etc.)
- [ ] Custom domain configured (optional)
- [ ] SSL/TLS enabled (automatic on Railway)

## Next Steps

1. **Login:** `railway login`
2. **Initialize:** `railway init --name nt-poc-battery-management`
3. **Add Database:** `railway add --plugin postgresql`
4. **Add Redis:** `railway add --plugin redis`
5. **Configure Variables:** Use CLI or Dashboard
6. **Deploy:** `./deploy-railway.sh` or individual `railway up`
7. **Run Migrations:** `railway run --service backend npm run migrate`
8. **Verify:** Check logs and test endpoints

## Useful Commands

```bash
# Project management
railway init                          # Initialize new project
railway link                          # Link existing project
railway unlink                        # Unlink project

# Deployment
railway up                            # Deploy all services
railway up --service <name>           # Deploy specific service

# Variables
railway variables                     # List all variables
railway variables --service <name>    # Service-specific variables
railway variables set KEY=value       # Set variable

# Database
railway connect Postgres              # Connect to PostgreSQL
railway add --plugin postgresql       # Add PostgreSQL

# Logs and monitoring
railway logs                          # View all logs
railway logs --service <name>         # Service-specific logs
railway status                        # Check deployment status
railway domain                        # List domains

# Shell access
railway shell <service>               # SSH into service
railway run --service <name> <cmd>    # Run command in service

# Cleanup
railway down --service <name>         # Stop service
railway delete --service <name>       # Delete service
```

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Project Structure:** See `railway.toml`
- **Local Testing:** See `docker-compose.yml`
