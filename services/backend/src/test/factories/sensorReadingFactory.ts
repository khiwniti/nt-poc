import { faker } from '@faker-js/faker';
import { pool } from '../../config/database.js';

export interface SensorReadingData {
  id?: number;
  battery_system_id?: string;
  time?: Date;
  voltage?: number;
  current?: number;
  temperature?: number;
  soc?: number;
  soh?: number;
  power?: number;
  created_at?: Date;
}

export const sensorReadingDefaults = {
  voltage: () => faker.number.float({ min: 3.0, max: 4.2, fractionDigits: 4 }),
  current: () => faker.number.float({ min: -50, max: 50, fractionDigits: 4 }),
  temperature: () => faker.number.float({ min: 15, max: 45, fractionDigits: 2 }),
  soc: () => faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
  soh: () => faker.number.float({ min: 70, max: 100, fractionDigits: 2 }),
  power: () => faker.number.float({ min: -100, max: 100, fractionDigits: 2 }),
};

export async function createSensorReading(overrides: SensorReadingData = {}): Promise<any> {
  const reading = {
    battery_system_id: overrides.battery_system_id || `test-bat-${faker.string.uuid()}`,
    time: overrides.time || new Date(),
    voltage: overrides.voltage ?? sensorReadingDefaults.voltage(),
    current: overrides.current ?? sensorReadingDefaults.current(),
    temperature: overrides.temperature ?? sensorReadingDefaults.temperature(),
    soc: overrides.soc ?? sensorReadingDefaults.soc(),
    soh: overrides.soh ?? sensorReadingDefaults.soh(),
    power: overrides.power ?? sensorReadingDefaults.power(),
    created_at: overrides.created_at || new Date(),
  };

  const result = await pool.query(
    `INSERT INTO sensor_readings (battery_system_id, time, voltage, current, temperature, soc, soh, power, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      reading.battery_system_id,
      reading.time,
      reading.voltage,
      reading.current,
      reading.temperature,
      reading.soc,
      reading.soh,
      reading.power,
      reading.created_at,
    ]
  );

  return result.rows[0];
}

export function buildSensorReading(overrides: SensorReadingData = {}): SensorReadingData {
  return {
    battery_system_id: overrides.battery_system_id || `test-bat-${faker.string.uuid()}`,
    time: overrides.time || new Date(),
    voltage: overrides.voltage ?? sensorReadingDefaults.voltage(),
    current: overrides.current ?? sensorReadingDefaults.current(),
    temperature: overrides.temperature ?? sensorReadingDefaults.temperature(),
    soc: overrides.soc ?? sensorReadingDefaults.soc(),
    soh: overrides.soh ?? sensorReadingDefaults.soh(),
    power: overrides.power ?? sensorReadingDefaults.power(),
    created_at: overrides.created_at || new Date(),
  };
}

export async function createManySensorReadings(count: number, overrides: SensorReadingData = {}): Promise<any[]> {
  const readings = [];
  for (let i = 0; i < count; i++) {
    readings.push(await createSensorReading(overrides));
  }
  return readings;
}

export async function createTimeSeriesReadings(
  batterySystemId: string,
  count: number,
  startTime: Date,
  intervalMinutes: number = 5
): Promise<any[]> {
  const readings = [];
  for (let i = 0; i < count; i++) {
    const time = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
    readings.push(await createSensorReading({ battery_system_id: batterySystemId, time }));
  }
  return readings;
}
