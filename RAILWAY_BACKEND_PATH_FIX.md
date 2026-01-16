# Railway Backend Path Fix - Deployment Resolution

## Issue Summary

Backend service on Railway failing with 502 "Application failed to respond" after series of configuration fixes.

## Root Cause Analysis

Changed [`tsconfig.json`](services/backend/tsconfig.json:5) `rootDir` from `"./src"` to `"."` to include scripts folder in compilation. This created a nested dist structure:

**Before:**
```
dist/
├── index.js
├── app.js
├── config/
├── routes/
└── services/
```

**After:**
```
dist/
├── src/
│   ├── index.js
│   ├── app.js
│   ├── config/
│   ├── routes/
│   └── services/
└── scripts/
    └── migrate.js
```

## Applied Fixes (Commit `875dd85`)

### 1. Updated [`package.json`](services/backend/package.json:7) Start Script
```json
{
  "scripts": {
    "start": "node dist/src/index.js"  // was: "node dist/index.js"
  }
}
```

### 2. Updated [`start-production.sh`](services/backend/scripts/start-production.sh:79)
```bash
# Migration execution
node --no-warnings dist/scripts/migrate.js

# Application start
exec node dist/src/index.js  # was: exec node dist/index.js
```

### 3. Previously Fixed (Commit `8fc36e9`)
- Added `.js` extensions to all ESM imports in [`src/index.ts`](services/backend/src/index.ts:5)
- Updated [`scripts/migrate.ts`](services/backend/scripts/migrate.ts:18) knex config path

## Current Deployment Status

**Service:** backend (Railway)
**URL:** https://backend-production-77f7.up.railway.app
**Status:** 502 Application failed to respond
**Last Commit:** `875dd85` (pushed to Railway)

## Verification Steps

### 1. Check Railway Build Logs
The build should show:
```
✓ TypeScript compilation successful
✓ dist/src/ directory created
✓ dist/scripts/ directory created
```

### 2. Check Railway Runtime Logs
Expected startup sequence:
```bash
🚀 Starting NT-POC Backend Service...
📦 Environment: production
⏳ Waiting for database connection...
✅ Database connection established
🔄 Running database migrations...
✅ Database migrations completed successfully
🚀 Starting application server...
Server is running on port 3000
```

### 3. Verify File Structure
SSH into Railway container (if possible) and verify:
```bash
ls -la dist/
ls -la dist/src/
ls -la dist/scripts/
```

## Environment Configuration (Railway)

### Database Connection (✅ Fixed)
```bash
DB_HOST=timescaledb.railway.internal
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=*** (set)
DB_SSL=false  # Internal Railway networking doesn't use SSL
```

### TimescaleDB Service (✅ Fixed)
```bash
POSTGRES_PASSWORD=*** (matches DB_PASSWORD)
POSTGRES_USER=postgres
POSTGRES_DB=railway
```

### Application Settings
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
JWT_SECRET=*** (set)
```

## Potential Remaining Issues

### 1. TypeScript Compilation Not Including Scripts
If build fails, check [`tsconfig.json`](services/backend/tsconfig.json:5):
```json
{
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "./dist"
  },
  "include": [
    "src/**/*",
    "scripts/**/*"  // Must be present
  ]
}
```

### 2. Module Resolution in Compiled Code
After compilation, verify imports have `.js` extensions:
```javascript
// dist/src/index.js should have:
import Sentry from './config/sentry.js';
import logger from './config/logger.js';
import app from './app.js';
```

### 3. Migration Path Resolution
[`dist/scripts/migrate.js`](services/backend/scripts/migrate.ts:18) should resolve:
```javascript
const knexConfigPath = join(__dirname, '../src/config/knex.js');
// Which resolves to: dist/scripts/../src/config/knex.js
// = dist/src/config/knex.js
```

### 4. Start Command in Railway
Railway should execute:
```bash
bash scripts/start-production.sh
```

Which internally calls:
```bash
node dist/src/index.js
```

## Next Debugging Steps

### Option A: Check Railway Logs (Recommended)
```bash
# Via Railway Dashboard
# Go to: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
# Select: backend service
# View: Deployments > Latest > Logs

# Via Railway CLI (if service linked correctly)
cd services/backend
railway link  # Select backend service
railway logs
```

### Option B: Test Build Locally
```bash
cd services/backend

# Clean build
rm -rf dist/
npm run build

# Verify structure
ls -la dist/
ls -la dist/src/
ls -la dist/scripts/

# Test production start
export NODE_ENV=production
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=nt_poc
export DB_USER=postgres
export DB_PASSWORD=yourpass
export DB_SSL=false
export PORT=3000
export JWT_SECRET=test

bash scripts/start-production.sh
```

### Option C: Alternative tsconfig Approach
If current structure causes issues, consider:
1. Keep `rootDir: "./src"` 
2. Copy scripts to dist manually in build step
3. Update package.json build script:
```json
{
  "scripts": {
    "build": "tsc && tsc --project scripts/tsconfig.json"
  }
}
```

## Files Modified in This Fix

1. [`services/backend/tsconfig.json`](services/backend/tsconfig.json:1) - Changed rootDir
2. [`services/backend/package.json`](services/backend/package.json:1) - Updated start script path
3. [`services/backend/scripts/start-production.sh`](services/backend/scripts/start-production.sh:1) - Updated migration and app paths
4. [`services/backend/src/index.ts`](services/backend/src/index.ts:1) - Added .js extensions to imports
5. [`services/backend/scripts/migrate.ts`](services/backend/scripts/migrate.ts:1) - Fixed knex config path resolution

## Success Criteria

✅ **Build Phase:**
- TypeScript compiles without errors
- dist/src/ and dist/scripts/ directories created
- All .ts files compiled to .js with .js extensions in imports

✅ **Runtime Phase:**
- Database connection establishes (timescaledb.railway.internal:5432)
- Migrations execute successfully
- Server starts on port 3000
- Health endpoint responds: `GET /api/v1/health` returns `{"status":"healthy"}`

✅ **Public Access:**
- `curl https://backend-production-77f7.up.railway.app/api/v1/health` returns 200
- No 502 errors

## Timeline of Issues & Fixes

1. **Initial Error:** Database connection failure (30 attempts)
2. **Fixed:** DB_HOST pointing to non-existent service
3. **Error:** SSL not supported
4. **Fixed:** DB_SSL=false for internal Railway networking
5. **Error:** Empty database credentials
6. **Fixed:** Set all DB_* environment variables
7. **Error:** TimescaleDB missing POSTGRES_PASSWORD
8. **Fixed:** Set POSTGRES_* variables on TimescaleDB service
9. **Error:** MODULE_NOT_FOUND - migration script
10. **Fixed:** Updated tsconfig to compile scripts folder
11. **Error:** Missing .js extensions in ESM imports
12. **Fixed:** Added .js extensions to all imports in index.ts
13. **Error:** Wrong path in start command (dist/index.js)
14. **Fixed:** Updated to dist/src/index.js (current status)
15. **Current:** 502 - Application failed to respond

## Recommended Next Action

**Wait for Railway rebuild** to complete (commit `875dd85`) and monitor deployment logs via Railway dashboard to see exact error causing the 502.

If rebuild shows successful build but still 502, likely causes:
1. Port binding issue (app not listening on $PORT)
2. Health check failing
3. Startup timeout (app taking too long to start)
4. Uncaught exception during startup

## Alternative Deployment Approach

If path issues persist, consider simplifying the build structure:

```json
// tsconfig.json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

And handle migrations differently:
1. Compile migrations separately
2. Or run migrations from TypeScript directly with tsx
3. Or keep migrations as plain SQL files

This would restore the flat dist/ structure and avoid nested paths.
