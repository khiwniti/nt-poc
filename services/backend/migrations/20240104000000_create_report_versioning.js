export async function up(knex) {
    await knex.schema.createTable('reports', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name', 255).notNullable();
        table.text('description');
        table.text('template').notNullable();
        table.jsonb('configuration').notNullable().defaultTo('{}');
        table.integer('current_version').notNullable().defaultTo(1);
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index('created_at');
        table.index('updated_at');
        table.index('name');
    });
    await knex.schema.createTable('report_versions', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('report_id').notNullable().references('id').inTable('reports').onDelete('CASCADE');
        table.integer('version').notNullable();
        table.text('template').notNullable();
        table.jsonb('configuration').notNullable().defaultTo('{}');
        table.string('author_user_id', 255);
        table.text('change_summary');
        table.jsonb('change_details').notNullable().defaultTo('{}');
        table.integer('rollback_from_version');
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.unique(['report_id', 'version']);
        table.index(['report_id', 'created_at']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('report_versions');
    await knex.schema.dropTableIfExists('reports');
}
