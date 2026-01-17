import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { pool } from '../../config/database.js';
import jwt from 'jsonwebtoken';

const generateToken = () => {
  return jwt.sign(
    { userId: 'user-123', role: 'admin' },
    process.env.JWT_SECRET || 'test-secret'
  );
};

describe('Sensor Readings API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    authToken = generateToken();
    
    await pool.query(`
      INSERT INTO battery_systems (id, zone_id, name, capacity, status)
      VALUES ('bat-test', 'zone-001', 'Test Battery', 100.0, 'operational')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Insert time-series data
    for (let i = 0; i < 10; i++) {
      await pool.query(`
        INSERT INTO sensor_readings (time, battery_system_id, voltage, current, temperature, soc, soh, power)
        VALUES (NOW() - INTERVAL '${i} minutes', 'bat-test', ${48.0 + i * 0.1}, 10.0, 25.0, 80.0, 95.0, 480.0)
      `);
    }
  });
  
  afterAll(async () => {
    await pool.query('DELETE FROM sensor_readings WHERE battery_system_id = \'bat-test\'');
    await pool.query('DELETE FROM battery_systems WHERE id = \'bat-test\'');
    await pool.end();
  });
  
  describe('GET /api/v1/sensor-readings/latest', () => {
    it('returns latest reading', async () => {
      const response = await request(app)
        .get('/api/v1/sensor-readings/latest?batterySystemId=bat-test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveProperty('voltage');
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('soc');
      expect(response.body.data.batterySystemId).toBe('bat-test');
    });
    
    it('requires batterySystemId parameter', async () => {
      await request(app)
        .get('/api/v1/sensor-readings/latest')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
  
  describe('GET /api/v1/sensor-readings/timeseries', () => {
    it('returns time-series data', async () => {
      const startTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      
      const response = await request(app)
        .get(`/api/v1/sensor-readings/timeseries?batterySystemId=bat-test&startTime=${startTime}&endTime=${endTime}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.total).toBe(response.body.data.length);
    });
    
    it('supports hourly aggregation', async () => {
      const response = await request(app)
        .get('/api/v1/sensor-readings/timeseries?batterySystemId=bat-test&startTime=2025-01-01&endTime=2025-01-09&interval=hourly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.interval).toBe('hourly');
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('avg_voltage');
      }
    });
  });
});
