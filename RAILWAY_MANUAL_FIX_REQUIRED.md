# Railway Manual Dashboard Fix Required

**Date**: 2026-01-15T21:50 UTC+7  
**Critical Issue**: MLOps and Simulator services require manual Dashboard configuration

---

## 🚨 Problem Summary

Despite removing `nixpacks.toml`, `Procfile`, and `railway.json` files, Railway continues to use **RAILPACK/NIXPACKS** builder instead of **DOCKERFILE** for mlops and simulator services.

**Root Cause**: Railway Dashboard has builder settings that **override all configuration files** including `railway.toml`.

---

## ✅ What We've Fixed So Far

### Backend Service: ✅ SUCCESSFULLY DEPLOYED
- Builder: DOCKERFILE ✓
- Build Time: 7.08 seconds
- Status: Running on port 3000

### Configuration Files Removed:
- ❌ `services/backend/railway.json` (commit 5d72f88)
- ❌ `services/frontend/railway.json` (commit 313cfb7)
- ❌ `services/mlops/nixpacks.toml` (commit 91a4d9b)
- ❌ `services/mlops/Procfile` (commit 91a4d9b)
- ❌ `services/simulator/nixpacks.toml` (commit 91a4d9b)
- ❌ `services/simulator/Procfile` (commit 91a4d9b)

### Dockerfiles Updated:
- ✅ `services/backend/Dockerfile` - Root context paths
- ✅ `services/frontend/Dockerfile` - Root context paths
- ✅ `services/mlops/Dockerfile` - Root context paths
- ✅ `services/simulator/Dockerfile` - Root context paths
- ✅ `services/line-bot/Dockerfile` - Root context paths

---

## 🔧 Manual Fix Required

### Railway Configuration Hierarchy
```
1. Railway Dashboard Settings (HIGHEST PRIORITY - overrides everything)
2. railway.json (service level)
3. railway.toml (repository root)
4. Dockerfile/nixpacks.toml detection
```

**The problem**: Dashboard settings were configured when services were first created and persist even after removing all config files.

---

## 📋 Step-by-Step Fix Instructions

### For MLOps Service:

1. **Open Railway Dashboard**
   - Navigate to: https://railway.app
   - Select project: `nt-poc-battery-management`
   - Click on service: **mlops**

2. **Change Builder Setting**
   - Go to: **Settings** tab
   - Scroll to: **Build** section
   - Click: **Builder** dropdown
   - Current: `Railpack` or `Nixpacks`
   - **Change to**: `Dockerfile`

3. **Set Dockerfile Path** (if prompted)
   - Dockerfile Path: `services/mlops/Dockerfile`
   - Build Context: Root directory (default)

4. **Trigger Redeploy**
   - Go to: **Deployments** tab
   - Click: **Redeploy** button
   - Or push a new commit to trigger automatic deployment

### For Simulator Service:

Repeat the same steps as above, but for the **simulator** service:
1. Select service: **simulator**
2. Settings > Build > Builder > Select `Dockerfile`
3. Dockerfile Path: `services/simulator/Dockerfile`
4. Trigger redeploy

### For Frontend Service (if needed):

If frontend is still serving 404s:
1. Select service: **frontend**
2. Settings > Build > Builder > Confirm it's `Dockerfile` (or change to it)
3. Dockerfile Path: `services/frontend/Dockerfile`
4. Trigger redeploy

---

## 🔍 Verification Steps

After changing Dashboard settings:

### 1. Check Build Logs
```bash
# MLOps
railway logs --service mlops --log-type build

# Simulator  
railway logs --service simulator --log-type build

# Should see:
# "Using Detected Dockerfile" or "=== Building with Dockerfile ===" 
# NOT "Using Nixpacks" or "Railpack"
```

### 2. Monitor Deployment
```bash
railway list-deployments --service mlops --limit 1 --json
railway list-deployments --service simulator --limit 1 --json

# Check status should be "SUCCESS" or "BUILDING"
# Check builder should be "DOCKERFILE"
```

### 3. Check Deployment Logs
```bash
railway logs --service mlops --log-type deploy
railway logs --service simulator --log-type deploy

# Should see successful startup messages
```

### 4. Test Health Endpoints
```bash
# MLOps
curl https://mlops-production-xxxx.up.railway.app/health

# Simulator
curl https://simulator-production-xxxx.up.railway.app/health

# Expected: 200 OK response
```

---

## 🎯 Expected Results After Fix

### MLOps Service
- Builder: DOCKERFILE ✓
- Build: Multi-stage Python build with requirements.txt
- Runtime: Python 3.11-slim + uvicorn
- Port: $PORT (Railway-provided)
- Health: `/health` endpoint responding

### Simulator Service  
- Builder: DOCKERFILE ✓
- Build: Multi-stage Python build with requirements.txt
- Runtime: Python 3.11-slim + uvicorn
- Port: $PORT (Railway-provided)
- Health: `/health` endpoint responding
- Note: Required by backend for sensor ingestion

---

## 🐛 Current Error Details

### MLOps Latest Deployment
- **Status**: FAILED
- **Builder**: RAILPACK (wrong!)
- **Error**: "No start command was found"
- **Commit**: 91a4d9b (removed nixpacks.toml and Procfile)
- **Date**: 2026-01-15T21:49 UTC

### Simulator Latest Deployment
- **Status**: FAILED  
- **Builder**: RAILPACK (wrong!)
- **Error**: "No start command was found"
- **Commit**: 91a4d9b (removed nixpacks.toml and Procfile)
- **Date**: 2026-01-15T21:43 UTC

---

## 📚 Alternative Fix (If Dashboard Access Not Available)

If you cannot access Railway Dashboard, you can set environment variables as a workaround:

```bash
# MLOps
railway variables set RAILWAY_DOCKERFILE_PATH="services/mlops/Dockerfile" --service mlops

# Simulator
railway variables set RAILWAY_DOCKERFILE_PATH="services/simulator/Dockerfile" --service simulator
```

**Note**: This may not work if Dashboard has explicit builder settings. Dashboard fix is preferred.

---

## ✅ Post-Fix Tasks (After Successful Deployment)

### 1. Run Database Migrations (Backend)
```bash
# Enable TimescaleDB extension
railway run --service backend psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"

# Run migrations
railway run --service backend npm run migrate

# Optional: Seed database
railway run --service backend npm run seed:run
```

### 2. Verify Backend Integration
After simulator is deployed, check backend logs:
```bash
railway logs --service backend

# Should no longer see:
# "sensor_ingestion_simulator_not_accessible"
# "sensor_ingestion_get_batteries_failed" (after migrations)
```

### 3. Deploy Line-bot Service
```bash
railway deploy --service line-bot
```

### 4. Configure LINE Webhook
After line-bot deployment:
- Get deployment URL: `https://line-bot-production-8114.up.railway.app`
- Update in LINE Developers Console
- Webhook URL: `https://line-bot-production-8114.up.railway.app/webhook`

---

## 📞 Summary for User

**What needs to be done manually**:

1. **Go to Railway Dashboard**
2. **Change builder from RAILPACK/Nixpacks to Dockerfile** for:
   - mlops service
   - simulator service
   - (optionally) frontend service
3. **Set Dockerfile paths**:
   - mlops: `services/mlops/Dockerfile`
   - simulator: `services/simulator/Dockerfile`
   - frontend: `services/frontend/Dockerfile`
4. **Trigger redeployments**

**Why this is necessary**:
- Railway Dashboard settings override all configuration files
- These settings persist from when services were first created
- Cannot be changed via `railway.toml` or Railway CLI
- Must be changed manually in the web interface

**What will happen after fix**:
- MLOps will build with Dockerfile (Python FastAPI)
- Simulator will build with Dockerfile (Python FastAPI)
- Backend will be able to connect to simulator
- All services will be operational

---

## 🎓 Lessons Learned

### Railway Configuration Priority (Confirmed)
1. **Dashboard UI settings** - ABSOLUTE PRIORITY
2. `railway.json` files - High priority (we deleted these)
3. `railway.toml` - Medium priority (correctly configured)
4. Auto-detection (Dockerfile, nixpacks.toml, Procfile) - Low priority

### Why Our Fixes Didn't Work Completely
- Removing `nixpacks.toml` and `Procfile` **should** have worked
- But Dashboard settings from initial service creation **override everything**
- Backend worked because Dashboard was already set to Dockerfile (or wasn't set)
- MLOps and simulator have persisted Dashboard settings that must be manually cleared

### Best Practice for Future
- **Always check Dashboard settings first** before debugging config files
- Set builder to Dockerfile in Dashboard when creating new services
- Don't rely on auto-detection for production services
- Document Dashboard configurations as they're not in git

---

**Status**: Waiting for manual Dashboard configuration changes.

**Next Step**: User must access Railway Dashboard and change builder settings for mlops and simulator services.
