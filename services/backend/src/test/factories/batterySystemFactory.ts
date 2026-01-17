import { faker } from '@faker-js/faker';
import { pool } from '../../config/database.js';

export interface BatterySystemData {
  id?: string;
  facility_id?: string;
  name?: string;
  zone?: string;
  capacity_kwh?: number;
  status?: 'online' | 'offline' | 'maintenance' | 'fault';
  installed_date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export const batterySystemDefaults = {
  name: () => `Battery System ${faker.string.alphanumeric(6).toUpperCase()}`,
  zone: () => `Zone-${faker.helpers.arrayElement(['A', 'B', 'C', 'D'])}-${faker.number.int({ min: 1, max: 10 })}`,
  capacity_kwh: () => faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
  status: () => faker.helpers.arrayElement(['online', 'offline', 'maintenance', 'fault'] as const),
  installed_date: () => faker.date.past({ years: 2 }),
};

export async function createBatterySystem(overrides: BatterySystemData = {}): Promise<any> {
  const batterySystem = {
    id: overrides.id || `test-bat-${faker.string.uuid()}`,
    facility_id: overrides.facility_id || `test-fac-${faker.string.uuid()}`,
    name: overrides.name || batterySystemDefaults.name(),
    zone: overrides.zone || batterySystemDefaults.zone(),
    capacity_kwh: overrides.capacity_kwh ?? batterySystemDefaults.capacity_kwh(),
    status: overrides.status || batterySystemDefaults.status(),
    installed_date: overrides.installed_date || batterySystemDefaults.installed_date(),
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
  };

  const result = await pool.query(
    `INSERT INTO battery_systems (id, facility_id, name, zone, capacity_kwh, status, installed_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      batterySystem.id,
      batterySystem.facility_id,
      batterySystem.name,
      batterySystem.zone,
      batterySystem.capacity_kwh,
      batterySystem.status,
      batterySystem.installed_date,
      batterySystem.created_at,
      batterySystem.updated_at,
    ]
  );

  return result.rows[0];
}

export function buildBatterySystem(overrides: BatterySystemData = {}): BatterySystemData {
  return {
    id: overrides.id || `test-bat-${faker.string.uuid()}`,
    facility_id: overrides.facility_id || `test-fac-${faker.string.uuid()}`,
    name: overrides.name || batterySystemDefaults.name(),
    zone: overrides.zone || batterySystemDefaults.zone(),
    capacity_kwh: overrides.capacity_kwh ?? batterySystemDefaults.capacity_kwh(),
    status: overrides.status || batterySystemDefaults.status(),
    installed_date: overrides.installed_date || batterySystemDefaults.installed_date(),
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
  };
}

export async function createManyBatterySystems(count: number, overrides: BatterySystemData = {}): Promise<any[]> {
  const systems = [];
  for (let i = 0; i < count; i++) {
    systems.push(await createBatterySystem(overrides));
  }
  return systems;
}
