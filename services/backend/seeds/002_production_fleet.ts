import type { Knex } from 'knex';

/**
 * Production-scale seed data for 9 data centers across Thailand
 *
 * Fleet Configuration:
 * - 9 data centers (facilities)
 * - 81 strings total (9 per site: 3 rectifier + 6 UPS)
 * - 1,944 batteries total (216 per site, 24 per string)
 * - Model: HX12-120 VRLA (12V, 120Ah)
 */

// Data Center Locations
const FACILITIES = [
  // Northern Region
  { id: 'f1000000-0000-0000-0000-000000000001', name: 'Chiangmai DC', city: 'Chiang Mai', lat: 18.7883, lng: 98.9853, address: '99 Nimmanhaemin Rd, Chiang Mai 50200' },

  // Northeastern Region
  { id: 'f2000000-0000-0000-0000-000000000001', name: 'Khon Kaen DC', city: 'Khon Kaen', lat: 16.4419, lng: 102.8360, address: '188 Mittraphap Rd, Khon Kaen 40000' },

  // Central Region
  { id: 'f3000000-0000-0000-0000-000000000001', name: 'Nonthaburi DC', city: 'Nonthaburi', lat: 13.8621, lng: 100.5144, address: '55 Popular Rd, Nonthaburi 11000' },
  { id: 'f3000000-0000-0000-0000-000000000002', name: 'Bangrak DC', city: 'Bangkok', lat: 13.7244, lng: 100.5316, address: '123 Silom Rd, Bangrak, Bangkok 10500' },
  { id: 'f3000000-0000-0000-0000-000000000003', name: 'Phrakhanong DC', city: 'Bangkok', lat: 13.7195, lng: 100.5992, address: '456 Sukhumvit Rd, Phra Khanong, Bangkok 10110' },

  // Eastern Region
  { id: 'f4000000-0000-0000-0000-000000000001', name: 'Sriracha DC', city: 'Chonburi', lat: 13.1632, lng: 100.9304, address: '77 Sukhumvit Rd, Sriracha, Chonburi 20110' },

  // Southern Region
  { id: 'f5000000-0000-0000-0000-000000000001', name: 'Surat Thani DC', city: 'Surat Thani', lat: 9.1382, lng: 99.3339, address: '234 Talad Mai Rd, Surat Thani 84000' },
  { id: 'f5000000-0000-0000-0000-000000000002', name: 'Phuket DC', city: 'Phuket', lat: 7.8966, lng: 98.3521, address: '88 Phuket Tech Park, Kathu, Phuket 83120' },
  { id: 'f5000000-0000-0000-0000-000000000003', name: 'Hat Yai DC', city: 'Songkhla', lat: 7.0089, lng: 100.4747, address: '321 Phetkasem Rd, Hat Yai, Songkhla 90110' },
];

// Battery specifications (HX12-120 VRLA)
const BATTERY_SPECS = {
  model: 'HX12-120',
  manufacturer: 'CSB Battery',
  voltage_v: 12,
  capacity_ah: 120,
  capacity_kwh: (12 * 120) / 1000, // 1.44 kWh
  float_voltage_min: 13.50,
  float_voltage_max: 13.80,
  boost_voltage_min: 14.40,
  boost_voltage_max: 14.70,
  max_charge_current: 36,
  temp_warning: 45,
  temp_critical: 50,
};

export async function seed(knex: Knex): Promise<void> {
  const now = new Date();

  console.log('🔄 Resetting database for production-scale deployment...');

  // Reset tables in dependency order
  await knex('model_performance_per_battery').del();
  await knex('model_drift_metrics').del();
  await knex('prediction_history').del();
  await knex('feature_store').del();
  await knex('battery_simulation_config').del();
  await knex('simulation_event_log').del();
  await knex('sensors').del();
  await knex('sensor_types').del();
  await knex('simulation_scenarios').del();
  await knex('model_versions').del();
  await knex('training_datasets').del();
  await knex('alerts').del();
  await knex('sensor_readings').del();
  await knex('rul_predictions').del();
  await knex('battery_systems').del();
  await knex('zones').del();
  await knex('facilities').del();

  console.log('✅ Tables cleared');

  // Insert facilities
  console.log('📍 Creating 9 data center facilities...');
  const facilities = FACILITIES.map(f => ({
    id: f.id,
    name: f.name,
    location: `${f.city} Data Center - Battery Room`,
    timezone: 'Asia/Bangkok',
    total_zones: 9, // Each facility has 9 zones (9 strings)
    status: 'active',
    latitude: f.lat,
    longitude: f.lng,
    address: f.address,
    city: f.city,
    country: 'Thailand',
    created_at: now,
    updated_at: now,
  }));
  await knex('facilities').insert(facilities);
  console.log(`✅ Created ${facilities.length} facilities`);

  // Create zones and batteries for each facility
  let totalZones = 0;
  let totalBatteries = 0;

  for (const facility of FACILITIES) {
    console.log(`\n🏢 Processing ${facility.name}...`);

    // Create 9 zones per facility (3 rectifier + 6 UPS)
    const zones = [];
    for (let stringNum = 1; stringNum <= 9; stringNum++) {
      const isRectifier = stringNum <= 3;
      const systemType = isRectifier ? 'Rectifier' : 'UPS';
      const stringLabel = isRectifier ? `R${stringNum}` : `U${stringNum - 3}`;

      zones.push({
        id: `${facility.id.substring(0, 8)}-zone-${String(stringNum).padStart(2, '0')}-${facility.id.substring(24)}`,
        facility_id: facility.id,
        name: `String ${stringLabel} - ${systemType}`,
        location: `Battery Room ${Math.ceil(stringNum / 3)}`,
        status: 'active',
        floor_level: 1,
        zone_width_m: 6.0,
        zone_length_m: 12.0, // Accommodates 24 batteries in a row
        zone_height_m: 3.0,
        boundary_coordinates: JSON.stringify([
          { x: 0, y: 0 },
          { x: 6.0, y: 0 },
          { x: 6.0, y: 12.0 },
          { x: 0, y: 12.0 },
        ]),
        max_battery_capacity: 24,
        layout_type: 'rack',
        created_at: now,
        updated_at: now,
      });
    }

    await knex('zones').insert(zones);
    totalZones += zones.length;
    console.log(`  ✅ Created ${zones.length} zones (strings)`);

    // Create 216 batteries for this facility (24 per string × 9 strings)
    const batteries = [];
    let batteryCount = 0;

    for (let stringNum = 1; stringNum <= 9; stringNum++) {
      const zone = zones[stringNum - 1];
      const isRectifier = stringNum <= 3;
      const systemType = isRectifier ? 'RECT' : 'UPS';
      const stringLabel = isRectifier ? `R${stringNum}` : `U${stringNum - 3}`;

      // 24 batteries per string
      for (let jarNum = 1; jarNum <= 24; jarNum++) {
        batteryCount++;
        const facilityCode = facility.city.substring(0, 3).toUpperCase();
        const serialNumber = `${facilityCode}-${systemType}-S${String(stringNum).padStart(2, '0')}-J${String(jarNum).padStart(2, '0')}`;

        batteries.push({
          id: `${facility.id.substring(0, 8)}-bat-${String(batteryCount).padStart(3, '0')}-${facility.id.substring(24)}`,
          zone_id: zone.id,
          serial_number: serialNumber,
          model: BATTERY_SPECS.model,
          manufacturer: BATTERY_SPECS.manufacturer,
          capacity_kwh: BATTERY_SPECS.capacity_kwh,
          voltage_v: BATTERY_SPECS.voltage_v,
          status: Math.random() > 0.95 ? 'maintenance' : 'active', // 5% in maintenance
          health_score: Math.floor(88 + Math.random() * 10), // 88-98%
          installation_date: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random within last year
          last_maintenance_date: new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random within last 90 days

          // 3D position in rack (linear arrangement)
          position_x: 0.5 + (jarNum - 1) * 0.5, // 0.5m spacing
          position_y: 1.0,
          position_z: 0,
          rotation_pitch: 0,
          rotation_yaw: 0,
          rotation_roll: 0,

          // Physical dimensions
          width_m: 0.4,
          height_m: 0.22,
          depth_m: 0.17,

          rack_id: `${stringLabel}-Rack`,
          bay_position: `J${String(jarNum).padStart(2, '0')}`,
          display_color: isRectifier ? '#3B82F6' : '#10B981', // Blue for rectifier, Green for UPS
          icon_type: 'battery_jar',
          model_3d_reference: 'models/hx12-120.glb',

          created_at: now,
          updated_at: now,
        });
      }
    }

    // Insert in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < batteries.length; i += batchSize) {
      const batch = batteries.slice(i, i + batchSize);
      await knex('battery_systems').insert(batch);
    }

    totalBatteries += batteries.length;
    console.log(`  ✅ Created ${batteries.length} batteries`);
  }

  console.log(`\n📊 Production Fleet Summary:`);
  console.log(`  • Facilities: ${facilities.length}`);
  console.log(`  • Zones (Strings): ${totalZones}`);
  console.log(`  • Batteries: ${totalBatteries}`);
  console.log(`  • Per facility: ${totalBatteries / facilities.length} batteries`);

  // Sensor types (same as before)
  console.log('\n🔌 Creating sensor catalog...');
  const sensorTypeIds = {
    temperature: '11111111-0000-0000-0000-000000000001',
    voltage: '11111111-0000-0000-0000-000000000002',
    current: '11111111-0000-0000-0000-000000000003',
    internal_resistance: '11111111-0000-0000-0000-000000000004',
  };

  const sensorTypes = [
    {
      id: sensorTypeIds.temperature,
      sensor_name: 'Thermal Probe T-200',
      measurement_unit: '°C',
      min_value: -20,
      max_value: 120,
      typical_value: 28,
      accuracy_percentage: 0.5,
      sampling_rate_hz: 1,
      description: 'High-accuracy thermocouple for battery casings',
    },
    {
      id: sensorTypeIds.voltage,
      sensor_name: 'Voltage Tap V-75',
      measurement_unit: 'V',
      min_value: 10,
      max_value: 16,
      typical_value: 13.65,
      accuracy_percentage: 0.2,
      sampling_rate_hz: 5,
      description: 'Differential voltage monitor for VRLA jars',
    },
    {
      id: sensorTypeIds.current,
      sensor_name: 'Hall Current HC-40',
      measurement_unit: 'A',
      min_value: -50,
      max_value: 50,
      typical_value: 5,
      accuracy_percentage: 0.8,
      sampling_rate_hz: 5,
      description: 'Bidirectional current clamp for string monitoring',
    },
    {
      id: sensorTypeIds.internal_resistance,
      sensor_name: 'Impedance Analyzer IA-500',
      measurement_unit: 'mΩ',
      min_value: 0,
      max_value: 100,
      typical_value: 5,
      accuracy_percentage: 2.0,
      sampling_rate_hz: 0.017, // ~once per minute
      description: 'AC impedance measurement for health assessment',
    },
  ];

  await knex('sensor_types').insert(sensorTypes);
  console.log(`✅ Created ${sensorTypes.length} sensor types`);

  // Simulation scenarios
  console.log('\n🎮 Creating simulation scenarios...');
  const simulationScenarioIds = {
    baseline: '22222222-0000-0000-0000-000000000001',
    thermalStress: '22222222-0000-0000-0000-000000000002',
    highLoad: '22222222-0000-0000-0000-000000000003',
  };

  const simulationScenarios = [
    {
      id: simulationScenarioIds.baseline,
      scenario_name: 'Baseline Normal Operation',
      description: 'Typical data center conditions with stable load',
      base_noise_level: 0.0025,
      drift_rate: 0.0004,
      failure_probability: 0.00015,
      temperature_variance: 1.2,
      voltage_variance: 0.05, // ±50mV
      current_variance: 0.5, // ±0.5A
      soc_degradation_rate: 0.001,
      soh_degradation_rate: 0.0001,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: simulationScenarioIds.thermalStress,
      scenario_name: 'Elevated Temperature',
      description: 'HVAC degradation or summer conditions (30-35°C ambient)',
      base_noise_level: 0.0045,
      drift_rate: 0.001,
      failure_probability: 0.00045,
      temperature_variance: 3.8,
      voltage_variance: 0.08,
      current_variance: 1.2,
      soc_degradation_rate: 0.0025,
      soh_degradation_rate: 0.0002,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: simulationScenarioIds.highLoad,
      scenario_name: 'High Load Cycling',
      description: 'Frequent discharge events and load transitions',
      base_noise_level: 0.0035,
      drift_rate: 0.0008,
      failure_probability: 0.00035,
      temperature_variance: 2.5,
      voltage_variance: 0.12,
      current_variance: 2.5,
      soc_degradation_rate: 0.003,
      soh_degradation_rate: 0.00015,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex('simulation_scenarios').insert(simulationScenarios);
  console.log(`✅ Created ${simulationScenarios.length} simulation scenarios`);

  console.log('\n✨ Production seed data created successfully!');
  console.log('\n📋 Next steps:');
  console.log('  1. Start simulator: cd services/simulator && uvicorn app.main:app --port 8001');
  console.log('  2. Start backend: cd services/backend && npm run dev');
  console.log('  3. Verify fleet: npm run verify:production-fleet');
}
