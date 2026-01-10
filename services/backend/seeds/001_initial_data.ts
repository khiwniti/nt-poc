import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  await knex('alerts').del();
  await knex('sensor_readings').del();
  await knex('rul_predictions').del();
  await knex('battery_systems').del();
  await knex('facilities').del();

  // Insert facilities
  const facilities = await knex('facilities')
    .insert([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'North Campus Data Center',
        location: 'Building A, Floor 2',
        timezone: 'America/New_York',
        total_zones: 4,
        status: 'active',
        latitude: 40.7128,
        longitude: -74.0060,
        address: '350 5th Ave, New York, NY 10118',
        city: 'New York',
        country: 'United States',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'South Campus Manufacturing',
        location: 'Building B, Floor 1',
        timezone: 'America/Los_Angeles',
        total_zones: 6,
        status: 'active',
        latitude: 34.0522,
        longitude: -118.2437,
        address: '1200 Getty Center Dr, Los Angeles, CA 90049',
        city: 'Los Angeles',
        country: 'United States',
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'East Campus Research Lab',
        location: 'Building C, Floor 3',
        timezone: 'America/Chicago',
        total_zones: 3,
        status: 'maintenance',
        latitude: 41.8781,
        longitude: -87.6298,
        address: '233 S Wacker Dr, Chicago, IL 60606',
        city: 'Chicago',
        country: 'United States',
      },
    ])
    .returning('*');

  // Insert battery systems
  const batterySystems = await knex('battery_systems')
    .insert([
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        facility_id: '11111111-1111-1111-1111-111111111111',
        name: 'Battery System A1',
        zone: 'Zone 1',
        capacity_kwh: 500.00,
        status: 'online',
        installed_date: new Date('2023-01-15'),
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        facility_id: '11111111-1111-1111-1111-111111111111',
        name: 'Battery System A2',
        zone: 'Zone 2',
        capacity_kwh: 750.00,
        status: 'online',
        installed_date: new Date('2023-03-20'),
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        facility_id: '22222222-2222-2222-2222-222222222222',
        name: 'Battery System B1',
        zone: 'Zone 1',
        capacity_kwh: 1000.00,
        status: 'online',
        installed_date: new Date('2023-02-10'),
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        facility_id: '22222222-2222-2222-2222-222222222222',
        name: 'Battery System B2',
        zone: 'Zone 3',
        capacity_kwh: 850.00,
        status: 'maintenance',
        installed_date: new Date('2023-04-05'),
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        facility_id: '33333333-3333-3333-3333-333333333333',
        name: 'Battery System C1',
        zone: 'Zone 1',
        capacity_kwh: 600.00,
        status: 'offline',
        installed_date: new Date('2023-05-12'),
      },
    ])
    .returning('*');

  // Insert sample sensor readings (last 24 hours)
  const now = new Date();
  const sensorReadings = [];
  
  for (const battery of batterySystems) {
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const baseVoltage = 400 + Math.random() * 20;
      const baseCurrent = 50 + Math.random() * 10;
      const baseTemp = 25 + Math.random() * 5;
      const baseSoc = 80 - (i * 2) + Math.random() * 5;
      const baseSoh = 95 + Math.random() * 3;
      
      sensorReadings.push({
        battery_system_id: battery.id,
        time: timestamp,
        voltage: parseFloat(baseVoltage.toFixed(4)),
        current: parseFloat(baseCurrent.toFixed(4)),
        temperature: parseFloat(baseTemp.toFixed(2)),
        soc: parseFloat(Math.max(0, Math.min(100, baseSoc)).toFixed(2)),
        soh: parseFloat(Math.max(0, Math.min(100, baseSoh)).toFixed(2)),
        power: parseFloat((baseVoltage * baseCurrent / 1000).toFixed(2)),
      });
    }
  }
  
  await knex('sensor_readings').insert(sensorReadings);

  // Insert sample RUL predictions
  const rulPredictions = [];
  for (const battery of batterySystems) {
    rulPredictions.push({
      battery_system_id: battery.id,
      predicted_rul: Math.floor(300 + Math.random() * 200),
      confidence: parseFloat((0.75 + Math.random() * 0.2).toFixed(2)),
      model_version: 'v1.0.0',
      features: JSON.stringify({
        avg_temperature: 26.5,
        avg_soc: 75.0,
        avg_soh: 96.5,
        cycle_count: 150,
      }),
    });
  }
  
  await knex('rul_predictions').insert(rulPredictions);

  // Insert sample alerts
  await knex('alerts').insert([
    {
      battery_system_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      severity: 'medium',
      type: 'temperature_high',
      message: 'Battery temperature exceeded 30°C',
      metadata: JSON.stringify({ temperature: 31.5, threshold: 30 }),
      acknowledged: false,
      resolved: false,
    },
    {
      battery_system_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      severity: 'low',
      type: 'soc_low',
      message: 'State of Charge dropped below 20%',
      metadata: JSON.stringify({ soc: 18.5, threshold: 20 }),
      acknowledged: true,
      acknowledged_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      acknowledged_by: 'admin@example.com',
      resolved: false,
    },
  ]);
}
