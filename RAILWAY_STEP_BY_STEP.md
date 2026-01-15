# Railway Deployment - Step-by-Step Guide

**Current Status:** ✅ Project created: `nt-poc-battery-management`

## Step 1: Enable TimescaleDB Extension ⚠️ CRITICAL

```bash
# Connect to PostgreSQL database
railway connect Postgres
```

This will open a `psql` prompt. Run these commands:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
\dx
\q
```

Expected output:
```
CREATE EXTENSION
                                      List of installed extensions
    Name     | Version |   Schema   |                            Description
-------------+---------+------------+-------------------------------------------------------------------
 plpgsql     | 1.0     | pg_catalog | PL/pgSQL procedural language
 timescaledb | 2.x.x   | public     | Enables scalable inserts and complex queries for time-series data
```

## Step 2: Deploy Services

Now let's deploy all services. You have two options:

### Option A: Automated Script (Recommended)

```bash
./deploy-railway.sh
```

When prompted:
- PostgreSQL added? → **y** (yes, we just added it)
- Redis added? → **y** (yes, we added it)
- Configure env vars? → **y** (yes, let the script set them up)
- Deploy now? → **y** (yes, deploy all services)
- Run migrations? → **y** (yes, after backend deploys)

### Option B: Manual Deployment

#### 2.1: Create Services

Railway needs you to create services first. Let's do this:

```bash
# Create backend service
railway service create backend

# Create frontend service
railway service create frontend

# Create mlops service
railway service create mlops

# Create simulator service
railway service create simulator

# Create line-bot service
railway service create line-bot
```

#### 2.2: Link Services to Code

Railway CLI v4 requires linking services to their source code:

```bash
# For each service, we need to link the source directory
# Backend
railway link --service backend
railway service link backend --source services/backend

# Frontend
railway link --service frontend
railway service link frontend --source services/frontend

# MLOps
railway link --service mlops
railway service link mlops --source services/mlops

# Simulator
railway link --service simulator
railway service link simulator --source services/simulator

# LINE Bot
railway link --service line-bot
railway service link line-bot --source services/line-bot
```

#### 2.3: Set Environment Variables

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

**Backend Variables:**
```bash
railway variables set --service backend \
  NODE_ENV=production \
  PORT=3000 \
  DB_SSL=true \
  JWT_SECRET="<paste-generated-secret>" \
  JWT_EXPIRY=24h \
  PREDICTION_JOB_INTERVAL_MINUTES=60 \
  ESCALATION_JOB_INTERVAL_MINUTES=5 \
  SENSOR_INGESTION_ENABLED=true \
  SENSOR_INGESTION_INTERVAL=10000 \
  LOG_LEVEL=info
```

**Link Backend to Databases:**
```bash
railway variables set --service backend \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  'DB_HOST=${{Postgres.PGHOST}}' \
  'DB_PORT=${{Postgres.PGPORT}}' \
  'DB_NAME=${{Postgres.PGDATABASE}}' \
  'DB_USER=${{Postgres.PGUSER}}' \
  'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
  'REDIS_URL=${{Redis.REDIS_URL}}'
```

**Backend Service URLs:**
```bash
railway variables set --service backend \
  MLOPS_SERVICE_URL=http://mlops.railway.internal:8000 \
  SIMULATOR_URL=http://simulator.railway.internal:8001
```

**Frontend Variables:**
```bash
railway variables set --service frontend \
  VITE_APP_NAME="Battery Management System" \
  VITE_ENVIRONMENT=production \
  NODE_ENV=production \
  GENERATE_SOURCEMAP=false
```

**MLOps Variables:**
```bash
railway variables set --service mlops \
  PORT=8000 \
  ENVIRONMENT=production \
  LOG_LEVEL=INFO \
  MODELS_DIR=/app/models \
  MODEL_VERSION=v1.0.0

railway variables set --service mlops \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  'DB_HOST=${{Postgres.PGHOST}}' \
  'DB_PORT=${{Postgres.PGPORT}}' \
  'DB_NAME=${{Postgres.PGDATABASE}}' \
  'DB_USER=${{Postgres.PGUSER}}' \
  'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
  'REDIS_URL=${{Redis.REDIS_URL}}'
```

**Simulator Variables:**
```bash
railway variables set --service simulator \
  PORT=8001 \
  SENSOR_BACKEND=simulator \
  SIMULATOR_NOISE_LEVEL=0.02 \
  SIMULATOR_DRIFT_ENABLED=true \
  SIMULATOR_UPDATE_INTERVAL_MS=1000
```

**LINE Bot Variables:**
```bash
railway variables set --service line-bot \
  PORT=3002 \
  NODE_ENV=production \
  BACKEND_API_URL=http://backend.railway.internal:3000
```

⚠️ **Manual Configuration Required:**
```bash
# You need to set these manually:
railway variables set --service line-bot \
  LINE_CHANNEL_ACCESS_TOKEN="<your-line-token>" \
  LINE_CHANNEL_SECRET="<your-line-secret>"
```

#### 2.4: Deploy Services

```bash
# Deploy all services
railway up

# OR deploy individually
railway up --service backend
railway up --service mlops
railway up --service simulator
railway up --service line-bot
railway up --service frontend
```

#### 2.5: Run Database Migrations

After backend deploys successfully:

```bash
railway run --service backend npm run migrate
```

## Step 3: Verify Deployment

### Check Status
```bash
railway status
```

### View Logs
```bash
# All services
railway logs

# Specific service
railway logs --service backend
```

### Get Service URLs
```bash
railway domain
```

### Test Health Endpoints

After getting your domains, test:
```bash
curl https://<backend-url>/api/v1/health
curl https://<mlops-url>/health
curl https://<simulator-url>/api/health
curl https://<line-bot-url>/health
```

### Update Frontend API URL

After backend is deployed:
```bash
# Get backend URL first
railway domain --service backend

# Set in frontend
railway variables set --service frontend \
  VITE_API_BASE_URL="https://<backend-url>/api"

# Redeploy frontend
railway up --service frontend
```

## Step 4: Configure LINE Webhook

After LINE Bot is deployed:

1. Get LINE Bot URL:
   ```bash
   railway domain --service line-bot
   ```

2. Go to LINE Developers Console: https://developers.line.biz/console/

3. Update Webhook URL: `https://<line-bot-url>/webhook`

4. Verify webhook is working

## Common Commands

```bash
# View all environment variables
railway variables --service backend

# Restart a service
railway restart --service backend

# Connect to database
railway connect Postgres

# Run a command in service
railway run --service backend npm run typecheck

# View metrics
railway metrics --service backend

# Stream logs
railway logs --service backend --follow
```

## Troubleshooting

### Build Fails
```bash
# Check logs
railway logs --service backend

# Verify railway.toml configuration
cat railway.toml
```

### Service Not Starting
```bash
# Check service logs
railway logs --service backend

# Verify environment variables
railway variables --service backend

# Check health endpoint path matches railway.toml
```

### Database Connection Issues
```bash
# Verify TimescaleDB extension
railway connect Postgres
\dx

# Check database variables are linked
railway variables --service backend | grep DATABASE
```

### Internal Networking Issues
```bash
# Verify service names match railway.toml
railway status

# Use .railway.internal domains between services
# Example: http://mlops.railway.internal:8000
```

## Next Steps

- [ ] Enable TimescaleDB extension
- [ ] Deploy all services
- [ ] Run database migrations
- [ ] Test all health endpoints
- [ ] Configure LINE webhook
- [ ] Update frontend API URL
- [ ] Test end-to-end functionality

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Dashboard: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
