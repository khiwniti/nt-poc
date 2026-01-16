# Database Migration Guide for Railway Backend

## Current Situation
Backend is deployed on Railway but database tables don't exist yet. Need to run migrations.

---

## ✅ Step-by-Step Migration Process

### Option 1: Use Railway CLI (Recommended)

The backend has migration scripts configured in [`services/backend/package.json`](services/backend/package.json:18):
- `migrate`: Run all pending migrations
- `migrate:status`: Check which migrations have been run
- `seed:run`: Populate database with seed data
- `db:setup`: Run migrations + seeds in one command

### Commands:

```bash
# 1. Link to backend service (already done)
railway link --service backend

# 2. Check migration status
railway exec --service backend "cd services/backend && npm run migrate:status"

# 3. Run migrations
railway exec --service backend "cd services/backend && npm run migrate"

# 4. (Optional) Run seeds
railway exec --service backend "cd services/backend && npm run seed:run"

# Or run both at once:
railway exec --service backend "cd services/backend && npm run db:setup"
```

### Option 2: Direct Database Access

If Railway CLI doesn't support exec, use direct psql:

```bash
# Get database URL from environment
railway variables --service backend | grep DATABASE_URL

# Use the DATABASE_URL to connect with psql locally
psql <DATABASE_URL> -c "SELECT version();"

# Run migrations manually from local machine
cd services/backend
DATABASE_URL=<railway-database-url> npm run migrate
```

### Option 3: Through Railway Dashboard

1. Go to Railway Dashboard
2. Click backend service
3. Click "Run Command" or "Shell"
4. Run:
   ```bash
   npm run migrate
   npm run seed:run
   ```

---

## 📋 What Migrations Will Create

The backend has these migration files:

**Core Tables**:
- `20240101000000_create_core_tables.ts`: battery_systems, facilities, users, etc.
- `20240102000000_create_rul_predictions.ts`: RUL prediction tables
- `20240103000000_create_model_performance_tables.ts`: ML model metrics
- `20240104000000_create_report_annotations.ts`: Report annotations
- `20240104000000_create_report_versioning.ts`: Report versioning
- `20240105000000_add_geolocation_to_facilities.ts`: Facility coordinates
- `20240105000000_create_report_analytics.ts`: Analytics tables

**Recent Migrations**:
- `20260111000000_update_battery_systems_schema.ts`: Updated battery schema
- `20260111_1400_update_alerts_schema.ts`: Alert system updates
- `20260111_1410_create_alert_escalation_tables.ts`: Alert escalation
- `20260112000000_t011_create_sensor_readings_hypertable.ts`: TimescaleDB hypertable
- `20260113000000_create_sensor_readings_legacy.ts`: Legacy sensor readings
- `20260114000000_add_facility_management_system.ts`: Facility management

**SQL Migrations**:
- `002_create_alerts_and_escalation.sql`: Alert tables
- `002_create_what_if_scenarios.sql`: What-if analysis
- `003_add_facility_geospatial.sql`: Geospatial features
- `004_create_rul_predictions.sql`: RUL predictions

---

## 🔍 Verify Migrations Succeeded

After running migrations, verify tables exist:

```bash
# Check if tables were created
railway exec --service backend "psql \$DATABASE_URL -c \"\\dt\""

# Or using Railway Dashboard shell:
\dt

# Should see tables like:
# - battery_systems
# - facilities  
# - sensor_readings
# - rul_predictions
# - users
# - alerts
# - alert_escalation_rules
# etc.
```

Or test via backend API:

```bash
curl https://backend-production-77f7.up.railway.app/api/v1/health

# Should return 200 OK without database errors
```

---

## ⚠️ Troubleshooting

### Error: "relation does not exist"
**Solution**: Migrations haven't run yet. Follow steps above.

###Error: "permission denied"
**Solution**: DATABASE_URL user needs CREATE permission.

### Error: "TimescaleDB extension not found"
**Solution**: TimescaleDB extension needs to be installed on Railway database.

Railway should have TimescaleDB available. If not:
1. Go to Railway Dashboard → Database service
2. Check database type (should be PostgreSQL with TimescaleDB)
3. Or manually install: `CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`

### Error: "migrations already run"
**Solution**: Check status: `npm run migrate:status`

---

## 🎯 Expected Result

After successful migration:
- ✅ All database tables created
- ✅ Backend `/api/v1/health` returns 200 OK
- ✅ Backend logs show "Database connected" (not "relation does not exist")
- ✅ Backend can query facilities, battery_systems, etc.

---

## 📝 Post-Migration Checklist

- [ ] Migrations completed without errors
- [ ] Tables exist in database
- [ ] Backend health endpoint returns 200
- [ ] Backend logs show successful database connection
- [ ] (Optional) Seed data populated for testing

---

## 🚀 Running Now

I'll try to run the migrations using Railway CLI. If it doesn't work, you'll need to use one of the alternative methods above.