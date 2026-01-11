import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('facilities', (table) => {
    table.decimal('latitude', 10, 7).nullable();
    table.decimal('longitude', 10, 7).nullable();

    // Add constraints for valid coordinate ranges
    table.check('latitude >= -90 AND latitude <= 90', [], 'valid_latitude');
    table.check('longitude >= -180 AND longitude <= 180', [], 'valid_longitude');

    // Add index for potential future proximity queries
    table.index(['latitude', 'longitude'], 'idx_facilities_coordinates');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('facilities', (table) => {
    table.dropIndex(['latitude', 'longitude'], 'idx_facilities_coordinates');
    table.dropColumn('latitude');
    table.dropColumn('longitude');
  });
}
