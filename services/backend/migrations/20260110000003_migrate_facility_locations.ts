import { Knex } from 'knex';

/**
 * Migrate existing location data to new coordinate columns
 * Parses JSON location strings from test data and populates latitude/longitude
 * Production systems would integrate a geocoding service for non-JSON locations
 */
export async function up(knex: Knex): Promise<void> {
  // Get all facilities with location data
  const facilities = await knex('facilities').select('id', 'location');

  let successCount = 0;
  let skipCount = 0;

  for (const facility of facilities) {
    try {
      // Try to parse as JSON first (test data format)
      // Expected format: {"lat": 13.7563, "lng": 100.5018, "address": "..."}
      const locationData = JSON.parse(facility.location);

      if (locationData.lat && locationData.lng) {
        await knex('facilities')
          .where('id', facility.id)
          .update({
            latitude: locationData.lat,
            longitude: locationData.lng,
          });
        successCount++;
      } else {
        console.warn(`Facility ${facility.id}: JSON parsed but missing lat/lng`);
        skipCount++;
      }
    } catch (error) {
      // If not JSON, leave as null (will need manual geocoding)
      // Production systems would integrate geocoding service here:
      // - Google Maps Geocoding API
      // - Nominatim (OpenStreetMap)
      // - Mapbox Geocoding API
      console.warn(`Facility ${facility.id}: Could not parse location as JSON, skipping`);
      skipCount++;
    }
  }

  console.log(`Location data migration complete:`);
  console.log(`  - Successfully migrated: ${successCount} facilities`);
  console.log(`  - Skipped (invalid format): ${skipCount} facilities`);

  if (skipCount > 0) {
    console.warn(`  - ${skipCount} facilities need manual coordinate assignment`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Reset coordinates to null
  await knex('facilities').update({
    latitude: null,
    longitude: null,
    coordinates: null,
  });

  console.log('Location data migration rolled back');
}
