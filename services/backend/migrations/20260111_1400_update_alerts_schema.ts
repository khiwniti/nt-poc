import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add new columns to alerts table
  await knex.schema.alterTable('alerts', (table) => {
    table.string('facility_id', 255);
    table.string('zone_id', 255);
    table.text('resolution_notes');
    // Add status enum column with default value
    table.enum('status', ['active', 'acknowledged', 'resolved'], {
      useNative: true,
      enumName: 'alert_status'
    }).notNullable().defaultTo('active');
  });

  // Migrate existing data: Convert boolean flags to status enum
  await knex.raw(`
    UPDATE alerts
    SET status = CASE
      WHEN resolved = true THEN 'resolved'::alert_status
      WHEN acknowledged = true THEN 'acknowledged'::alert_status
      ELSE 'active'::alert_status
    END
  `);

  // Drop old boolean columns
  await knex.schema.alterTable('alerts', (table) => {
    table.dropColumn('acknowledged');
    table.dropColumn('resolved');
  });

  // Update severity enum to match SQL file (info, medium, high, critical)
  // Update existing values: 'low' → 'info'
  await knex.raw(`
    UPDATE alerts
    SET severity = 'info'
    WHERE severity = 'low'
  `);
  
  // Drop the enum constraint
  await knex.raw(`
    ALTER TABLE alerts
    DROP CONSTRAINT IF EXISTS alerts_severity_check
  `);
  
  // Change column to text temporarily
  await knex.raw(`
    ALTER TABLE alerts
    ALTER COLUMN severity TYPE text
  `);

  // Create new enum type
  await knex.raw(`
    CREATE TYPE alert_severity AS ENUM ('info', 'medium', 'high', 'critical')
  `);
  
  // Convert column to new enum type
  await knex.raw(`
    ALTER TABLE alerts
    ALTER COLUMN severity TYPE alert_severity
    USING severity::alert_severity
  `);

  // Add new indexes for performance
  await knex.schema.alterTable('alerts', (table) => {
    table.index(['facility_id', 'created_at'], 'idx_alerts_facility');
    table.index(['status', 'severity', 'created_at'], 'idx_alerts_status_severity');
    table.index(['zone_id', 'created_at'], 'idx_alerts_zone');
  });

  // Drop old index that included 'acknowledged' and 'resolved'
  await knex.raw(`DROP INDEX IF EXISTS idx_alerts_severity_acknowledged_resolved`);
}

export async function down(knex: Knex): Promise<void> {
  // Add back boolean columns
  await knex.schema.alterTable('alerts', (table) => {
    table.boolean('acknowledged').notNullable().defaultTo(false);
    table.boolean('resolved').notNullable().defaultTo(false);
  });

  // Migrate status enum back to boolean flags
  await knex.raw(`
    UPDATE alerts
    SET
      acknowledged = CASE WHEN status IN ('acknowledged', 'resolved') THEN true ELSE false END,
      resolved = CASE WHEN status = 'resolved' THEN true ELSE false END
  `);

  // Drop new indexes
  await knex.raw(`DROP INDEX IF EXISTS idx_alerts_facility`);
  await knex.raw(`DROP INDEX IF EXISTS idx_alerts_status_severity`);
  await knex.raw(`DROP INDEX IF EXISTS idx_alerts_zone`);

  // Restore old index
  await knex.schema.alterTable('alerts', (table) => {
    table.index(['severity', 'acknowledged', 'resolved'], 'idx_alerts_severity_acknowledged_resolved');
  });

  // Drop status column
  await knex.schema.alterTable('alerts', (table) => {
    table.dropColumn('status');
  });

  // Drop status enum type
  await knex.raw(`DROP TYPE IF EXISTS alert_status CASCADE`);

  // Revert severity enum back to original (low, medium, high, critical)
  await knex.raw(`
    CREATE TYPE alert_severity_old AS ENUM ('low', 'medium', 'high', 'critical')
  `);

  await knex.raw(`
    ALTER TABLE alerts
    ALTER COLUMN severity TYPE alert_severity_old
    USING (CASE severity::text
      WHEN 'info' THEN 'low'::alert_severity_old
      ELSE severity::text::alert_severity_old
    END)
  `);

  await knex.raw(`DROP TYPE IF EXISTS alert_severity CASCADE`);
  await knex.raw(`ALTER TYPE alert_severity_old RENAME TO alert_severity`);

  // Drop new columns
  await knex.schema.alterTable('alerts', (table) => {
    table.dropColumn('facility_id');
    table.dropColumn('zone_id');
    table.dropColumn('resolution_notes');
  });
}
