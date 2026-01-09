import { faker } from '@faker-js/faker';
import { pool } from '../../config/database';

export interface FacilityData {
  id?: string;
  name?: string;
  location?: string;
  timezone?: string;
  total_zones?: number;
  status?: 'active' | 'inactive' | 'maintenance';
  created_at?: Date;
  updated_at?: Date;
}

export const facilityDefaults = {
  name: () => `${faker.company.name()} Energy Facility`,
  location: () => faker.location.city(),
  timezone: () => faker.location.timeZone(),
  total_zones: () => faker.number.int({ min: 1, max: 20 }),
  status: () => faker.helpers.arrayElement(['active', 'inactive', 'maintenance'] as const),
};

export async function createFacility(overrides: FacilityData = {}): Promise<any> {
  const facility = {
    id: overrides.id || `test-fac-${faker.string.uuid()}`,
    name: overrides.name || facilityDefaults.name(),
    location: overrides.location || facilityDefaults.location(),
    timezone: overrides.timezone || facilityDefaults.timezone(),
    total_zones: overrides.total_zones ?? facilityDefaults.total_zones(),
    status: overrides.status || facilityDefaults.status(),
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
  };

  const result = await pool.query(
    `INSERT INTO facilities (id, name, location, timezone, total_zones, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      facility.id,
      facility.name,
      facility.location,
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
