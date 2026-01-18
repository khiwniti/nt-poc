export async function up(knex) {
    // Create battery_systems table only if it doesn't exist
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
        console.log('✅ Created battery_systems table');
    }
    // Create sensor_readings table only if it doesn't exist
    const sensorReadingsExists = await knex.schema.hasTable('sensor_readings');
    if (!sensorReadingsExists) {
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
        console.log('✅ Created sensor_readings table');
    }
    // Create alerts table only if it doesn't exist
    const alertsExists = await knex.schema.hasTable('alerts');
    if (!alertsExists) {
        await knex.schema.createTable('alerts', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table.uuid('battery_system_id').notNullable()
                .references('id').inTable('battery_systems').onDelete('CASCADE');
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
        console.log('✅ Created alerts table');
    }
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('alerts');
    await knex.schema.dropTableIfExists('sensor_readings');
    await knex.schema.dropTableIfExists('battery_systems');
}
