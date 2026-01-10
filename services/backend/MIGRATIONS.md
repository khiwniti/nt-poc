# Database Migrations Guide

This project uses **Knex.js** for database migrations with automatic execution on deployment.

## Table of Contents

- [Quick Start](#quick-start)
- [Migration Commands](#migration-commands)
- [Creating Migrations](#creating-migrations)
- [Seed Data](#seed-data)
- [Automatic Deployment](#automatic-deployment)
- [Migration Status](#migration-status)
- [Rollback Support](#rollback-support)
- [Best Practices](#best-practices)

## Quick Start

### Initial Setup

```bash
# Install dependencies (runs migrations automatically via postinstall hook)
npm install

# Or manually run migrations and seeds
npm run db:setup
```

## Migration Commands

### Run Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last batch
npm run migrate:rollback
```

### Create New Migration

```bash
# Create a new migration file
npm run migrate:make create_new_table

# Example output: migrations/20240105123456_create_new_table.ts
```

## Creating Migrations

### Migration File Structure

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('table_name', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('table_name');
}
```

### Available Column Types

```typescript
// Common column types
table.uuid('id')
table.string('name', 255)
table.text('description')
table.integer('count')
table.decimal('price', 10, 2)
table.boolean('is_active')
table.timestamp('created_at', { useTz: true })
table.jsonb('metadata')
table.enum('status', ['active', 'inactive'])

// Constraints
.notNullable()
.nullable()
.defaultTo(value)
.unsigned()
// CHECK constraints (Postgres): use knex.raw('ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)')

// Indexes
table.index('column_name')
table.index(['col1', 'col2'])
table.unique('email')

// Foreign Keys
table.uuid('user_id')
  .references('id')
  .inTable('users')
  .onDelete('CASCADE')
```

## Seed Data

### Run Seeds

```bash
# Run all seed files
npm run seed:run
```

### Seed File Structure

```typescript
import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  await knex('table_name').del();

  // Insert seed data
  await knex('table_name').insert([
    { name: 'Item 1', status: 'active' },
    { name: 'Item 2', status: 'active' },
  ]);
}
```

## Automatic Deployment

Migrations run automatically on deployment via the `postinstall` npm hook.

### Deployment Flow

1. `npm install` is run during deployment
2. `postinstall` hook triggers `npm run migrate`
3. `migrate` script runs pending migrations
4. Application starts with up-to-date schema

### Manual Deployment

If you prefer manual control, remove the `postinstall` hook and run:

```bash
npm run migrate
npm start
```

## Migration Status

### Check Status

```bash
npm run migrate:status
```

Example output:

```
📊 Checking migration status...

✅ Completed migrations (3):
   ✓ 20240101000000_create_core_tables.ts
   ✓ 20240102000000_create_rul_predictions.ts
   ✓ 20240103000000_create_model_performance_tables.ts

⏳ Pending migrations (1):
   ○ 20240104000000_add_user_roles.ts
```

### Migration History Table

Knex tracks migrations in the `knex_migrations` table:

```sql
SELECT * FROM knex_migrations ORDER BY id DESC;
```

## Rollback Support

### Rollback Last Batch

```bash
npm run migrate:rollback
```

### Rollback Specific Number of Batches

```bash
# Rollback 2 batches
tsx node_modules/knex/bin/cli.js migrate:rollback --knexfile knexfile.ts --all
```

### Important Notes

- Rollbacks execute the `down()` function in migrations
- Always test rollbacks in development first
- Never rollback in production without a backup
- Consider using separate migration for schema changes vs data changes

## Best Practices

### 1. Naming Conventions

```bash
# Good naming
20240101000000_create_users_table.ts
20240102000000_add_email_index_to_users.ts
20240103000000_alter_users_add_role.ts

# Bad naming
migration1.ts
update.ts
```

### 2. Migration Structure

- One migration per logical change
- Always include `down()` method for rollback
- Use transactions for data migrations
- Test both `up()` and `down()` functions

### 3. Schema Changes

```typescript
// ✅ Good: Create index
await knex.schema.table('users', (table) => {
  table.index('email');
});

// ✅ Good: Add column with default
await knex.schema.table('users', (table) => {
  table.string('phone').nullable();
});

// ❌ Bad: Don't mix schema and data changes
await knex.schema.table('users', (table) => {
  table.string('role').notNullable().defaultTo('user');
});
await knex('users').update({ role: 'admin' }).where({ id: 1 });
```

### 4. Data Migrations

```typescript
// Use transactions for data migrations
export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const users = await trx('users').select('*');
    
    for (const user of users) {
      await trx('users')
        .where({ id: user.id })
        .update({ email_normalized: user.email.toLowerCase() });
    }
  });
}
```

### 5. Testing Migrations

```bash
# Test migration up
npm run migrate

# Verify database schema
# Check application works

# Test migration down
npm run migrate:rollback

# Test migration up again
npm run migrate
```

#### Automated Migration Tests

Database migration tests live in `services/backend/migration-tests/databaseMigrations.test.ts` and require a running PostgreSQL instance (configured via `.env.test`) with the `pgcrypto` extension available.

```bash
# Run just migration tests
npm run test:migrations
```

Optional tuning:
- `MIGRATION_TEST_SENSOR_ROWS` (default `50000`)
- `MIGRATION_TEST_MAX_QUERY_MS` (default `2000`)

## Existing Migrations

### 20240101000000_create_core_tables.ts

Creates core application tables:
- `facilities` - Facility locations and details
- `battery_systems` - Battery system inventory
- `sensor_readings` - Time-series sensor data
- `alerts` - System alerts and notifications

### 20240102000000_create_rul_predictions.ts

Creates RUL (Remaining Useful Life) prediction system:
- `rul_predictions` - ML model predictions with 90-day retention
- `cleanup_old_rul_predictions()` - Cleanup function for old data

### 20240103000000_create_model_performance_tables.ts

Creates MLOps monitoring tables:
- `model_predictions` - Model prediction tracking
- `model_performance_metrics` - Accuracy metrics (MAE, RMSE, R²)
- `model_drift_metrics` - Feature drift detection
- `data_quality_metrics` - Data quality monitoring
- `model_health_alerts` - Model health alerting
- `model_health_scores` - Overall model health scores

## Environment Configuration

Configure database connection in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=battery_management
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false  # Set to 'true' for production with SSL
NODE_ENV=development  # development | test | production
```

## Troubleshooting

### Migration Fails

```bash
# Check connection
psql -h localhost -U postgres -d battery_management

# Check migration status
npm run migrate:status

# View error details
npm run migrate 2>&1 | tee migration.log
```

### Reset Database (Development Only)

```bash
# ⚠️ WARNING: This will delete all data!

# Rollback all migrations
tsx node_modules/knex/bin/cli.js migrate:rollback --all --knexfile knexfile.ts

# Run all migrations
npm run migrate

# Seed data
npm run seed:run
```

## Additional Resources

- [Knex.js Documentation](https://knexjs.org/)
- [Knex Schema Builder](https://knexjs.org/guide/schema-builder.html)
- [Knex Migrations API](https://knexjs.org/guide/migrations.html)
