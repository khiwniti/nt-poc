# ✅ Railway Docker Deployment - Complete

**Status**: Ready to Deploy  
**Date**: 2026-01-17  
**Method**: Docker + Railway CLI  

---

## 🎉 What's Been Configured

### ✅ Dockerfiles Created (4 services)
- **Backend**: Multi-stage Node.js build (~150 MB)
- **Simulator**: Python FastAPI service (~200 MB)
- **MLOps**: Python ML service with TensorFlow (~500 MB)
- **Frontend**: React + Nginx (~50 MB)

### ✅ Railway Configuration
- **railway.toml** for each service (Docker-based)
- **.dockerignore** files to optimize builds
- **Health checks** configured for all services
- **Auto-restart** policies on failure

### ✅ Local Development
- **docker-compose.yml** for complete local testing
- **nginx.conf** for frontend production serving
- All services networked together

### ✅ Deployment Automation
- **deploy-railway.sh** - One-command deployment script
- Provisions PostgreSQL with TimescaleDB
- Deploys all 4 services automatically
- Runs migrations and seeds data
- Configures service URLs

---

## 🚀 Deploy Now (3 Steps)

### Step 1: Ensure Railway CLI is Ready
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Verify
railway whoami
```

### Step 2: Run Deployment Script
```bash
# Make executable
chmod +x deploy-railway.sh

# Deploy everything
./deploy-railway.sh
```

**Script will**:
1. ✅ Create Railway project
2. ✅ Provision PostgreSQL database
3. ✅ Deploy backend (with migrations)
4. ✅ Seed 1,944 batteries
5. ✅ Deploy simulator
6. ✅ Deploy MLOps
7. ✅ Deploy frontend
8. ✅ Link all services together

### Step 3: Verify Deployment
```bash
# Check all services
railway status

# Get URLs
cd services/frontend && railway domain
cd ../backend && railway domain

# Test health
curl https://your-backend-url.railway.app/api/v1/health
```

---

## 🧪 Test Locally First (Recommended)

```bash
# Start all services with Docker Compose
docker-compose up -d

# Wait for services to be healthy (~60 seconds)
docker-compose ps

# Check logs
docker-compose logs -f

# Test endpoints
curl http://localhost:3000/api/v1/health     # Backend
curl http://localhost:8001/health            # Simulator
curl http://localhost:8002/health            # MLOps
curl http://localhost/health                 # Frontend

# Open frontend
open http://localhost

# Stop when done
docker-compose down
```

---

## 📦 What Each Dockerfile Does

### Backend Dockerfile
```dockerfile
# Stage 1: Build TypeScript
FROM node:18-alpine AS builder
- Installs dependencies
- Builds TypeScript to JavaScript
- Creates dist/ folder

# Stage 2: Production
FROM node:18-alpine
- Copies built files only
- Production dependencies only
- Runs migrations on startup
- Starts Express server

CMD: npm run migrate && node dist/index.js
```

### Simulator Dockerfile
```dockerfile
FROM python:3.11-slim
- Installs FastAPI + dependencies
- Copies app code
- Runs uvicorn with 2 workers

CMD: uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2
```

### MLOps Dockerfile
```dockerfile
FROM python:3.11-slim
- Installs TensorFlow + ML libraries
- Copies src code
- Creates models directory
- Runs uvicorn with 2 workers

CMD: uvicorn src.main:app --host 0.0.0.0 --port 8001 --workers 2
```

### Frontend Dockerfile
```dockerfile
# Stage 1: Build React
FROM node:18-alpine AS builder
- Installs dependencies
- Runs Vite build
- Creates dist/ folder

# Stage 2: Nginx
FROM nginx:alpine
- Copies built files to nginx
- Includes nginx.conf for SPA routing
- Serves on port 80

CMD: nginx -g "daemon off;"
```

---

## 🔧 Environment Variables Reference

### Backend
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...              # Auto-set by Railway
DB_SSL=true
SIMULATOR_URL=https://simulator.railway.app
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000
```

### Simulator
```bash
ENVIRONMENT=production
PORT=8001
SIMULATOR_CACHE_SIZE=500
BATCH_MAX_SIZE=200
BATCH_PARALLEL_WORKERS=10
LOG_LEVEL=INFO
```

### MLOps
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

### Frontend
```bash
VITE_API_URL=https://backend.railway.app
VITE_MAPBOX_TOKEN=your-token              # Optional
VITE_GEMINI_API_KEY=your-key              # Optional
```

---

## ⚠️ Important Notes

### MLOps Model File
The MLOps service needs the trained model file (`rul_lstm_model.h5`). You have 3 options:

**Option 1**: Include in Docker image (if < 100 MB)
```bash
# Place model in services/mlops/models/
# Remove from .dockerignore
# Railway will include it in build
```

**Option 2**: Upload to Railway volume
```bash
cd services/mlops
railway volume create models
railway volume mount models /app/models
railway run bash -c "curl -o /app/models/rul_lstm_model.h5 YOUR_URL"
```

**Option 3**: Download on startup
```bash
# Set environment variable
railway variables set MODEL_URL=https://your-storage/model.h5

# Update Dockerfile CMD to download first
CMD ["sh", "-c", "curl -o /app/models/rul_lstm_model.h5 $MODEL_URL && uvicorn ..."]
```

### Database Seeding
The deployment script automatically seeds 1,944 batteries. To verify:
```bash
cd services/backend
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM battery_systems;"
# Expected: 1944
```

### Service URLs
After deployment, get URLs with:
```bash
cd services/frontend && railway domain  # Frontend URL
cd ../backend && railway domain          # Backend API URL
```

Update frontend to use backend URL:
```bash
cd services/frontend
railway variables set VITE_API_URL=https://your-backend-url.railway.app
railway up  # Redeploy frontend
```

---

## 📊 Expected Results

After successful deployment:

✅ **PostgreSQL**: Provisioned with TimescaleDB extension  
✅ **Backend**: Running on Railway with 1,944 batteries seeded  
✅ **Simulator**: Responding to sensor requests  
✅ **MLOps**: Ready for predictions (if model uploaded)  
✅ **Frontend**: Accessible via public URL  

**Health Checks**: All passing  
**Data Flow**: Simulator → Backend → Database  
**Predictions**: Backend → MLOps → Database  
**Frontend**: Displays real-time data from backend  

---

## 🎯 Next Steps After Deployment

1. **Verify Services**
   ```bash
   railway status
   ```

2. **Check Health**
   ```bash
   curl https://backend-url/api/v1/health
   curl https://simulator-url/health
   curl https://mlops-url/health
   ```

3. **Test Frontend**
   - Visit frontend URL
   - Check dashboard shows 1.9k batteries
   - Verify 9 facilities displayed
   - Test pagination (39 pages)

4. **Monitor Logs**
   ```bash
   railway logs --service backend --follow
   ```

5. **Set Up Custom Domain** (Optional)
   ```bash
   railway domain add your-domain.com --service frontend
   ```

6. **Configure Monitoring** (Optional)
   - Set up Railway alerts
   - Configure Sentry for error tracking
   - Add Prometheus metrics

---

## 📚 Documentation Files

All documentation created:
- ✅ `RAILWAY_DOCKER_DEPLOYMENT.md` - Complete deployment guide
- ✅ `DOCKER_QUICK_REFERENCE.md` - Quick command reference
- ✅ `docker-compose.yml` - Local development environment
- ✅ `deploy-railway.sh` - Automated deployment script
- ✅ This summary document

**Dockerfiles**: 4 services  
**Railway Configs**: 4 railway.toml files  
**Nginx Config**: Frontend SPA routing  
**Docker Ignore**: 4 .dockerignore files  

---

## 🚀 Ready to Deploy!

Everything is configured and ready. Choose your path:

**Option A - Full Automated Deployment**:
```bash
./deploy-railway.sh
```

**Option B - Test Locally First**:
```bash
docker-compose up -d
# Test everything
docker-compose down
./deploy-railway.sh
```

**Option C - Manual Step-by-Step**:
Follow `RAILWAY_DOCKER_DEPLOYMENT.md` for detailed manual deployment.

---

**Status**: ✅ **READY TO DEPLOY**  
**Configuration**: Complete  
**Testing**: Local testing ready  
**Automation**: Deployment script ready  
**Documentation**: Comprehensive guides created

🎉 **Your production fleet system is ready for Railway!** 🎉
