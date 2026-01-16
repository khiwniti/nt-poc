# Railway LINE Bot Database Connectivity Issue - Resolution Guide

## Problem Statement

LINE OA (Official Account) bot service cannot connect to the database/backend API on Railway.

## Root Cause Analysis

The LINE bot service **does not directly connect to the database**. Instead, it connects to the **backend API service** which provides data access. The issue is a **misconfiguration of the backend API URL** in the LINE bot service.

### Architecture Overview

```
LINE Bot → Backend API → PostgreSQL/TimescaleDB
         (HTTP REST)    (Database Connection)
```

- **LINE Bot**: Connects to backend via HTTP/REST API
- **Backend**: Connects directly to database
- **Database**: TimescaleDB (PostgreSQL extension)

## Issue Identification

### 1. Environment Variable Mismatch

**Code expects:** `BACKEND_API_URL` ([`services/line-bot/src/services/backendApi.ts`](services/line-bot/src/services/backendApi.ts:49))
```typescript
this.baseUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
```

**Documentation shows:** `BACKEND_URL` ([`RAILWAY_ALL_SERVICES_DEPLOYED.md`](RAILWAY_ALL_SERVICES_DEPLOYED.md:125))
```bash
railway variables set BACKEND_URL=http://backend.railway.internal:3000 --service line-bot
```

### 2. Current Backend Status

The backend service is experiencing 502 errors, which means:
- Backend is not responding to health checks
- LINE bot cannot reach backend API endpoints
- This appears as "database connection" issue from LINE bot perspective

## Resolution Steps

### Step 1: Fix Backend Service (Priority)

The backend must be operational first. Current status:
- ✅ Database connection configured (timescaledb.railway.internal)
- ✅ All DB credentials set
- ⏳ Application path fixes deployed (commit `875dd85`)
- ❌ Service returning 502 (Application failed to respond)

**Action:** Wait for Railway rebuild to complete and verify backend health:
```bash
curl https://backend-production-77f7.up.railway.app/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected"
}
```

### Step 2: Set Correct Environment Variable for LINE Bot

Once backend is healthy, configure LINE bot with correct variable name.

#### Option A: Set BACKEND_API_URL (Matches Code)
```bash
# Via Railway Dashboard
# Go to: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
# Service: line-bot
# Variables tab:

BACKEND_API_URL=http://backend.railway.internal:3000
```

#### Option B: Update Code to Use BACKEND_URL (Matches Docs)
Update [`services/line-bot/src/services/backendApi.ts`](services/line-bot/src/services/backendApi.ts:49):
```typescript
// Change from:
this.baseUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';

// To:
this.baseUrl = process.env.BACKEND_URL || process.env.BACKEND_API_URL || 'http://localhost:3000';
```

**Recommended:** Option A (set BACKEND_API_URL) - no code changes needed.

### Step 3: Verify LINE Bot Configuration

Check all required LINE bot environment variables in Railway:

```bash
# Required for LINE Platform Integration
LINE_CHANNEL_ACCESS_TOKEN=<your-line-channel-access-token>
LINE_CHANNEL_SECRET=<your-line-channel-secret>

# Backend API Connection
BACKEND_API_URL=http://backend.railway.internal:3000

# Application Settings
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

### Step 4: Restart LINE Bot Service

After setting environment variables:
```bash
# Via Railway Dashboard - click "Restart" on line-bot service
# Or via CLI (if linked):
railway restart --service line-bot
```

### Step 5: Test LINE Bot Health

```bash
# Check LINE bot is running
curl https://<line-bot-domain>.up.railway.app/health

# Expected response:
{
  "status": "ok",
  "service": "line-bot"
}
```

### Step 6: Test Backend API Connection from LINE Bot

Monitor LINE bot logs for backend API calls:
```bash
# Via Railway Dashboard
# Go to: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
# Service: line-bot
# Deployments > Latest > Logs

# Look for:
# ✅ "API Request: GET /api/v1/facilities/map"
# ❌ "API Network Error: No response received"
# ❌ "API Error: 502 - Application failed to respond"
```

## Diagnostic Commands

### Check Backend from LINE Bot Container

If you can access Railway shell:
```bash
# Test internal networking
curl -v http://backend.railway.internal:3000/api/v1/health

# Test DNS resolution
nslookup backend.railway.internal
ping backend.railway.internal
```

### Check Environment Variables

```bash
# In LINE bot container
echo $BACKEND_API_URL
echo $BACKEND_URL
echo $NODE_ENV
echo $LINE_CHANNEL_ACCESS_TOKEN
```

## Railway Internal Networking

LINE bot uses Railway's internal networking to communicate with backend:

```
LINE Bot Service → backend.railway.internal:3000 → Backend Service
                    (Private Network)
```

**Important:**
- Internal URLs: `http://backend.railway.internal:3000` (no SSL)
- External URLs: `https://backend-production-77f7.up.railway.app` (with SSL)
- LINE bot should use **internal URL** for service-to-service communication

## Common Issues and Solutions

### Issue 1: "API Network Error: No response received"

**Cause:** Backend service not running or wrong hostname
**Solution:**
1. Verify backend service is running: Check Railway dashboard
2. Verify hostname: Must be `backend.railway.internal` (not external domain)
3. Verify port: Must be `3000` (internal port)

### Issue 2: "API Error: 502"

**Cause:** Backend is running but not responding
**Solution:**
1. Check backend logs for startup errors
2. Verify database migrations completed
3. Check backend health endpoint directly
4. Review backend environment variables

### Issue 3: "Connection timeout"

**Cause:** Network configuration or port mismatch
**Solution:**
1. Verify Railway private networking is enabled (default)
2. Check both services are in same Railway project
3. Verify PORT environment variable matches service configuration

### Issue 4: LINE bot responds but with "System unavailable"

**Cause:** Backend connection configured but backend returns errors
**Solution:**
1. Check backend API endpoints are working
2. Verify database has required data (facilities, alerts, etc.)
3. Run database migrations and seeds
4. Check backend logs for application errors

## Verification Checklist

### Backend Service
- [ ] Backend service deployed and running
- [ ] Backend health endpoint returns 200 OK
- [ ] Database connection successful
- [ ] Database migrations completed
- [ ] Backend has public domain (for external access)
- [ ] Backend responds to: `GET /api/v1/health`
- [ ] Backend responds to: `GET /api/v1/facilities/map`

### LINE Bot Service
- [ ] LINE bot service deployed and running
- [ ] LINE bot health endpoint returns 200 OK
- [ ] Environment variable `BACKEND_API_URL` set correctly
- [ ] Environment variable `LINE_CHANNEL_ACCESS_TOKEN` set
- [ ] Environment variable `LINE_CHANNEL_SECRET` set
- [ ] LINE bot has public domain (for LINE webhook)
- [ ] LINE bot logs show successful API requests to backend
- [ ] No "Network Error" or "502" errors in LINE bot logs

### Integration Testing
- [ ] Send test message to LINE OA
- [ ] LINE bot receives webhook event
- [ ] LINE bot calls backend API successfully
- [ ] LINE bot sends response with actual data
- [ ] No "System unavailable" messages

## Current Status Summary

**Backend Service:**
- Status: 502 Application failed to respond
- Last Fix: Path updates for dist/src/ structure (commit `875dd85`)
- Next: Await Railway rebuild and verify startup

**LINE Bot Service:**
- Status: Unknown (need to check after backend is fixed)
- Issue: Missing BACKEND_API_URL environment variable
- Next: Set BACKEND_API_URL once backend is operational

**Database:**
- Status: ✅ Running and accessible
- Connection: timescaledb.railway.internal:5432
- Credentials: All configured

## Next Actions

1. **Monitor backend deployment** (commit `875dd85`)
   - Check Railway dashboard for build completion
   - Verify backend health endpoint

2. **Set LINE bot environment variable**
   - Add `BACKEND_API_URL=http://backend.railway.internal:3000`
   - Restart line-bot service

3. **Test end-to-end flow**
   - Send message to LINE OA
   - Verify backend API calls in LINE bot logs
   - Confirm data returns successfully

## Related Documentation

- [`RAILWAY_ALL_SERVICES_DEPLOYED.md`](RAILWAY_ALL_SERVICES_DEPLOYED.md:1) - Service deployment guide
- [`RAILWAY_BACKEND_PATH_FIX.md`](RAILWAY_BACKEND_PATH_FIX.md:1) - Backend path resolution fixes
- [`services/line-bot/README.md`](services/line-bot/README.md:1) - LINE bot documentation
- Railway Project: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4

## Technical Notes

### Why LINE Bot Doesn't Connect to Database Directly

The LINE bot is a **presentation/integration layer** that:
- Receives webhook events from LINE Platform
- Translates user messages to API requests
- Formats API responses into LINE message format
- Handles LINE-specific auth and message types

It **should not** have direct database access because:
- ✅ Separation of concerns (API handles business logic)
- ✅ Security (reduces attack surface)
- ✅ Maintainability (single source of truth for data)
- ✅ Consistency (all clients use same API)

### Railway Service Architecture

```
Internet → Railway Proxy → LINE Bot Service (Public)
                              ↓ (Internal Network)
                           Backend Service (Internal)
                              ↓ (Database Connection)
                           TimescaleDB Service (Internal)
```

Only the LINE bot webhook endpoint needs to be public (for LINE Platform to send events). All other communication happens via Railway's secure internal network.
