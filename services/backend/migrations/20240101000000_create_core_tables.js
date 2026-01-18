export async function up(knex) {
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
        console.log('✅ Created facilities table');
    }
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('facilities');
}
