import { createFacility, createBatterySystem, createSensorReading, createAlert, createRulPrediction } from '../factories';

export interface DegradedBatteryFixture {
  facility: any;
  batterySystem: any;
  sensorReadings: any[];
  alerts: any[];
  rulPrediction: any;
}

export async function createDegradedBatteryFixture(): Promise<DegradedBatteryFixture> {
  const facility = await createFacility({
    name: 'Aging Test Facility',
    status: 'active',
  });

  const batterySystem = await createBatterySystem({
    facility_id: facility.id,
    name: 'Degraded Battery XYZ',
    status: 'online',
    capacity_kwh: 150,
    installed_date: new Date(Date.now() - 700 * 24 * 60 * 60 * 1000), // 700 days ago
  });

  const sensorReadings = [];
  const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 30; i++) {
    const reading = await createSensorReading({
      battery_system_id: batterySystem.id,
      time: new Date(startTime.getTime() + i * 24 * 60 * 60 * 1000),
      soc: 85 - i * 0.5,
      soh: 75 - i * 0.3,
      temperature: 35 + Math.random() * 5,
      voltage: 3.2 + Math.random() * 0.3,
    });
    sensorReadings.push(reading);
  }

  const alerts = [];
  
  const tempAlert = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'high',
    type: 'temperature',
    message: 'Battery temperature consistently high',
    acknowledged: false,
    resolved: false,
  });
  alerts.push(tempAlert);

  const sohAlert = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'critical',
    type: 'soh',
    message: 'State of Health below threshold',
    acknowledged: true,
    acknowledged_by: 'operator@example.com',
    acknowledged_at: new Date(),
    resolved: false,
  });
  alerts.push(sohAlert);

  const rulPrediction = await createRulPrediction({
    battery_system_id: batterySystem.id,
    predicted_rul: 45,
    confidence: 0.92,
    model_version: 'v2.0.0',
    features: {
      avg_temperature: 37.5,
      avg_soc: 72.3,
      avg_soh: 71.5,
      cycle_count: 2500,
      age_days: 700,
    },
  });

  return {
    facility,
    batterySystem,
    sensorReadings,
    alerts,
    rulPrediction,
  };
}
