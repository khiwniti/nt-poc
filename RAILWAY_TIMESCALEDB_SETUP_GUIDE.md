# Railway TimescaleDB Setup Guide

## Problem Diagnosis

The database migrations are failing on Railway because:

1. **Database Connection Issues**: The backend service cannot connect to the PostgreSQL database
2. **Missing TimescaleDB Extension**: The migrations require TimescaleDB, which is not included in Railway's standard PostgreSQL plugin

## Evidence

### Migration Requirements

The following migrations require TimescaleDB:

- [`20260112000000_t011_create_sensor_readings_hypertable.ts`](services/backend/migrations/20260112000000_t011_create_sensor_readings_hypertable.ts)
- [`20260113000000_create_sensor_readings_legacy.ts`](services/backend/migrations/20260113000000_create_sensor_readings_legacy.ts)

Both migrations execute:
```sql
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('sensor_readings', 'timestamp', ...);
```

### Current Status

- ✅ Backend service is deployed
- ✅ PostgreSQL database is provisioned  
- ❌ Database connection failing (DB_HOST was empty, now set to `postgres.railway.internal`)
- ❌ TimescaleDB extension not available
- ❌ Migrations cannot run

## Solution: Enable TimescaleDB on Railway

Railway's standard PostgreSQL plugin **does not include TimescaleDB**. You have two options:

### Option 1: Deploy Custom TimescaleDB Docker Container (Recommended)

Railway allows you to deploy custom Docker containers. Deploy TimescaleDB as a separate service:

#### Step 1: Create TimescaleDB Service

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Empty Service"**
3. Name it **"timescaledb"**
4. Go to service **Settings** → **Source**
5. Choose **"Docker Image"**
6. Enter image: `timescale/timescaledb:latest-pg16` (or `timescale/timescaledb-ha:pg16` for high availability)

#### Step 2: Configure TimescaleDB Service

Add environment variables to the TimescaleDB service:

```bash
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=railway
POSTGRES_USER=postgres
```

#### Step 3: Update Backend Service Variables

Replace the existing PostgreSQL connection variables on the backend service with:

```bash
DB_HOST=timescaledb.railway.internal
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=<same-password-from-step-2>
DB_SSL=false
DATABASE_URL=postgresql://postgres:<password>@timescaledb.railway.internal:5432/railway
```

**Note**: Set `DB_SSL=false` because internal Railway connections don't require SSL.

#### Step 4: Remove Old PostgreSQL Plugin (Optional)

Once TimescaleDB is working, you can remove the old Postgres plugin to avoid confusion:

1. Go to the Postgres service
2. Settings → Danger Zone → Delete Service

### Option 2: Use Railway's PostgreSQL and Add TimescaleDB Extension Manually

This option is **NOT recommended** because Railway's PostgreSQL doesn't support custom extensions out of the box. However, if you have a Teams plan with Database Extensions support:

1. Connect to your Railway PostgreSQL database using a client (e.g., `psql`, pgAdmin)
2. Run as superuser:
   ```sql
   CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
   ```

**Problem**: Railway's PostgreSQL plugin typically doesn't allow creating extensions, and TimescaleDB isn't pre-installed.

### Option 3: Modify Migrations to Not Require TimescaleDB (Not Recommended)

If you don't actually need time-series optimizations, you could modify the migrations to use regular PostgreSQL tables instead of hypertables. However, this would lose the performance benefits of TimescaleDB for time-series data.

## Recommended Implementation Plan

### Phase 1: Fix Database Connection (Already Done)

✅ Set `DB_HOST=postgres.railway.internal` on backend service  
✅ Set `DATABASE_URL` with correct hostname  
✅ Added SSL configuration to [`database.ts`](services/backend/src/config/database.ts)  
✅ Fixed migration script path resolution

### Phase 2: Enable TimescaleDB (Action Required)

**You need to do this manually via Railway dashboard:**

1. **Deploy TimescaleDB container** (follow Option 1 steps above)
2. **Update backend environment variables** to point to TimescaleDB service
3. **Redeploy backend** service to pick up new variables

### Phase 3: Verify Migrations

After TimescaleDB is deployed and backend variables updated:

```bash
# Check backend logs
railway logs --service backend

# Should see:
# ✅ Database connection established
# 🔄 Running database migrations...
# ✅ Migrations completed successfully
# 🚀 Starting server on port 3001...
```

### Phase 4: Test Health Endpoint

```bash
curl https://backend-production-77f7.up.railway.app/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-16T...",
  "database": "connected"
}
```

## Why TimescaleDB is Required

The application uses TimescaleDB hypertables for efficient storage and querying of time-series battery sensor data:

- **Sensor readings**: High-frequency voltage, current, temperature data
- **Automatic partitioning**: Data is automatically partitioned by time for performance
- **Compression**: Old data is compressed to save storage
- **Time-series optimizations**: Specialized indexes and query planning

Without TimescaleDB, the migrations will fail because:
1. `CREATE EXTENSION timescaledb` will fail (extension not available)
2. `create_hypertable()` function doesn't exist in standard PostgreSQL
3. Time-series queries won't be optimized

## Alternative: Use Standard PostgreSQL Tables

If you don't want to deploy TimescaleDB, you would need to:

1. **Rewrite migrations** to create regular tables instead of hypertables
2. **Remove TimescaleDB-specific code** from migrations
3. **Accept performance tradeoffs** for time-series queries
4. **Update application queries** that depend on hypertable features

This is **not recommended** as it would require significant code changes and lose important performance benefits.

## Next Steps

**Manual action required**:

1. Follow **Option 1** above to deploy TimescaleDB on Railway
2. Update backend service environment variables
3. Let the backend service redeploy automatically (it will pick up new DB connection)
4. Verify migrations run successfully via logs
5. Test the health endpoint

## Files Modified in This Debugging Session

✅ [`services/backend/src/config/database.ts`](services/backend/src/config/database.ts) - Added SSL support  
✅ [`services/backend/scripts/migrate.ts`](services/backend/scripts/migrate.ts) - Fixed path resolution  
✅ [`services/backend/scripts/start-production.sh`](services/backend/scripts/start-production.sh) - Enhanced diagnostics

## Summary

**Root Cause**: Migrations require TimescaleDB extension which is not available in Railway's standard PostgreSQL plugin.

**Solution**: Deploy a custom TimescaleDB Docker container on Railway and update backend connection variables.

**Status**: Code fixes complete. **Manual Railway dashboard configuration required** to deploy TimescaleDB.
