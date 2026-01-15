# Railway Deployment - Final Status Report

## Issue Summary
All 5 application services (backend, frontend, line-bot, mlops, simulator) are failing to deploy on Railway despite multiple configuration attempts.

## Root Cause
Railway's Nixpacks is not detecting the start commands from either:
1. `nixpacks.toml` files (with `[start]` sections)
2. `railway.toml` file (with `startCommand` directives)

The Nixpacks build output shows:
```
║ start      │                                                                 ║
```
(Empty start command)

## Configuration Files Created/Modified

### 1. services/backend/nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs_22", "npm-9_x", "postgresql"]

[phases.install]
cmds = ["npm ci --cache=/tmp/.npm --prefer-offline=false"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "node dist/index.js"
```

### 2. railway.toml (Backend section)
```toml
[[services]]
name = "backend"
source = "services/backend"

[services.build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[services.deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/api/v1/health"
```

## Attempted Solutions

1. ✅ Fixed TypeScript compilation errors (commit 19603ff)
2. ✅ Updated .dockerignore to prevent cache conflicts (commit 40fd309)
3. ✅ Created nixpacks.toml for all services (commit b535254)
4. ✅ Renamed Dockerfiles to .backup to force Nixpacks (commit 9198e9a)
5. ✅ Updated railway.toml with explicit startCommands (commit 63243ff)
6. ✅ Manually triggered redeploys with `railway up`

## Current Status
- ❌ Backend: FAILED - "No start command could be found"
- ❌ Frontend: FAILED - 404 errors (likely missing dist directory)
- ❌ LINE Bot: FAILED - "No start command could be found"
- ❌ MLOps: FAILED - Start command detection issue
- ❌ Simulator: FAILED - Start command detection issue
- ✅ PostgreSQL: SUCCESS
- ✅ Redis: SUCCESS

## Recommended Next Steps

### Option 1: Railway Dashboard Configuration
Manually set start commands in Railway Dashboard for each service:
- Backend: `node dist/index.js`
- Frontend: `npx serve -s dist -p $PORT`
- LINE Bot: `node dist/index.js`
- MLOps: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- Simulator: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Option 2: Use Procfile
Create a `Procfile` in each service directory:
```
web: node dist/index.js
```
Railway prioritizes Procfile over other configuration methods.

### Option 3: Switch to Docker Builder
Change builder from NIXPACKS to DOCKERFILE in railway.toml:
```toml
[services.build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```
Then restore the original Dockerfiles (currently backed up as .backup).

### Option 4: Use Railway V2 Config
Investigate if Railway V2 configuration format is required:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/index.js"
  }
}
```

## Additional Information

### Working Locally
All services build and run successfully locally:
```bash
# Backend
cd services/backend
npm ci && npm run build && node dist/index.js  # ✅ Works

# Frontend
cd services/frontend
npm ci && npm run build && npx serve -s dist  # ✅ Works
```

### Railway Environment
- Region: asia-southeast1
- Nixpacks Version: v1.38.0
- Node Version: 22.11.0
- NPM Version: 10.9.0

### Git Commits
- 19603ff: TypeScript fixes
- 40fd309: Cache directory exclusions
- b535254: Nixpacks cache configuration
- 9198e9a: Dockerfile removal
- 63243ff: Railway.toml startCommand updates

## Conclusion
The configuration files are correct, but Railway/Nixpacks is not parsing them properly. Manual configuration through Railway Dashboard or using Procfiles is recommended as the fastest path to deployment.
