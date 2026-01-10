import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';
import jwt from 'jsonwebtoken';

const generateToken = () => {
  return jwt.sign(
    { userId: 'user-123', role: 'admin' },
    process.env.JWT_SECRET || 'test-secret'
  );
};

describe('Battery Health API', () => {
  let authToken: string;
  let testFacilityId: string;
  let testBatteryIds: string[];
  
  beforeAll(async () => {
    authToken = generateToken();
    
    // Seed test data
    const facilityResult = await pool.query(`
      INSERT INTO facilities (id, name, location, timezone, total_zones, status)
      VALUES ('health-test-facility', 'Health Test Facility', 'Test Location', 'UTC', 3, 'active')
      RETURNING id
    `);
    testFacilityId = facilityResult.rows[0].id;

    // Create test batteries in different zones with different health scores
    const batteryResult = await pool.query(`
      INSERT INTO battery_systems (id, facility_id, name, zone, capacity_kwh, status)
      VALUES 
        ('health-bat-1', $1, 'Healthy Battery 1', 'Zone A', 100.0, 'online'),
        ('health-bat-2', $1, 'Warning Battery 1', 'Zone A', 100.0, 'online'),
        ('health-bat-3', $1, 'At Risk Battery 1', 'Zone B', 100.0, 'online'),
        ('health-bat-4', $1, 'At Risk Battery 2', 'Zone B', 100.0, 'online'),
        ('health-bat-5', $1, 'Healthy Battery 2', 'Zone C', 100.0, 'online')
      RETURNING id
    `, [testFacilityId]);
    testBatteryIds = batteryResult.rows.map(r => r.id);

    // Create sensor readings with different health scores (SOH)
    const now = new Date();
    await pool.query(`
      INSERT INTO sensor_readings (battery_system_id, time, voltage, current, temperature, soc, soh, power)
      VALUES 
        -- Healthy Battery 1: SOH = 95
        ('health-bat-1', $1, 48.5, 10.0, 25.0, 85.0, 95.0, 485.0),
        ('health-bat-1', $2, 48.4, 10.1, 25.2, 84.5, 95.2, 488.0),
        -- Warning Battery 1: SOH = 75
        ('health-bat-2', $1, 48.0, 9.5, 26.0, 80.0, 75.0, 456.0),
        ('health-bat-2', $2, 47.9, 9.6, 26.1, 79.5, 75.5, 460.0),
        -- At Risk Battery 1: SOH = 65
        ('health-bat-3', $1, 47.5, 9.0, 27.0, 75.0, 65.0, 427.5),
        ('health-bat-3', $2, 47.4, 9.1, 27.2, 74.5, 65.2, 431.0),
        -- At Risk Battery 2: SOH = 55
        ('health-bat-4', $1, 47.0, 8.5, 28.0, 70.0, 55.0, 399.5),
        ('health-bat-4', $2, 46.9, 8.6, 28.1, 69.5, 55.5, 403.0),
        -- Healthy Battery 2: SOH = 92
        ('health-bat-5', $1, 48.3, 10.2, 25.5, 88.0, 92.0, 492.0),
        ('health-bat-5', $2, 48.2, 10.3, 25.6, 87.5, 92.5, 496.0)
    `, [new Date(now.getTime() - 3600000), now]); // 1 hour ago and now

    // Add historical data for trend
    for (let i = 1; i <= 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 3600000); // i days ago
      const avgSoh = 80 - (i * 0.2); // Declining trend
      await pool.query(`
        INSERT INTO sensor_readings (battery_system_id, time, soh)
        VALUES 
          ('health-bat-1', $1, $2),
          ('health-bat-2', $1, $2),
          ('health-bat-3', $1, $2)
      `, [date, avgSoh]);
    }
  });
  
  afterAll(async () => {
    await pool.query('DELETE FROM sensor_readings WHERE battery_system_id LIKE \'health-bat-%\'');
    await pool.query('DELETE FROM battery_systems WHERE id LIKE \'health-bat-%\'');
    await pool.query('DELETE FROM facilities WHERE id = \'health-test-facility\'');
    await pool.end();
  });
  
  describe('GET /api/v1/battery-health/facility/:facilityId/summary', () => {
    it('returns facility-wide health summary', async () => {
      const response = await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('totalBatteries', 5);
      expect(response.body).toHaveProperty('avgHealthScore');
      expect(response.body.avgHealthScore).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('atRiskCount', 2); // 2 batteries < 70
      expect(response.body).toHaveProperty('healthyCount', 2); // 2 batteries >= 90
      expect(response.body).toHaveProperty('warningCount', 1); // 1 battery 70-89
    });
    
    it('requires authentication', async () => {
      await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/summary`)
        .expect(401);
    });
  });

  describe('GET /api/v1/battery-health/facility/:facilityId/distribution', () => {
    it('returns health score distribution', async () => {
      const response = await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/distribution`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('bucket');
      expect(response.body.data[0]).toHaveProperty('bucket_midpoint');
      expect(response.body.data[0]).toHaveProperty('count');
    });
  });

  describe('GET /api/v1/battery-health/facility/:facilityId/at-risk', () => {
    it('returns list of at-risk batteries', async () => {
      const response = await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/at-risk`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.total).toBe(2); // 2 batteries with health < 70
      expect(response.body.threshold).toBe(70);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('zone');
      expect(response.body.data[0]).toHaveProperty('health_score');
      expect(response.body.data[0].health_score).toBeLessThan(70);
    });

    it('supports custom threshold', async () => {
      const response = await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/at-risk?threshold=80`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.threshold).toBe(80);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/v1/battery-health/facility/:facilityId/trend', () => {
    it('returns 30-day health trend', async () => {
      const response = await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/trend`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('date');
      expect(response.body.data[0]).toHaveProperty('avg_health_score');
    });

    it('supports custom number of days', async () => {
      const response = await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/trend?days=7`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/battery-health/facility/:facilityId/by-zone', () => {
    it('returns zone-level health aggregation', async () => {
      const response = await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/by-zone`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('zone');
      expect(response.body.data[0]).toHaveProperty('battery_count');
      expect(response.body.data[0]).toHaveProperty('avg_health_score');
      expect(response.body.data[0]).toHaveProperty('min_health_score');
      expect(response.body.data[0]).toHaveProperty('max_health_score');
      expect(response.body.data[0]).toHaveProperty('at_risk_count');
    });
  });

  describe('GET /api/v1/battery-health/facility/:facilityId/export', () => {
    it('exports health report as CSV', async () => {
      const response = await request(app)
        .get(`/api/v1/battery-health/facility/${testFacilityId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Battery ID');
      expect(response.text).toContain('Battery Name');
      expect(response.text).toContain('Health Score');
    });

    it('returns 404 for facility with no data', async () => {
      await request(app)
        .get('/api/v1/battery-health/facility/non-existent-facility/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
