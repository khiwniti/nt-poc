export async function up(knex) {
    // Create alert_escalation_events table
    await knex.schema.createTable('alert_escalation_events', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('alert_id').notNullable()
            .references('id').inTable('alerts').onDelete('CASCADE');
        // Escalation details
        table.string('from_severity', 20).notNullable();
        table.string('to_severity', 20).notNullable();
        table.timestamp('escalated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        // Escalation reason and metadata
        table.text('reason').notNullable();
        table.boolean('auto_escalated').notNullable().defaultTo(true);
        // Notification tracking
        table.boolean('notification_sent').notNullable().defaultTo(false);
        table.timestamp('notification_sent_at', { useTz: true });
        // Indexes for performance
        table.index(['alert_id', 'escalated_at'], 'idx_escalation_events_alert');
        table.index('escalated_at', 'idx_escalation_events_time');
    });
    // Create escalation_rules table
    await knex.schema.createTable('escalation_rules', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('facility_id', 255).notNullable().unique();
        // Escalation timeframes (in minutes)
        table.integer('info_to_medium_minutes').defaultTo(120);
        table.integer('medium_to_high_minutes').defaultTo(60);
        table.integer('high_to_critical_minutes').defaultTo(30);
        // Rule settings
        table.boolean('enabled').notNullable().defaultTo(true);
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        // Additional configuration
        table.jsonb('config').defaultTo('{}');
        // Indexes
        table.index('facility_id', 'idx_escalation_rules_facility');
        table.index(['enabled', 'facility_id'], 'idx_escalation_rules_enabled');
    });
    // Insert default escalation rule
    await knex('escalation_rules').insert({
        facility_id: 'default',
        info_to_medium_minutes: 120,
        medium_to_high_minutes: 60,
        high_to_critical_minutes: 30,
        enabled: true,
        config: {}
    });
    // Add comments for documentation
    await knex.raw(`
    COMMENT ON TABLE alert_escalation_events IS 'History of alert severity escalations';
    COMMENT ON TABLE escalation_rules IS 'Facility-specific escalation configuration';
    COMMENT ON COLUMN escalation_rules.info_to_medium_minutes IS 'Minutes before escalating info alerts to medium';
    COMMENT ON COLUMN escalation_rules.medium_to_high_minutes IS 'Minutes before escalating medium alerts to high';
    COMMENT ON COLUMN escalation_rules.high_to_critical_minutes IS 'Minutes before escalating high alerts to critical';
  `);
}
export async function down(knex) {
    // Drop tables in reverse order (cascading will handle foreign keys)
    await knex.schema.dropTableIfExists('alert_escalation_events');
    await knex.schema.dropTableIfExists('escalation_rules');
}
