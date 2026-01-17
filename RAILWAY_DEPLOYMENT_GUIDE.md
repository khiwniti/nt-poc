# Railway Deployment Guide - Production Fleet System

**Fleet Scale**: 1,944 batteries across 9 data centers  
**Deployment Method**: Railway CLI  
**Last Updated**: 2026-01-17  

---

## 🚀 Quick Start - Railway Deployment

### Prerequisites

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Verify login
railway whoami
```

---

## 📋 Pre-Deployment Checklist

- [ ] Railway account created and verified
- [ ] Railway CLI installed and authenticated
- [ ] Git repository pushed to GitHub/GitLab
- [ ] All environment variables documented
- [ ] Database backup strategy planned
- [ ] Monitoring setup ready

---

## 🏗️ Project Structure Setup

### Step 1: Initialize Railway Project

```bash
# Navigate to project root
cd /Users/khiwn/nt-poc/nt-poc

# Initialize Railway project
railway init

# Select "Create new project"
# Enter project name: "nt-poc-production"
# Select "Empty Project"
```

### Step 2: Link to Railway Project

```bash
# Link current directory to Railway project
railway link

# Verify linking
railway status
```

---

## 🗄️ Database Deployment (PostgreSQL + TimescaleDB)

### Option A: Railway PostgreSQL Plugin (Recommended)

```bash
# Add PostgreSQL plugin
railway add --plugin postgresql

# This automatically:
# - Provisions PostgreSQL 15
# - Sets DATABASE_URL environment variable
# - Configures connection pooling
```

**Note**: Railway's PostgreSQL doesn't include TimescaleDB by default. You need to enable it:

```bash
# After PostgreSQL is provisioned, get connection details
railway variables

# Connect to database
railway run psql $DATABASE_URL

# Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

# Verify installation
SELECT extversion FROM pg_extension WHERE extname='timescaledb';
```

### Option B: External TimescaleDB (Production Alternative)

If Railway's PostgreSQL doesn't support TimescaleDB or for better performance:

1. Use Timescale Cloud (https://www.timescale.com/)
2. Or use Railway's PostgreSQL and manually install TimescaleDB
3. Set `DATABASE_URL` manually in Railway variables

```bash
# Set external database URL
railway variables set DATABASE_URL="postgresql://user:password@host:port/dbname"
```

---

## 🔧 Backend Service Deployment

### Step 1: Create Backend Service

```bash
# Create backend service
railway service create backend

# Link to backend service
railway service link backend
```

### Step 2: Configure Environment Variables

```bash
# Navigate to backend directory
cd services/backend

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set DB_SSL=true

# Background Jobs
railway variables set PREDICTION_JOB_INTERVAL_MINUTES=60
railway variables set ESCALATION_JOB_INTERVAL_MINUTES=5

# Sensor Ingestion
railway variables set SENSOR_INGESTION_ENABLED=true
railway variables set SENSOR_INGESTION_INTERVAL=10000
railway variables set SIMULATOR_URL=https://simulator.railway.app

# Get DATABASE_URL from PostgreSQL plugin
# It's automatically set by Railway when you add PostgreSQL
```

### Step 3: Create Railway Configuration

Create `railway.toml` in `services/backend/`:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm run migrate && node dist/index.js"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

[[healthcheck]]
path = "/api/v1/health"
interval = 30
timeout = 10
```

### Step 4: Deploy Backend

```bash
# From services/backend directory
railway up

# Monitor deployment logs
railway logs

# Get deployment URL
railway domain
```

### Step 5: Run Migrations and Seed Data

```bash
# Run migrations
railway run npm run migrate

# Seed production data (1,944 batteries)
railway run npm run seed:production

# Verify data
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM battery_systems;"
# Expected: 1944
```

---

## 🤖 Simulator Service Deployment

### Step 1: Create Simulator Service

```bash
# Return to project root
cd /Users/khiwn/nt-poc/nt-poc

# Create simulator service
railway service create simulator

# Navigate to simulator directory
cd services/simulator

# Link to simulator service
railway service link simulator
```

### Step 2: Configure Environment Variables

```bash
# Set environment variables
railway variables set ENVIRONMENT=production
railway variables set PORT=8001

# Production optimization
railway variables set SIMULATOR_CACHE_SIZE=500
railway variables set BATCH_MAX_SIZE=200
railway variables set BATCH_PARALLEL_WORKERS=10

railway variables set LOG_LEVEL=INFO
```

### Step 3: Create Railway Configuration

Create `railway.toml` in `services/simulator/`:

```toml
[build]
builder = "nixpacks"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

[[healthcheck]]
path = "/health"
interval = 30
timeout = 10
```

### Step 4: Deploy Simulator

```bash
# From services/simulator directory
railway up

# Monitor deployment
railway logs

# Get deployment URL
railway domain

# Save URL for backend configuration
SIMULATOR_URL=$(railway domain)
```

### Step 5: Update Backend with Simulator URL

```bash
# Switch to backend service
cd ../backend
railway service link backend

# Update simulator URL
railway variables set SIMULATOR_URL=https://simulator-production.up.railway.app
```

---

## 🧠 MLOps Service Deployment

### Step 1: Create MLOps Service

```bash
# Return to project root
cd /Users/khiwn/nt-poc/nt-poc

# Create mlops service
railway service create mlops

# Navigate to mlops directory
cd services/mlops

# Link to mlops service
railway service link mlops
```

### Step 2: Upload Model File

**Important**: Model file must be included in deployment or uploaded to Railway storage.

```bash
# Option A: Commit model file to git (if < 100MB)
git lfs track "services/mlops/models/*.h5"
git add services/mlops/models/rul_lstm_model.h5
git commit -m "Add trained RUL model"
git push

# Option B: Use Railway volumes (recommended for large models)
railway volume create models
railway volume mount models /app/models

# Then upload model via Railway CLI
railway run --service mlops bash -c "curl -o /app/models/rul_lstm_model.h5 YOUR_MODEL_URL"
```

### Step 3: Configure Environment Variables

```bash
# Set environment variables
railway variables set ENVIRONMENT=production
railway variables set PORT=8001

# CORS - Add your domains
railway variables set CORS_ORIGINS='["https://backend.railway.app","https://frontend.railway.app"]'

# Model configuration
railway variables set MODELS_DIR=models
railway variables set RUL_MODEL_PATH=/app/models/rul_lstm_model.h5

# Production batch processing
railway variables set BATCH_MAX_SIZE=500
railway variables set BATCH_PARALLEL_WORKERS=10
railway variables set MODEL_CACHE_SIZE=4
railway variables set PREDICTION_BATCH_SIZE=50
railway variables set FEATURE_WINDOW_SIZE=10

railway variables set LOG_LEVEL=INFO
```

### Step 4: Create Railway Configuration

Create `railway.toml` in `services/mlops/`:

```toml
[build]
builder = "nixpacks"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn src.main:app --host 0.0.0.0 --port $PORT --workers 2"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

[[healthcheck]]
path = "/health"
interval = 30
timeout = 10
```

### Step 5: Deploy MLOps

```bash
# From services/mlops directory
railway up

# Monitor deployment
railway logs

# Verify health check
curl https://mlops-production.up.railway.app/health
```

---

## 🎨 Frontend Service Deployment

### Step 1: Create Frontend Service

```bash
# Return to project root
cd /Users/khiwn/nt-poc/nt-poc

# Create frontend service
railway service create frontend

# Navigate to frontend directory
cd services/frontend

# Link to frontend service
railway service link frontend
```

### Step 2: Configure Environment Variables

```bash
# Get backend URL first
cd ../backend
BACKEND_URL=$(railway domain)
cd ../frontend

# Set environment variables for build
railway variables set VITE_API_URL=https://$BACKEND_URL

# Optional: Add Mapbox and Gemini tokens
railway variables set VITE_MAPBOX_TOKEN=your-mapbox-token
railway variables set VITE_GEMINI_API_KEY=your-gemini-api-key
```

### Step 3: Create Railway Configuration

Create `railway.toml` in `services/frontend/`:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npx serve -s dist -l $PORT"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

[[healthcheck]]
path = "/"
interval = 30
timeout = 10
```

### Step 4: Deploy Frontend

```bash
# From services/frontend directory
railway up

# Monitor deployment
railway logs

# Get deployment URL
railway domain

# Visit frontend
open https://frontend-production.up.railway.app
```

---

## 🔗 Service Linking & Networking

Railway automatically provides private networking between services in the same project. Update service URLs:

```bash
# Backend service
cd services/backend
railway service link backend

# Use internal URLs for service-to-service communication
railway variables set MLOPS_INTERNAL_URL=mlops.railway.internal:8001
railway variables set SIMULATOR_INTERNAL_URL=simulator.railway.internal:8001

# MLOps service
cd ../mlops
railway service link mlops

# If backend needs to call MLOps, update backend
railway variables set MLOPS_URL=https://mlops-production.up.railway.app

# Or use internal networking (faster, no egress costs)
railway variables set MLOPS_URL=http://mlops.railway.internal:8001
```

---

## 📊 Complete Deployment Script

Create `deploy-railway.sh` in project root:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying NT-POC Production Fleet to Railway"
echo "================================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install: npm install -g @railway/cli"
    exit 1
fi

# Check authentication
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Run: railway login"
    exit 1
fi

echo ""
echo "${BLUE}Step 1: Creating Railway project${NC}"
railway init || echo "Project already initialized"

echo ""
echo "${BLUE}Step 2: Adding PostgreSQL${NC}"
railway add --plugin postgresql || echo "PostgreSQL already added"

echo ""
echo "${BLUE}Step 3: Deploying Backend Service${NC}"
cd services/backend
railway service create backend --yes || railway service link backend
railway variables set NODE_ENV=production PORT=3000 DB_SSL=true
railway variables set PREDICTION_JOB_INTERVAL_MINUTES=60
railway variables set ESCALATION_JOB_INTERVAL_MINUTES=5
railway variables set SENSOR_INGESTION_ENABLED=true
railway variables set SENSOR_INGESTION_INTERVAL=10000
railway up --detach
echo "${GREEN}✅ Backend deployed${NC}"

echo ""
echo "${BLUE}Step 4: Running Database Migrations${NC}"
sleep 30  # Wait for backend to be ready
railway run npm run migrate
railway run npm run seed:production
echo "${GREEN}✅ Database initialized with 1,944 batteries${NC}"

echo ""
echo "${BLUE}Step 5: Deploying Simulator Service${NC}"
cd ../simulator
railway service create simulator --yes || railway service link simulator
railway variables set ENVIRONMENT=production PORT=8001
railway variables set SIMULATOR_CACHE_SIZE=500
railway variables set BATCH_MAX_SIZE=200
railway variables set BATCH_PARALLEL_WORKERS=10
railway up --detach
SIMULATOR_URL=$(railway domain)
echo "${GREEN}✅ Simulator deployed: $SIMULATOR_URL${NC}"

echo ""
echo "${BLUE}Step 6: Updating Backend with Simulator URL${NC}"
cd ../backend
railway service link backend
railway variables set SIMULATOR_URL=https://$SIMULATOR_URL

echo ""
echo "${BLUE}Step 7: Deploying MLOps Service${NC}"
cd ../mlops
railway service create mlops --yes || railway service link mlops
railway variables set ENVIRONMENT=production PORT=8001
railway variables set BATCH_MAX_SIZE=500
railway variables set BATCH_PARALLEL_WORKERS=10
railway variables set MODEL_CACHE_SIZE=4
railway variables set PREDICTION_BATCH_SIZE=50
railway up --detach
echo "${GREEN}✅ MLOps deployed${NC}"

echo ""
echo "${BLUE}Step 8: Deploying Frontend Service${NC}"
cd ../frontend
BACKEND_URL=$(cd ../backend && railway domain)
railway service create frontend --yes || railway service link frontend
railway variables set VITE_API_URL=https://$BACKEND_URL
railway up --detach
FRONTEND_URL=$(railway domain)
echo "${GREEN}✅ Frontend deployed: $FRONTEND_URL${NC}"

echo ""
echo "${GREEN}================================================${NC}"
echo "${GREEN}🎉 Deployment Complete!${NC}"
echo "${GREEN}================================================${NC}"
echo ""
echo "Service URLs:"
echo "  Frontend:  https://$FRONTEND_URL"
echo "  Backend:   https://$BACKEND_URL"
echo "  Simulator: https://$SIMULATOR_URL"
echo ""
echo "Next steps:"
echo "  1. Verify all services: railway status"
echo "  2. Check logs: railway logs"
echo "  3. Monitor health: curl https://$BACKEND_URL/api/v1/health"
echo "  4. Visit frontend: open https://$FRONTEND_URL"
```

Make it executable and run:

```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

---

## 🔍 Post-Deployment Verification

### Check All Services

```bash
# View all services
railway status

# Check backend logs
railway logs --service backend

# Check simulator logs
railway logs --service simulator

# Check mlops logs
railway logs --service mlops

# Check frontend logs
railway logs --service frontend
```

### Verify Health Endpoints

```bash
# Backend health
curl https://backend-production.up.railway.app/api/v1/health

# Simulator health
curl https://simulator-production.up.railway.app/health

# MLOps health
curl https://mlops-production.up.railway.app/health
```

### Test Data Flow

```bash
# Get backend URL
BACKEND_URL=$(cd services/backend && railway domain)

# Test fleet summary
curl https://$BACKEND_URL/api/v1/battery-systems/fleet/summary

# Test sensor reading
curl https://$BACKEND_URL/api/v1/sensor-readings/latest/BAT-CM-R1-001

# Test prediction
curl -X POST https://$BACKEND_URL/api/v1/ml/predict/BAT-CM-R1-001
```

---

## 📈 Monitoring & Observability

### Railway Dashboard

Access Railway dashboard: https://railway.app/dashboard

**Metrics to Monitor**:
- CPU usage (should be 30-70% average)
- Memory usage (should be <80%)
- Network bandwidth
- Request count
- Error rate

### Custom Domain Setup

```bash
# Add custom domain to frontend
railway domain add your-domain.com --service frontend

# Add custom domain to backend
railway domain add api.your-domain.com --service backend

# Configure DNS
# Add CNAME record: your-domain.com -> railway-provided-domain
```

### Environment-Specific Deployments

```bash
# Create staging environment
railway environment create staging

# Deploy to staging
railway up --environment staging

# Create production environment
railway environment create production

# Deploy to production
railway up --environment production
```

---

## 💰 Cost Optimization

### Railway Pricing Considerations

**Starter Plan** ($5/month):
- 512 MB RAM per service
- 1 GB disk
- Shared CPU
- $0.000231/GB egress

**Developer Plan** ($20/month):
- 8 GB RAM
- 100 GB disk
- Shared CPU
- $0.000231/GB egress

**Team Plan** (Custom):
- Dedicated resources
- Priority support

### Optimization Tips

```bash
# 1. Use internal networking (no egress charges)
railway variables set SERVICE_URL=http://service.railway.internal:PORT

# 2. Reduce worker processes for smaller services
# In railway.toml:
startCommand = "uvicorn app.main:app --workers 1"  # Instead of 2

# 3. Enable hibernation for non-critical services
railway service update --enable-hibernation

# 4. Use caching to reduce database queries
railway variables set REDIS_URL=redis://redis.railway.internal:6379

# 5. Optimize build caching
# Railway automatically caches node_modules and pip packages
```

---

## 🔄 Rollback Procedures

### Rollback to Previous Deployment

```bash
# List deployments
railway deployments

# Rollback backend service
railway rollback --service backend

# Rollback to specific deployment
railway rollback --service backend --deployment-id <deployment-id>
```

### Database Rollback

```bash
# Rollback migration
railway run --service backend npm run migrate:rollback

# Rollback to specific version
railway run --service backend npm run migrate:rollback -- --to 20260111000000
```

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
railway logs --service backend --tail 100

# Common issues:
# 1. Missing environment variables
railway variables

# 2. Build failure
railway builds

# 3. Health check failing
railway service update --health-check-path /api/v1/health --health-check-timeout 30
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL

# Test connection
railway run --service backend psql $DATABASE_URL -c "SELECT 1;"

# Check SSL requirement
railway variables set DB_SSL=true
```

### Out of Memory

```bash
# Check memory usage
railway metrics --service backend

# Increase memory (upgrade plan) or optimize:
# 1. Reduce worker processes
# 2. Enable garbage collection
# 3. Add memory limits in code
```

### Slow Performance

```bash
# Check metrics
railway metrics --service backend

# Common fixes:
# 1. Add database indexes
railway run --service backend npm run migrate

# 2. Enable Redis caching
railway add --plugin redis

# 3. Scale horizontally (upgrade plan)
railway service scale --replicas 2
```

---

## 📋 Maintenance Tasks

### Daily Checks

```bash
# Check all services healthy
railway status

# Monitor error rates
railway logs --service backend | grep ERROR

# Verify database size
railway run psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('railway'));"
```

### Weekly Tasks

```bash
# Review resource usage
railway metrics

# Check for updates
cd services/backend && npm outdated
cd services/frontend && npm outdated

# Review logs for anomalies
railway logs --service backend --since 7d | grep -i warning
```

### Monthly Tasks

```bash
# Database maintenance
railway run psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Review TimescaleDB compression
railway run psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.compression_settings;"

# Update dependencies
npm update
pip list --outdated
```

---

## 🎯 Success Criteria

### Deployment Successful When:

- [ ] All services show "Active" in Railway dashboard
- [ ] Health checks passing for all services
- [ ] Database has 1,944 batteries (verified)
- [ ] Frontend loads and displays real data
- [ ] Sensor data flowing from simulator to backend
- [ ] Predictions generating successfully
- [ ] No critical errors in logs
- [ ] Response times meet SLAs (<200ms p95)

---

## 📞 Support

### Railway Support
- Dashboard: https://railway.app/dashboard
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

### Project Support
- Documentation: See `PRODUCTION_DEPLOYMENT_GUIDE.md`
- Backend Guide: `BACKEND_IMPLEMENTATION_QUICK_START.md`
- MLOps Guide: `MLOPS_QUICK_START.md`

---

**Status**: ✅ Railway Deployment Guide Complete  
**Last Updated**: 2026-01-17  
**Deployment Method**: Railway CLI  
**Production Ready**: Yes
