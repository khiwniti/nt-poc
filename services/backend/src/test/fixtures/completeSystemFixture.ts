import { createFacility, createBatterySystem, createSensorReading, createRulPrediction } from '../factories';

export interface CompleteSystemFixture {
  facility: any;
  batterySystems: any[];
  sensorReadings: any[];
  rulPredictions: any[];
}

export async function createCompleteSystemFixture(
  numBatterySystems: number = 3,
  readingsPerSystem: number = 10
): Promise<CompleteSystemFixture> {
  const facility = await createFacility({
    name: 'Test Facility Alpha',
    location: 'Bangkok, Thailand',
    timezone: 'Asia/Bangkok',
    total_zones: 5,
    status: 'active',
  });

  const batterySystems = [];
  const sensorReadings = [];
  const rulPredictions = [];

  for (let i = 0; i < numBatterySystems; i++) {
    const batterySystem = await createBatterySystem({
      facility_id: facility.id,
      name: `Battery System ${String.fromCharCode(65 + i)}`,
      zone: `Zone-A-${i + 1}`,
      status: 'online',
      capacity_kwh: 100 + i * 50,
    });
    batterySystems.push(batterySystem);

    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (let j = 0; j < readingsPerSystem; j++) {
      const reading = await createSensorReading({
        battery_system_id: batterySystem.id,
        time: new Date(startTime.getTime() + j * 60 * 60 * 1000),
        soc: 95 - j * 2,
        soh: 98 - i * 0.5,
        temperature: 25 + Math.sin(j / 2) * 5,
      });
      sensorReadings.push(reading);
    }

    const prediction = await createRulPrediction({
      battery_system_id: batterySystem.id,
      predicted_rul: 365 - i * 50,
      confidence: 0.85 + i * 0.03,
      model_version: 'v2.0.0',
    });
    rulPredictions.push(prediction);
  }

  return {
    facility,
    batterySystems,
    sensorReadings,
    rulPredictions,
  };
}
