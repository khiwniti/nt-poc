# Railway Shared Environment Variables Guide

This guide explains how to set up environment variables that are shared across multiple services in your Railway deployment.

## Overview

Your project has **5 services** that need coordinated configuration:
1. **Backend** (Node.js/Express) - API server
2. **Frontend** (React/Vite) - Web application
3. **MLOps** (Python/FastAPI) - ML model serving
4. **Simulator** (Python/FastAPI) - Sensor data simulator
5. **Line Bot** (Node.js/Express) - LINE messaging integration

Plus **2 managed services**:
6. **PostgreSQL 16** (with TimescaleDB extension)
7. **Redis 7**

---

## Quick Setup (Automated)

Run the automated setup script:

```bash
# 1. Login to Railway
railway login

# 2. Link to your project
cd /Users/khiwn/nt-poc/nt-poc
railway link --project battery-rul-monitoring

# 3. Run the environment setup script
./setup-shared-env.sh
```

---

## Manual Setup via Railway Dashboard

If you prefer to set variables manually or the script doesn't work, follow these steps:

### Step 1: Add Database Services

1. Go to [Railway Dashboard](https://railway.app/project/battery-rul-monitoring)
2. Click **"New"** → **"Database"** → **"PostgreSQL"**
3. Click **"New"** → **"Database"** → **"Redis"**

### Step 2: Enable TimescaleDB Extension

```bash
railway run psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### Step 3: Link Databases to Services

In the Railway Dashboard:
- **PostgreSQL** → Link to: `backend`, `mlops`
- **Redis** → Link to: `backend`, `mlops`

---

## Environment Variables by Service

### 🔧 Backend Service

#### Required (Auto-provided by Railway plugins):
```bash
DATABASE_URL       # From PostgreSQL plugin
DB_HOST            # From PostgreSQL plugin
DB_PORT            # From PostgreSQL plugin
DB_NAME            # From PostgreSQL plugin
DB_USER            # From PostgreSQL plugin
DB_PASSWORD        # From PostgreSQL plugin
REDIS_URL          # From Redis plugin
```

#### Required (Set manually):
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRY=24h
LOG_LEVEL=info
DB_SSL=true
```

#### Internal Service URLs:
```bash
MLOPS_SERVICE_URL=http://mlops.railway.internal:8001
```

#### Job Configuration:
```bash
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5
```

#### Email (Optional - requires SendGrid):
```bash
SENDGRID_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=alerts@yourdomain.com
EMAIL_FROM_NAME=Battery Management System
DASHBOARD_BASE_URL=https://<your-frontend-domain>.railway.app
```

#### Monitoring (Optional):
```bash
SENTRY_DSN=<your-sentry-dsn>
METRICS_AUTH_TOKEN=<random-token>
MONITORING_AUTH_TOKEN=<random-token>
```

---

### 🎨 Frontend Service

#### Required (Set manually):
```bash
NODE_ENV=production
VITE_APP_NAME=Battery Management System
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

#### API Endpoints (Set after deploying backend/mlops):
```bash
VITE_API_BASE_URL=https://<backend-domain>.railway.app/api/v1
VITE_MLOPS_SERVICE_URL=https://<mlops-domain>.railway.app
```

#### Feature Flags:
```bash
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_DEBUG_MODE=false
```

#### UI Settings:
```bash
VITE_DEFAULT_THEME=light
VITE_ENABLE_DARK_MODE=true
```

#### Monitoring (Optional):
```bash
VITE_SENTRY_DSN=<your-frontend-sentry-dsn>
```

---

### 🤖 MLOps Service

#### Required (Set manually):
```bash
APP_NAME=MLOps Service
ENVIRONMENT=production
PORT=8001
LOG_LEVEL=INFO
MODELS_DIR=/app/models
MODEL_VERSION=v1.0.0
WORKER_PROCESSES=2
MAX_BATCH_SIZE=100
```

#### Optional (Auto-provided if linked):
```bash
REDIS_URL           # From Redis plugin (optional)
DATABASE_URL        # From PostgreSQL plugin (optional)
```

#### CORS Configuration:
```bash
CORS_ORIGINS=["https://<frontend-domain>.railway.app"]
```

---

### 🔬 Simulator Service

#### Required (Set manually):
```bash
APP_NAME=Sensor Simulator
PORT=8002
SIMULATION_INTERVAL=5
```

#### Internal Service URL:
```bash
BACKEND_API_URL=http://backend.railway.internal:3000
```

---

### 💬 Line Bot Service

#### Required (Set manually):
```bash
NODE_ENV=production
PORT=3001
```

#### LINE API Credentials (Get from LINE Developers Console):
```bash
LINE_CHANNEL_ACCESS_TOKEN=<your-line-channel-token>
LINE_CHANNEL_SECRET=<your-line-channel-secret>
```

#### Internal Service URL:
```bash
BACKEND_API_URL=http://backend.railway.internal:3000
```

---

## Railway Internal Networking

Services can communicate privately using `.railway.internal` domains:

```bash
backend.railway.internal:3000      # Backend API
frontend.railway.internal:80       # Frontend (not typically used)
mlops.railway.internal:8001        # MLOps API
simulator.railway.internal:8002    # Simulator API
line-bot.railway.internal:3001     # Line Bot API
postgres.railway.internal:5432     # PostgreSQL
redis.railway.internal:6379        # Redis
```

**Example:** Backend calling MLOps:
```bash
MLOPS_SERVICE_URL=http://mlops.railway.internal:8001
```

---

## Setting Variables via CLI

### Set a variable for a specific service:
```bash
railway variables --service backend set JWT_SECRET=<your-secret>
```

### Set multiple variables:
```bash
railway variables --service backend set \
  NODE_ENV=production \
  PORT=3000 \
  LOG_LEVEL=info
```

### View all variables for a service:
```bash
railway variables --service backend
```

### Copy variables from one environment to another:
```bash
railway variables --service backend --environment production
```

---

## Deployment Order

**IMPORTANT:** Deploy in this order to avoid connection issues:

1. **PostgreSQL** (via Dashboard)
2. **Redis** (via Dashboard)
3. **MLOps** (depends on Redis, PostgreSQL)
4. **Backend** (depends on PostgreSQL, Redis, MLOps)
5. **Simulator** (depends on Backend)
6. **Line Bot** (depends on Backend)
7. **Frontend** (depends on Backend, MLOps)

---

## Verification Checklist

After setting up all environment variables:

- [ ] PostgreSQL database created and linked to backend/mlops
- [ ] Redis cache created and linked to backend/mlops
- [ ] TimescaleDB extension enabled
- [ ] JWT_SECRET generated and set for backend
- [ ] All backend environment variables set
- [ ] All frontend environment variables set (including API URLs)
- [ ] MLOps environment variables set
- [ ] Simulator environment variables set
- [ ] Line Bot API credentials set
- [ ] Internal networking URLs configured (.railway.internal)
- [ ] Public domain URLs configured for frontend

---

## Troubleshooting

### Issue: Services can't connect to database
**Solution:** Make sure PostgreSQL is linked to the service in Railway Dashboard

### Issue: Frontend can't reach backend API
**Solution:** Update `VITE_API_BASE_URL` with the correct Railway public domain

### Issue: Backend can't reach MLOps
**Solution:** Use internal networking URL: `http://mlops.railway.internal:8001`

### Issue: Environment variables not taking effect
**Solution:** Redeploy the service after changing variables:
```bash
railway up --service <service-name>
```

---

## Generate Secure Tokens

### JWT Secret:
```bash
openssl rand -base64 32
```

### Auth Tokens:
```bash
openssl rand -hex 32
```

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Environment Variables Guide](https://docs.railway.app/develop/variables)
- [Private Networking](https://docs.railway.app/reference/private-networking)
- [Project Tokens](https://docs.railway.app/develop/cli#project-tokens)
