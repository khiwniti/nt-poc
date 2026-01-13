import type { Knex } from 'knex';

/**
 * Create sensor_readings hypertable for battery system telemetry
 * This uses the legacy schema with battery_system_id for backward compatibility
 */
export async function up(knex: Knex): Promise<void> {
  // Ensure TimescaleDB extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

  // Check if sensor_readings table exists
  const hasTable = await knex.schema.hasTable('sensor_readings');
  
  if (!hasTable) {
    // Create sensor_readings table with battery_system_id (legacy schema)
    await knex.schema.createTable('sensor_readings', (table) => {
      table.increments('id').primary();
      table.uuid('battery_system_id').notNullable()
        .references('id').inTable('battery_systems').onDelete('CASCADE');
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

    // Convert to hypertable
    await knex.raw(`
      SELECT create_hypertable(
        'sensor_readings',
        'time',
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      )
    `);

    console.log('✅ Created sensor_readings hypertable with legacy schema');
  } else {
    console.log('ℹ️  sensor_readings table already exists');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sensor_readings');
}
