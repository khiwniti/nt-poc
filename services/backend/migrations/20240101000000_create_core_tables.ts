import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create facilities table only if it doesn't exist
  const facilitiesExists = await knex.schema.hasTable('facilities');
  if (!facilitiesExists) {
    await knex.schema.createTable('facilities', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 255).notNullable();
      table.string('location', 255).notNullable();
      table.string('timezone', 100).notNullable().defaultTo('UTC');
      table.integer('total_zones').notNullable().defaultTo(0);
      table.enum('status', ['active', 'inactive', 'maintenance']).notNullable().defaultTo('active');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index('status');
      table.index('created_at');
    });
  }

  // Create battery_systems table only if it doesn't exist
  const batterySystemsExists = await knex.schema.hasTable('battery_systems');
  if (!batterySystemsExists) {
    await knex.schema.createTable('battery_systems', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('facility_id').notNullable().references('id').inTable('facilities').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('zone', 100);
      table.decimal('capacity_kwh', 10, 2).notNullable();
      table.enum('status', ['online', 'offline', 'maintenance', 'fault']).notNullable().defaultTo('online');
      table.timestamp('installed_date', { useTz: true });
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(['facility_id', 'status']);
      table.index('created_at');
    });
  }

  // Create sensor_readings table only if it doesn't exist
  const sensorReadingsExists = await knex.schema.hasTable('sensor_readings');
  if (!sensorReadingsExists) {
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

  // Create alerts table only if it doesn't exist
  const alertsExists = await knex.schema.hasTable('alerts');
  if (!alertsExists) {
    await knex.schema.createTable('alerts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('battery_system_id').notNullable().references('id').inTable('battery_systems').onDelete('CASCADE');
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
      table.string('type', 100).notNullable();
      table.text('message').notNullable();
      table.jsonb('metadata').defaultTo('{}');
      table.boolean('acknowledged').notNullable().defaultTo(false);
      table.timestamp('acknowledged_at', { useTz: true });
      table.string('acknowledged_by', 255);
      table.boolean('resolved').notNullable().defaultTo(false);
      table.timestamp('resolved_at', { useTz: true });
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.index(['battery_system_id', 'created_at']);
      table.index(['severity', 'acknowledged', 'resolved']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('alerts');
  await knex.schema.dropTableIfExists('sensor_readings');
  await knex.schema.dropTableIfExists('battery_systems');
  await knex.schema.dropTableIfExists('facilities');
}
