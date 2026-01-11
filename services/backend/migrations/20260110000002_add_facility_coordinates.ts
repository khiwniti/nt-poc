import { Knex } from 'knex';

/**
 * Add geospatial columns to facilities table
 * - latitude/longitude: Separate decimal columns for easy API responses
 * - coordinates: PostGIS geography point for accurate spatial queries
 * - Uses geography type (not geometry) for spherical distance calculations
 * - Auto-sync trigger keeps coordinates in sync with lat/lng
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('facilities', (table) => {
    // Add latitude and longitude as separate columns
    // DECIMAL(10,8) allows range -90.00000000 to 90.00000000 for latitude
    // DECIMAL(11,8) allows range -180.00000000 to 180.00000000 for longitude
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
  });

  // Add PostGIS geography column using raw SQL
  // Geography type uses spherical model for accurate distance calculations
  // SRID 4326 = WGS84 coordinate system (standard for GPS)
  await knex.raw(`
    ALTER TABLE facilities
    ADD COLUMN coordinates geography(POINT, 4326)
  `);

  // Create spatial index for fast distance queries
  // GiST (Generalized Search Tree) index provides O(log n) performance
  await knex.raw(`
    CREATE INDEX idx_facilities_coordinates
    ON facilities
    USING GIST(coordinates)
  `);

  // Create trigger to auto-sync coordinates from lat/lng
  // This ensures data consistency when lat/lng are updated
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_facility_coordinates()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.coordinates = ST_SetSRID(
          ST_MakePoint(NEW.longitude, NEW.latitude),
          4326
        )::geography;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER sync_facility_coordinates
    BEFORE INSERT OR UPDATE ON facilities
    FOR EACH ROW
    EXECUTE FUNCTION update_facility_coordinates();
  `);

  console.log('Geospatial columns and spatial index added to facilities table');
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger and function first (dependencies)
  await knex.raw('DROP TRIGGER IF EXISTS sync_facility_coordinates ON facilities');
  await knex.raw('DROP FUNCTION IF EXISTS update_facility_coordinates');

  // Drop spatial index
  await knex.raw('DROP INDEX IF EXISTS idx_facilities_coordinates');

  // Drop columns
  await knex.schema.alterTable('facilities', (table) => {
    table.dropColumn('coordinates');
    table.dropColumn('longitude');
    table.dropColumn('latitude');
  });

  console.log('Geospatial columns removed from facilities table');
}
