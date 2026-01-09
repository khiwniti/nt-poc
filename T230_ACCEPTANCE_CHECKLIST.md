# T230: Database Migrations - Acceptance Checklist

**Task**: Set up database migrations with automatic execution on deployment using Knex.js migration system.

## ✅ Acceptance Criteria

### 1. Knex.js Migration Setup
- [x] **Knex.js installed** - Added `knex` package to dependencies
- [x] **Configuration file created** - `knexfile.ts` with dev/test/prod environments
- [x] **Knex instance configured** - `src/config/knex.ts` for app-wide usage
- [x] **TypeScript support** - All migration files use TypeScript

### 2. Migration Scripts for All Tables
- [x] **Core tables migration** - `20240101000000_create_core_tables.ts`
  - facilities
  - battery_systems
  - sensor_readings
  - alerts
- [x] **RUL predictions migration** - `20240102000000_create_rul_predictions.ts`
  - rul_predictions table
  - cleanup function for 90-day retention
- [x] **Model performance migration** - `20240103000000_create_model_performance_tables.ts`
  - model_predictions
  - model_performance_metrics
  - model_drift_metrics
  - data_quality_metrics
  - model_health_alerts
  - model_health_scores
- [x] **Proper indexes** - All tables have appropriate indexes for performance
- [x] **Foreign key constraints** - Proper relationships with CASCADE deletes
- [x] **Rollback support** - All migrations have `down()` functions

### 3. Seed Scripts for Initial Data
- [x] **Seed file created** - `seeds/001_initial_data.ts`
- [x] **Sample facilities** - 3 facilities with different statuses
- [x] **Sample battery systems** - 5 battery systems across facilities
- [x] **Sample sensor readings** - 24 hours of data per battery system
- [x] **Sample RUL predictions** - Initial predictions for all batteries
- [x] **Sample alerts** - Test alerts with different severities

### 4. Automatic Migration on Deploy
- [x] **Migration runner script** - `scripts/migrate.ts`
- [x] **postinstall hook** - Automatic migration on `npm install`
- [x] **Error handling** - Proper error logging and exit codes
- [x] **Idempotent** - Safe to run multiple times
- [x] **Package.json scripts** - `npm run migrate` command

### 5. Migration Rollback Support
- [x] **Rollback script** - `scripts/migrate-rollback.ts`
- [x] **Rollback command** - `npm run migrate:rollback`
- [x] **All migrations have down()** - Rollback functions for all migrations
- [x] **Proper cleanup** - Removes tables and functions on rollback

### 6. Migration Status Monitoring
- [x] **Status script** - `scripts/migrate-status.ts`
- [x] **Status command** - `npm run migrate:status`
- [x] **Completed migrations list** - Shows all applied migrations
- [x] **Pending migrations list** - Shows migrations not yet applied
- [x] **User-friendly output** - Clear, readable status messages

### 7. Documentation
- [x] **Migration guide** - Comprehensive `MIGRATIONS.md` documentation
- [x] **Quick start** - Setup and usage instructions
- [x] **Examples** - Migration and seed file examples
- [x] **Best practices** - Guidelines for creating migrations
- [x] **Troubleshooting** - Common issues and solutions
- [x] **Environment config** - Database connection setup (DB_SSL added)

## 📋 Testing Checklist

### Manual Testing

```bash
# 1. Install dependencies (triggers automatic migration)
cd services/backend
npm install

# 2. Check migration status
npm run migrate:status
# Expected: Shows all 3 migrations as completed

# 3. Test rollback
npm run migrate:rollback
# Expected: Rolls back last migration batch

# 4. Check status again
npm run migrate:status
# Expected: Shows rolled back migrations as pending

# 5. Re-run migrations
npm run migrate
# Expected: Applies pending migrations

# 6. Run seed data
npm run seed:run
# Expected: Populates database with sample data

# 7. Verify database
psql -d battery_management -c "\dt"
# Expected: Shows all tables

# 8. Check migration tracking table
psql -d battery_management -c "SELECT * FROM knex_migrations;"
# Expected: Shows migration history
```

### Integration Testing

1. **Fresh Installation Test**
   ```bash
   # Clean environment
   rm -rf node_modules package-lock.json
   
   # Install (should run migrations automatically)
   npm install
   
   # Verify all tables exist
   npm run migrate:status
   ```

2. **Deployment Simulation**
   ```bash
   # Simulate production deployment
   NODE_ENV=production npm install
   
   # Check migrations ran
   npm run migrate:status
   ```

3. **Rollback Test**
   ```bash
   # Roll back all migrations
   npm run migrate:rollback
   npm run migrate:rollback
   npm run migrate:rollback
   
   # Verify all tables removed
   # Re-apply all migrations
   npm run migrate
   ```

## 🎯 Implementation Summary

### Files Created/Modified

**Configuration:**
- `knexfile.ts` - Knex configuration for all environments
- `src/config/knex.ts` - Knex instance wrapper
- `.env.example` - Updated with DB_SSL configuration

**Migrations:**
- `migrations/20240101000000_create_core_tables.ts` - Core tables
- `migrations/20240102000000_create_rul_predictions.ts` - RUL predictions
- `migrations/20240103000000_create_model_performance_tables.ts` - MLOps tables

**Seeds:**
- `seeds/001_initial_data.ts` - Initial sample data

**Scripts:**
- `scripts/migrate.ts` - Run migrations
- `scripts/migrate-status.ts` - Check migration status
- `scripts/migrate-rollback.ts` - Rollback migrations

**Documentation:**
- `MIGRATIONS.md` - Comprehensive migration guide

**Package.json:**
- Added migration commands
- Added postinstall hook for automatic migrations
- Added db:setup command

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run migrate` | Run all pending migrations |
| `npm run migrate:status` | Check migration status |
| `npm run migrate:rollback` | Rollback last migration batch |
| `npm run migrate:make <name>` | Create new migration file |
| `npm run seed:run` | Run seed files |
| `npm run db:setup` | Run migrations and seeds |

### Database Schema

**Tables Created:**
1. `facilities` - 8 columns, 2 indexes
2. `battery_systems` - 9 columns, 2 indexes
3. `sensor_readings` - 10 columns, 2 indexes
4. `alerts` - 11 columns, 2 indexes
5. `rul_predictions` - 8 columns, 4 indexes
6. `model_predictions` - 14 columns, 2 indexes
7. `model_performance_metrics` - 22 columns, 1 index
8. `model_drift_metrics` - 14 columns, 1 index
9. `data_quality_metrics` - 19 columns, 1 index
10. `model_health_alerts` - 14 columns, 2 indexes
11. `model_health_scores` - 9 columns, 1 index
12. `knex_migrations` - Migration tracking (auto-created)

**Functions Created:**
- `cleanup_old_rul_predictions()` - 90-day retention cleanup
- `update_updated_at_column()` - Auto-update timestamps

## 🚀 Deployment Instructions

### First-Time Deployment

1. **Set environment variables:**
   ```bash
   export DB_HOST=your-db-host
   export DB_NAME=battery_management
   export DB_USER=your-db-user
   export DB_PASSWORD=your-db-password
   export DB_SSL=true
   export NODE_ENV=production
   ```

2. **Deploy application:**
   ```bash
   npm install  # Runs migrations automatically
   npm start
   ```

### Subsequent Deployments

Migrations run automatically via the `postinstall` hook:

```bash
npm install  # Updates dependencies and runs migrations
npm start
```

### Manual Migration Control

If you prefer manual control, remove the `postinstall` hook from `package.json`:

```bash
npm run migrate  # Run manually before starting
npm start
```

## ✨ Key Features

1. **Automatic Execution** - Migrations run on `npm install` via postinstall hook
2. **Environment-Specific** - Separate configs for dev/test/prod
3. **Idempotent** - Safe to run multiple times
4. **Transactional** - All migrations run in transactions
5. **Rollback Support** - All migrations have rollback capability
6. **Status Monitoring** - Easy to check what's applied
7. **TypeScript** - Full TypeScript support for migrations
8. **Well-Documented** - Comprehensive documentation in MIGRATIONS.md

## 📊 Success Metrics

- ✅ All 3 migration files created
- ✅ All 11 tables defined with proper schema
- ✅ 1 seed file with sample data
- ✅ 3 utility scripts for migration management
- ✅ Automatic deployment via postinstall hook
- ✅ Full rollback support for all migrations
- ✅ Migration status monitoring
- ✅ Comprehensive documentation

## ⚠️ Important Notes

1. **Database Required** - PostgreSQL must be running and accessible
2. **Credentials** - Ensure database credentials are set in environment
3. **SSL in Production** - Set `DB_SSL=true` for production databases
4. **Backup Before Rollback** - Always backup before rolling back in production
5. **Test Migrations** - Always test migrations in development first

## 📚 References

- **Specification**: spec.md (Deployment section)
- **Planning**: plan.md (Section 8.5)
- **Migration Guide**: MIGRATIONS.md
- **Knex Documentation**: https://knexjs.org/
