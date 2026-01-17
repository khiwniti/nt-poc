import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database.js';
import jwt from 'jsonwebtoken';

const generateToken = (role = 'admin') => {
  return jwt.sign({ userId: 'user-123', role }, process.env.JWT_SECRET || 'test-secret');
};

describe('Alerts API Integration Tests', () => {
  let authToken: string;
  let facilityId: string;
  let batteryId: string;
  let alertId: string;

  beforeAll(async () => {
    authToken = generateToken();

    const facilityResult = await pool.query(`
      INSERT INTO facilities (id, name, location, timezone, total_zones, status)
      VALUES ('alert-test-fac', 'Alert Test Facility', '{"lat": 13.7563, "lng": 100.5018}', 'Asia/Bangkok', 1, 'active')
      RETURNING id
    `);
    facilityId = facilityResult.rows[0].id;

    const batteryResult = await pool.query(
      `
      INSERT INTO battery_systems (id, facility_id, name, capacity_kwh, state_of_charge, state_of_health, status)
      VALUES ('alert-test-battery', $1, 'Test Battery', 100, 80, 95, 'operational')
      RETURNING id
    `,
      [facilityId]
    );
    batteryId = batteryResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM alerts WHERE battery_id = $1', [batteryId]);
    await pool.query('DELETE FROM battery_systems WHERE id = $1', [batteryId]);
    await pool.query('DELETE FROM facilities WHERE id = $1', [facilityId]);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM alerts WHERE battery_id = $1', [batteryId]);
  });

  describe('GET /api/v1/alerts', () => {
    it('should return list of alerts with pagination', async () => {
      await pool.query(
        `
        INSERT INTO alerts (battery_id, alert_type, severity, message, status)
        VALUES 
          ($1, 'temperature', 'critical', 'High temperature', 'active'),
          ($1, 'voltage', 'warning', 'Low voltage', 'active')
      `,
        [batteryId]
      );

      const response = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
    });

    it('should filter alerts by severity', async () => {
      await pool.query(
        `
        INSERT INTO alerts (battery_id, alert_type, severity, message, status)
        VALUES 
          ($1, 'temperature', 'critical', 'Critical alert', 'active'),
          ($1, 'voltage', 'warning', 'Warning alert', 'active')
      `,
        [batteryId]
      );

      const response = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ severity: 'critical' })
        .expect(200);

      expect(response.body.data.every((a: { severity: string }) => a.severity === 'critical')).toBe(
        true
      );
    });

    it('should filter alerts by status', async () => {
      await pool.query(
        `
        INSERT INTO alerts (battery_id, alert_type, severity, message, status)
        VALUES 
          ($1, 'temperature', 'critical', 'Active alert', 'active'),
          ($1, 'voltage', 'warning', 'Resolved alert', 'resolved')
      `,
        [batteryId]
      );

      const response = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.data.every((a: { status: string }) => a.status === 'active')).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/alerts').expect(401);
    });
  });

  describe('GET /api/v1/alerts/:id', () => {
    beforeEach(async () => {
      const result = await pool.query(
        `
        INSERT INTO alerts (battery_id, alert_type, severity, message, status)
        VALUES ($1, 'temperature', 'critical', 'Test alert', 'active')
        RETURNING id
      `,
        [batteryId]
      );
      alertId = result.rows[0].id;
    });

    it('should return alert details', async () => {
      const response = await request(app)
        .get(`/api/v1/alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(alertId);
      expect(response.body.data.alert_type).toBe('temperature');
      expect(response.body.data.severity).toBe('critical');
    });

    it('should return 404 for non-existent alert', async () => {
      await request(app)
        .get('/api/v1/alerts/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/v1/alerts/${alertId}`).expect(401);
    });
  });

  describe('POST /api/v1/alerts', () => {
    it('should create new alert', async () => {
      const newAlert = {
        battery_id: batteryId,
        alert_type: 'temperature',
        severity: 'warning',
        message: 'New test alert',
        metadata: { temp: 45 },
      };

      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newAlert)
        .expect(201);

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.alert_type).toBe('temperature');
      expect(response.body.data.status).toBe('active');

      alertId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ alert_type: 'temperature' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/alerts')
        .send({ battery_id: batteryId, alert_type: 'test' })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/alerts/:id', () => {
    beforeEach(async () => {
      const result = await pool.query(
        `
        INSERT INTO alerts (battery_id, alert_type, severity, message, status)
        VALUES ($1, 'temperature', 'warning', 'Test alert', 'active')
        RETURNING id
      `,
        [batteryId]
      );
      alertId = result.rows[0].id;
    });

    it('should update alert status', async () => {
      const response = await request(app)
        .patch(`/api/v1/alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'resolved', resolution_notes: 'Fixed' })
        .expect(200);

      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolution_notes).toBe('Fixed');
    });

    it('should update alert severity', async () => {
      const response = await request(app)
        .patch(`/api/v1/alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ severity: 'critical' })
        .expect(200);

      expect(response.body.data.severity).toBe('critical');
    });

    it('should return 404 for non-existent alert', async () => {
      await request(app)
        .patch('/api/v1/alerts/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'resolved' })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/alerts/${alertId}`)
        .send({ status: 'resolved' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/alerts/:id', () => {
    beforeEach(async () => {
      const result = await pool.query(
        `
        INSERT INTO alerts (battery_id, alert_type, severity, message, status)
        VALUES ($1, 'temperature', 'warning', 'Test alert', 'active')
        RETURNING id
      `,
        [batteryId]
      );
      alertId = result.rows[0].id;
    });

    it('should delete alert', async () => {
      await request(app)
        .delete(`/api/v1/alerts/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const checkResult = await pool.query('SELECT * FROM alerts WHERE id = $1', [alertId]);
      expect(checkResult.rows.length).toBe(0);
    });

    it('should return 404 for non-existent alert', async () => {
      await request(app)
        .delete('/api/v1/alerts/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require admin role', async () => {
      const userToken = generateToken('user');
      await request(app)
        .delete(`/api/v1/alerts/${alertId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app).delete(`/api/v1/alerts/${alertId}`).expect(401);
    });
  });

  describe('GET /api/v1/alerts/stats', () => {
    beforeEach(async () => {
      await pool.query(
        `
        INSERT INTO alerts (battery_id, alert_type, severity, message, status)
        VALUES 
          ($1, 'temperature', 'critical', 'Critical 1', 'active'),
          ($1, 'voltage', 'warning', 'Warning 1', 'active'),
          ($1, 'temperature', 'critical', 'Critical 2', 'resolved')
      `,
        [batteryId]
      );
    });

    it('should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/v1/alerts/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.total).toBeGreaterThanOrEqual(3);
      expect(response.body.data.by_severity).toBeDefined();
      expect(response.body.data.by_status).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/alerts/stats').expect(401);
    });
  });
});
