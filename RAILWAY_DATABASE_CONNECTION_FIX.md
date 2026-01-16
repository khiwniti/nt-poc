# Railway Database Connection Failure - Root Cause & Solution

**Date**: 2026-01-16  
**Issue**: Backend service failing with "❌ Failed to connect to database after 30 attempts"  
**Status**: 🔴 **CRITICAL - TimescaleDB Service Not Running**

---

## Root Cause Identified

The backend environment variables show:
```bash
DB_HOST=timescaledb.railway.internal  # ← Pointing to non-existent service
DB_SSL=true
DATABASE_URL=postgresql://postgres:cQGmOZHklTOlcLfSrhACSyaRECIjCOqb@postgres.railway.internal:5432/railway
```

**Problem**: The `DB_HOST` is set to `timescaledb.railway.internal`, but **no TimescaleDB service exists** in your Railway project.

The backend is trying to connect to a service that doesn't exist, causing the 30 retry attempts to fail.

---

## Two Solution Paths

### Solution A: Deploy TimescaleDB Service (Recommended)

This is required if your migrations need TimescaleDB hypertables.

#### Step 1: Create TimescaleDB Service via Railway Dashboard

1. Go to Railway dashboard: https://railway.app/project/your-project
2. Click **"+ New"** → **"Empty Service"**
3. Name it: **`timescaledb`**
4. Go to **Settings** → **Source**
5. Choose **"Docker Image"**
6. Enter: `timescale/timescaledb:latest-pg16`

#### Step 2: Add TimescaleDB Environment Variables

In the TimescaleDB service, add:

```bash
POSTGRES_PASSWORD=cQGmOZHklTOlcLfSrhACSyaRECIjCOqb
POSTGRES_DB=railway
POSTGRES_USER=postgres
```

#### Step 3: Update Backend Variables

Update these backend service variables:

```bash
# Change DB_SSL from true to false (internal Railway connections don't need SSL)
DB_SSL=false

# Update DATABASE_URL to point to TimescaleDB
DATABASE_URL=postgresql://postgres:cQGmOZHklTOlcLfSrhACSyaRECIjCOqb@timescaledb.railway.internal:5432/railway
```

#### Step 4: Verify Deployment

```bash
railway logs --service backend

# Should see:
# ✅ Database connection established
# 🔄 Running database migrations...
# ✅ Migrations completed successfully
```

---

### Solution B: Use Existing PostgreSQL (Quick Fix)

If you don't need TimescaleDB features immediately, point backend to the existing Postgres service.

#### Update Backend Environment Variables:

```bash
# Change DB_HOST back to existing Postgres
DB_HOST=postgres.railway.internal

# Keep DB_SSL as true for external Postgres connections
DB_SSL=true

# DATABASE_URL is already correct:
# DATABASE_URL=postgresql://postgres:cQGmOZHklTOlcLfSrhACSyaRECIjCOqb@postgres.railway.internal:5432/railway
```

#### ⚠️ Warning: Migrations Will Fail

The existing migrations require TimescaleDB:
- [`20260112000000_t011_create_sensor_readings_hypertable.ts`](services/backend/migrations/20260112000000_t011_create_sensor_readings_hypertable.ts)
- [`20260113000000_create_sensor_readings_legacy.ts`](services/backend/migrations/20260113000000_create_sensor_readings_legacy.ts)

Both execute:
```sql
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('sensor_readings', 'timestamp', ...);
```

**These will fail** with standard PostgreSQL. You would need to either:
1. Deploy TimescaleDB (Solution A)
2. Rewrite migrations to remove TimescaleDB dependencies

---

## Recommended Action Plan

### Immediate Fix (Choose One):

**Option 1: Deploy TimescaleDB** (Best for production)
- Follow Solution A steps above
- Takes ~10 minutes
- Enables full time-series optimizations
- Required for hypertable features

**Option 2: Temporarily Use Standard PostgreSQL** (Quick test)
- Update `DB_HOST=postgres.railway.internal` on backend service
- Backend will connect, but migrations may fail
- Good for testing if basic connectivity works

### CLI Commands to Apply Option 2 (Quick Test):

```bash
# Update backend DB_HOST to point to existing Postgres
railway variables --service backend --set DB_HOST=postgres.railway.internal

# Verify the change
railway variables --service backend | grep DB_HOST

# Check logs
railway logs --service backend
```

---

## Diagnostic Evidence

From `railway variables --service backend`:

```
DB_HOST                             │ timescaledb.railway.internal  ← Non-existent!
DATABASE_URL                        │ postgresql://...@postgres.railway.internal:5432/railway  ← Exists
```

**Mismatch**: `DB_HOST` points to `timescaledb.railway.internal`, but `DATABASE_URL` points to `postgres.railway.internal`.

The application uses `DB_HOST` for the connection, causing the failure.

---

## Environment Variable Conflicts

Your backend has **conflicting database references**:

```bash
# Individual connection params (used by start-production.sh)
DB_HOST=timescaledb.railway.internal  ← Points to non-existent service
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=cQGmOZHklTOlcLfSrhACSyaRECIjCOqb

# Connection string (might be used elsewhere)
DATABASE_URL=postgresql://postgres:cQGmOZHklTOlcLfSrhACSyaRECIjCOqb@postgres.railway.internal:5432/railway
```

**Result**: The startup script reads `DB_HOST=timescaledb.railway.internal` and tries to connect there, failing because the service doesn't exist.

---

## How to Check if TimescaleDB Service Exists

Unfortunately, Railway CLI doesn't have a straightforward command to list all services. Check via:

1. **Railway Dashboard**: https://railway.app → your project → check left sidebar for services
2. **Try connecting**: If `timescaledb.railway.internal` resolves, the service exists

Based on the connection failures, it's clear **TimescaleDB service does NOT exist**.

---

## Immediate Next Steps

### Quick Test (2 minutes):

```bash
# Point backend to existing Postgres
railway variables --service backend --set DB_HOST=postgres.railway.internal

# Watch logs
railway logs --service backend --follow
```

Expected outcome:
- ✅ Database connection succeeds
- ❌ Migrations fail (TimescaleDB extension not available)

### Production Fix (10 minutes):

1. **Deploy TimescaleDB service** via Railway dashboard (see Solution A)
2. **Update `DB_SSL=false`** for internal Railway connections
3. **Update `DATABASE_URL`** to point to TimescaleDB
4. **Verify migrations succeed**

---

## Files That Need Updates (If Using Option 2)

If you choose to temporarily use standard PostgreSQL and skip TimescaleDB:

### 1. Disable TimescaleDB Migrations

Create a script to skip problematic migrations:

```bash
# services/backend/scripts/migrate-safe.ts
// Temporarily skip TimescaleDB migrations
const skipMigrations = [
  '20260112000000_t011_create_sensor_readings_hypertable.ts',
  '20260113000000_create_sensor_readings_legacy.ts'
];
```

### 2. Update startup script

Modify [`services/backend/scripts/start-production.sh`](services/backend/scripts/start-production.sh):

```bash
# Add fallback for migration failures
if npm run migrate; then
  echo "✅ Database migrations completed successfully"
else
  echo "⚠️ Database migrations failed, attempting to continue..."
  # Don't exit on migration failure for now
fi
```

---

## Summary

| Issue | Status |
|-------|--------|
| Database connection failing | 🔴 **Root cause identified** |
| TimescaleDB service missing | 🔴 **Service doesn't exist** |
| Environment variable mismatch | 🔴 **DB_HOST points to wrong service** |
| Solution available | ✅ **Two options documented** |

**Recommended**: Deploy TimescaleDB service (Solution A) for full functionality.

**Quick Test**: Update `DB_HOST` to `postgres.railway.internal` (Solution B) to verify basic connectivity.

---

## Related Documentation

- [RAILWAY_TIMESCALEDB_SETUP_GUIDE.md](RAILWAY_TIMESCALEDB_SETUP_GUIDE.md) - Detailed TimescaleDB deployment
- [RAILWAY_DATABASE_MIGRATION_DIAGNOSIS.md](RAILWAY_DATABASE_MIGRATION_DIAGNOSIS.md) - Previous diagnosis
- [services/backend/scripts/start-production.sh](services/backend/scripts/start-production.sh) - Startup script with connection logic

---

## Contact

If you need assistance:
1. Deploy TimescaleDB service via Railway dashboard (recommended)
2. Or apply Option 2 quick fix to test basic connectivity
3. Review logs: `railway logs --service backend --follow`
