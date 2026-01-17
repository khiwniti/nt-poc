import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Check if columns already exist before adding them
  const hasModel = await knex.schema.hasColumn('battery_systems', 'model');
  const hasManufacturer = await knex.schema.hasColumn('battery_systems', 'manufacturer');
  const hasWarrantyEnd = await knex.schema.hasColumn('battery_systems', 'warranty_end_date');
  const hasMetadata = await knex.schema.hasColumn('battery_systems', 'metadata');
  
  await knex.schema.alterTable('battery_systems', (table) => {
    // Don't rename zone to zone_id - zone_id should already exist from core tables migration
    // Only add columns if they don't exist (migration replay safe)
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

  // Update status enum to use 'active' instead of 'online', 'offline' instead of 'fault'
  await knex.raw('ALTER TABLE battery_systems DROP CONSTRAINT IF EXISTS battery_systems_status_check');
  await knex.raw("UPDATE battery_systems SET status = 'active' WHERE status = 'online'");
  await knex.raw("UPDATE battery_systems SET status = 'offline' WHERE status = 'fault'");
  await knex.raw("ALTER TABLE battery_systems ADD CONSTRAINT battery_systems_status_check CHECK (status IN ('active', 'inactive', 'maintenance', 'offline'))");
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
