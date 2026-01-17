import { createFacility, createBatterySystem, createSensorReading } from '../factories.js';

export interface TimeSeriesFixture {
  facility: any;
  batterySystem: any;
  hourlyReadings: any[];
  dailyReadings: any[];
}

export async function createTimeSeriesFixture(
  hoursOfData: number = 24,
  daysOfData: number = 30
): Promise<TimeSeriesFixture> {
  const facility = await createFacility({
    name: 'Time Series Test Facility',
    status: 'active',
  });

  const batterySystem = await createBatterySystem({
    facility_id: facility.id,
    name: 'Time Series Battery',
    status: 'online',
  });

  const hourlyReadings = [];
  const hourlyStartTime = new Date(Date.now() - hoursOfData * 60 * 60 * 1000);
  
  for (let i = 0; i < hoursOfData; i++) {
    const time = new Date(hourlyStartTime.getTime() + i * 60 * 60 * 1000);
    const hourOfDay = time.getHours();
    
    const socPattern = 90 - Math.abs(hourOfDay - 12) * 2;
    const tempPattern = 25 + Math.sin((hourOfDay / 24) * Math.PI * 2) * 8;
    const powerPattern = Math.cos((hourOfDay / 24) * Math.PI * 2) * 50;
    
    const reading = await createSensorReading({
      battery_system_id: batterySystem.id,
      time,
      soc: socPattern + Math.random() * 5,
      soh: 95 - i * 0.05,
      temperature: tempPattern + Math.random() * 3,
      power: powerPattern + Math.random() * 10,
      voltage: 3.7 + Math.random() * 0.3,
      current: powerPattern / 3.7,
    });
    hourlyReadings.push(reading);
  }

  const dailyReadings = [];
  const dailyStartTime = new Date(Date.now() - daysOfData * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < daysOfData; i++) {
    const time = new Date(dailyStartTime.getTime() + i * 24 * 60 * 60 * 1000);
    const dayTrend = 100 - i * 0.5;
    
    const reading = await createSensorReading({
      battery_system_id: batterySystem.id,
      time,
      soc: dayTrend - 5 + Math.random() * 10,
      soh: 95 - i * 0.15,
      temperature: 28 + Math.random() * 8,
      power: 30 + Math.random() * 40,
      voltage: 3.6 + Math.random() * 0.4,
    });
    dailyReadings.push(reading);
  }

  return {
    facility,
    batterySystem,
    hourlyReadings,
    dailyReadings,
  };
}
