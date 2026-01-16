# Backend Crash Fix - January 17, 2026

## Problem Summary

Backend service was crashing on Railway with multiple errors:
1. **502 "Application failed to respond"**
2. **Double-nested dist path**: `/app/dist/dist/config/knex.js`
3. **Missing .js extensions**: `Cannot find module '/app/dist/src/config/metrics'`

## Root Causes Identified

### 1. TypeScript Configuration Issue
**File:** [`services/backend/tsconfig.json`](services/backend/tsconfig.json:13)

**Problem:** `rootDir: "."` was creating nested output structure:
```
dist/
├── src/          # Nested structure
│   └── index.js
└── scripts/
    └── migrate.js
```

This caused path confusion in Railway's build environment, resulting in double-nested paths (`/app/dist/dist/`).

### 2. Missing ESM Import Extensions
**File:** [`services/backend/src/app.ts`](services/backend/src/app.ts:4)

**Problem:** Imports lacked `.js` extensions required for ESM:
```typescript
import { register } from './config/metrics';  // ❌ Missing .js
```

Node.js ESM strict mode requires explicit file extensions.

### 3. Path Mismatches
Multiple configuration files had inconsistent paths:
- `nixpacks.toml`: `node dist/src/index.js`
- `package.json`: `node dist/src/index.js`
- `start-production.sh`: `node dist/src/index.js`

## Solutions Applied

### 1. Restored Flat TypeScript Structure
**File:** [`services/backend/tsconfig.json`](services/backend/tsconfig.json:13)

```json
{
  "compilerOptions": {
    "rootDir": "./src",  // Changed from "."
    "outDir": "./dist"
  },
  "include": ["src/**/*"]  // Removed scripts/**/*
}
```

**Result:** Clean flat structure
```
dist/
├── index.js
├── app.js
├── config/
├── routes/
└── services/
```

### 2. Added .js Extensions to All Imports
**File:** [`services/backend/src/app.ts`](services/backend/src/app.ts:1)

```typescript
import { register } from './config/metrics.js';      // ✅ Added .js
import monitoringRouter from './routes/monitoring.js';  // ✅ Added .js
import { loggingMiddleware } from './middleware/logging.js';  // ✅ Added .js
// ... all 24 imports updated
```

### 3. Updated Start Commands
**File:** [`services/backend/nixpacks.toml`](services/backend/nixpacks.toml:11)
```toml
[start]
cmd = "node dist/index.js"  # Changed from dist/src/index.js
```

**File:** [`services/backend/package.json`](services/backend/package.json:7)
```json
{
  "scripts": {
    "start": "node dist/index.js"  // Changed from dist/src/index.js
  }
}
```

### 4. Updated Production Startup Script
**File:** [`services/backend/scripts/start-production.sh`](services/backend/scripts/start-production.sh:65)

```bash
# Run migrations with tsx (no longer compiling scripts)
if npx tsx scripts/migrate.ts; then
  echo "✅ Database migrations completed successfully"
fi

# Start app with flat path
exec node dist/index.js  # Changed from dist/src/index.js
```

## Migration Handling

Since `scripts/` is no longer compiled, migrations now run using `tsx` directly from TypeScript source:
- `npx tsx scripts/migrate.ts` - Runs migrations
- `npx tsx scripts/migrate-status.ts` - Checks status

This approach:
- ✅ Simpler build process (only src/ compiled)
- ✅ No double-nesting issues
- ✅ Migrations use source files directly
- ✅ Production image includes `tsx` dependency

## Files Modified

1. [`services/backend/tsconfig.json`](services/backend/tsconfig.json:1) - Restored flat structure
2. [`services/backend/src/app.ts`](services/backend/src/app.ts:1) - Added .js extensions (24 imports)
3. [`services/backend/nixpacks.toml`](services/backend/nixpacks.toml:11) - Updated start command
4. [`services/backend/package.json`](services/backend/package.json:7) - Updated start script
5. [`services/backend/scripts/start-production.sh`](services/backend/scripts/start-production.sh:65) - Updated paths and migration handling

## Verification Steps

### Local Build Test
```bash
cd services/backend
rm -rf dist
npm run build
ls -la dist/  # Should show flat structure
head dist/app.js  # Should show .js extensions
```

### Expected Output Structure
```
dist/
├── index.js          ✅
├── app.js            ✅
├── config/           ✅
├── routes/           ✅
├── services/         ✅
└── ... (no nested src/ or dist/ folders)
```

## Deployment Instructions

### Option 1: Railway CLI (Interactive)
```bash
cd services/backend
railway link --service backend
railway up
```

### Option 2: Railway CLI (Non-Interactive)
```bash
# From repository root
railway up --service backend --detach
```

### Option 3: Git Push (Automatic)
```bash
git add .
git commit -m "fix: resolve backend crash with flat dist structure and ESM imports"
git push origin main
```

Railway will automatically detect the push and redeploy.

## Expected Startup Sequence

After deployment, logs should show:
```
🚀 Starting NT-POC Backend Service...
📦 Environment: production
⏳ Waiting for database connection...
✅ Database connection established
🔄 Running database migrations...
✅ Database migrations completed successfully
🚀 Starting application server...
Server is running on port 3000
```

## Success Criteria

✅ **Build Phase:**
- TypeScript compiles without errors
- Flat dist/ structure created (no nested src/)
- All .js files have correct import extensions

✅ **Runtime Phase:**
- Database connection establishes
- Migrations execute successfully
- Server starts on port 3000
- No module resolution errors

✅ **Public Access:**
- `curl https://backend-production-77f7.up.railway.app/api/v1/health` returns 200
- Response: `{"status":"healthy"}`
- No 502 errors

## Prevention for Future

To avoid similar issues:

1. **Always use explicit .js extensions** in TypeScript imports when using ESM
2. **Keep rootDir simple** - prefer `"./src"` over `"."`
3. **Test builds locally** before deploying to Railway
4. **Verify dist/ structure** matches expected paths
5. **Consistent paths** across all config files (nixpacks.toml, package.json, scripts)

## Related Documentation

- Previous investigation: [`RAILWAY_BACKEND_PATH_FIX.md`](RAILWAY_BACKEND_PATH_FIX.md:1)
- TypeScript config: [`services/backend/tsconfig.json`](services/backend/tsconfig.json:1)
- Railway config: [`services/backend/railway.json`](services/backend/railway.json:1)
- Nixpacks config: [`services/backend/nixpacks.toml`](services/backend/nixpacks.toml:1)

## Timeline

- **Jan 16**: Multiple database and path issues identified
- **Jan 17 00:40**: Attempted nested structure with rootDir="."
- **Jan 17 00:44**: Reverted to flat structure with rootDir="./src"
- **Jan 17 00:44**: Added .js extensions to all imports
- **Jan 17 00:44**: Build verified locally - ready for deployment

---

**Status:** ✅ Fixed and ready for deployment
**Next Step:** Deploy to Railway and monitor logs
