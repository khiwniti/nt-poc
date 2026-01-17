import type { Knex } from 'knex';

const BANGKOK_FACILITY_ID = 'f0000000-0000-0000-0000-000000000001';
const PHUKET_FACILITY_ID = 'f0000000-0000-0000-0000-000000000002';
const CHIANGMAI_FACILITY_ID = 'f0000000-0000-0000-0000-000000000003';

const BANGKOK_ZONE_ID = 'z0000000-0000-0000-0000-000000000001';
const PHUKET_ZONE_ID = 'z0000000-0000-0000-0000-000000000002';
const CHIANGMAI_ZONE_ID = 'z0000000-0000-0000-0000-000000000003';

const BATTERY_IDS = [
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000005',
  'b0000000-0000-0000-0000-000000000006',
  'b0000000-0000-0000-0000-000000000007',
  'b0000000-0000-0000-0000-000000000008',
  'b0000000-0000-0000-0000-000000000009',
];

const SENSOR_TYPE_IDS = {
  temperature: '11111111-0000-0000-0000-000000000001',
  voltage: '11111111-0000-0000-0000-000000000002',
  current: '11111111-0000-0000-0000-000000000003',
  vibration: '11111111-0000-0000-0000-000000000004',
};

const SIMULATION_SCENARIO_IDS = {
  baseline: '22222222-0000-0000-0000-000000000001',
  thermalStress: '22222222-0000-0000-0000-000000000002',
  gridShift: '22222222-0000-0000-0000-000000000003',
};

const TRAINING_DATASET_ID = '33333333-0000-0000-0000-000000000001';
const MODEL_VERSION_ID = '44444444-0000-0000-0000-000000000001';

export async function seed(knex: Knex): Promise<void> {
  const now = new Date();

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

  // Facilities
  const facilities = [
    {
      id: BANGKOK_FACILITY_ID,
      name: 'Bangkok HQ Energy Hub',
      location: 'CentralWorld Tower, Level 5',
      timezone: 'Asia/Bangkok',
      total_zones: 2,
      status: 'active',
      latitude: 13.7563,
      longitude: 100.5018,
      address: '999 Rama I Rd, Pathum Wan, Bangkok 10330',
      city: 'Bangkok',
      country: 'Thailand',
    },
    {
      id: PHUKET_FACILITY_ID,
      name: 'Phuket DC Battery Campus',
      location: 'Phuket Tech Park, Building 2',
      timezone: 'Asia/Bangkok',
      total_zones: 2,
      status: 'active',
      latitude: 7.8966,
      longitude: 98.3521,
      address: '88 Moo 4, Kathu, Phuket 83120',
      city: 'Phuket',
      country: 'Thailand',
    },
    {
      id: CHIANGMAI_FACILITY_ID,
      name: 'Chiang Mai Innovation Office',
      location: 'Nimmanhaemin Innovation Center',
      timezone: 'Asia/Bangkok',
      total_zones: 1,
      status: 'active',
      latitude: 18.7883,
      longitude: 98.9853,
      address: '12 Nimmanhaemin Rd, Chiang Mai 50200',
      city: 'Chiang Mai',
      country: 'Thailand',
    },
  ];
  await knex('facilities').insert(facilities);

  // Zones with spatial metadata
  const zones = [
    {
      id: BANGKOK_ZONE_ID,
      facility_id: BANGKOK_FACILITY_ID,
      name: 'Zone 1 Server Room',
      location: 'HQ Level 5 North Wing',
      status: 'active',
      floor_level: 5,
      zone_width_m: 5.5,
      zone_length_m: 4.5,
      zone_height_m: 3.2,
      boundary_coordinates: JSON.stringify([
        { x: 0, y: 0 },
        { x: 5.5, y: 0 },
        { x: 5.5, y: 4.5 },
        { x: 0, y: 4.5 },
      ]),
      max_battery_capacity: 6,
      floor_plan_image_url: 'https://cdn.nt-poc.local/floorplans/bkk-zone1.png',
      layout_type: 'rack',
    },
    {
      id: PHUKET_ZONE_ID,
      facility_id: PHUKET_FACILITY_ID,
      name: 'Zone 2 Battery Room',
      location: 'Battery Hall South',
      status: 'active',
      floor_level: 1,
      zone_width_m: 6.0,
      zone_length_m: 5.0,
      zone_height_m: 3.4,
      boundary_coordinates: JSON.stringify([
        { x: 0, y: 0 },
        { x: 6.0, y: 0 },
        { x: 6.0, y: 5.0 },
        { x: 0, y: 5.0 },
      ]),
      max_battery_capacity: 6,
      floor_plan_image_url: 'https://cdn.nt-poc.local/floorplans/phuket-zone2.png',
      layout_type: 'cabinet',
    },
    {
      id: CHIANGMAI_ZONE_ID,
      facility_id: CHIANGMAI_FACILITY_ID,
      name: 'Zone 3 UPS Room',
      location: 'Ops Level 2',
      status: 'active',
      floor_level: 2,
      zone_width_m: 4.2,
      zone_length_m: 3.6,
      zone_height_m: 2.9,
      boundary_coordinates: JSON.stringify([
        { x: 0, y: 0 },
        { x: 4.2, y: 0 },
        { x: 4.2, y: 3.6 },
        { x: 0, y: 3.6 },
      ]),
      max_battery_capacity: 4,
      floor_plan_image_url: 'https://cdn.nt-poc.local/floorplans/chiangmai-zone3.png',
      layout_type: 'floor',
    },
  ];
  await knex('zones').insert(zones);

  const batterySystems = [
    {
      id: BATTERY_IDS[0],
      zone_id: BANGKOK_ZONE_ID,
      serial_number: 'BAT-BKK-01',
      model: 'RackMax-600',
      manufacturer: 'EnvisionPower',
      capacity_kwh: 620,
      voltage_v: 402,
      status: 'active',
      health_score: 96,
      installation_date: new Date('2025-03-01T00:00:00Z'),
      last_maintenance_date: new Date('2025-12-12T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.6,
      height_m: 1.9,
      depth_m: 0.9,
      rack_id: 'Rack-A',
      bay_position: 'U01',
      display_color: '#1E90FF',
      icon_type: 'battery_rack',
      model_3d_reference: 'models/rack_unit.glb',
    },
    {
      id: BATTERY_IDS[1],
      zone_id: BANGKOK_ZONE_ID,
      serial_number: 'BAT-BKK-02',
      model: 'RackMax-600',
      manufacturer: 'EnvisionPower',
      capacity_kwh: 610,
      voltage_v: 401,
      status: 'active',
      health_score: 95,
      installation_date: new Date('2025-03-10T00:00:00Z'),
      last_maintenance_date: new Date('2025-11-30T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.6,
      height_m: 1.9,
      depth_m: 0.9,
      rack_id: 'Rack-A',
      bay_position: 'U03',
      display_color: '#3CB371',
      icon_type: 'battery_rack',
      model_3d_reference: 'models/rack_unit.glb',
    },
    {
      id: BATTERY_IDS[2],
      zone_id: BANGKOK_ZONE_ID,
      serial_number: 'BAT-BKK-03',
      model: 'RackMax-650',
      manufacturer: 'EnvisionPower',
      capacity_kwh: 640,
      voltage_v: 404,
      status: 'active',
      health_score: 93,
      installation_date: new Date('2025-04-01T00:00:00Z'),
      last_maintenance_date: new Date('2025-12-05T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.6,
      height_m: 1.9,
      depth_m: 0.9,
      rack_id: 'Rack-B',
      bay_position: 'U05',
      display_color: '#FFD700',
      icon_type: 'battery_rack',
      model_3d_reference: 'models/rack_unit.glb',
    },
    {
      id: BATTERY_IDS[3],
      zone_id: PHUKET_ZONE_ID,
      serial_number: 'BAT-PKT-01',
      model: 'CabinetCore-800',
      manufacturer: 'GridCab Systems',
      capacity_kwh: 780,
      voltage_v: 405,
      status: 'active',
      health_score: 94,
      installation_date: new Date('2025-05-15T00:00:00Z'),
      last_maintenance_date: new Date('2025-12-20T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.8,
      height_m: 1.6,
      depth_m: 1.0,
      rack_id: 'Cab-1',
      bay_position: 'Level-1',
      display_color: '#FF7F50',
      icon_type: 'battery_cabinet',
      model_3d_reference: 'models/cabinet_unit.glb',
    },
    {
      id: BATTERY_IDS[4],
      zone_id: PHUKET_ZONE_ID,
      serial_number: 'BAT-PKT-02',
      model: 'CabinetCore-820',
      manufacturer: 'GridCab Systems',
      capacity_kwh: 810,
      voltage_v: 407,
      status: 'active',
      health_score: 92,
      installation_date: new Date('2025-06-05T00:00:00Z'),
      last_maintenance_date: new Date('2025-12-25T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.8,
      height_m: 1.6,
      depth_m: 1.0,
      rack_id: 'Cab-1',
      bay_position: 'Level-3',
      display_color: '#8A2BE2',
      icon_type: 'battery_cabinet',
      model_3d_reference: 'models/cabinet_unit.glb',
    },
    {
      id: BATTERY_IDS[5],
      zone_id: PHUKET_ZONE_ID,
      serial_number: 'BAT-PKT-03',
      model: 'CabinetCore-820',
      manufacturer: 'GridCab Systems',
      capacity_kwh: 805,
      voltage_v: 406,
      status: 'maintenance',
      health_score: 88,
      installation_date: new Date('2025-06-20T00:00:00Z'),
      last_maintenance_date: new Date('2026-01-10T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.8,
      height_m: 1.6,
      depth_m: 1.0,
      rack_id: 'Cab-2',
      bay_position: 'Level-2',
      display_color: '#00CED1',
      icon_type: 'battery_cabinet',
      model_3d_reference: 'models/cabinet_unit.glb',
    },
    {
      id: BATTERY_IDS[6],
      zone_id: CHIANGMAI_ZONE_ID,
      serial_number: 'BAT-CNX-01',
      model: 'FloorSafe-700',
      manufacturer: 'TerraStorage',
      capacity_kwh: 690,
      voltage_v: 398,
      status: 'active',
      health_score: 91,
      installation_date: new Date('2025-07-01T00:00:00Z'),
      last_maintenance_date: new Date('2025-11-28T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.7,
      height_m: 1.4,
      depth_m: 1.1,
      rack_id: null,
      bay_position: null,
      display_color: '#DC143C',
      icon_type: 'floor_unit',
      model_3d_reference: 'models/floor_pack.glb',
    },
    {
      id: BATTERY_IDS[7],
      zone_id: CHIANGMAI_ZONE_ID,
      serial_number: 'BAT-CNX-02',
      model: 'FloorSafe-700',
      manufacturer: 'TerraStorage',
      capacity_kwh: 700,
      voltage_v: 399,
      status: 'active',
      health_score: 90,
      installation_date: new Date('2025-07-20T00:00:00Z'),
      last_maintenance_date: new Date('2025-12-08T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.7,
      height_m: 1.4,
      depth_m: 1.1,
      rack_id: null,
      bay_position: null,
      display_color: '#32CD32',
      icon_type: 'floor_unit',
      model_3d_reference: 'models/floor_pack.glb',
    },
    {
      id: BATTERY_IDS[8],
      zone_id: CHIANGMAI_ZONE_ID,
      serial_number: 'BAT-CNX-03',
      model: 'FloorSafe-720',
      manufacturer: 'TerraStorage',
      capacity_kwh: 720,
      voltage_v: 400,
      status: 'active',
      health_score: 89,
      installation_date: new Date('2025-08-05T00:00:00Z'),
      last_maintenance_date: new Date('2025-12-18T00:00:00Z'),
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_pitch: 0,
      rotation_yaw: 0,
      rotation_roll: 0,
      width_m: 0.7,
      height_m: 1.4,
      depth_m: 1.1,
      rack_id: null,
      bay_position: null,
      display_color: '#FF1493',
      icon_type: 'floor_unit',
      model_3d_reference: 'models/floor_pack.glb',
    },
  ];
  await knex('battery_systems').insert(batterySystems);

  // Sensor catalog
  const sensorTypes = [
    {
      id: SENSOR_TYPE_IDS.temperature,
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
      id: SENSOR_TYPE_IDS.voltage,
      sensor_name: 'Voltage Tap V-75',
      measurement_unit: 'V',
      min_value: 300,
      max_value: 500,
      typical_value: 405,
      accuracy_percentage: 0.2,
      sampling_rate_hz: 5,
      description: 'Differential voltage monitor for pack strings',
    },
    {
      id: SENSOR_TYPE_IDS.current,
      sensor_name: 'Hall Current HC-40',
      measurement_unit: 'A',
      min_value: -200,
      max_value: 200,
      typical_value: 55,
      accuracy_percentage: 0.8,
      sampling_rate_hz: 5,
      description: 'Bidirectional current clamp with drift compensation',
    },
    {
      id: SENSOR_TYPE_IDS.vibration,
      sensor_name: 'IMU VX-10',
      measurement_unit: 'g',
      min_value: 0,
      max_value: 5,
      typical_value: 0.5,
      accuracy_percentage: 1.5,
      sampling_rate_hz: 20,
      description: 'Tri-axis vibration probe for cabinet monitoring',
    },
  ];
  await knex('sensor_types').insert(sensorTypes);

  // Simulation scenarios
  const simulationScenarios = [
    {
      id: SIMULATION_SCENARIO_IDS.baseline,
      scenario_name: 'Urban Baseline',
      description: 'Nominal HVAC-controlled environment.',
      base_noise_level: 0.0025,
      drift_rate: 0.0004,
      failure_probability: 0.00015,
      temperature_variance: 1.2,
      voltage_variance: 2.5,
      current_variance: 3.4,
      soc_degradation_rate: 0.0015,
      soh_degradation_rate: 0.0009,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: SIMULATION_SCENARIO_IDS.thermalStress,
      scenario_name: 'Monsoon Thermal Stress',
      description: 'High humidity and temperature fluctuations typical for Phuket.',
      base_noise_level: 0.0045,
      drift_rate: 0.001,
      failure_probability: 0.00045,
      temperature_variance: 3.8,
      voltage_variance: 4.6,
      current_variance: 5.1,
      soc_degradation_rate: 0.0025,
      soh_degradation_rate: 0.0016,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: SIMULATION_SCENARIO_IDS.gridShift,
      scenario_name: 'Peak Demand Load Shift',
      description: 'Rapid discharge/charge cycles during evening demand response.',
      base_noise_level: 0.0032,
      drift_rate: 0.0007,
      failure_probability: 0.00032,
      temperature_variance: 2.4,
      voltage_variance: 3.8,
      current_variance: 6.2,
      soc_degradation_rate: 0.003,
      soh_degradation_rate: 0.0012,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];
  await knex('simulation_scenarios').insert(simulationScenarios);

  // Sensors per battery
  const sensorTemplates = [
    { sensor_type_id: SENSOR_TYPE_IDS.temperature, suffix: 'TEMP', position_on_battery: 'top' },
    { sensor_type_id: SENSOR_TYPE_IDS.voltage, suffix: 'VOLT', position_on_battery: 'front' },
    { sensor_type_id: SENSOR_TYPE_IDS.current, suffix: 'CURR', position_on_battery: 'rear' },
    { sensor_type_id: SENSOR_TYPE_IDS.vibration, suffix: 'VIBE', position_on_battery: 'side_1' },
  ];

  const sensors = batterySystems.flatMap((battery, batteryIndex) =>
    sensorTemplates.map((template, templateIndex) => ({
      battery_system_id: battery.id,
      sensor_type_id: template.sensor_type_id,
      sensor_serial_number: `${battery.serial_number}-${template.suffix}`,
      position_on_battery: template.position_on_battery,
      status: templateIndex === 3 && batteryIndex % 2 === 0 ? 'calibrating' : 'active',
      calibration_date: new Date('2025-12-20T00:00:00Z'),
      created_at: now,
      updated_at: now,
    }))
  );
  await knex('sensors').insert(sensors);

  // Battery simulation configs
  const batterySimulationConfigs = batterySystems.map((battery, index) => {
    const scenario = simulationScenarios[index % simulationScenarios.length];
    const isActive = index % 3 !== 1;
    return {
      battery_system_id: battery.id,
      simulation_scenario_id: scenario.id,
      custom_noise_level: Number((scenario.base_noise_level + index * 0.0003).toFixed(4)),
      random_seed: 9000 + index,
      start_time: new Date(now.getTime() - (index + 2) * 24 * 60 * 60 * 1000),
      end_time: isActive ? null : new Date(now.getTime() - 24 * 60 * 60 * 1000),
      is_active: isActive,
      configuration_json: JSON.stringify({
        voltage: { min: 380, max: 432 },
        temperature: { min: 18, max: 37 },
        noiseScale: Number((1 + index * 0.05).toFixed(2)),
      }),
      created_at: now,
      updated_at: now,
    };
  });
  await knex('battery_simulation_config').insert(batterySimulationConfigs);

  // Training dataset and model version
  const trainingDataset = {
    id: TRAINING_DATASET_ID,
    dataset_name: 'RUL-baseline-SEA',
    dataset_version: '2026.01',
    start_date: new Date('2025-01-01T00:00:00Z'),
    end_date: new Date('2025-12-31T00:00:00Z'),
    battery_system_ids: JSON.stringify(batterySystems.map((battery) => battery.id)),
    total_records: 8640,
    feature_columns: JSON.stringify([
      'voltage_mean',
      'current_mean',
      'temperature_mean',
      'soc_trend',
      'soh_trend',
      'anomaly_score',
    ]),
    target_column: 'predicted_rul',
    storage_path: 's3://nt-poc-datasets/battery/rul-baseline-2026.parquet',
    data_hash: 'sha256:3e5389a6fb21b27a7c0de72f4f1f9a23',
    created_at: now,
  };
  await knex('training_datasets').insert(trainingDataset);

  const modelVersions = [
    {
      id: MODEL_VERSION_ID,
      model_name: 'bms-rul-transformer',
      version: 'v1.0.0',
      framework: 'tensorflow',
      model_file_path: 'models/rul_transformer_v1.onnx',
      training_dataset_id: TRAINING_DATASET_ID,
      hyperparameters: {
        learning_rate: 0.0005,
        sequence_length: 48,
        dropout: 0.1,
      },
      training_metrics: {
        loss: 0.024,
        mae: 6.2,
      },
      validation_metrics: {
        loss: 0.031,
        mae: 7.1,
      },
      deployed_at: new Date('2026-01-10T03:00:00Z'),
      is_active: true,
      created_by: 'mlops@nt-poc.local',
      created_at: now,
      updated_at: now,
    },
  ];
  await knex('model_versions').insert(modelVersions);

  // Feature store snapshot per battery
  const featureStoreEntries = batterySystems.map((battery, index) => {
    const voltageMean = 398 + index * 0.7;
    const currentMean = 52 + (index % 4) * 1.5;
    const temperatureMean = 26 + (index % 3) * 0.8;
    return {
      battery_system_id: battery.id,
      feature_timestamp: new Date(now.getTime() - index * 30 * 60 * 1000),
      voltage_mean: Number(voltageMean.toFixed(4)),
      voltage_std: 1.4 + index * 0.05,
      voltage_min: Number((voltageMean - 2.3).toFixed(4)),
      voltage_max: Number((voltageMean + 2.7).toFixed(4)),
      current_mean: Number(currentMean.toFixed(4)),
      current_std: 2.1 + index * 0.08,
      current_min: Number((currentMean - 5).toFixed(4)),
      current_max: Number((currentMean + 5.5).toFixed(4)),
      temperature_mean: Number(temperatureMean.toFixed(4)),
      temperature_std: 0.9 + index * 0.03,
      temperature_min: Number((temperatureMean - 1.5).toFixed(4)),
      temperature_max: Number((temperatureMean + 1.6).toFixed(4)),
      soc_trend: Number((80 - index * 1.2).toFixed(4)),
      soh_trend: Number((95 - index * 0.7).toFixed(4)),
      power_consumption_total: Number(((voltageMean * currentMean) / 1000).toFixed(4)),
      anomaly_score: Number((0.02 + index * 0.005).toFixed(4)),
      feature_version: 'fs-2026.01',
      created_at: now,
    };
  });
  await knex('feature_store').insert(featureStoreEntries);

  // Prediction history entries
  const predictionHistory = batterySystems.map((battery, index) => ({
    battery_system_id: battery.id,
    model_version_id: MODEL_VERSION_ID,
    prediction_timestamp: new Date(now.getTime() - index * 45 * 60 * 1000),
    prediction_type: 'rul',
    predicted_value: 320 - index * 8,
    confidence_score: Number((0.82 - index * 0.01).toFixed(4)),
    feature_values_snapshot: JSON.stringify({
      voltage_mean: featureStoreEntries[index].voltage_mean,
      current_mean: featureStoreEntries[index].current_mean,
      temperature_mean: featureStoreEntries[index].temperature_mean,
    }),
    prediction_metadata: JSON.stringify({ window: '24h', horizon_days: 30 }),
    actual_value: null,
    created_at: now,
  }));
  await knex('prediction_history').insert(predictionHistory);

  // Drift metrics and performance summaries
  const modelDriftMetrics = [
    {
      model_version_id: MODEL_VERSION_ID,
      battery_system_id: BATTERY_IDS[0],
      metric_timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      drift_type: 'data_drift',
      drift_score: 0.18,
      metric_name: 'voltage_pdf',
      baseline_distribution: JSON.stringify({ mean: 402, std: 1.6 }),
      current_distribution: JSON.stringify({ mean: 404, std: 2.0 }),
      threshold_exceeded: false,
      alert_triggered: false,
      created_at: now,
    },
    {
      model_version_id: MODEL_VERSION_ID,
      battery_system_id: BATTERY_IDS[4],
      metric_timestamp: new Date(now.getTime() - 90 * 60 * 1000),
      drift_type: 'concept_drift',
      drift_score: 0.27,
      metric_name: 'soh_trend',
      baseline_distribution: JSON.stringify({ slope: -0.001 }),
      current_distribution: JSON.stringify({ slope: -0.0017 }),
      threshold_exceeded: true,
      alert_triggered: true,
      created_at: now,
    },
    {
      model_version_id: MODEL_VERSION_ID,
      battery_system_id: BATTERY_IDS[7],
      metric_timestamp: new Date(now.getTime() - 30 * 60 * 1000),
      drift_type: 'prediction_drift',
      drift_score: 0.12,
      metric_name: 'rul_error',
      baseline_distribution: JSON.stringify({ mae: 6.0 }),
      current_distribution: JSON.stringify({ mae: 7.4 }),
      threshold_exceeded: false,
      alert_triggered: false,
      created_at: now,
    },
  ];
  await knex('model_drift_metrics').insert(modelDriftMetrics);

  const modelPerformance = [
    {
      model_version_id: MODEL_VERSION_ID,
      battery_system_id: BATTERY_IDS[0],
      evaluation_period_start: new Date('2025-12-01T00:00:00Z'),
      evaluation_period_end: new Date('2025-12-31T23:59:59Z'),
      mae: 5.8,
      rmse: 7.4,
      r2_score: 0.93,
      precision: 0.91,
      recall: 0.89,
      f1_score: 0.9,
      prediction_count: 720,
      error_rate: 0.07,
      performance_json: JSON.stringify({ facility: 'Bangkok', zone: 'Zone 1' }),
      created_at: now,
    },
    {
      model_version_id: MODEL_VERSION_ID,
      battery_system_id: BATTERY_IDS[4],
      evaluation_period_start: new Date('2025-12-01T00:00:00Z'),
      evaluation_period_end: new Date('2025-12-31T23:59:59Z'),
      mae: 6.7,
      rmse: 8.9,
      r2_score: 0.9,
      precision: 0.88,
      recall: 0.86,
      f1_score: 0.87,
      prediction_count: 720,
      error_rate: 0.11,
      performance_json: JSON.stringify({ facility: 'Phuket', zone: 'Zone 2' }),
      created_at: now,
    },
    {
      model_version_id: MODEL_VERSION_ID,
      battery_system_id: BATTERY_IDS[7],
      evaluation_period_start: new Date('2025-12-01T00:00:00Z'),
      evaluation_period_end: new Date('2025-12-31T23:59:59Z'),
      mae: 6.1,
      rmse: 8.1,
      r2_score: 0.91,
      precision: 0.89,
      recall: 0.9,
      f1_score: 0.895,
      prediction_count: 720,
      error_rate: 0.09,
      performance_json: JSON.stringify({ facility: 'Chiang Mai', zone: 'Zone 3' }),
      created_at: now,
    },
  ];
  await knex('model_performance_per_battery').insert(modelPerformance);

  // Sensor readings (24-hour history per battery)
  const sensorReadings: Array<Record<string, unknown>> = [];
  for (const [index, battery] of batterySystems.entries()) {
    for (let hour = 0; hour < 24; hour += 1) {
      const timestamp = new Date(now.getTime() - hour * 60 * 60 * 1000);
      const voltage = 400 + index * 0.5 + Math.sin(hour / 3) * 1.5;
      const current = 50 + (index % 4) * 3 + Math.cos(hour / 4) * 2;
      const temperature = 25 + (index % 3) * 0.7 + Math.sin(hour / 6);
      const soc = Math.max(40, 85 - hour * 1.5 + index * 0.3);
      const soh = Math.max(70, 97 - index * 0.5 - hour * 0.05);
      sensorReadings.push({
        battery_system_id: battery.id,
        time: timestamp,
        voltage: Number(voltage.toFixed(4)),
        current: Number(current.toFixed(4)),
        temperature: Number(temperature.toFixed(2)),
        soc: Number(soc.toFixed(2)),
        soh: Number(soh.toFixed(2)),
        power: Number(((voltage * current) / 1000).toFixed(3)),
      });
    }
  }
  await knex('sensor_readings').insert(sensorReadings);

  // RUL predictions per battery
  const rulPredictions = batterySystems.map((battery, index) => ({
    battery_system_id: battery.id,
    predicted_rul: 340 - index * 9,
    confidence: Number((0.8 - index * 0.01).toFixed(2)),
    model_version: 'bms-rul-transformer@v1.0.0',
    features: JSON.stringify({
      avg_temperature: featureStoreEntries[index].temperature_mean,
      avg_soc: featureStoreEntries[index].soc_trend,
      avg_soh: featureStoreEntries[index].soh_trend,
      cycle_count: 150 + index * 10,
    }),
  }));
  await knex('rul_predictions').insert(rulPredictions);

  // Alerts referencing new layout
  await knex('alerts').insert([
    {
      battery_system_id: BATTERY_IDS[5],
      severity: 'high',
      type: 'temperature_high',
      message: 'Cabinet temperature exceeded 36°C threshold',
      metadata: JSON.stringify({ measured: 37.2, threshold: 36, zone: 'Phuket Zone 2' }),
      status: 'active',
    },
    {
      battery_system_id: BATTERY_IDS[7],
      severity: 'medium',
      type: 'voltage_spike',
      message: 'Sudden 5V step detected on CNX floor pack',
      metadata: JSON.stringify({ measured: 409, baseline: 402 }),
      status: 'acknowledged',
      acknowledged_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      acknowledged_by: 'ops@nt-poc.local',
    },
  ]);
}
