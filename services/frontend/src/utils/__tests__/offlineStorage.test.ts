import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { offlineStorage, db } from '../offlineStorage';
import type { SensorReading, Alert } from '../../types';

describe('offlineStorage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('cacheSensorReading', () => {
    it('should cache sensor reading', async () => {
      const reading: SensorReading = {
        batterySystemId: 'battery-1',
        time: Date.now(),
        voltage: 12.5,
        current: 2.3,
        temperature: 25.0,
      };

      await offlineStorage.cacheSensorReading(reading);
      
      const readings = await db.sensorReadings.toArray();
      expect(readings).toHaveLength(1);
      expect(readings[0].batterySystemId).toBe('battery-1');
    });

    it('should limit cached readings to 1000', async () => {
      const readings: SensorReading[] = Array.from({ length: 1050 }, (_, i) => ({
        batterySystemId: 'battery-1',
        time: Date.now() + i,
        voltage: 12.5,
      }));

      for (const reading of readings) {
        await offlineStorage.cacheSensorReading(reading);
      }

      const count = await db.sensorReadings.count();
      expect(count).toBe(1000);
    });
  });

  describe('getLatestReadings', () => {
    it('should return latest readings for battery system', async () => {
      await db.sensorReadings.bulkAdd([
        { batterySystemId: 'battery-1', time: 1000, voltage: 12.0 },
        { batterySystemId: 'battery-1', time: 2000, voltage: 12.5 },
        { batterySystemId: 'battery-2', time: 1500, voltage: 13.0 },
      ]);

      const readings = await offlineStorage.getLatestReadings('battery-1');
      
      expect(readings).toHaveLength(2);
      expect(readings[0].time).toBe(2000);
    });

    it('should respect limit parameter', async () => {
      await db.sensorReadings.bulkAdd(
        Array.from({ length: 50 }, (_, i) => ({
          batterySystemId: 'battery-1',
          time: i,
          voltage: 12.0,
        }))
      );

      const readings = await offlineStorage.getLatestReadings('battery-1', 10);
      
      expect(readings).toHaveLength(10);
    });
  });

  describe('cacheAlert', () => {
    it('should cache alert', async () => {
      const alert: Alert = {
        id: 'alert-1',
        batterySystemId: 'battery-1',
        status: 'active',
        severity: 'high',
        createdAt: Date.now(),
      };

      await offlineStorage.cacheAlert(alert);
      
      const alerts = await db.alerts.toArray();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('alert-1');
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only active alerts', async () => {
      await db.alerts.bulkAdd([
        { id: 'alert-1', status: 'active', severity: 'high' },
        { id: 'alert-2', status: 'resolved', severity: 'low' },
        { id: 'alert-3', status: 'active', severity: 'medium' },
      ]);

      const alerts = await offlineStorage.getActiveAlerts();
      
      expect(alerts).toHaveLength(2);
      expect(alerts.every((a) => a.status === 'active')).toBe(true);
    });
  });
});
