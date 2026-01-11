import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('facilities', (table) => {
    table.decimal('latitude', 10, 7).nullable();
    table.decimal('longitude', 10, 7).nullable();
    table.string('address', 500).nullable();
    table.string('city', 255).nullable();
    table.string('country', 255).nullable();
    
    // Add index for geospatial queries
    table.index(['latitude', 'longitude']);
    table.index('city');
    table.index('country');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('facilities', (table) => {
    table.dropIndex(['latitude', 'longitude']);
    table.dropIndex('city');
    table.dropIndex('country');
    table.dropColumn('latitude');
    table.dropColumn('longitude');
    table.dropColumn('address');
    table.dropColumn('city');
    table.dropColumn('country');
  });
}
