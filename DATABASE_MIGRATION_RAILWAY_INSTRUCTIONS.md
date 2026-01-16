# Run Database Migrations - Railway Instructions

## Problem
Database migrations cannot be run from local machine because `DATABASE_URL` uses internal Railway networking (`postgres.railway.internal`), which is only accessible from within Railway's infrastructure.

## ✅ Solution: Run Migrations from Railway Dashboard

### Step 1: Access Railway Dashboard Shell

1. Go to https://railway.app/dashboard
2. Open **nt-poc-battery-management** project
3. Click **backend** service
4. Look for one of these options:
   - **"Deploy" tab** → **"Run Command"** button
   - **"Settings" tab** → **"One-off Commands"**
   - **Three dots menu** (⋮) → **"Run Command"**

### Step 2: Run Migration Commands

In the Railway command interface, run:

```bash
npm run migrate
```

Wait for completion. You should see output like:
```
✅ Migrated: 20240101000000_create_core_tables.ts
✅ Migrated: 20240102000000_create_rul_predictions.ts
✅ Migrated: 20240103000000_create_model_performance_tables.ts
... (more migrations)
✅ All migrations completed successfully!
```

###Step 3: (Optional) Run Seed Data

If you want test data:

```bash
npm run seed:run
```

Or run both at once:

```bash
npm run db:setup
```

---

## 🔄 Alternative Method: Trigger via Deployment Hook

If Railway doesn't have "Run Command" UI, we can add a migration job to the Dockerfile or create a separate migration service.

### Option A: Add Migration to Backend Startup

**NOT RECOMMENDED** - Migrations should be run once, not on every startup.

### Option B: Create Separate Migration Service

Create a one-time job service in Railway:

1. Railway Dashboard → **+ New** → **Empty Service**
2. Name: **migrator** (temporary)
3. Same repo: **khiwniti/nt-poc**
4. Builder: **Dockerfile**
5. Create file: `services/backend/Dockerfile.migrate`

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY services/backend/package*.json ./
RUN npm install --ignore-scripts

COPY services/backend/tsconfig.json ./
COPY services/backend/knexfile.ts ./
COPY services/backend/migrations/ ./migrations/
COPY services/backend/scripts/ ./scripts/
COPY services/backend/src/ ./src/

CMD ["npm", "run", "migrate"]
```

6. Deploy this service once
7. Check logs to confirm migrations ran
8. Delete the migrator service (it's one-time use)

### Option C: Use Railway Postgres Plugin Commands

Railway may have built-in psql access:

1. Dashboard → **postgres** service (if separate)
2. Click **Connect** or **Query**
3. Manually run SQL migrations from `services/backend/migrations/*.sql`

---

## 🔍 Verify Migrations Succeeded

After running migrations, check backend logs:

```bash
# Get recent deployment logs
```

Visit backend health endpoint:

```bash
curl https://backend-production-77f7.up.railway.app/api/v1/health
```

Should return `200 OK` without database errors.

Or check database directly from Railway Dashboard:
1. Click postgres service
2. Click **Data** or **Query** tab  
3. Run: `SELECT tablename FROM pg_tables WHERE schemaname='public';`
4. Should see tables like: `battery_systems`, `facilities`, `users`, `sensor_readings`, etc.

---

## 📋 Migration Files to Be Applied

The backend has 21+ migration files:

**Core Infrastructure**:
- Core tables (battery_systems, facilities, users)
- RUL predictions
- Model performance tracking
- Report annotations & versioning
- Geolocation features
- Analytics tables

**Recent Features**:
- Alert system & escalation
- TimescaleDB hypertables for sensor data
- Facility management system
- What-if scenario analysis

All migrations are idempotent and safe to run.

---

## ⚠️ Important Notes

### Why Local Migration Doesn't Work

The `railway run` command executes commands **locally** with Railway environment variables injected. However:

```
DATABASE_URL=postgresql://postgres:xxx@postgres.railway.internal:5432/railway
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                        Only accessible within Railway network!
```

Local machine cannot resolve `postgres.railway.internal`.

### Public Database URL

Railway databases don't expose public URLs by default for security. Migrations must run from within Railway infrastructure.

### Migration Safety

- ✅ All migrations are transactional (rollback on error)
- ✅ Idempotent (safe to run multiple times)
- ✅ No data loss (only CREATE/ALTER operations)
- ✅ Properly sequenced by timestamp

---

## 🎯 Recommended Approach

**BEST**: Use Railway Dashboard "Run Command" feature to execute `npm run migrate` from within the backend service environment.

**ALTERNATIVE**: Create temporary migration service (Dockerfile.migrate) that runs once and can be deleted.

**LAST RESORT**: Manually run SQL migrations through Railway's postgres query interface.

---

## 📞 Need Help?

If you cannot find the "Run Command" option in Railway Dashboard:

1. Check Railway documentation: https://docs.railway.app/
2. Look for "One-off Commands" or "Jobs" feature
3. Contact Railway support for guidance on running migrations
4. Or use the migration service approach (Option B above)

---

## ✨ Next Steps After Migrations

Once migrations complete:

1. ✅ Verify backend logs show no database errors
2. ✅ Test backend API endpoints
3. ✅ Check health endpoint returns 200 OK
4. ✅ Confirm tables exist in database
5. Move on to recreating frontend/mlops/simulator services