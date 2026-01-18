export async function up(knex) {
    await knex.schema.createTable('report_annotations', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.text('report_id').notNullable();
        table.text('section_id').notNullable();
        table.text('anchor_text');
        table.boolean('resolved').notNullable().defaultTo(false);
        table.timestamp('resolved_at', { useTz: true });
        table.text('resolved_by');
        table.text('resolved_by_email');
        table.text('resolved_by_name');
        table.text('created_by').notNullable();
        table.text('created_by_email');
        table.text('created_by_name');
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['report_id', 'section_id']);
        table.index(['report_id', 'resolved']);
        table.index('created_at');
    });
    await knex.schema.createTable('report_annotation_comments', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
            .uuid('annotation_id')
            .notNullable()
            .references('id')
            .inTable('report_annotations')
            .onDelete('CASCADE');
        table.text('body').notNullable();
        table.jsonb('mentions').notNullable().defaultTo('[]');
        table.text('created_by').notNullable();
        table.text('created_by_email');
        table.text('created_by_name');
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['annotation_id', 'created_at']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('report_annotation_comments');
    await knex.schema.dropTableIfExists('report_annotations');
}
