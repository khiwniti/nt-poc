# Railway Deployment - Final Status & Next Steps
**Date**: 2026-01-16  
**Status**: Partial Deployment - Database Configuration Required

---

## 🎯 Current Status Summary

### ✅ Successfully Deployed Services

| Service | Status | URL | Health Check |
|---------|--------|-----|--------------|
| **Frontend** | ✅ Deployed | https://frontend-production-ed3d.up.railway.app/ | 200 OK |
| **MLOps** | ✅ Deployed | https://mlops-production-3b39.up.railway.app/health | Healthy |
| **LINE Bot** | ✅ Deployed | https://line-bot-production-8114.up.railway.app/health | Healthy |
| **Simulator** | ✅ Deployed | https://simulator-production-a018.up.railway.app/api/health | Needs verification |

### ⚠️ Services Requiring Configuration

| Service | Status | Issue | Solution |
|---------|--------|-------|----------|
| **Backend** | 🔄 Deployed but failing | No database connection | Add PostgreSQL addon + configure variables |
| **Frontend** | ⚠️ Working but misconfigured | Connecting to localhost:3000 | Update VITE_API_URL environment variable |

---

## 🔧 Code Fixes Completed

### ✅ Backend Migration Path Fix

Fixed the Knex migration issue where compiled TypeScript paths were incorrect:

1. **Updated files**:
   - [`services/backend/Dockerfile`](services/backend/Dockerfile) - Fixed build and copy paths
   - [`services/backend/scripts/migrate.ts`](services/backend/scripts/migrate.ts) - Dynamic path resolution
   - [`services/backend/scripts/migrate-rollback.ts`](services/backend/scripts/migrate-rollback.ts) - Dynamic path resolution  
   - [`services/backend/scripts/migrate-status.ts`](services/backend/scripts/migrate-status.ts) - Dynamic path resolution

2. **Changes made**:
   - Migration scripts now detect if running from `dist/` (production) or `src/` (development)
   - Dynamically import from correct path: `../dist/config/knex.js` or `../src/config/knex.js`
   - Dockerfile copies compiled scripts properly
   - Uses [`knexfile.js`](services/backend/knexfile.js) (no compilation needed)

3. **Result**: Backend deploys and starts correctly, waits for database connection

---

## 🚀 Required Next Steps

### CRITICAL: Step 1 - Add PostgreSQL Database to Railway

The backend is deployed but cannot start without a database. You need to add Railway's PostgreSQL addon:

#### Via Railway Dashboard (Recommended):

```
1. Go to: https://railway.app/dashboard
2. Select project: "nt-poc-battery-management"
3. Click: "+ New" button
4. Select: "Database" → "Add PostgreSQL"
5. Wait ~1-2 minutes for provisioning
6. Railway automatically creates DATABASE_URL
```

#### Via Railway CLI (Alternative):

```bash
# This requires interactive terminal
railway add
# Select: PostgreSQL
```

---

### Step 2 - Configure Backend Environment Variables

Once PostgreSQL is added, configure backend to use it:

#### Option A: Use DATABASE_URL (Simplest)

Railway's PostgreSQL automatically provides `DATABASE_URL`. Update backend to parse it:

```bash
# Get DATABASE_URL from PostgreSQL service
railway variables --service postgresql | grep DATABASE_URL

# Example: postgresql://postgres:password@host.railway.internal:5432/railway

# Backend can parse this automatically if we update knex config
```

#### Option B: Set Individual Variables (Current Setup)

Parse the DATABASE_URL and set individual variables:

```bash
# Example DATABASE_URL:
# postgresql://postgres:secretpass@postgres.railway.internal:5432/railway

# Set these in Railway dashboard or CLI:
railway variables --service backend set DB_HOST="postgres.railway.internal"
railway variables --service backend set DB_PORT="5432"
railway variables --service backend set DB_NAME="railway"
railway variables --service backend set DB_USER="postgres"
railway variables --service backend set DB_PASSWORD="secretpass"
railway variables --service backend set DB_SSL="true"
```

#### Set Additional Required Variables:

```bash
# JWT Secret (generate a secure random string)
railway variables --service backend set JWT_SECRET="$(openssl rand -base64 32)"

# Environment
railway variables --service backend set NODE_ENV="production"

# Port (Railway sets automatically, but confirm)
railway variables --service backend set PORT="3000"
```

---

### Step 3 - Redeploy Backend

After setting variables, backend will auto-redeploy or trigger manually:

```bash
cd services/backend
railway up --service backend
```

**Monitor deployment**:
```bash
railway logs --service backend --follow
```

**Expected successful logs**:
```
🚀 Starting NT-POC Backend Service...
📦 Environment: production
⏳ Waiting for database connection...
✅ Database connection established
🔄 Running database migrations...
📦 Using config from: ../dist/config/knex.js
✅ Database migrations completed successfully
📊 Checking migration status...
✅ Completed migrations (X)
🚀 Starting application server...
Server listening on port 3000
```

---

### Step 4 - Update Frontend VITE_API_URL

Frontend is currently trying to connect to `localhost:3000` instead of the Railway backend URL.

#### Set the correct backend URL:

```bash
railway variables --service frontend set VITE_API_URL="https://backend-production-77f7.up.railway.app"
```

#### Redeploy frontend:

```bash
cd services/frontend
railway up --service frontend
```

---

### Step 5 - Verify All Services

Once all steps are complete, test each endpoint:

```bash
# Frontend (should load without errors)
curl https://frontend-production-ed3d.up.railway.app/

# Backend health check
curl https://backend-production-77f7.up.railway.app/api/v1/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...}

# MLOps health check
curl https://mlops-production-3b39.up.railway.app/health
# Expected: {"status":"healthy",...}

# LINE Bot health check
curl https://line-bot-production-8114.up.railway.app/health
# Expected: {"status":"healthy",...}

# Simulator health check
curl https://simulator-production-a018.up.railway.app/api/health
# Expected: {"status":"ok",...}
```

---

## 📊 Environment Variables Checklist

### Backend Service

Required variables:

- [ ] `DB_HOST` - PostgreSQL host
- [ ] `DB_PORT` - PostgreSQL port (usually 5432)
- [ ] `DB_NAME` - Database name
- [ ] `DB_USER` - Database username
- [ ] `DB_PASSWORD` - Database password
- [ ] `DB_SSL` - Set to "true" for Railway
- [ ] `JWT_SECRET` - Secure random string for JWT signing
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Set to "3000" (Railway auto-sets)

Optional but recommended:

- [ ] `SENTRY_DSN` - Error tracking
- [ ] `REDIS_URL` - If using Redis for caching

### Frontend Service

Required variables:

- [ ] `VITE_API_URL` - Backend URL (https://backend-production-77f7.up.railway.app)

Optional:

- [ ] `VITE_GEMINI_API_KEY` - For AI features
- [ ] `VITE_ENABLE_VR` - Enable/disable VR mode

### LINE Bot Service

Required variables (if using):

- [ ] `LINE_CHANNEL_ACCESS_TOKEN` - LINE bot access token
- [ ] `LINE_CHANNEL_SECRET` - LINE bot secret
- [ ] `BACKEND_API_URL` - Backend URL
- [ ] `GEMINI_API_KEY` - For AI responses

---

## 🗄️ Database Migration Status

Once backend connects to database, migrations will run automatically via [`start-production.sh`](services/backend/scripts/start-production.sh).

### Manual Migration (if needed):

```bash
# Port forward to Railway database (if needed for local testing)
railway run --service backend psql $DATABASE_URL

# Or run migrations from local with Railway database
cd services/backend
railway run npm run migrate
```

### Migration Files:

All migrations are in [`services/backend/migrations/`](services/backend/migrations/):
- Creates tables for facilities, batteries, sensors, reports, work orders, etc.
- Sets up relationships and indexes
- Includes initial seed data capabilities

---

## 🏗️ Kubernetes Database (Optional - For Reference)

A PostgreSQL database was also set up in local Kubernetes for reference/development:

- **Namespace**: `facility-manager`
- **Service**: `postgres` (LoadBalancer on localhost:5432)
- **StatefulSet**: 1 replica, 10Gi storage
- **Access**: Only accessible locally (Docker Desktop K8s)

**To use K8s database**: See [`KUBERNETES_DATABASE_SETUP.md`](KUBERNETES_DATABASE_SETUP.md)

**Note**: Railway services cannot connect to local K8s database. Use Railway PostgreSQL addon for production.

---

## 🐛 Troubleshooting

### Backend: "Database not ready yet" (30 attempts then fails)

**Cause**: Database variables not set or incorrect

**Solution**:
1. Verify PostgreSQL addon is added to Railway project
2. Check database variables are set correctly
3. Ensure DB_SSL="true" for Railway
4. Test connection: `railway run --service backend node -e "require('pg').Client..."`

### Frontend: "Failed to load resource: net::ERR_CONNECTION_REFUSED localhost:3000"

**Cause**: VITE_API_URL not set or pointing to localhost

**Solution**:
```bash
railway variables --service frontend set VITE_API_URL="https://backend-production-77f7.up.railway.app"
railway up --service frontend
```

### Frontend: "Gemini API key not configured"

**Cause**: VITE_GEMINI_API_KEY not set (optional feature)

**Solution**:
```bash
# If you want AI features
railway variables --service frontend set VITE_GEMINI_API_KEY="your-gemini-key"
# Or ignore if not using AI features
```

### Backend: "Cannot find module '/app/src/config/knex.js'"

**Cause**: Old deployment before migration fix

**Solution**: ✅ **FIXED** - Redeploy with updated code:
```bash
cd services/backend
railway up --service backend
```

### Migrations fail during startup

**Cause**: Database schema incompatibility or connection issues

**Solution**:
1. Check logs: `railway logs --service backend`
2. Verify database is accessible
3. Manually rollback: `railway run --service backend npm run migrate:rollback`
4. Re-run migrations: `railway run --service backend npm run migrate`

---

## 📝 Quick Reference Commands

### Check Service Status

```bash
# List all services
railway service

# Check backend logs
railway logs --service backend --follow

# Check frontend logs
railway logs --service frontend --follow

# View all variables for a service
railway variables --service backend
```

### Redeploy Services

```bash
# Backend
cd services/backend && railway up --service backend

# Frontend
cd services/frontend && railway up --service frontend

# Any service from root
railway up --service <service-name>
```

### Database Operations

```bash
# Connect to PostgreSQL
railway run --service postgresql psql $DATABASE_URL

# Run migrations
railway run --service backend npm run migrate

# Check migration status
railway run --service backend npm run migrate:status

# Rollback last migration
railway run --service backend npm run migrate:rollback
```

---

## 📚 Related Documentation

- [`RAILWAY_ALL_SERVICES_DEPLOYED.md`](RAILWAY_ALL_SERVICES_DEPLOYED.md) - Initial deployment guide
- [`KUBERNETES_DATABASE_SETUP.md`](KUBERNETES_DATABASE_SETUP.md) - K8s database setup
- [`setup-railway-database.sh`](setup-railway-database.sh) - Automated setup script
- [`services/backend/MIGRATIONS.md`](services/backend/MIGRATIONS.md) - Database migration docs
- [`DATABASE_MIGRATION_GUIDE.md`](DATABASE_MIGRATION_GUIDE.md) - Migration best practices

---

## ✅ Success Criteria

Deployment is complete when:

- [ ] All 5 services show "Deployed" status in Railway dashboard
- [ ] Backend health endpoint returns `{"status":"healthy"}`
- [ ] Frontend loads without "ERR_CONNECTION_REFUSED" errors
- [ ] Frontend successfully fetches data from backend API
- [ ] Database migrations completed successfully (check backend logs)
- [ ] All services have required environment variables set
- [ ] No critical errors in any service logs

---

## 🎯 Summary

### What's Working:
- ✅ Frontend, MLOps, LINE Bot, Simulator deployed to Railway
- ✅ Backend code fixed (migration path issue resolved)
- ✅ Backend deploys successfully to Railway
- ✅ PostgreSQL StatefulSet deployed to K8s (for local/dev use)

### What's Needed:
- 🔧 Add PostgreSQL database addon in Railway
- 🔧 Configure backend database environment variables
- 🔧 Update frontend VITE_API_URL to point to Railway backend
- 🔧 Verify all services can communicate

### Estimated Time to Complete:
- Adding PostgreSQL: 2-3 minutes
- Configuring variables: 5 minutes
- Redeployment & verification: 5-10 minutes
- **Total: ~15-20 minutes**

---

**Next Action**: Add PostgreSQL database to Railway project and follow Step 2-5 above.

For questions or issues, check the troubleshooting section or review service logs with `railway logs --service <name>`.
