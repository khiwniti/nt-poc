# Railway Deployment with Docker - Complete Guide

**Fleet Scale**: 1,944 batteries across 9 data centers  
**Deployment Method**: Railway CLI with Docker  
**Last Updated**: 2026-01-17  

---

## 🎯 Overview

All services now use **Dockerfile-based** deployment on Railway for:
- ✅ Consistent builds across environments
- ✅ Optimized layer caching
- ✅ Multi-stage builds for smaller images
- ✅ Built-in health checks
- ✅ Production-ready configurations

---

## 📦 Docker Images Overview

| Service | Base Image | Size | Build Time |
|---------|-----------|------|------------|
| Backend | node:18-alpine | ~150 MB | 2-3 min |
| Simulator | python:3.11-slim | ~200 MB | 3-4 min |
| MLOps | python:3.11-slim | ~500 MB | 4-5 min (TensorFlow) |
| Frontend | nginx:alpine | ~50 MB | 1-2 min |

---

## 🚀 Quick Deployment

### Method 1: Using Deployment Script

```bash
# Make script executable
chmod +x deploy-railway.sh

# Run deployment
./deploy-railway.sh
```

The script will:
1. Initialize Railway project
2. Provision PostgreSQL database
3. Deploy all 4 services with Docker
4. Run migrations and seed data
5. Configure service URLs

---

### Method 2: Manual Service-by-Service

#### Step 1: Initialize Railway

```bash
# Login to Railway
railway login

# Initialize project
railway init --name nt-poc-production

# Add PostgreSQL
railway add --plugin postgresql
```

#### Step 2: Deploy Backend

```bash
cd services/backend

# Create and link service
railway up --service backend

# Set environment variables
railway variables set \
  NODE_ENV=production \
  PORT=3000 \
  DB_SSL=true \
  PREDICTION_JOB_INTERVAL_MINUTES=60 \
  ESCALATION_JOB_INTERVAL_MINUTES=5 \
  SENSOR_INGESTION_ENABLED=true \
  SENSOR_INGESTION_INTERVAL=10000

# Deploy (Railway will use Dockerfile automatically)
railway up

# Run migrations
railway run npm run migrate

# Seed production data
railway run npm run seed:production
```

#### Step 3: Deploy Simulator

```bash
cd ../simulator

# Create and link service
railway up --service simulator

# Set environment variables
railway variables set \
  ENVIRONMENT=production \
  PORT=8001 \
  SIMULATOR_CACHE_SIZE=500 \
  BATCH_MAX_SIZE=200 \
  BATCH_PARALLEL_WORKERS=10

# Deploy
railway up

# Get URL and update backend
SIMULATOR_URL=$(railway domain)
cd ../backend
railway variables set SIMULATOR_URL=https://$SIMULATOR_URL
```

#### Step 4: Deploy MLOps

```bash
cd ../mlops

# Create and link service
railway up --service mlops

# Set environment variables
railway variables set \
  ENVIRONMENT=production \
  PORT=8001 \
  BATCH_MAX_SIZE=500 \
  BATCH_PARALLEL_WORKERS=10 \
  MODEL_CACHE_SIZE=4 \
  PREDICTION_BATCH_SIZE=50

# Deploy
railway up

# Note: You'll need to upload the model file separately
```

#### Step 5: Deploy Frontend

```bash
cd ../frontend

# Create and link service
railway up --service frontend

# Set environment variables
BACKEND_URL=$(cd ../backend && railway domain)
railway variables set VITE_API_URL=https://$BACKEND_URL

# Deploy
railway up
```

---

## 🏗️ Dockerfile Details

### Backend Dockerfile

**Multi-stage build**:
1. **Builder stage**: Installs all dependencies, builds TypeScript
2. **Production stage**: Only production dependencies, compiled JS

**Features**:
- Runs migrations on startup
- Built-in health check
- Optimal layer caching
- ~150 MB final image

**Build command**: Automatic via Railway
**Start command**: `npm run migrate && node dist/index.js`

---

### Simulator Dockerfile

**Single-stage build** with Python 3.11-slim

**Features**:
- Minimal system dependencies (gcc only)
- FastAPI with uvicorn
- 2 workers for production
- Built-in health check

**Start command**: `uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2`

---

### MLOps Dockerfile

**Single-stage build** with Python 3.11-slim

**Features**:
- TensorFlow + scikit-learn
- Model directory creation
- Built-in health check
- Optimized for ML workloads

**Start command**: `uvicorn src.main:app --host 0.0.0.0 --port 8001 --workers 2`

**Note**: Model file (rul_lstm_model.h5) must be uploaded separately or included in build.

---

### Frontend Dockerfile

**Multi-stage build**:
1. **Builder stage**: Builds Vite React app
2. **Production stage**: Nginx serves static files

**Features**:
- Nginx configuration included
- Gzip compression enabled
- Security headers
- SPA routing support
- ~50 MB final image

**Nginx serves**: Static files from `/usr/share/nginx/html`

---

## 🔧 Local Docker Testing

Test Docker images locally before deploying:

### Backend

```bash
cd services/backend

# Build image
docker build -t nt-backend .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e NODE_ENV=production \
  -e DB_SSL=false \
  nt-backend

# Test health
curl http://localhost:3000/api/v1/health
```

### Simulator

```bash
cd services/simulator

# Build image
docker build -t nt-simulator .

# Run
docker run -p 8001:8001 \
  -e ENVIRONMENT=production \
  -e SIMULATOR_CACHE_SIZE=500 \
  nt-simulator

# Test health
curl http://localhost:8001/health
```

### MLOps

```bash
cd services/mlops

# Build image
docker build -t nt-mlops .

# Run with model volume
docker run -p 8001:8001 \
  -v $(pwd)/models:/app/models \
  -e ENVIRONMENT=production \
  -e BATCH_MAX_SIZE=500 \
  nt-mlops

# Test health
curl http://localhost:8001/health
```

### Frontend

```bash
cd services/frontend

# Build image
docker build -t nt-frontend \
  --build-arg VITE_API_URL=http://localhost:3000 .

# Run
docker run -p 80:80 nt-frontend

# Test
curl http://localhost/health
```

---

## 🐳 Docker Compose (Local Development)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: battery_management
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./services/backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/battery_management
      NODE_ENV: production
      DB_SSL: "false"
      SIMULATOR_URL: http://simulator:8001
      PREDICTION_JOB_INTERVAL_MINUTES: 60
      SENSOR_INGESTION_ENABLED: "true"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  simulator:
    build:
      context: ./services/simulator
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      ENVIRONMENT: production
      SIMULATOR_CACHE_SIZE: 500
      BATCH_MAX_SIZE: 200
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"]
      interval: 30s
      timeout: 10s
      retries: 3

  mlops:
    build:
      context: ./services/mlops
      dockerfile: Dockerfile
    ports:
      - "8002:8001"
    environment:
      ENVIRONMENT: production
      BATCH_MAX_SIZE: 500
      MODEL_CACHE_SIZE: 4
    volumes:
      - ./services/mlops/models:/app/models
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./services/frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:3000
    ports:
      - "80:80"
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
```

**Usage**:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

---

## 📊 Railway Dashboard Configuration

After deployment, configure in Railway dashboard:

### Service Settings

For each service, verify:
- ✅ **Health Check**: Path configured correctly
- ✅ **Restart Policy**: On failure with 3 retries
- ✅ **Environment**: Production variables set
- ✅ **Domains**: Public domains generated

### Resource Allocation

**Recommended settings** (Pro plan):
- Backend: 2 GB RAM, 2 vCPU
- Simulator: 1 GB RAM, 1 vCPU
- MLOps: 2 GB RAM, 2 vCPU (4 GB if using GPU)
- Frontend: 512 MB RAM, 0.5 vCPU

---

## 🔍 Troubleshooting

### Build Failures

**Issue**: Docker build fails on Railway

**Solutions**:
```bash
# Test build locally first
docker build -t test-image services/backend

# Check .dockerignore excludes large files
ls -lh services/backend/node_modules  # Should not exist

# Verify railway.toml points to correct Dockerfile
cat services/backend/railway.toml
```

---

### Health Check Failures

**Issue**: Service deployed but health check failing

**Solutions**:
```bash
# Check logs
railway logs --service backend

# Test health endpoint
railway run curl http://localhost:3000/api/v1/health

# Verify port matches
railway variables | grep PORT

# Increase health check timeout in railway.toml
[[healthcheck]]
timeout = 20  # Increase from 10
```

---

### Model File Missing (MLOps)

**Issue**: MLOps service can't find model file

**Solutions**:

**Option 1**: Use Railway volumes
```bash
cd services/mlops
railway volume create models
railway volume mount models /app/models

# Upload model
railway run bash -c "curl -o /app/models/rul_lstm_model.h5 YOUR_MODEL_URL"
```

**Option 2**: Include in Docker image
```bash
# Add to Dockerfile before CMD
COPY models/rul_lstm_model.h5 /app/models/

# Rebuild
railway up --service mlops
```

**Option 3**: Use external storage
```bash
# Set environment variable to download on startup
railway variables set MODEL_DOWNLOAD_URL=https://your-storage/model.h5

# Update Dockerfile to download on startup
CMD ["sh", "-c", "curl -o /app/models/rul_lstm_model.h5 $MODEL_DOWNLOAD_URL && uvicorn src.main:app --host 0.0.0.0 --port 8001"]
```

---

### Database Connection Issues

**Issue**: Backend can't connect to PostgreSQL

**Solutions**:
```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL

# Check SSL setting matches database
railway variables set DB_SSL=true

# Test connection
railway run psql $DATABASE_URL -c "SELECT 1;"

# Check PostgreSQL plugin status
railway status
```

---

## 🎯 Production Checklist

Before going live:

- [ ] All Dockerfiles tested locally
- [ ] `.dockerignore` files configured properly
- [ ] `railway.toml` files updated for Docker
- [ ] Health checks passing for all services
- [ ] Database migrations completed successfully
- [ ] 1,944 batteries seeded in database
- [ ] Service URLs configured correctly
- [ ] Frontend can reach backend API
- [ ] Backend can reach simulator and MLOps
- [ ] Model file uploaded to MLOps service
- [ ] Monitoring and alerts configured
- [ ] Custom domains configured (optional)
- [ ] SSL certificates active
- [ ] Backup strategy in place

---

## 📚 Files Created

**Dockerfiles**:
- ✅ `services/backend/Dockerfile` - Multi-stage Node.js build
- ✅ `services/simulator/Dockerfile` - Python FastAPI service
- ✅ `services/mlops/Dockerfile` - Python ML service with TensorFlow
- ✅ `services/frontend/Dockerfile` - Multi-stage React + Nginx

**Docker Configuration**:
- ✅ `services/backend/.dockerignore`
- ✅ `services/simulator/.dockerignore`
- ✅ `services/mlops/.dockerignore`
- ✅ `services/frontend/.dockerignore`
- ✅ `services/frontend/nginx.conf` - Nginx configuration for SPA

**Railway Configuration**:
- ✅ `services/backend/railway.toml` - Updated for Docker
- ✅ `services/simulator/railway.toml` - Updated for Docker
- ✅ `services/mlops/railway.toml` - Updated for Docker
- ✅ `services/frontend/railway.toml` - Updated for Docker

**Deployment**:
- ✅ `deploy-railway.sh` - Automated deployment script
- ✅ `docker-compose.yml` - Local development environment

---

## 🚀 Next Steps

1. **Test locally**: `docker-compose up -d`
2. **Deploy to Railway**: `./deploy-railway.sh`
3. **Verify services**: Check Railway dashboard
4. **Monitor logs**: `railway logs --follow`
5. **Test endpoints**: Verify health checks
6. **Load frontend**: Visit deployed URL

---

**Status**: ✅ Docker Configuration Complete  
**Deployment Ready**: Yes  
**Production Grade**: Yes  
**Last Updated**: 2026-01-17
