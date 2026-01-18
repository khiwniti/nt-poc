const SENSOR_TYPES_TABLE = 'sensor_types';
const SENSORS_TABLE = 'sensors';
const SIMULATION_SCENARIOS_TABLE = 'simulation_scenarios';
const BATTERY_SIM_CONFIG_TABLE = 'battery_simulation_config';
const SIMULATION_EVENT_LOG_TABLE = 'simulation_event_log';
const SENSOR_STATUS_CHECK = 'sensors_status_check';
const EVENT_TYPE_CHECK = 'simulation_event_log_type_check';
export async function up(knex) {
    const batterySystemsExists = await knex.schema.hasTable('battery_systems');
    if (!batterySystemsExists) {
        return;
    }
    const sensorTypesExists = await knex.schema.hasTable(SENSOR_TYPES_TABLE);
    if (!sensorTypesExists) {
        await knex.schema.createTable(SENSOR_TYPES_TABLE, (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table.string('sensor_name', 100).notNullable().unique();
            table.string('measurement_unit', 16).notNullable();
            table.decimal('min_value', 10, 4);
            table.decimal('max_value', 10, 4);
            table.decimal('typical_value', 10, 4);
            table.decimal('accuracy_percentage', 5, 2);
            table.integer('sampling_rate_hz');
            table.text('description');
            table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
        });
    }
    const sensorsExists = await knex.schema.hasTable(SENSORS_TABLE);
    if (!sensorsExists) {
        await knex.schema.createTable(SENSORS_TABLE, (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table
                .uuid('battery_system_id')
                .notNullable()
                .references('id')
                .inTable('battery_systems')
                .onDelete('CASCADE');
            table
                .uuid('sensor_type_id')
                .notNullable()
                .references('id')
                .inTable(SENSOR_TYPES_TABLE)
                .onDelete('RESTRICT');
            table.string('sensor_serial_number', 64).notNullable().unique();
            table.string('position_on_battery', 32);
            table.string('status', 16).notNullable().defaultTo('active');
            table.timestamp('calibration_date', { useTz: true });
            table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
            table.index(['battery_system_id', 'status'], 'idx_sensors_battery_status');
            table.index(['sensor_type_id'], 'idx_sensors_sensor_type');
        });
        await knex.raw(`ALTER TABLE ${SENSORS_TABLE} DROP CONSTRAINT IF EXISTS ${SENSOR_STATUS_CHECK}`);
        await knex.raw(`ALTER TABLE ${SENSORS_TABLE} ADD CONSTRAINT ${SENSOR_STATUS_CHECK} CHECK (status IN ('active','inactive','faulty','calibrating'))`);
    }
    const scenariosExists = await knex.schema.hasTable(SIMULATION_SCENARIOS_TABLE);
    if (!scenariosExists) {
        await knex.schema.createTable(SIMULATION_SCENARIOS_TABLE, (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table.string('scenario_name', 150).notNullable().unique();
            table.text('description');
            table.decimal('base_noise_level', 6, 4);
            table.decimal('drift_rate', 8, 4);
            table.decimal('failure_probability', 6, 5);
            table.decimal('temperature_variance', 10, 4);
            table.decimal('voltage_variance', 10, 4);
            table.decimal('current_variance', 10, 4);
            table.decimal('soc_degradation_rate', 8, 4);
            table.decimal('soh_degradation_rate', 8, 4);
            table.boolean('is_active').notNullable().defaultTo(true);
            table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
            table.index(['is_active', 'scenario_name'], 'idx_simulation_scenarios_active_name');
        });
    }
    const configExists = await knex.schema.hasTable(BATTERY_SIM_CONFIG_TABLE);
    if (!configExists) {
        await knex.schema.createTable(BATTERY_SIM_CONFIG_TABLE, (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table
                .uuid('battery_system_id')
                .notNullable()
                .unique()
                .references('id')
                .inTable('battery_systems')
                .onDelete('CASCADE');
            table
                .uuid('simulation_scenario_id')
                .notNullable()
                .references('id')
                .inTable(SIMULATION_SCENARIOS_TABLE)
                .onDelete('RESTRICT');
            table.decimal('custom_noise_level', 6, 4);
            table.integer('random_seed');
            table.timestamp('start_time', { useTz: true });
            table.timestamp('end_time', { useTz: true });
            table.boolean('is_active').notNullable().defaultTo(false);
            table.jsonb('configuration_json');
            table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
            table.index(['is_active', 'simulation_scenario_id'], 'idx_battery_sim_config_active_scenario');
            table.index(['battery_system_id'], 'idx_battery_sim_config_battery');
        });
    }
    const eventLogExists = await knex.schema.hasTable(SIMULATION_EVENT_LOG_TABLE);
    if (!eventLogExists) {
        await knex.schema.createTable(SIMULATION_EVENT_LOG_TABLE, (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table
                .uuid('battery_system_id')
                .notNullable()
                .references('id')
                .inTable('battery_systems')
                .onDelete('CASCADE');
            table
                .uuid('simulation_scenario_id')
                .references('id')
                .inTable(SIMULATION_SCENARIOS_TABLE)
                .onDelete('SET NULL');
            table
                .uuid('sensor_id')
                .references('id')
                .inTable(SENSORS_TABLE)
                .onDelete('SET NULL');
            table.string('event_type', 32).notNullable();
            table.text('event_description');
            table.jsonb('previous_state');
            table.jsonb('new_state');
            table.string('triggered_by', 64);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.index(['battery_system_id', 'created_at'], 'idx_simulation_event_log_battery_created');
            table.index(['simulation_scenario_id'], 'idx_simulation_event_log_scenario');
            table.index(['event_type'], 'idx_simulation_event_log_type');
        });
        await knex.raw(`ALTER TABLE ${SIMULATION_EVENT_LOG_TABLE} DROP CONSTRAINT IF EXISTS ${EVENT_TYPE_CHECK}`);
        await knex.raw(`ALTER TABLE ${SIMULATION_EVENT_LOG_TABLE} ADD CONSTRAINT ${EVENT_TYPE_CHECK} CHECK (event_type IN ('scenario_changed','failure_injected','sensor_calibrated','config_updated'))`);
        await knex.raw(`CREATE INDEX IF NOT EXISTS idx_simulation_event_log_previous_state_gin ON ${SIMULATION_EVENT_LOG_TABLE} USING GIN (previous_state)`);
        await knex.raw(`CREATE INDEX IF NOT EXISTS idx_simulation_event_log_new_state_gin ON ${SIMULATION_EVENT_LOG_TABLE} USING GIN (new_state)`);
    }
}
export async function down(knex) {
    await knex.raw(`DROP INDEX IF EXISTS idx_simulation_event_log_previous_state_gin`);
    await knex.raw(`DROP INDEX IF EXISTS idx_simulation_event_log_new_state_gin`);
    await knex.schema.dropTableIfExists(SIMULATION_EVENT_LOG_TABLE);
    await knex.schema.dropTableIfExists(BATTERY_SIM_CONFIG_TABLE);
    await knex.schema.dropTableIfExists(SENSORS_TABLE);
    await knex.schema.dropTableIfExists(SIMULATION_SCENARIOS_TABLE);
    await knex.schema.dropTableIfExists(SENSOR_TYPES_TABLE);
}
