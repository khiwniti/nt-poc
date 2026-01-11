import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Ensure TimescaleDB extension is available
  await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

  // 2. Create sensors table if it doesn't exist (Dependencies: T010)
  const hasSensors = await knex.schema.hasTable('sensors');
  if (!hasSensors) {
    await knex.schema.createTable('sensors', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('facility_id').notNullable().references('id').inTable('facilities').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('type', 50).notNullable();
      table.jsonb('metadata').defaultTo('{}');
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
      
      table.index(['facility_id']);
    });
  }

  // 3. Handle existing sensor_readings table
  const hasSensorReadings = await knex.schema.hasTable('sensor_readings');
  if (hasSensorReadings) {
    // Drop the old table to replace with the new schema
    await knex.schema.dropTable('sensor_readings');
  }

  // 4. Create new sensor_readings table
  await knex.schema.createTable('sensor_readings', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sensor_id').notNullable().references('id').inTable('sensors').onDelete('CASCADE');
    table.uuid('facility_id').notNullable().references('id').inTable('facilities').onDelete('CASCADE');
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.specificType('value', 'numeric').notNullable();
    table.string('unit', 50).notNullable();
    table.string('status', 50).notNullable();
    table.jsonb('metadata');

    table.primary(['id', 'timestamp']);
  });

  // 5. Convert to hypertable
  await knex.raw("SELECT create_hypertable('sensor_readings', 'timestamp', chunk_time_interval => INTERVAL '1 week')");
}

export async function down(knex: Knex): Promise<void> {
  // Drop the hypertable
  await knex.schema.dropTableIfExists('sensor_readings');
  
  // Drop sensors table
  await knex.schema.dropTableIfExists('sensors');

  // Restore old sensor_readings schema (legacy support)
  await knex.schema.createTable('sensor_readings', (table) => {
    table.increments('id').primary();
    table.uuid('battery_system_id').notNullable().references('id').inTable('battery_systems').onDelete('CASCADE');
    table.timestamp('time', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.decimal('voltage', 10, 4);
    table.decimal('current', 10, 4);
    table.decimal('temperature', 6, 2);
    table.decimal('soc', 5, 2);
    table.decimal('soh', 5, 2);
    table.decimal('power', 10, 2);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['battery_system_id', 'time']);
    table.index('time');
  });
}
