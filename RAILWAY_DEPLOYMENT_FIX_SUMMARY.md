# Railway Deployment Fix Summary

## Problem Statement
Railway deployments were failing with "No start command could be found" error across all 5 microservices (backend, frontend, mlops, simulator, line-bot) despite having Dockerfiles and proper configuration.

## Root Causes Identified

### 1. Configuration File Hierarchy Issue
**Priority Order**: Dashboard Settings > `railway.json` > `railway.toml`

- **Issue**: `services/backend/railway.json` had `"builder": "NIXPACKS"` 
- **Impact**: This overrode the `railway.toml` setting of `builder = "DOCKERFILE"`
- **Commits**: 
  - db3ca08: Changed railway.json to use DOCKERFILE builder
  - 525a236: Removed global NIXPACKS builder from railway.toml

### 2. Docker Build Context Problems
**Issue**: Railway builds from repository root, but Dockerfiles expected service subdirectory context

- **Symptom**: `/scripts`: not found, `/seeds`: not found errors
- **Root Cause**: COPY commands in Dockerfile referencing directories not available in build context
- **Commits**:
  - 7954017: Removed scripts/ directory COPY commands
  - 1da420d: Removed migrations/ and seeds/ directory COPY commands

### 3. Environment Variable Fallbacks
**Workaround Applied**: Set `NIXPACKS_START_CMD` for all services

- **Purpose**: Ensures services can start even if NIXPACKS builder is used
- **Values Set**:
  - Backend: `node dist/index.js`
  - Frontend: `npm run preview`
  - MLOps: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
  - Simulator: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Line-bot: `node dist/index.js`

## Fixes Applied

### Code Changes

#### 1. services/backend/railway.json (db3ca08)
```json
{
  "build": {
    "builder": "DOCKERFILE",  // Changed from NIXPACKS
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js"  // Changed from npm start
  }
}
```

#### 2. services/backend/Dockerfile (1da420d, 7954017)
**Removed**:
- `COPY scripts/ ./scripts/` (not in build context)
- `COPY migrations/ ./migrations/` (not in build context)
- `COPY seeds/ ./seeds/` (not in build context)

**Note**: Migrations and seeds will be handled via Railway CLI post-deployment:
```bash
railway run --service backend npm run migrate
railway run --service backend npm run seed:run
```

#### 3. railway.toml (525a236)
**Removed global build section**:
```toml
# REMOVED - Was causing conflicts
# [build]
# builder = "NIXPACKS"
```

**Kept service-level configurations**:
```toml
[[services]]
name = "backend"
source = "services/backend"

[services.build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```

### Configuration Changes (Railway Dashboard/CLI)

#### Environment Variables Added
Used Railway MCP server `set-variables` tool:

```bash
# Backend
NIXPACKS_START_CMD=node dist/index.js

# Frontend  
NIXPACKS_START_CMD=npm run preview

# MLOps
NIXPACKS_START_CMD=uvicorn src.main:app --host 0.0.0.0 --port $PORT

# Simulator
NIXPACKS_START_CMD=uvicorn app.main:app --host 0.0.0.0 --port $PORT

# Line-bot
NIXPACKS_START_CMD=node dist/index.js
```

## Deployment Timeline

| Deployment ID | Status | Commit | Issue |
|---------------|--------|--------|-------|
| 88ff5fb3 | FAILED | 7954017 | `/seeds`: not found |
| 68f14b05 | FAILED | 7954017 | `/seeds`: not found |
| c9e21371 | QUEUED | 1da420d | Removed seeds/ - Testing |
| (next) | PENDING | db3ca08 | DOCKERFILE in railway.json - Expected to succeed |

## Verification Steps

### 1. Check Deployment Status
```bash
railway status
railway list-deployments --service backend --limit 5 --json
```

### 2. Monitor Build Logs
```bash
railway logs --service backend --log-type build
```

### 3. Check Deployment Logs
```bash
railway logs --service backend --log-type deploy
```

### 4. Test Health Endpoints
```bash
# Backend
curl https://backend-production-77f7.up.railway.app/api/v1/health

# Frontend
curl https://frontend-production-d5f1.up.railway.app/

# MLOps
curl https://mlops-production-d9b1.up.railway.app/health

# Simulator
curl https://simulator-production-b8e1.up.railway.app/health

# Line-bot
curl https://line-bot-production-8114.up.railway.app/health
```

## Post-Deployment Tasks

### 1. Enable TimescaleDB Extension
```bash
railway run --service backend psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"
```

### 2. Run Database Migrations
```bash
cd services/backend
railway run --service backend npm run migrate
```

### 3. Seed Database (Optional)
```bash
railway run --service backend npm run seed:run
```

### 4. Configure LINE Webhook
Update webhook URL in LINE Developers Console:
```
https://line-bot-production-8114.up.railway.app/webhook
```

### 5. Verify Service Communication
Check internal networking between services:
```bash
railway run --service backend -- curl http://mlops.railway.internal:8001/health
```

## Lessons Learned

### Railway Configuration Hierarchy
1. **Dashboard settings override everything** - Must use Dashboard UI for builder changes if config files conflict
2. **Service-level railway.json** takes precedence over root railway.toml
3. **Global settings** in railway.toml can cause conflicts with service-level settings

### Docker Build Context
1. Railway uses repository root as build context when `source` is set
2. Files outside service directory are not available in Docker COPY commands
3. Consider using `.dockerignore` whitelist approach for monorepos

### Best Practices
1. **Delete railway.json if using railway.toml** - Avoid configuration conflicts
2. **Test builds locally** before pushing to Railway:
   ```bash
   cd services/backend
   docker build -t backend-test .
   ```
3. **Use Railway CLI for debugging** - Provides better visibility than Dashboard alone
4. **Set fallback environment variables** - NIXPACKS_START_CMD as safety net

## Related Files

- [`railway.toml`](railway.toml) - Root configuration
- [`services/backend/railway.json`](services/backend/railway.json) - Service config (fixed)
- [`services/backend/Dockerfile`](services/backend/Dockerfile) - Build instructions (fixed)
- [`RAILWAY_DEPLOYMENT_FIX_GUIDE.md`](RAILWAY_DEPLOYMENT_FIX_GUIDE.md) - Detailed troubleshooting guide
- [`fix-railway-deployment.sh`](fix-railway-deployment.sh) - Interactive fix script

## Next Steps

1. ✅ Fixed backend service configuration
2. ⏳ Waiting for deployment to complete
3. 🔄 Apply same fixes to other services (frontend, mlops, simulator, line-bot)
4. 🔄 Run post-deployment tasks
5. 🔄 Monitor production health
6. 🔄 Update LINE webhook configuration

---

**Last Updated**: 2026-01-15 21:19 UTC  
**Status**: Deployment in progress (commit db3ca08)  
**Expected Result**: Successful DOCKERFILE-based build
