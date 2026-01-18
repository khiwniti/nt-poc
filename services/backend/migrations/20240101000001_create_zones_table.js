export async function up(knex) {
    const zonesExists = await knex.schema.hasTable('zones');
    if (!zonesExists) {
        await knex.schema.createTable('zones', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table.uuid('facility_id').notNullable()
                .references('id').inTable('facilities').onDelete('CASCADE');
            table.string('name', 255).notNullable();
            table.string('location', 255);
            table.enum('status', ['active', 'inactive', 'maintenance'])
                .notNullable().defaultTo('active');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
            table.index(['facility_id', 'status']);
            table.index('created_at');
        });
        console.log('✅ Created zones table');
    }
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('zones');
    console.log('✅ Dropped zones table');
}
