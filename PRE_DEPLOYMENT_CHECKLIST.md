# Pre-Deployment Checklist

**NT-POC Production Fleet - Railway Docker Deployment**  
**Fleet:** 1,944 batteries | 9 data centers | 4 services

---

## ✅ Configuration Status

### Docker Files
- [x] `services/backend/Dockerfile` - Multi-stage Node.js build
- [x] `services/simulator/Dockerfile` - Python FastAPI service
- [x] `services/mlops/Dockerfile` - Python ML service with TensorFlow
- [x] `services/frontend/Dockerfile` - React + Nginx
- [x] `services/frontend/nginx.conf` - Nginx SPA routing configuration

### Docker Ignore Files
- [x] `services/backend/.dockerignore`
- [x] `services/simulator/.dockerignore`
- [x] `services/mlops/.dockerignore`
- [x] `services/frontend/.dockerignore`

### Railway Configuration
- [x] `services/backend/railway.toml` - Docker builder configured
- [x] `services/simulator/railway.toml` - Docker builder configured
- [x] `services/mlops/railway.toml` - Docker builder configured
- [x] `services/frontend/railway.toml` - Docker builder configured

### Local Testing
- [x] `docker-compose.yml` - Complete local development environment

### Deployment Scripts
- [x] `deploy-railway.sh` - Automated Railway deployment script (executable)

---

## 🔍 Pre-Deployment Validation

### Step 1: Test Locally with Docker Compose

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f simulator
docker-compose logs -f mlops
docker-compose logs -f frontend

# Test endpoints
curl http://localhost:3000/api/v1/health      # Backend
curl http://localhost:8001/health             # Simulator
curl http://localhost:8002/health             # MLOps
curl http://localhost:8080/health             # Frontend

# Stop services
docker-compose down
```

**Expected Results:**
- ✅ All services start without errors
- ✅ Health checks return 200 OK
- ✅ Backend connects to PostgreSQL
- ✅ Database migrations run successfully
- ✅ Frontend loads in browser at http://localhost:8080

---

### Step 2: Verify Environment Variables

#### Backend `.env` (Required)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_SSL=true

# Server
NODE_ENV=production
PORT=3000

# Background Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5

# Sensor Ingestion
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000
SIMULATOR_URL=<will be set by Railway>

# Monitoring
SENTRY_DSN=<optional>
```

#### Simulator `.env` (Required)
```bash
ENVIRONMENT=production
PORT=8001
SIMULATOR_CACHE_SIZE=500
BATCH_MAX_SIZE=200
BATCH_PARALLEL_WORKERS=10
LOG_LEVEL=INFO
```

#### MLOps `.env` (Required)
```bash
ENVIRONMENT=production
PORT=8001
BATCH_MAX_SIZE=500
BATCH_PARALLEL_WORKERS=10
MODEL_CACHE_SIZE=4
PREDICTION_BATCH_SIZE=50
FEATURE_WINDOW_SIZE=10
LOG_LEVEL=INFO
```

#### Frontend `.env` (Required)
```bash
VITE_API_URL=<will be set by Railway>
VITE_MAPBOX_TOKEN=<optional>
VITE_GEMINI_API_KEY=<optional>
```

---

### Step 3: Verify Railway CLI Setup

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Verify authentication
railway whoami

# Link to project (if already created)
railway link
```

**Expected Output:**
```
✅ Logged in as: your-email@example.com
✅ Authentication successful
```

---

### Step 4: Review Database Seed Data

The deployment script will automatically seed 1,944 batteries. Verify the seed script exists:

```bash
# Check if seed script exists
ls -l services/backend/seeds/001_production_fleet.ts

# Review seed data structure (optional)
cat services/backend/seeds/001_production_fleet.ts | head -50
```

**Expected Data Structure:**
- 9 facilities (data centers)
- 81 strings (9 per facility)
- 1,944 batteries (24 per string)
- Each battery: HX12-120 VRLA (12V, 120Ah, 1.44 kWh)

---

### Step 5: Check Model Files (MLOps)

MLOps service requires trained model files:

```bash
# Check if model directory exists
ls -l services/mlops/models/

# Expected files
# - rul_model.h5 (50-200 MB) - LSTM model
# - scaler.pkl (optional) - Data scaler
# - feature_names.json (optional) - Feature metadata
```

**⚠️ IMPORTANT:** If model files don't exist:

**Option A:** Include in Docker image (if < 100 MB)
```dockerfile
# In services/mlops/Dockerfile
COPY models ./models
```

**Option B:** Upload to Railway volume after deployment
```bash
railway run --service mlops mkdir -p models
railway run --service mlops --volume models:./models bash
# Then upload files via Railway dashboard
```

**Option C:** Download on startup (recommended for large models)
```python
# Add to services/mlops/src/main.py startup
import urllib.request
if not os.path.exists("models/rul_model.h5"):
    urllib.request.urlretrieve("https://your-storage-url/rul_model.h5", "models/rul_model.h5")
```

---

## 🚀 Deployment Process

### Automated Deployment (Recommended)

```bash
# Make script executable
chmod +x deploy-railway.sh

# Run deployment script
./deploy-railway.sh
```

**The script will:**
1. ✅ Initialize Railway project
2. ✅ Provision PostgreSQL database
3. ✅ Deploy backend service
4. ✅ Run database migrations
5. ✅ Seed production data (1,944 batteries)
6. ✅ Deploy simulator service
7. ✅ Deploy MLOps service
8. ✅ Deploy frontend service
9. ✅ Link services with environment variables

**Estimated Time:** 10-15 minutes

---

### Manual Deployment (Alternative)

See `RAILWAY_DOCKER_DEPLOYMENT.md` for step-by-step manual deployment instructions.

---

## 🔍 Post-Deployment Verification

### Step 1: Check Service Status

```bash
# View all services
railway status

# Expected output:
# ✓ backend    (running)
# ✓ simulator  (running)
# ✓ mlops      (running)
# ✓ frontend   (running)
# ✓ postgresql (running)
```

### Step 2: Test Health Endpoints

```bash
# Get service URLs
cd services/backend && railway domain
cd ../simulator && railway domain
cd ../mlops && railway domain
cd ../frontend && railway domain

# Test health endpoints
curl https://backend-url.up.railway.app/api/v1/health
curl https://simulator-url.up.railway.app/health
curl https://mlops-url.up.railway.app/health
curl https://frontend-url.up.railway.app/health
```

**Expected Response:** All return `200 OK` with health status

### Step 3: Verify Database

```bash
cd services/backend

# Check battery count
railway run bash -c 'psql $DATABASE_URL -c "SELECT COUNT(*) FROM battery_systems;"'
# Expected: 1944

# Check facility count
railway run bash -c 'psql $DATABASE_URL -c "SELECT COUNT(*) FROM facilities;"'
# Expected: 9

# Check string count
railway run bash -c 'psql $DATABASE_URL -c "SELECT COUNT(*) FROM zones WHERE zone_type = '\''STRING'\'';"'
# Expected: 81
```

### Step 4: Test API Endpoints

```bash
# Get fleet summary
curl https://backend-url.up.railway.app/api/v1/battery-systems/fleet/summary

# Expected response:
{
  "totalBatteries": 1944,
  "totalFacilities": 9,
  "totalStrings": 81,
  "totalCapacityKwh": 2799.36,
  ...
}

# Test simulator batch endpoint
curl -X POST https://simulator-url.up.railway.app/api/v1/sensors/readings/batch \
  -H "Content-Type: application/json" \
  -d '{"battery_system_ids": ["BAT-001", "BAT-002"]}'

# Expected: Sensor readings for 2 batteries
```

### Step 5: Test Frontend

```bash
# Open frontend in browser
open https://frontend-url.up.railway.app

# Verify:
# ✅ Dashboard loads
# ✅ Battery count shows "1.9k"
# ✅ Facility count shows "9"
# ✅ Map displays 9 facility locations
# ✅ Battery list pagination works (50 per page)
```

---

## 📊 Performance Validation

### Expected Performance Metrics

**Backend:**
- Response time: < 200ms (p95)
- Health check: < 50ms
- Database query: < 100ms
- Concurrent users: 100+

**Simulator:**
- Single reading: < 50ms
- Batch (200 batteries): < 2s
- Cache hit rate: 70-80%
- Memory usage: ~250 MB

**MLOps:**
- Single prediction: < 100ms
- Batch (500 batteries): < 20s
- Model load time: < 5s
- Memory usage: ~600 MB

**Frontend:**
- Initial load: < 3s
- Page navigation: < 500ms
- Bundle size: < 2 MB
- Lighthouse score: > 90

---

## 🔧 Monitoring & Logs

### View Logs

```bash
# Backend logs
cd services/backend
railway logs --follow

# Simulator logs
cd services/simulator
railway logs --follow

# MLOps logs
cd services/mlops
railway logs --follow

# Frontend logs
cd services/frontend
railway logs --follow
```

### Key Log Patterns to Watch

**Backend (Success):**
```
✅ Database connected successfully
✅ TimescaleDB extension verified
✅ Migrations completed: 15
✅ Server started on port 3000
✅ scheduled_prediction_job_active
✅ sensor_ingestion_run_completed
```

**Backend (Errors to Watch):**
```
❌ Database connection failed
❌ Migration failed
❌ TimescaleDB extension not found
❌ Unable to connect to simulator
```

**Simulator (Success):**
```
✅ Application startup complete
✅ Cache initialized (size: 500)
✅ Batch workers: 10
✅ Health check endpoint active
```

**MLOps (Success):**
```
✅ Application startup complete
✅ Model loaded: rul_model.h5
✅ Batch processing enabled
✅ TensorFlow initialized
```

---

## 🐛 Troubleshooting

### Issue: Backend can't connect to database

**Solution:**
```bash
cd services/backend
railway variables get DATABASE_URL
railway variables set DB_SSL=true
railway restart
```

### Issue: Migrations fail

**Solution:**
```bash
cd services/backend
railway run npm run migrate:rollback  # Rollback if needed
railway run npm run migrate           # Re-run migrations
```

### Issue: Simulator not responding

**Solution:**
```bash
cd services/simulator
railway logs --tail 100               # Check recent logs
railway restart                       # Restart service
```

### Issue: MLOps model not found

**Solution:**
```bash
cd services/mlops
railway run ls -la models/            # Check if model exists
# If missing, upload model (see Step 5 above)
```

### Issue: Frontend shows "Network Error"

**Solution:**
```bash
cd services/frontend
railway variables get VITE_API_URL    # Check backend URL
# Update if needed:
railway variables set VITE_API_URL="https://backend-url.up.railway.app"
railway restart
```

### Issue: Slow performance

**Check resource usage:**
```bash
railway status  # Check CPU/Memory usage
```

**Scale if needed (Railway dashboard):**
- Backend: Increase to 2GB RAM
- MLOps: Increase to 4GB RAM
- Enable horizontal scaling

---

## 📋 Deployment Checklist Summary

### Before Deployment
- [ ] Local Docker testing passed
- [ ] Environment variables configured
- [ ] Railway CLI authenticated
- [ ] Database seed data verified
- [ ] MLOps model files ready

### During Deployment
- [ ] Railway project created
- [ ] PostgreSQL provisioned
- [ ] All 4 services deployed
- [ ] Database migrations completed
- [ ] Production data seeded

### After Deployment
- [ ] All services running (railway status)
- [ ] Health checks passing
- [ ] Database contains 1,944 batteries
- [ ] API endpoints responding
- [ ] Frontend loads successfully
- [ ] Performance metrics acceptable
- [ ] Logs show no errors

---

## 📚 Additional Resources

- **Deployment Guide:** `RAILWAY_DOCKER_DEPLOYMENT.md`
- **Quick Reference:** `DOCKER_QUICK_REFERENCE.md`
- **Frontend Config:** `FRONTEND_PRODUCTION_FLEET_CONFIG_SUMMARY.md`
- **Simulator Optimization:** `SIMULATOR_PRODUCTION_OPTIMIZATION_SUMMARY.md`
- **MLOps Optimization:** `MLOPS_PRODUCTION_OPTIMIZATION_SUMMARY.md`

---

## 🎯 Success Criteria

✅ **Deployment is successful when:**

1. All 4 services are running on Railway
2. Health checks return 200 OK
3. Database contains 1,944 batteries across 9 facilities
4. Frontend displays correct fleet statistics
5. API endpoints respond within performance targets
6. No critical errors in logs
7. System handles production load (100+ concurrent users)

---

**Deployment Status:** ✅ READY FOR DEPLOYMENT

Last Updated: 2026-01-17
