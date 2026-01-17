# Database Schema Fix Strategy

## Executive Summary

The database schema investigation revealed a **critical mismatch** between the actual PostgreSQL database schema and the migration files/application code. This mismatch is causing the "0 facilities" issue and preventing data seeding.

### Current Situation

**Actual Database Schema (3-tier hierarchy):**
```
facilities → zones → battery_systems
```

- `zones` table exists with `facility_id` foreign key
- `battery_systems` has:
  - `zone_id` (references zones)
  - `serial_number`, `model`, `manufacturer`
  - `health_score`, `voltage_v`
  - `installation_date`
- `sensor_readings` has:
  - `battery_id` (not `battery_system_id`)
  - `timestamp` (not `time`)

**Expected Schema (from migrations/code):**
```
facilities → battery_systems (2-tier, then later migrations try to add zones)
```

- Migration `20240101000000_create_core_tables.ts` expects:
  - `battery_systems.facility_id` (direct link to facilities)
  - `battery_systems.zone` (string field, not FK)
- Migration `20260111000000_update_battery_systems_schema.ts` tries to:
  - Rename `zone` → `zone_id` (but assumes it's a string column)
- Seed file `001_initial_data.ts` expects:
  - 3-tier hierarchy with `zones` table
  - `battery_systems.zone_id`
  - `sensor_readings.battery_system_id` and `time`

**Application Code:**
- All 283+ references use `battery_system_id`, `facility_id`, `zone_id`
- Services, routes, repositories, tests all expect the 3-tier hierarchy
- No code references `battery_id` or `timestamp`

### Data Status
- **0 facilities** currently in database
- All 13 migrations marked as "completed" in `knex_migrations`
- This appears to be a **development environment**
- **No production data to preserve**

---

## Option A: Clean Database Rebuild (RECOMMENDED)

### Overview
Drop the entire database schema and rebuild from scratch using corrected migrations. This is the **fastest and cleanest** solution for a development environment.

### What Needs to Be Modified

#### 1. Drop Existing Schema
```bash
# All tables and knex_migrations will be removed
```

#### 2. Fix Migration File: `20260111000000_update_battery_systems_schema.ts`
**Problem:** Line 6 tries to rename `zone` → `zone_id`, but:
- The migration assumes `zone` is a string column
- The actual database already has `zone_id` as UUID
- This migration likely never ran successfully or caused the mismatch

**Fix Required:**
```typescript
// BEFORE (lines 4-11):
await knex.schema.alterTable('battery_systems', (table) => {
  table.renameColumn('zone', 'zone_id');  // ❌ WRONG: assumes 'zone' exists
  table.string('model').notNullable().defaultTo('Unknown');
  // ...
});

// AFTER: Remove the rename, add only if column doesn't exist
await knex.schema.alterTable('battery_systems', (table) => {
  // Don't rename - zone_id should already exist from zones table creation
  table.string('model').notNullable().defaultTo('Unknown');
  table.string('manufacturer').notNullable().defaultTo('Unknown');
  table.timestamp('warranty_end_date', { useTz: true });
  table.jsonb('metadata').defaultTo('{}');
});
```

#### 3. Create Missing Migration: `zones` Table
**Problem:** No migration creates the `zones` table, but the seed file expects it.

**New Migration Needed:** `20240101000001_create_zones_table.ts`
```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const zonesExists = await knex.schema.hasTable('zones');
  if (!zonesExists) {
    await knex.schema.createTable('zones', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('facility_id').notNullable()
        .references('id').inTable('facilities').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('location', 255);
      table.enum('status', ['active', 'inactive', 'maintenance'])
        .notNullable().defaultTo('active');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(['facility_id', 'status']);
      table.index('created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('zones');
}
```

#### 4. Fix Migration: `20240101000000_create_core_tables.ts`
**Problem:** Creates `battery_systems` with `facility_id`, but should use `zone_id`.

**Fix Required (lines 22-39):**
```typescript
// BEFORE:
await knex.schema.createTable('battery_systems', (table) => {
  table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
  table.uuid('facility_id').notNullable()  // ❌ WRONG: should be zone_id
    .references('id').inTable('facilities').onDelete('CASCADE');
  table.string('name', 255).notNullable();
  table.string('zone', 100);  // ❌ WRONG: should be zone_id UUID FK
  // ...
});

// AFTER:
await knex.schema.createTable('battery_systems', (table) => {
  table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
  table.uuid('zone_id').notNullable()  // ✅ CORRECT: references zones
    .references('id').inTable('zones').onDelete('CASCADE');
  table.string('serial_number', 100).unique();
  table.string('model', 100);
  table.string('manufacturer', 100);
  table.decimal('capacity_kwh', 10, 2).notNullable();
  table.decimal('voltage_v', 8, 2);
  table.integer('health_score').defaultTo(100);
  table.enum('status', ['active', 'inactive', 'maintenance', 'offline'])
    .notNullable().defaultTo('active');
  table.timestamp('installation_date', { useTz: true });
  table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

  table.index(['zone_id', 'status']);
  table.index('created_at');
});
```

#### 5. Verify Seed File
The seed file `001_initial_data.ts` **looks correct** - it already uses the 3-tier hierarchy. No changes needed.

### Data Impact
- ✅ **Loses:** Nothing (database is empty)
- ✅ **Preserves:** Nothing (no data to preserve)
- ✅ **Result:** Clean, working database with test data

### Execution Steps

```bash
# 1. Drop all tables and reset migrations
cd services/backend
npm run knex migrate:rollback --all

# If that fails, manually drop in PostgreSQL:
# psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Create the missing zones migration file
# (Create file: services/backend/migrations/20240101000001_create_zones_table.ts)

# 3. Fix the core tables migration
# (Edit: services/backend/migrations/20240101000000_create_core_tables.ts)

# 4. Fix the battery systems update migration
# (Edit: services/backend/migrations/20260111000000_update_battery_systems_schema.ts)

# 5. Run all migrations fresh
npm run migrate

# 6. Seed the database
npm run seed:run

# 7. Verify
npm run typecheck
npm run test
node -r tsx/register scripts/check-all-tables.ts
```

### Effort & Complexity
- **Time:** 30-60 minutes
- **Complexity:** Low
- **Risk:** Very Low (dev environment, no data)
- **Testing Required:** Migrations + seeds + unit tests

### Benefits
- ✅ Cleanest solution - no legacy issues
- ✅ Migrations match actual schema needs
- ✅ No migration debt or technical debt
- ✅ Full test coverage possible
- ✅ Fastest to implement

### Risks
- ⚠️ Must fix migrations correctly first time
- ⚠️ Any running services must be restarted

---

## Option B: Write Schema Transformation Migrations

### Overview
Keep existing schema and write new migrations to transform it to match application expectations.

### What Needs to Be Modified

#### 1. New Migration: Transform Current Schema
**File:** `20260117000000_fix_schema_mismatch.ts`

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Rename sensor_readings columns
  await knex.schema.alterTable('sensor_readings', (table) => {
    table.renameColumn('battery_id', 'battery_system_id');
    table.renameColumn('timestamp', 'time');
  });

  // 2. Update foreign key references
  await knex.raw(`
    ALTER TABLE sensor_readings 
    DROP CONSTRAINT IF EXISTS sensor_readings_battery_id_fkey
  `);
  
  await knex.raw(`
    ALTER TABLE sensor_readings
    ADD CONSTRAINT sensor_readings_battery_system_id_fkey
    FOREIGN KEY (battery_system_id) 
    REFERENCES battery_systems(id) 
    ON DELETE CASCADE
  `);

  // 3. Ensure zones table exists (should already exist)
  const zonesExists = await knex.schema.hasTable('zones');
  if (!zonesExists) {
    throw new Error('zones table missing - database in unexpected state');
  }

  // 4. battery_systems should already have zone_id - verify
  const hasZoneId = await knex.schema.hasColumn('battery_systems', 'zone_id');
  if (!hasZoneId) {
    throw new Error('battery_systems.zone_id missing - database in unexpected state');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sensor_readings', (table) => {
    table.renameColumn('battery_system_id', 'battery_id');
    table.renameColumn('time', 'timestamp');
  });
  
  // Restore FK constraint with old name
  await knex.raw(`
    ALTER TABLE sensor_readings 
    DROP CONSTRAINT IF EXISTS sensor_readings_battery_system_id_fkey
  `);
  
  await knex.raw(`
    ALTER TABLE sensor_readings
    ADD CONSTRAINT sensor_readings_battery_id_fkey
    FOREIGN KEY (battery_id) 
    REFERENCES battery_systems(id) 
    ON DELETE CASCADE
  `);
}
```

#### 2. Mark Old Migrations as Already Run
The `knex_migrations` table shows 13 migrations completed. These need to stay marked as completed even though they don't match reality.

### Data Impact
- ✅ **Loses:** Nothing (current data preserved)
- ✅ **Preserves:** All existing data (if any existed)
- ⚠️ **Result:** Working schema but migration history is confusing

### Execution Steps

```bash
cd services/backend

# 1. Create the transformation migration
# (Create: services/backend/migrations/20260117000000_fix_schema_mismatch.ts)

# 2. Run the new migration
npm run migrate

# 3. Seed the database
npm run seed:run

# 4. Verify
npm run typecheck
npm run test
node -r tsx/register scripts/check-all-tables.ts
```

### Effort & Complexity
- **Time:** 1-2 hours (write + test + debug)
- **Complexity:** Medium
- **Risk:** Medium (may encounter unexpected schema differences)
- **Testing Required:** Extensive (migrations + rollback + seeds + tests)

### Benefits
- ✅ Preserves any existing data (none in this case)
- ✅ Migration history stays in knex_migrations
- ✅ Can be rolled back if issues occur

### Risks
- ⚠️ Migration history becomes confusing (completed migrations don't match schema)
- ⚠️ May discover additional schema mismatches during migration
- ⚠️ Technical debt: history doesn't reflect actual schema evolution
- ⚠️ Future developers will be confused by migration order
- ⚠️ Harder to reproduce in fresh environments

---

## Option C: Update All Code to Match Database Schema

### Overview
Keep the current database schema and update all application code to match it.

### What Needs to Be Modified

#### Codebase Changes Required

**1. Column Name Changes (283+ occurrences):**
- Replace `battery_system_id` → `battery_id` everywhere
- Replace `time` → `timestamp` in sensor_readings queries
- Add handling for actual database columns: `serial_number`, `health_score`, `voltage_v`, `installation_date`

**2. Files Requiring Updates (50+ files):**

**Services:**
- `src/services/mlopsClient.ts` (4 occurrences)
- `src/services/batchPredictionService.ts` (8 occurrences)
- `src/services/alertEscalationService.ts` (12 occurrences)
- `src/services/sensorIngestionService.ts` (6 occurrences)
- `src/services/scheduledPredictionJob.ts` (6 occurrences)
- `src/services/modelPerformance.ts` (10 occurrences)

**Repositories:**
- `src/repositories/BatterySystemRepository.ts` - Complete rewrite
- `src/repositories/AlertRepository.ts` - Update all queries

**Routes (20+ files):**
- `src/routes/predictions.ts`
- `src/routes/sensorReadings.ts`
- `src/routes/whatIfScenario.ts`
- `src/routes/batteryHealth.ts`
- `src/routes/comparativeAnalysis.ts`
- `src/routes/facilities.ts`
- `src/routes/weather.ts`
- `src/routes/chatbot.ts`
- `src/routes/explainability.ts`
- `src/routes/modelPerformance.ts`
- `src/routes/stream.ts`

**Tests (15+ test files):**
- All `__tests__` directories need updates
- Test factories need complete rewrites
- Test fixtures need updates
- Integration tests need query updates

**Type Definitions:**
- `src/types/rulPrediction.ts`
- `src/types/whatIfScenario.ts`
- All interface definitions

**3. Migration Files:**
All 13 migration files would need to be rewritten to match actual schema.

**4. Seed Files:**
- `seeds/001_initial_data.ts` - Rewrite to use `battery_id` and actual schema

#### Example Changes

**Before (current code):**
```typescript
const result = await pool.query(
  `SELECT * FROM sensor_readings 
   WHERE battery_system_id = $1 
   ORDER BY time DESC`,
  [batterySystemId]
);
```

**After (to match database):**
```typescript
const result = await pool.query(
  `SELECT * FROM sensor_readings 
   WHERE battery_id = $1 
   ORDER BY timestamp DESC`,
  [batteryId]
);
```

### Data Impact
- ✅ **Loses:** Nothing (schema stays same)
- ✅ **Preserves:** Current database structure
- ⚠️ **Result:** Massive code changes, high risk of bugs

### Execution Steps

```bash
# 1. Update all TypeScript types and interfaces (10+ files)
# 2. Update all repositories (5+ files)
# 3. Update all services (15+ files)
# 4. Update all routes (20+ files)
# 5. Update all tests (30+ files)
# 6. Update all migrations (13 files)
# 7. Update all seeds (3+ files)
# 8. Update test factories and fixtures (10+ files)

# 9. Run linter and fix all issues
npm run lint:fix

# 10. Run type checker
npm run typecheck

# 11. Fix all type errors (likely 100+)

# 12. Run all tests
npm test

# 13. Fix all test failures (likely 50+)

# 14. Manual testing of all endpoints

# Total: 100+ files to modify
```

### Effort & Complexity
- **Time:** 2-3 days (full rewrite)
- **Complexity:** Very High
- **Risk:** Very High (massive changes, high bug potential)
- **Testing Required:** Complete regression testing

### Benefits
- ✅ Database schema stays exactly as is
- ✅ No migration needed

### Risks
- ❌ 100+ files to modify
- ❌ 283+ code occurrences to change
- ❌ Very high risk of introducing bugs
- ❌ All tests need updates
- ❌ Type system needs complete rework
- ❌ High chance of missing references
- ❌ Will break existing deployments
- ❌ Documentation becomes outdated
- ❌ Future maintenance nightmare

---

## Comparison Matrix

| Criteria | Option A: Clean Rebuild | Option B: Transform Schema | Option C: Update Code |
|----------|------------------------|---------------------------|---------------------|
| **Time to Complete** | 30-60 min | 1-2 hours | 2-3 days |
| **Complexity** | Low | Medium | Very High |
| **Risk Level** | Very Low | Medium | Very High |
| **Files Modified** | 3 migrations | 1 new migration | 100+ files |
| **Data Loss** | None (DB empty) | None | None |
| **Technical Debt** | Zero | Medium | Very High |
| **Testing Effort** | Low | Medium | Very High |
| **Future Maintainability** | Excellent | Good | Poor |
| **Team Alignment** | High (clean) | Medium | Low (confusing) |
| **Rollback Ability** | Easy | Medium | Very Hard |
| **Documentation Match** | Perfect | Good | Requires rewrite |

---

## Recommendation: Option A (Clean Database Rebuild)

### Why Option A is Strongly Recommended

#### 1. **Context: Development Environment**
- Database currently has **0 facilities**
- No production data to preserve
- All 13 migrations show "completed" but schema doesn't match
- This is the perfect time for a clean slate

#### 2. **Technical Superiority**
- Migration files will accurately reflect schema evolution
- No technical debt or confusing history
- Application code already matches the target schema (3-tier hierarchy)
- Seed file already correct for target schema

#### 3. **Risk Analysis**
- **Option A Risk:** Very Low - just fix 3 migration files
- **Option B Risk:** Medium - transformation might hit unexpected issues
- **Option C Risk:** Very High - 100+ files, 283+ changes, massive bug potential

#### 4. **Time Investment**
- **Option A:** 30-60 minutes total
- **Option B:** 1-2 hours + potential debugging
- **Option C:** 2-3 days + extensive testing + likely bugs in production

#### 5. **Long-term Benefits**
- Clean migration history for new team members
- Easy to replicate in new environments (staging, production)
- Migrations become source of truth
- No confusion between "what migrations say" vs "what DB has"

### When to Consider Other Options

**Choose Option B if:**
- ✓ Database has critical production data that cannot be lost
- ✓ Multiple environments already running with current schema
- ✓ Cannot afford downtime for rebuild

**Choose Option C if:**
- ✗ **Never recommended** - only if absolutely forced by business constraints
- ✗ Would need strong justification (e.g., cannot touch database in production)

---

## Implementation Plan: Option A (Recommended)

### Phase 1: Preparation (5 minutes)

```bash
cd services/backend

# 1. Backup current knex_migrations table (just in case)
psql $DATABASE_URL -c "SELECT * FROM knex_migrations;" > migration-backup.txt

# 2. Verify no critical data exists
psql $DATABASE_URL -c "SELECT COUNT(*) FROM facilities;" # Should be 0
```

### Phase 2: Create Missing Migration (10 minutes)

**File:** `services/backend/migrations/20240101000001_create_zones_table.ts`

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const zonesExists = await knex.schema.hasTable('zones');
  if (!zonesExists) {
    await knex.schema.createTable('zones', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('facility_id').notNullable()
        .references('id').inTable('facilities').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('location', 255);
      table.enum('status', ['active', 'inactive', 'maintenance'])
        .notNullable().defaultTo('active');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(['facility_id', 'status']);
      table.index('created_at');
    });
    
    console.log('✅ Created zones table');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('zones');
  console.log('✅ Dropped zones table');
}
```

### Phase 3: Fix Core Tables Migration (15 minutes)

**File:** `services/backend/migrations/20240101000000_create_core_tables.ts`

Update the `battery_systems` table creation (lines 22-39):

```typescript
// Replace the battery_systems creation with:
const batterySystemsExists = await knex.schema.hasTable('battery_systems');
if (!batterySystemsExists) {
  await knex.schema.createTable('battery_systems', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('zone_id').notNullable()
      .references('id').inTable('zones').onDelete('CASCADE');
    table.string('serial_number', 100).unique();
    table.string('model', 100);
    table.string('manufacturer', 100);
    table.decimal('capacity_kwh', 10, 2).notNullable();
    table.decimal('voltage_v', 8, 2);
    table.integer('health_score').defaultTo(100);
    table.enum('status', ['active', 'inactive', 'maintenance', 'offline'])
      .notNullable().defaultTo('active');
    table.timestamp('installation_date', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['zone_id', 'status']);
    table.index('created_at');
  });
}
```

### Phase 4: Fix Battery Systems Update Migration (10 minutes)

**File:** `services/backend/migrations/20260111000000_update_battery_systems_schema.ts`

Replace the entire `up` function (lines 3-31):

```typescript
export async function up(knex: Knex): Promise<void> {
  // Check if columns already exist before adding them
  const hasModel = await knex.schema.hasColumn('battery_systems', 'model');
  const hasManufacturer = await knex.schema.hasColumn('battery_systems', 'manufacturer');
  const hasWarrantyEnd = await knex.schema.hasColumn('battery_systems', 'warranty_end_date');
  const hasMetadata = await knex.schema.hasColumn('battery_systems', 'metadata');
  
  await knex.schema.alterTable('battery_systems', (table) => {
    // Only add if not exists (migration replay safe)
    if (!hasModel) {
      table.string('model').notNullable().defaultTo('Unknown');
    }
    if (!hasManufacturer) {
      table.string('manufacturer').notNullable().defaultTo('Unknown');
    }
    if (!hasWarrantyEnd) {
      table.timestamp('warranty_end_date', { useTz: true });
    }
    if (!hasMetadata) {
      table.jsonb('metadata').defaultTo('{}');
    }
  });

  // Update status enum (if needed - zone_id should already exist from core tables)
  // Note: Status enum updates remain the same
  await knex.raw('ALTER TABLE battery_systems DROP CONSTRAINT IF EXISTS battery_systems_status_check');
  await knex.raw("UPDATE battery_systems SET status = 'active' WHERE status = 'online'");
  await knex.raw("UPDATE battery_systems SET status = 'offline' WHERE status = 'fault'");
  await knex.raw("ALTER TABLE battery_systems ADD CONSTRAINT battery_systems_status_check CHECK (status IN ('active', 'inactive', 'maintenance', 'offline'))");
}
```

### Phase 5: Drop and Rebuild Database (10 minutes)

```bash
# 1. Drop all tables (complete reset)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"

# Alternative: Use knex rollback (if it works)
npm run knex migrate:rollback --all

# 2. Verify clean slate
psql $DATABASE_URL -c "\dt"  # Should show "No relations found"

# 3. Run all migrations in correct order
npm run migrate

# Expected output:
# Batch 1 run: 13 migrations
# - 20240101000000_create_core_tables.ts
# - 20240101000001_create_zones_table.ts  (NEW)
# - 20240102000000_create_rul_predictions.ts
# - ... (all others)

# 4. Verify schema
node -r tsx/register scripts/check-all-tables.ts

# Expected: facilities, zones, battery_systems, sensor_readings, alerts, etc.
```

### Phase 6: Seed Database (5 minutes)

```bash
# 1. Run seeds
npm run seed:run

# 2. Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM facilities;"  # Should be 3
psql $DATABASE_URL -c "SELECT COUNT(*) FROM zones;"       # Should be 5
psql $DATABASE_URL -c "SELECT COUNT(*) FROM battery_systems;"  # Should be 5

# 3. Check facility data
psql $DATABASE_URL -c "SELECT id, name, location FROM facilities;"
```

### Phase 7: Validation (5 minutes)

```bash
# 1. Run type checker
npm run typecheck
# Expected: No errors

# 2. Run linter
npm run lint
# Expected: No errors (or only warnings)

# 3. Run tests
npm run test
# Expected: All tests pass

# 4. Test API endpoints (if server running)
curl http://localhost:3001/api/v1/facilities
# Expected: JSON with 3 facilities
```

### Phase 8: Verify Backend API (5 minutes)

```bash
# 1. Start backend server
npm run dev:backend

# 2. In another terminal, test endpoints:
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/facilities
curl http://localhost:3001/api/v1/facilities/11111111-1111-1111-1111-111111111111

# All should return valid data
```

---

## Success Criteria

✅ **Database has correct schema:**
- `facilities` table exists
- `zones` table exists with `facility_id` FK
- `battery_systems` has `zone_id` FK (not `facility_id`)
- `sensor_readings` has `battery_system_id` and `time` columns

✅ **Data is seeded successfully:**
- 3 facilities present
- 5 zones present
- 5 battery systems present
- Sensor readings exist

✅ **Application works:**
- Type checking passes: `npm run typecheck`
- Linting passes: `npm run lint`
- Tests pass: `npm run test`
- API returns facilities: `GET /api/v1/facilities`

✅ **No technical debt:**
- Migration files accurately reflect schema
- No confusing history in `knex_migrations`
- Team can replicate in new environments

---

## Rollback Plan

If issues occur during Option A implementation:

```bash
# 1. Stop any running services
pkill -f "node.*backend"

# 2. Drop everything again
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"

# 3. Restore original migrations from git
git checkout services/backend/migrations/

# 4. Re-run original migrations (will create broken schema)
npm run migrate

# 5. Note: This gets you back to square one (broken state)
# 6. Consider Option B if Option A proves problematic
```

---

## Post-Implementation Checklist

After completing Option A:

- [ ] All migrations run successfully without errors
- [ ] Seeds run successfully without errors
- [ ] `check-all-tables.ts` shows correct schema
- [ ] 3 facilities exist in database
- [ ] 5 zones exist linked to facilities
- [ ] 5 battery systems exist linked to zones
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Unit tests pass (`npm run test`)
- [ ] Integration tests pass (if applicable)
- [ ] API endpoints return data correctly
- [ ] Frontend can connect and display facilities (if tested)
- [ ] Documentation updated if needed
- [ ] Team notified of schema fix

---

## Questions & Answers

**Q: Will this affect production?**
A: No, this is a development database. Production should be handled separately with a proper deployment strategy.

**Q: Do we lose any data?**
A: No, the database is currently empty (0 facilities). There is no data to lose.

**Q: How long will this take?**
A: 30-60 minutes for Option A, following the step-by-step guide above.

**Q: What if we discover more issues?**
A: Option A gives a clean slate, making it easier to identify and fix any additional issues.

**Q: Can we do this incrementally?**
A: No, migration mismatches require a complete rebuild for Option A. Option B allows incremental approach but has technical debt.

**Q: What about Railway deployment?**
A: After local fix is confirmed working:
1. Push fixed migrations to Railway
2. Run `railway run npm run migrate:rollback --all` (or manual schema drop)
3. Run `railway run npm run migrate`
4. Run `railway run npm run seed:run`

---

## Next Steps

1. **Review this strategy document** with the team
2. **Get approval** for Option A (recommended)
3. **Allocate 1 hour** for implementation
4. **Follow Phase 1-8** above step-by-step
5. **Validate with Success Criteria**
6. **Deploy to Railway** after local validation

---

**Document Version:** 1.0  
**Created:** 2026-01-17  
**Author:** Database Schema Investigation  
**Status:** Ready for Implementation
