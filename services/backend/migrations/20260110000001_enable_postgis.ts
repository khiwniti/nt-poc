import { Knex } from 'knex';

/**
 * Enable PostGIS extension for geospatial functionality
 * PostGIS provides spatial database capabilities including:
 * - Geometry/Geography types for storing coordinates
 * - Spatial functions (ST_Distance, ST_DWithin, etc.)
 * - Spatial indexes (GiST) for fast distance queries
 */
export async function up(knex: Knex): Promise<void> {
  // Enable PostGIS extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');

  // Enable PostGIS topology (optional, for advanced spatial operations)
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis_topology');

  console.log('PostGIS extension enabled successfully');
}

export async function down(knex: Knex): Promise<void> {
  // Drop PostGIS topology first (dependencies)
  await knex.raw('DROP EXTENSION IF EXISTS postgis_topology');

  // Drop PostGIS extension
  await knex.raw('DROP EXTENSION IF EXISTS postgis');

  console.log('PostGIS extension removed');
}
