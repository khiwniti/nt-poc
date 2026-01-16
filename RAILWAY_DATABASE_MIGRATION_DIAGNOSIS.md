# Railway Database Migration Diagnosis Report

**Date**: 2026-01-16  
**Service**: Backend (https://backend-production-77f7.up.railway.app)  
**Status**: ⚠️ **BLOCKED - Manual Configuration Required**

---

## Executive Summary

Database migrations are failing on Railway due to **missing TimescaleDB extension**. The backend service requires TimescaleDB for time-series battery sensor data storage, but Railway's standard PostgreSQL plugin does not include this extension.

**Multiple issues were identified and resolved during diagnosis:**

1. ✅ **Fixed**: Empty `DB_HOST` environment variable
2. ✅ **Fixed**: Malformed `DATABASE_URL` (missing hostname)
3. ✅ **Fixed**: Missing SSL configuration in database connection pool
4. ✅ **Fixed**: Migration script path resolution for production builds
5. ⚠️ **BLOCKED**: TimescaleDB extension not available in Railway PostgreSQL

**Action Required**: Deploy custom TimescaleDB container on Railway (see [`RAILWAY_TIMESCALEDB_SETUP_GUIDE.md`](RAILWAY_TIMESCALEDB_SETUP_GUIDE.md))

---

## Detailed Diagnosis Timeline

### Phase 1: Initial Investigation

**Symptoms**:
- Backend service in crash loop
- Logs showing: "❌ Failed to connect to database after 30 attempts"
- Migrations not running

**Discovery**:
```bash
railway logs --service backend
# Output: Connection failures, no diagnostic details
```

### Phase 2: Environment Variable Analysis

**Issue Found**: Empty `DB_HOST` variable

```bash
railway variables --service backend | grep DB_HOST
# Result: DB_HOST was blank/empty
```

**Issue Found**: Malformed `DATABASE_URL`

```
# Before:
DATABASE_URL=postgresql://postgres:password@:5432/railway
                                          ^^^ missing hostname!

# After:
DATABASE_URL=postgresql://postgres:cQGmOZHklTOlcLfSrhACSyaRECIjCOqb@postgres.railway.internal:5432/railway
```

**Fixes Applied**:
- Set `DB_HOST=postgres.railway.internal`
- Updated `DATABASE_URL` with correct hostname
- Set `DB_SSL=true` for Railway's Postgres

### Phase 3: Code Configuration Fixes

**Issue Found**: Missing SSL support in database connection pool

**File**: [`services/backend/src/config/database.ts`](services/backend/src/config/database.ts)

```typescript
// Added:
ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
```

**Issue Found**: Migration script using wrong path detection

**File**: [`services/backend/scripts/migrate.ts`](services/backend/scripts/migrate.ts)

```typescript
// Before:
const isProduction = __dirname.includes('/dist/');

// After:
const isProduction = process.env.NODE_ENV === 'production';

// Path resolution also fixed:
const knexConfigPath = isProduction
  ? join(__dirname, '../dist/config/knex.js')
  : join(__dirname, '../src/config/knex.ts');
```

**Issue Found**: Insufficient diagnostic logging

**File**: [`services/backend/scripts/start-production.sh`](services/backend/scripts/start-production.sh)

```bash
# Added diagnostic output:
echo "🔍 DB_HOST: ${DB_HOST}"
echo "🔍 DB_PORT: ${DB_PORT}"
echo "🔍 DB_NAME: ${DB_NAME}"
echo "🔍 DB_SSL: ${DB_SSL}"

# Enhanced error reporting:
console.error('❌ Connection error:', err.code, err.message);
```

### Phase 4: Root Cause Discovery

**Critical Discovery**: User feedback revealed "timescaleDB was not enable yes"

**Investigation**: Searched migration files for TimescaleDB usage

```bash
grep -r "timescale\|hypertable\|CREATE EXTENSION" services/backend/migrations/
```

**Results**:

1. **Migration**: `20260112000000_t011_create_sensor_readings_hypertable.ts`
   ```typescript
   await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');
   await knex.raw("SELECT create_hypertable('sensor_readings', 'timestamp', ...)");
   ```

2. **Migration**: `20260113000000_create_sensor_readings_legacy.ts`
   ```typescript
   await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');
   await knex.raw("SELECT create_hypertable('sensor_readings', ...)");
   ```

**Conclusion**: Migrations **require TimescaleDB**, which Railway's standard PostgreSQL plugin does **NOT provide**.

---

## Root Cause Analysis

### Primary Cause: Missing TimescaleDB Extension

**What is TimescaleDB?**
- PostgreSQL extension for time-series data
- Provides hypertables with automatic partitioning
- Optimized for high-frequency sensor readings
- Not included in Railway's standard PostgreSQL plugin

**Why it's required:**
- Application stores battery sensor readings (voltage, current, temperature)
- High-frequency time-series data benefits from TimescaleDB optimizations
- Migrations explicitly create hypertables using `create_hypertable()`

**Impact:**
- Even if database connection works, migrations will fail
- `CREATE EXTENSION timescaledb` will fail (extension not available)
- `create_hypertable()` function doesn't exist in standard PostgreSQL
- Application cannot store sensor data properly

### Secondary Causes (All Fixed):

1. **Empty DB_HOST**: Caused connection failures
2. **Malformed DATABASE_URL**: Missing hostname between `@` and `:5432`
3. **No SSL Configuration**: Railway Postgres requires SSL connections
4. **Wrong Path Detection**: Migration script couldn't find compiled knex config

---

## Files Modified

### 1. [`services/backend/src/config/database.ts`](services/backend/src/config/database.ts)

**Change**: Added SSL support for Railway PostgreSQL

```typescript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false, // ← Added
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_TIMEOUT || '5000'),
});
```

### 2. [`services/backend/scripts/migrate.ts`](services/backend/scripts/migrate.ts)

**Changes**:
- Fixed production detection method
- Corrected path resolution for compiled files

```typescript
const isProduction = process.env.NODE_ENV === 'production'; // ← Changed

const knexConfigPath = isProduction
  ? join(__dirname, '../dist/config/knex.js')  // ← Fixed path
  : join(__dirname, '../src/config/knex.ts');
```

### 3. [`services/backend/scripts/start-production.sh`](services/backend/scripts/start-production.sh)

**Changes**:
- Added diagnostic logging for connection variables
- Enhanced error reporting with error codes
- Fixed stderr capture
- Added parseInt for port parsing

```bash
echo "🔍 DB_HOST: ${DB_HOST}"
echo "🔍 DB_PORT: ${DB_PORT}"
echo "🔍 DB_NAME: ${DB_NAME}"
echo "🔍 DB_SSL: ${DB_SSL}"

# Enhanced error output:
console.error('❌ Connection error:', err.code, err.message);

# Fixed command with stderr capture:
" 2>&1; then
```

---

## Current Status

### ✅ Completed

- [x] Diagnosed database connection issues
- [x] Fixed empty `DB_HOST` environment variable
- [x] Fixed malformed `DATABASE_URL`
- [x] Added SSL configuration to database connection pool
- [x] Fixed migration script path resolution
- [x] Enhanced startup script diagnostics
- [x] Identified TimescaleDB requirement
- [x] Redeployed backend service with fixes
- [x] Created comprehensive setup guide

### ⚠️ Blocked - Manual Action Required

- [ ] Deploy TimescaleDB container on Railway
- [ ] Update backend environment variables to point to TimescaleDB
- [ ] Verify migrations run successfully
- [ ] Test backend health endpoint

**Blocker**: Railway's PostgreSQL plugin does not include TimescaleDB extension

---

## Solution: Deploy TimescaleDB on Railway

### Quick Start

Follow the detailed guide: [`RAILWAY_TIMESCALEDB_SETUP_GUIDE.md`](RAILWAY_TIMESCALEDB_SETUP_GUIDE.md)

### Summary Steps

1. **Create TimescaleDB Service** in Railway dashboard:
   - New → Empty Service → Name: "timescaledb"
   - Settings → Source → Docker Image: `timescale/timescaledb:latest-pg16`

2. **Configure TimescaleDB**:
   ```bash
   POSTGRES_PASSWORD=<generate-strong-password>
   POSTGRES_DB=railway
   POSTGRES_USER=postgres
   ```

3. **Update Backend Variables**:
   ```bash
   DB_HOST=timescaledb.railway.internal
   DB_PORT=5432
   DB_NAME=railway
   DB_USER=postgres
   DB_PASSWORD=<same-password>
   DB_SSL=false  # Internal Railway connections don't need SSL
   DATABASE_URL=postgresql://postgres:<password>@timescaledb.railway.internal:5432/railway
   ```

4. **Verify**: Backend will auto-redeploy, check logs:
   ```bash
   railway logs --service backend
   # Should see:
   # ✅ Database connection established
   # 🔄 Running database migrations...
   # ✅ Migrations completed successfully
   ```

---

## Testing Checklist

After deploying TimescaleDB:

- [ ] Backend service starts without crash loop
- [ ] Logs show successful database connection
- [ ] Logs show migrations running
- [ ] Logs show "Migrations completed successfully"
- [ ] Health endpoint responds: `curl https://backend-production-77f7.up.railway.app/api/v1/health`
- [ ] Response shows `"database": "connected"`

---

## Alternative Solutions (Not Recommended)

### Option A: Remove TimescaleDB Requirement

**Impact**: Major code changes, loss of time-series optimizations

**Required Changes**:
- Rewrite 2+ migration files to use regular PostgreSQL tables
- Remove `create_hypertable()` calls
- Remove TimescaleDB-specific queries from application
- Accept performance degradation for time-series data
- Lose automatic partitioning and compression features

**Estimate**: 4-8 hours of development + testing

### Option B: Switch to Non-Railway Database

**Options**:
- Deploy own TimescaleDB on DigitalOcean, AWS RDS, etc.
- Use Timescale Cloud (managed TimescaleDB service)
- Update `DATABASE_URL` to point to external database

**Pros**: Full TimescaleDB features, managed backups  
**Cons**: Additional cost, complexity, external dependency

---

## Lessons Learned

1. **Always check extension requirements** before choosing a database provider
2. **Railway's "PostgreSQL" is standard PostgreSQL**, not a universal solution
3. **Environment variable validation is critical** - empty values cause silent failures
4. **Diagnostic logging saves time** - added early in debugging process
5. **User feedback is valuable** - "timescaleDB was not enable yes" was the key clue

---

## Related Documentation

- [RAILWAY_TIMESCALEDB_SETUP_GUIDE.md](RAILWAY_TIMESCALEDB_SETUP_GUIDE.md) - Step-by-step TimescaleDB deployment
- [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md) - General migration documentation
- [services/backend/MIGRATIONS.md](services/backend/MIGRATIONS.md) - Backend migration details

---

## Contact & Support

**Questions?** Refer to:
1. TimescaleDB Setup Guide for deployment steps
2. Railway documentation: https://docs.railway.app/
3. TimescaleDB documentation: https://docs.timescale.com/

**Next Action**: Follow [`RAILWAY_TIMESCALEDB_SETUP_GUIDE.md`](RAILWAY_TIMESCALEDB_SETUP_GUIDE.md) to deploy TimescaleDB on Railway.
