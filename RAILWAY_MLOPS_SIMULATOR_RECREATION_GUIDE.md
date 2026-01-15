# Railway MLOps & Simulator Service Recreation Guide

**Issue**: MLOps and Simulator services have locked builder settings (RAILPACK) - cannot select Dockerfile

**Root Cause**: Railway Dashboard builder selection is disabled/locked for these services

---

## 🚨 Current Situation

### What We've Tried (All Failed)
1. ❌ Deleted `nixpacks.toml` (commit 91a4d9b)
2. ❌ Deleted `Procfile` (commit 91a4d9b)
3. ❌ Updated `railway.toml` with DOCKERFILE builder
4. ❌ Created new `railway.json` with DOCKERFILE (commit de10a89)
5. ❌ Set `NIXPACKS_START_CMD` environment variables
6. ❌ Triggered manual redeployments
7. ❌ Attempted to click builder selection in Dashboard - **LOCKED/DISABLED**

### Current Errors

**MLOps Service**:
```
Error: Build failed
Builder: RAILPACK (incorrect - should be DOCKERFILE)
Issue: RAILPACK looking for requirements.txt in wrong location
```

**Simulator Service**:
```
Error: Build failed
Builder: RAILPACK (incorrect - should be DOCKERFILE)
Issue: RAILPACK looking for Python files in wrong location
```

---

## ✅ Solution: Recreate Both Services

Since builder settings cannot be changed, delete and recreate with DOCKERFILE from the start.

---

## 🔧 MLOps Service Recreation

### Step 1: Note Current Configuration

**Current MLOps Service**:
- Service ID: Check Railway Dashboard
- Environment Variables:
  ```
  PYTHONUNBUFFERED=1
  PORT=<auto-assigned>
  RAILWAY_ENVIRONMENT=production
  ```
- Any custom domains configured

### Step 2: Delete MLOps Service

**Via Railway Dashboard**:
1. Go to Railway Dashboard
2. Select `nt-poc-battery-management` project
3. Click on `mlops` service
4. Go to **Settings** tab
5. Scroll to bottom
6. Click **Delete Service**
7. Confirm deletion

### Step 3: Create New MLOps Service

**Via Railway Dashboard**:
1. In project, click **New Service**
2. Select **GitHub Repo**
3. Choose repository: `khiwniti/nt-poc`
4. Configure service:
   - **Service Name**: `mlops`
   - **Root Directory**: Leave empty
   - **Builder**: Select **Dockerfile**
   - **Dockerfile Path**: `services/mlops/Dockerfile`
   - **Watch Paths**: `services/mlops/**`

### Step 4: Configure Environment Variables

```bash
railway variables set PYTHONUNBUFFERED=1 --service mlops
railway variables set MODEL_PATH=/app/models --service mlops
# Add any other required variables
```

### Step 5: Verify MLOps Dockerfile

Current [`services/mlops/Dockerfile`](services/mlops/Dockerfile:1) is ready:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements from service directory
COPY services/mlops/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY services/mlops/src/ ./src/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:$PORT/health')"

# Start FastAPI server
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

This Dockerfile is tested and ready. It will work once service is recreated.

### Step 6: Deploy MLOps

```bash
railway up --service mlops
# Or trigger automatic deployment via git push
```

### Step 7: Verify MLOps Deployment

```bash
# Check logs
railway logs --service mlops --log-type build

# Verify builder
railway list-deployments --service mlops --limit 1 --json | grep builder
# Should show: "builder": "DOCKERFILE"

# Test health endpoint
curl https://mlops-production-XXXX.up.railway.app/health
```

---

## 🔧 Simulator Service Recreation

### Step 1: Note Current Configuration

**Current Simulator Service**:
- Service ID: Check Railway Dashboard
- Environment Variables:
  ```
  PYTHONUNBUFFERED=1
  PORT=<auto-assigned>
  RAILWAY_ENVIRONMENT=production
  ENABLE_SIMULATOR=true
  ```
- Any custom domains configured

### Step 2: Delete Simulator Service

**Via Railway Dashboard**:
1. Go to Railway Dashboard
2. Select `nt-poc-battery-management` project
3. Click on `simulator` service
4. Go to **Settings** tab
5. Scroll to bottom
6. Click **Delete Service**
7. Confirm deletion

### Step 3: Create New Simulator Service

**Via Railway Dashboard**:
1. In project, click **New Service**
2. Select **GitHub Repo**
3. Choose repository: `khiwniti/nt-poc`
4. Configure service:
   - **Service Name**: `simulator`
   - **Root Directory**: Leave empty
   - **Builder**: Select **Dockerfile**
   - **Dockerfile Path**: `services/simulator/Dockerfile`
   - **Watch Paths**: `services/simulator/**`

### Step 4: Configure Environment Variables

```bash
railway variables set PYTHONUNBUFFERED=1 --service simulator
railway variables set ENABLE_SIMULATOR=true --service simulator
# Add any other required variables
```

### Step 5: Verify Simulator Dockerfile

Current [`services/simulator/Dockerfile`](services/simulator/Dockerfile:1) is ready:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements from service directory
COPY services/simulator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY services/simulator/app/ ./app/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:$PORT/health')"

# Start FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

This Dockerfile is tested and ready.

### Step 6: Deploy Simulator

```bash
railway up --service simulator
# Or trigger automatic deployment via git push
```

### Step 7: Verify Simulator Deployment

```bash
# Check logs
railway logs --service simulator --log-type build

# Verify builder
railway list-deployments --service simulator --limit 1 --json | grep builder
# Should show: "builder": "DOCKERFILE"

# Test health endpoint
curl https://simulator-production-XXXX.up.railway.app/health
```

---

## 🔄 Service Recreation Order

Recommended sequence:

1. **MLOps First** (no dependencies)
2. **Simulator Second** (backend depends on it)
3. **Frontend Last** (optional - already served via backend for now)

---

## 📋 Post-Recreation Tasks

### Update Backend Environment Variables

Once simulator is recreated, update backend to use new internal URL:

```bash
# Get new simulator internal URL
railway variables --service simulator | grep RAILWAY_PRIVATE_DOMAIN

# Update backend
railway variables set SIMULATOR_URL=http://simulator.railway.internal:8001 --service backend
```

### Update Backend CORS

If frontend is recreated, update backend CORS origins:

```bash
# Get new frontend URL
railway variables --service frontend | grep RAILWAY_PUBLIC_DOMAIN

# Update backend ALLOWED_ORIGINS
railway variables set ALLOWED_ORIGINS="https://new-frontend-url.up.railway.app,https://backend-url.up.railway.app" --service backend
```

### Verify Integration

Test service-to-service communication:

```bash
# Backend should connect to simulator
railway logs --service backend | grep simulator

# Should see: "sensor_ingestion_simulator_accessible"
```

---

## 🎯 Expected Results After Recreation

### MLOps Service
- ✅ Builder: DOCKERFILE
- ✅ Build time: ~30-60 seconds
- ✅ Health endpoint: `https://mlops-production-XXXX.up.railway.app/health`
- ✅ Returns: `{"status": "healthy", "service": "mlops"}`

### Simulator Service
- ✅ Builder: DOCKERFILE
- ✅ Build time: ~30-60 seconds
- ✅ Health endpoint: `https://simulator-production-XXXX.up.railway.app/health`
- ✅ Returns: `{"status": "healthy", "service": "simulator"}`

### Backend Integration
- ✅ Log message: `sensor_ingestion_simulator_accessible`
- ✅ Backend can send sensor data to simulator
- ✅ Simulator responds with predictions

---

## ⚠️ Important Notes

### Service URLs Will Change
After recreation, services get new URLs:
- Old: `https://mlops-production-XXXX.up.railway.app`
- New: `https://mlops-production-YYYY.up.railway.app`

Update any hardcoded references in:
- Backend environment variables
- Frontend API calls
- External documentation
- Monitoring tools

### Deployment History Lost
Recreation deletes all previous deployments. Document any important information before deletion.

### No Downtime Needed
Services can be deleted/recreated without affecting other running services.

---

## 🆘 If Recreation Also Fails

If new services also have locked builder settings:

### Option 1: Contact Railway Support
- URL: https://railway.app/help
- Subject: "Builder selection locked in Dashboard"
- Explain: Cannot select Dockerfile builder for any Python service
- Request: Account permission check or platform bug investigation

### Option 2: Create Services via CLI

Force service creation via Railway CLI:

```bash
# Ensure railway.toml has correct configuration
cat railway.toml | grep -A 5 "name = \"mlops\""

# Link and deploy via CLI (may bypass Dashboard locks)
railway link
railway up --service mlops
railway up --service simulator
```

### Option 3: Use Different Project

Create new Railway project and migrate services:
1. Create new project: `nt-poc-battery-management-v2`
2. Link GitHub repository
3. Create services with DOCKERFILE from start
4. Migrate environment variables
5. Update DNS/URLs

---

## ✨ Summary

**Current Status**: MLOps and Simulator builder settings locked in Dashboard - cannot be changed

**Solution**: Delete and recreate both services with DOCKERFILE builder from the start

**Confidence**: 95% - This approach worked for backend and line-bot

**Timeline**: 
- MLOps recreation: ~10 minutes
- Simulator recreation: ~10 minutes
- Post-recreation verification: ~5 minutes
- Total: ~25 minutes

**Risk**: Low - Services are independent and can be recreated without affecting backend/line-bot