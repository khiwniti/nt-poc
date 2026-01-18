export async function up(knex) {
    await knex.schema.createTable('report_analytics_events', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('report_id').notNullable().references('id').inTable('reports').onDelete('CASCADE');
        table.string('event_type', 50).notNullable(); // 'view', 'download', 'email_open', 'email_click'
        table.string('format', 20); // 'pdf', 'csv', 'xlsx' (for downloads)
        table.string('user_id', 255);
        table.string('user_email', 255);
        table.jsonb('metadata').notNullable().defaultTo('{}'); // Additional context
        table.string('ip_address', 45);
        table.text('user_agent');
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['report_id', 'event_type', 'created_at']);
        table.index(['event_type', 'created_at']);
        table.index(['user_id', 'created_at']);
        table.index('created_at');
    });
    await knex.schema.createTable('report_analytics_summary', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('report_id').notNullable().unique().references('id').inTable('reports').onDelete('CASCADE');
        table.integer('total_views').notNullable().defaultTo(0);
        table.integer('total_downloads').notNullable().defaultTo(0);
        table.integer('total_email_opens').notNullable().defaultTo(0);
        table.integer('total_email_clicks').notNullable().defaultTo(0);
        table.integer('pdf_downloads').notNullable().defaultTo(0);
        table.integer('csv_downloads').notNullable().defaultTo(0);
        table.integer('xlsx_downloads').notNullable().defaultTo(0);
        table.timestamp('last_viewed_at', { useTz: true });
        table.timestamp('last_downloaded_at', { useTz: true });
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index('total_views');
        table.index('total_downloads');
        table.index('updated_at');
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('report_analytics_summary');
    await knex.schema.dropTableIfExists('report_analytics_events');
}
