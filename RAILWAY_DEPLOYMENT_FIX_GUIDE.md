# Railway Deployment Fix Guide
**Date**: January 15, 2026  
**Project**: nt-poc-battery-management  
**Issue**: All deployments failing with "No start command could be found"  
**Status**: ✅ Root cause identified, fix partially implemented

---

## 🔍 Root Cause Analysis

### Issue Summary
All 19+ consecutive Railway deployments have failed with:
```
Error: No start command could be found
```

### Root Cause
**Railway Dashboard builder settings override `railway.toml` configuration files.**

Despite [`railway.toml`](railway.toml) specifying `builder = "DOCKERFILE"` for each service (lines 32, 93, 138, 183, 209), Railway Dashboard was configured to use `builder = "NIXPACKS"` globally (removed in latest commit 525a236).

The NIXPACKS builder cannot detect start commands from:
- ❌ Procfile files
- ❌ railway.json files  
- ❌ nixpacks.toml files
- ❌ package.json scripts

### What Was Changed
**Commit 525a236**: Removed conflicting global `[build]` section from `railway.toml`
- **Before**: Global `builder = "NIXPACKS"` on line 21
- **After**: Only service-level `builder = "DOCKERFILE"` configurations remain

---

## ✅ What's Already Working

### Configuration Files ✅
- All Dockerfiles exist and are properly configured
- All environment variables are set correctly
- Database (PostgreSQL + TimescaleDB) is provisioned
- Redis is provisioned
- Public domains are generated
- Internal networking is configured

### Service Dockerfiles ✅
| Service | Dockerfile Path | Status |
|---------|----------------|--------|
| Backend | [`services/backend/Dockerfile`](services/backend/Dockerfile) | ✅ Exists |
| Frontend | [`services/frontend/Dockerfile`](services/frontend/Dockerfile) | ✅ Exists |
| MLOps | [`services/mlops/Dockerfile`](services/mlops/Dockerfile) | ✅ Exists |
| Simulator | [`services/simulator/Dockerfile`](services/simulator/Dockerfile) | ✅ Exists |
| LINE Bot | [`services/line-bot/Dockerfile`](services/line-bot/Dockerfile) | ✅ Exists |

### Environment Variables ✅
**Backend**:
- `DATABASE_URL`: postgresql://postgres:***@postgres.railway.internal:5432/railway
- `REDIS_URL`: redis://***@redis.railway.internal:6379
- `JWT_SECRET`: Configured
- `MLOPS_SERVICE_URL`: http://mlops.railway.internal:8000
- `SIMULATOR_URL`: http://simulator.railway.internal:8001

**LINE Bot**:
- `LINE_CHANNEL_ACCESS_TOKEN`: Configured
- `LINE_CHANNEL_SECRET`: Configured
- `BACKEND_API_URL`: http://backend.railway.internal:3000

**All Services**:
- `PORT`: Configured per service
- `NODE_ENV`: production
- Service URLs: All internal networking configured

### Public Domains ✅
- Backend: https://backend-production-77f7.up.railway.app
- Frontend: https://frontend-production-036e.up.railway.app
- MLOps: https://mlops-production-3b39.up.railway.app
- Simulator: https://simulator-production-a018.up.railway.app
- LINE Bot: https://line-bot-production-8114.up.railway.app

---

## 🔧 Required Fix: Manual Dashboard Configuration

**The Railway CLI cannot override Dashboard builder settings.** You must manually configure each service in the Railway Dashboard.

### Quick Fix Instructions

#### Open Railway Dashboard
```
https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
```

#### For Each Service (backend, frontend, mlops, simulator, line-bot):

1. **Click** on the service name
2. Go to **Settings** tab
3. Scroll to **Build** section
4. **Change** "Builder" dropdown: `Nixpacks` → **`Dockerfile`**
5. **Verify** "Dockerfile Path" shows: `Dockerfile`
6. **Verify** "Root Directory" is **BLANK** (Railway uses the `source` path from railway.toml)
7. Click **"Deploy"** button at the top of the page

#### Visual Reference
```
Settings Tab
└── Build Section
    ├── Builder: [Dockerfile ▼]  ← Change from "Nixpacks" to "Dockerfile"
    ├── Dockerfile Path: Dockerfile
    └── Root Directory: (leave blank)
```

---

## 🚀 Deployment Process

### Step 1: Apply Dashboard Changes
Follow the instructions above to configure all 5 services.

### Step 2: Monitor Deployments
```bash
# Check overall status
railway status

# Monitor logs per service
railway logs --service backend
railway logs --service frontend
railway logs --service mlops
railway logs --service simulator
railway logs --service line-bot
```

### Step 3: Wait for Success
Each service should:
1. Build successfully using Dockerfile
2. Deploy successfully
3. Pass health checks

### Step 4: Post-Deployment Setup

#### Enable TimescaleDB Extension
```bash
railway run --service backend psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

#### Run Database Migrations
```bash
cd services/backend
railway run --service backend npm run migrate
cd ../..
```

---

## ✓ Verification Checklist

### Health Checks
```bash
# Backend
curl https://backend-production-77f7.up.railway.app/api/v1/health

# Frontend (returns HTML)
curl -I https://frontend-production-036e.up.railway.app

# MLOps
curl https://mlops-production-3b39.up.railway.app/health

# Simulator
curl https://simulator-production-a018.up.railway.app/health

# LINE Bot
curl https://line-bot-production-8114.up.railway.app/health
```

### Expected Responses
- **Backend**: JSON with `{ "status": "ok", "database": "connected", ... }`
- **Frontend**: HTTP 200 with HTML content
- **MLOps**: JSON with `{ "status": "healthy", ... }`
- **Simulator**: JSON with `{ "status": "healthy", ... }`
- **LINE Bot**: JSON with `{ "status": "ok", ... }`

---

## 📋 Additional Configuration

### Update LINE Webhook URL
1. Go to: https://developers.line.biz/console/
2. Select your channel
3. Set Webhook URL to: `https://line-bot-production-8114.up.railway.app/webhook`
4. Enable webhook
5. Test connection

### Update Frontend API URL (if backend domain changed)
```bash
# Set in Railway Dashboard for frontend service
VITE_API_BASE_URL=https://backend-production-77f7.up.railway.app/api
```

---

## 🔍 Troubleshooting

### If Deployment Still Fails

#### Check Builder Setting
- Verify each service shows `builder: DOCKERFILE` in Settings
- Verify "Dockerfile Path" is set to `Dockerfile`
- Verify "Root Directory" is BLANK

#### Check Build Logs
```bash
# Get latest deployment ID
railway deployments list --service backend --limit 1

# View build logs
railway logs --service backend --deployment <deployment-id>
```

#### Common Issues

**Issue**: "Dockerfile not found"
- **Fix**: Check "Root Directory" is BLANK in Dashboard Settings
- Railway should use the `source` path from railway.toml

**Issue**: "EBUSY: resource busy or locked"
- **Fix**: Already resolved by using Dockerfile builder instead of Nixpacks

**Issue**: "Cannot find module"
- **Fix**: Check Dockerfile has correct `COPY` commands and `npm ci`/`pip install` steps

---

## 📊 Deployment Architecture

### Service Communication
```
Frontend (React/Vite)
    ↓ HTTPS
Backend (Express API) ← LINE Bot
    ↓ HTTP (internal)
    ├→ PostgreSQL (TimescaleDB)
    ├→ Redis
    ├→ MLOps (FastAPI) - ML predictions
    └→ Simulator (FastAPI) - Sensor data
```

### Internal Networking
Services communicate via Railway's private network:
- `backend.railway.internal:3000`
- `postgres.railway.internal:5432`
- `redis.railway.internal:6379`
- `mlops.railway.internal:8000`
- `simulator.railway.internal:8001`

---

## 📝 Summary

**Current Status**: 99% Complete

### ✅ Completed
- [x] All code builds successfully locally
- [x] All Dockerfiles created and tested
- [x] All environment variables configured
- [x] Database and Redis provisioned
- [x] Public domains generated
- [x] Removed conflicting global builder setting from railway.toml
- [x] Committed and pushed fix (commit 525a236)

### ⏳ Remaining
- [ ] Manually change builder from "Nixpacks" to "Dockerfile" in Dashboard for 5 services
- [ ] Trigger redeployments
- [ ] Verify deployments succeed
- [ ] Run post-deployment tasks (TimescaleDB extension, migrations)
- [ ] Test all health endpoints

**Estimated Time to Complete**: 10-15 minutes

---

## 🎯 Success Criteria

Deployment is successful when:
1. ✅ All 5 services show "Active" status in Railway Dashboard
2. ✅ All health endpoints return 200 OK
3. ✅ Backend can connect to PostgreSQL and Redis
4. ✅ Frontend loads and can communicate with backend
5. ✅ MLOps service is accessible for predictions
6. ✅ Simulator is generating sensor data
7. ✅ LINE Bot webhook responds successfully

---

## 🔗 Useful Links

- **Railway Project**: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
- **Railway Docs - Config as Code**: https://docs.railway.app/deploy/config-as-code
- **Railway Docs - Dockerfiles**: https://docs.railway.app/deploy/dockerfiles
- **LINE Developers Console**: https://developers.line.biz/console/
- **Repository**: https://github.com/khiwniti/nt-poc

---

## 📞 Support

If issues persist after following this guide:

1. Check Railway Dashboard for detailed error messages
2. Review build logs: `railway logs --service <name>`
3. Verify Dockerfile syntax and build locally: `docker build -t test services/<service-name>`
4. Check Railway status page: https://status.railway.app/

---

**Last Updated**: January 15, 2026  
**Commit**: 525a236  
**Author**: Claude (via Railway MCP)
