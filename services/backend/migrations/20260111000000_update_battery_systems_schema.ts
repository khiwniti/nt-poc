import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Add new columns and rename zone
  await knex.schema.alterTable('battery_systems', (table) => {
    table.renameColumn('zone', 'zone_id');
    table.string('model').notNullable().defaultTo('Unknown');
    table.string('manufacturer').notNullable().defaultTo('Unknown');
    table.timestamp('warranty_end_date', { useTz: true });
    table.jsonb('metadata').defaultTo('{}');
  });

  // 2. Update status constraint
  // Drop existing constraint
  await knex.raw('ALTER TABLE battery_systems DROP CONSTRAINT IF EXISTS battery_systems_status_check');
  
  // Update existing values to match new allowed values
  // 'online' -> 'operational'
  // 'fault' -> 'degraded'
  // We use raw queries here to avoid issues with check constraints during update
  await knex.raw("UPDATE battery_systems SET status = 'operational' WHERE status = 'online'");
  await knex.raw("UPDATE battery_systems SET status = 'degraded' WHERE status = 'fault'");

  // Add new constraint
  await knex.raw("ALTER TABLE battery_systems ADD CONSTRAINT battery_systems_status_check CHECK (status IN ('operational', 'degraded', 'maintenance', 'offline'))");
  
  // Update default value
  await knex.schema.alterTable('battery_systems', (table) => {
    table.string('status').defaultTo('operational').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revert status default
  await knex.schema.alterTable('battery_systems', (table) => {
      table.string('status').defaultTo('online').alter();
  });

  // Drop new constraint
  await knex.raw('ALTER TABLE battery_systems DROP CONSTRAINT IF EXISTS battery_systems_status_check');
  
  // Revert data
  await knex.raw("UPDATE battery_systems SET status = 'online' WHERE status = 'operational'");
  await knex.raw("UPDATE battery_systems SET status = 'fault' WHERE status = 'degraded'");

  // Add old constraint
  await knex.raw("ALTER TABLE battery_systems ADD CONSTRAINT battery_systems_status_check CHECK (status IN ('online', 'offline', 'maintenance', 'fault'))");

  // Revert columns
  await knex.schema.alterTable('battery_systems', (table) => {
    table.renameColumn('zone_id', 'zone');
    table.dropColumn('model');
    table.dropColumn('manufacturer');
    table.dropColumn('warranty_end_date');
    table.dropColumn('metadata');
  });
}
