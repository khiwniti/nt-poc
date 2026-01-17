import { faker } from '@faker-js/faker';
import { pool } from '../../config/database.js';

export interface FacilityData {
  id?: string;
  name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  total_zones?: number;
  status?: 'active' | 'inactive' | 'maintenance';
  created_at?: Date;
  updated_at?: Date;
}

export const facilityDefaults = {
  name: () => `${faker.company.name()} Energy Facility`,
  location: () => faker.location.city(),
  latitude: () => faker.location.latitude(),
  longitude: () => faker.location.longitude(),
  address: () => faker.location.streetAddress(true),
  city: () => faker.location.city(),
  country: () => faker.location.country(),
  timezone: () => faker.location.timeZone(),
  total_zones: () => faker.number.int({ min: 1, max: 20 }),
  status: () => faker.helpers.arrayElement(['active', 'inactive', 'maintenance'] as const),
};

export async function createFacility(overrides: FacilityData = {}): Promise<any> {
  const facility = {
    id: overrides.id || `test-fac-${faker.string.uuid()}`,
    name: overrides.name || facilityDefaults.name(),
    location: overrides.location || facilityDefaults.location(),
    latitude: overrides.latitude ?? facilityDefaults.latitude(),
    longitude: overrides.longitude ?? facilityDefaults.longitude(),
    address: overrides.address ?? facilityDefaults.address(),
    city: overrides.city ?? facilityDefaults.city(),
    country: overrides.country ?? facilityDefaults.country(),
    timezone: overrides.timezone || facilityDefaults.timezone(),
    total_zones: overrides.total_zones ?? facilityDefaults.total_zones(),
    status: overrides.status || facilityDefaults.status(),
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
  };

  const result = await pool.query(
    `INSERT INTO facilities (id, name, location, latitude, longitude, address, city, country,
                            timezone, total_zones, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      facility.id,
      facility.name,
      facility.location,
      facility.latitude,
      facility.longitude,
      facility.address,
      facility.city,
      facility.country,
      facility.timezone,
      facility.total_zones,
      facility.status,
      facility.created_at,
      facility.updated_at,
    ]
  );

  return result.rows[0];
}

export function buildFacility(overrides: FacilityData = {}): FacilityData {
  return {
    id: overrides.id || `test-fac-${faker.string.uuid()}`,
    name: overrides.name || facilityDefaults.name(),
    location: overrides.location || facilityDefaults.location(),
    latitude: overrides.latitude ?? facilityDefaults.latitude(),
    longitude: overrides.longitude ?? facilityDefaults.longitude(),
    address: overrides.address ?? facilityDefaults.address(),
    city: overrides.city ?? facilityDefaults.city(),
    country: overrides.country ?? facilityDefaults.country(),
    timezone: overrides.timezone || facilityDefaults.timezone(),
    total_zones: overrides.total_zones ?? facilityDefaults.total_zones(),
    status: overrides.status || facilityDefaults.status(),
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
  };
}

export async function createManyFacilities(count: number, overrides: FacilityData = {}): Promise<any[]> {
  const facilities = [];
  for (let i = 0; i < count; i++) {
    facilities.push(await createFacility(overrides));
  }
  return facilities;
}
