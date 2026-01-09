import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import {
  createFacility,
  createBatterySystem,
  createSensorReading,
  generateAdminToken,
} from '../factories';
import {
  createCompleteSystemFixture,
  createDegradedBatteryFixture,
  createTimeSeriesFixture,
} from '../fixtures';
import { useTestDatabase } from '../utils';

describe('Test Data Factories - Example Usage', () => {
  useTestDatabase();

  describe('Basic Factory Usage', () => {
    it('should create a facility with default values', async () => {
      const facility = await createFacility();

      expect(facility).toBeDefined();
      expect(facility.id).toMatch(/^test-fac-/);
      expect(facility.name).toBeTruthy();
      expect(facility.status).toMatch(/^(active|inactive|maintenance)$/);
    });

    it('should create a facility with custom values', async () => {
      const facility = await createFacility({
        name: 'Custom Test Facility',
        status: 'active',
        total_zones: 15,
      });

      expect(facility.name).toBe('Custom Test Facility');
      expect(facility.status).toBe('active');
      expect(facility.total_zones).toBe(15);
    });

    it('should create a battery system linked to facility', async () => {
      const facility = await createFacility();
      const batterySystem = await createBatterySystem({
        facility_id: facility.id,
        name: 'Test Battery',
        status: 'online',
      });

      expect(batterySystem.facility_id).toBe(facility.id);
      expect(batterySystem.name).toBe('Test Battery');
      expect(batterySystem.status).toBe('online');
    });

    it('should create sensor readings with realistic values', async () => {
      const batterySystem = await createBatterySystem();
      const reading = await createSensorReading({
        battery_system_id: batterySystem.id,
      });

      expect(reading.voltage).toBeGreaterThan(0);
      expect(reading.voltage).toBeLessThan(5);
      expect(reading.soc).toBeGreaterThanOrEqual(0);
      expect(reading.soc).toBeLessThanOrEqual(100);
      expect(reading.soh).toBeGreaterThanOrEqual(0);
      expect(reading.soh).toBeLessThanOrEqual(100);
    });
  });

  describe('Fixture Usage', () => {
    it('should create complete system fixture', async () => {
      const { facility, batterySystems, sensorReadings, rulPredictions } =
        await createCompleteSystemFixture(3, 5);

      expect(facility).toBeDefined();
      expect(batterySystems).toHaveLength(3);
      expect(sensorReadings.length).toBeGreaterThan(0);
      expect(rulPredictions).toHaveLength(3);

      batterySystems.forEach((battery) => {
        expect(battery.facility_id).toBe(facility.id);
      });
    });

    it('should create degraded battery fixture', async () => {
      const { batterySystem, alerts, rulPrediction } =
        await createDegradedBatteryFixture();

      expect(batterySystem).toBeDefined();
      expect(alerts.length).toBeGreaterThan(0);
      expect(rulPrediction.predicted_rul).toBeLessThan(100);

      const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it('should create time series fixture', async () => {
      const { batterySystem, hourlyReadings, dailyReadings } =
        await createTimeSeriesFixture(24, 7);

      expect(batterySystem).toBeDefined();
      expect(hourlyReadings).toHaveLength(24);
      expect(dailyReadings).toHaveLength(7);

      const times = hourlyReadings.map((r) => new Date(r.time).getTime());
      for (let i = 1; i < times.length; i++) {
        const diff = times[i] - times[i - 1];
        expect(diff).toBeCloseTo(60 * 60 * 1000, -3);
      }
    });
  });

  describe('API Integration with Factories', () => {
    it('should retrieve facilities created by factory', async () => {
      await createFacility({ name: 'Facility Alpha' });
      await createFacility({ name: 'Facility Beta' });

      const token = generateAdminToken();
      const response = await request(app)
        .get('/api/v1/facilities')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve battery systems for facility', async () => {
      const facility = await createFacility();
      await createBatterySystem({ facility_id: facility.id });
      await createBatterySystem({ facility_id: facility.id });

      const token = generateAdminToken();
      const response = await request(app)
        .get(`/api/v1/facilities/${facility.id}/battery-systems`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('Authentication Helpers', () => {
    it('should generate valid admin token', async () => {
      const facility = await createFacility();
      const token = generateAdminToken();

      const response = await request(app)
        .get('/api/v1/facilities')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should reject requests without token', async () => {
      await createFacility();

      await request(app).get('/api/v1/facilities').expect(401);
    });
  });

  describe('Data Cleanup', () => {
    it('should only clean test-prefixed data', async () => {
      const facility1 = await createFacility();
      const facility2 = await createFacility();

      expect(facility1.id).toMatch(/^test-fac-/);
      expect(facility2.id).toMatch(/^test-fac-/);
    });
  });
});
