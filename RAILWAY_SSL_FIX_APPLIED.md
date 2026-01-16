# Railway SSL Connection Fix - Applied

**Date**: 2026-01-16 15:27 UTC+7  
**Issue**: Backend failing with "The server does not support SSL connections"  
**Status**: 🔄 **FIX APPLIED - Redeploying**

---

## Root Cause Analysis

### Error Message:
```
❌ Connection error: undefined The server does not support SSL connections
```

### Configuration Issue:
```bash
DB_HOST=timescaledb.railway.internal  # Internal Railway service
DB_SSL=true                           # ← WRONG! Internal services don't use SSL
```

**Problem**: Railway's internal services (`*.railway.internal`) communicate over Railway's private network **without SSL**. Only external connections require SSL.

---

## Fix Applied

### Environment Variable Updated:
```bash
railway variables --service backend --set DB_SSL=false
```

**Before**:
```bash
DB_SSL=true  # ❌ Caused SSL connection error
```

**After**:
```bash
DB_SSL=false  # ✅ Correct for internal Railway connections
```

### Service Redeployed:
```bash
railway redeploy --service backend --yes
```

---

## Expected Behavior After Fix

### With DB_SSL=false:
1. **Connection Attempt**: Backend connects to `timescaledb.railway.internal:5432`
2. **No SSL Negotiation**: Plain PostgreSQL connection (internal network is secure)
3. **Two Possible Outcomes**:

   **A) If TimescaleDB service exists**:
   - ✅ Connection succeeds
   - ✅ Migrations run
   - ✅ Server starts successfully

   **B) If TimescaleDB service doesn't exist** (current situation):
   - ❌ Connection fails with: "ENOTFOUND timescaledb.railway.internal" or timeout
   - ❌ Server enters crash loop
   - **Solution**: Deploy TimescaleDB or change to `DB_HOST=postgres.railway.internal`

---

## Railway SSL Connection Rules

### Internal Connections (*.railway.internal):
```bash
DB_HOST=<service>.railway.internal
DB_SSL=false  # ✅ No SSL needed
```

Examples:
- `timescaledb.railway.internal` → `DB_SSL=false`
- `postgres.railway.internal` → `DB_SSL=false`
- `redis.railway.internal` → No SSL support

### External Connections (public URLs):
```bash
DB_HOST=<region>.railway.app
DB_SSL=true  # ✅ SSL required
```

Examples:
- `containers.railway.app` → `DB_SSL=true`
- External managed databases → `DB_SSL=true`

---

## Next Expected Outcome

### Scenario 1: TimescaleDB Service Exists
Logs will show:
```
🚀 Starting NT-POC Backend Service...
🔍 DB_HOST: timescaledb.railway.internal
🔍 DB_SSL: false
✅ Connection test successful
✅ Database connection established
🔄 Running database migrations...
✅ Database migrations completed successfully
🚀 Starting application server...
```

### Scenario 2: TimescaleDB Service Doesn't Exist (Current)
Logs will show:
```
🚀 Starting NT-POC Backend Service...
🔍 DB_HOST: timescaledb.railway.internal
🔍 DB_SSL: false
❌ Connection error: ENOTFOUND getaddrinfo ENOTFOUND timescaledb.railway.internal
⏳ Database not ready yet (attempt 1/30)...
```

**Fix**: Update `DB_HOST=postgres.railway.internal` or deploy TimescaleDB service

---

## Monitoring Redeployment

### Current Status:
- ✅ `DB_SSL` updated to `false`
- ✅ Redeployment triggered
- ⏳ Waiting for new container to start
- ⏳ Monitoring logs for connection result

### Commands to Monitor:
```bash
# Watch live logs
railway logs --service backend --follow

# Check deployment status
railway status --service backend

# Verify environment variables
railway variables --service backend | grep -E "(DB_HOST|DB_SSL)"
```

---

## Additional Fix Required (Likely)

Based on earlier diagnostics, the `timescaledb` service doesn't exist. After SSL fix, you'll likely need to:

### Option A: Deploy TimescaleDB
1. Railway Dashboard → **+ New** → **Empty Service**
2. Name: `timescaledb`
3. Docker Image: `timescale/timescaledb:latest-pg16`
4. Set password, database name
5. Backend will auto-connect

### Option B: Use Existing PostgreSQL
```bash
railway variables --service backend --set DB_HOST=postgres.railway.internal
```

**Tradeoff**: Migrations requiring TimescaleDB will fail, but basic connectivity works

---

## Technical Details

### Why Internal Services Don't Use SSL

1. **Private Network**: Railway's internal network is isolated
2. **Performance**: SSL overhead unnecessary for internal traffic
3. **Complexity**: Certificate management not needed
4. **Security**: Network isolation provides security

### PostgreSQL SSL Modes

```javascript
// With SSL (external connections)
ssl: { rejectUnauthorized: false }

// Without SSL (internal connections)
ssl: false
```

The code in [`services/backend/src/config/database.ts`](services/backend/src/config/database.ts:179) correctly handles both:
```typescript
ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
```

---

## Summary

| Item | Before | After |
|------|--------|-------|
| DB_SSL value | `true` ❌ | `false` ✅ |
| Error type | "server does not support SSL" | TBD (connection or host not found) |
| Service status | Crash loop | Redeploying |
| Next action | Update DB_SSL | Wait for logs, then fix DB_HOST if needed |

**Status**: SSL configuration fixed. Waiting for redeployment to determine if TimescaleDB service exists.
