import Dexie, { Table } from 'dexie';
import type { SensorReading, Alert } from '../types';

class FacilityDatabase extends Dexie {
  sensorReadings!: Table<SensorReading>;
  alerts!: Table<Alert>;
  
  constructor() {
    super('FacilityManagerDB');
    
    this.version(1).stores({
      sensorReadings: '++id, batterySystemId, time',
      alerts: '++id, batterySystemId, status, createdAt',
    });
  }
}

export const db = new FacilityDatabase();

export const offlineStorage = {
  async cacheSensorReading(reading: SensorReading) {
    await db.sensorReadings.add(reading);
    
    // Keep only last 1000 readings
    const count = await db.sensorReadings.count();
    if (count > 1000) {
      const oldestIds = await db.sensorReadings
        .orderBy('time')
        .limit(count - 1000)
        .primaryKeys();
      await db.sensorReadings.bulkDelete(oldestIds);
    }
  },
  
  async getLatestReadings(batterySystemId: string, limit = 100) {
    return await db.sensorReadings
      .where('batterySystemId')
      .equals(batterySystemId)
      .reverse()
      .limit(limit)
      .toArray();
  },
  
  async cacheAlert(alert: Alert) {
    await db.alerts.add(alert);
  },
  
  async getActiveAlerts() {
    return await db.alerts
      .where('status')
      .equals('active')
      .toArray();
  },
};
