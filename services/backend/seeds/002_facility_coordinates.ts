import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Update existing facilities with coordinates
  await knex('facilities')
    .where('id', '11111111-1111-1111-1111-111111111111')
    .update({
      location: 'New York, USA',
      latitude: 40.7128,
      longitude: -74.0060,
    });

  await knex('facilities')
    .where('id', '22222222-2222-2222-2222-222222222222')
    .update({
      location: 'Los Angeles, USA',
      latitude: 34.0522,
      longitude: -118.2437,
    });

  await knex('facilities')
    .where('id', '33333333-3333-3333-3333-333333333333')
    .update({
      location: 'Chicago, USA',
      latitude: 41.8781,
      longitude: -87.6298,
    });

  // Add more diverse facilities for demo
  await knex('facilities').insert([
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Bangkok Energy Hub',
      location: 'Bangkok, Thailand',
      latitude: 13.7563,
      longitude: 100.5018,
      timezone: 'Asia/Bangkok',
      total_zones: 8,
      status: 'active',
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Tokyo Power Station',
      location: 'Tokyo, Japan',
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
      total_zones: 12,
      status: 'active',
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'London Grid Facility',
      location: 'London, UK',
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
      total_zones: 6,
      status: 'maintenance',
    },
  ]).onConflict('id').ignore();
}
