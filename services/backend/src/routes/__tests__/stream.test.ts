import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { pool } from '../../config/database.js';
import jwt from 'jsonwebtoken';

const generateToken = () => {
  return jwt.sign({ userId: 'user-123', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
};

describe('Stream API Integration Tests', () => {
  let authToken: string;
  let facilityId: string;

  beforeAll(async () => {
    authToken = generateToken();

    const result = await pool.query(`
      INSERT INTO facilities (id, name, location, timezone, total_zones, status)
      VALUES ('stream-test-fac', 'Stream Test Facility', '{"lat": 13.7563, "lng": 100.5018}', 'Asia/Bangkok', 1, 'active')
      RETURNING id
    `);
    facilityId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM facilities WHERE id = $1', [facilityId]);
  });

  describe('GET /api/v1/stream/events', () => {
    it('should establish SSE connection', async () => {
      const response = await request(app)
        .get('/api/v1/stream/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/stream/events')
        .set('Accept', 'text/event-stream')
        .expect(401);
    });

    it('should send initial connection event', (done) => {
      const req = request(app)
        .get('/api/v1/stream/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      let receivedData = '';

      req.on('data', (chunk) => {
        receivedData += chunk.toString();
        if (receivedData.includes('event: connected')) {
          req.abort();
          done();
        }
      });

      setTimeout(() => {
        req.abort();
        done(new Error('Timeout waiting for connection event'));
      }, 5000);
    });
  });

  describe('GET /api/v1/stream/alerts', () => {
    it('should stream alerts as SSE', async () => {
      const response = await request(app)
        .get('/api/v1/stream/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should filter by facility_id', async () => {
      const response = await request(app)
        .get('/api/v1/stream/alerts')
        .query({ facility_id: facilityId })
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/stream/alerts')
        .set('Accept', 'text/event-stream')
        .expect(401);
    });
  });

  describe('GET /api/v1/stream/metrics', () => {
    it('should stream metrics as SSE', async () => {
      const response = await request(app)
        .get('/api/v1/stream/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should filter by battery_id', async () => {
      const batteryResult = await pool.query(
        `
        INSERT INTO battery_systems (id, facility_id, name, capacity_kwh, state_of_charge, state_of_health, status)
        VALUES ('stream-test-battery', $1, 'Test Battery', 100, 80, 95, 'operational')
        RETURNING id
      `,
        [facilityId]
      );

      const batteryId = batteryResult.rows[0].id;

      const response = await request(app)
        .get('/api/v1/stream/metrics')
        .query({ battery_id: batteryId })
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);

      await pool.query('DELETE FROM battery_systems WHERE id = $1', [batteryId]);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/stream/metrics')
        .set('Accept', 'text/event-stream')
        .expect(401);
    });
  });

  describe('SSE Connection Management', () => {
    it('should handle connection close gracefully', (done) => {
      const req = request(app)
        .get('/api/v1/stream/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      setTimeout(() => {
        req.abort();
        done();
      }, 1000);
    });

    it('should send keep-alive comments', (done) => {
      const req = request(app)
        .get('/api/v1/stream/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      let receivedData = '';

      req.on('data', (chunk) => {
        receivedData += chunk.toString();
        if (receivedData.includes(':keep-alive') || receivedData.includes(':\n')) {
          req.abort();
          done();
        }
      });

      setTimeout(() => {
        req.abort();
        done(new Error('Timeout waiting for keep-alive'));
      }, 35000);
    }, 40000);
  });
});
