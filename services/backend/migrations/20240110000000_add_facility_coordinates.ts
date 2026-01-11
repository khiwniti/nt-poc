import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('facilities', (table) => {
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    table.index(['latitude', 'longitude']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('facilities', (table) => {
    table.dropColumn('latitude');
    table.dropColumn('longitude');
  });
}
