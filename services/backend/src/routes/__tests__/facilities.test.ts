import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { pool } from '../../config/database.js';
import jwt from 'jsonwebtoken';
import { geocodingService } from '../../services/geocodingService.js';

vi.mock('../../services/geocodingService', () => ({
  geocodingService: {
    geocode: vi.fn(),
    reverseGeocode: vi.fn(),
  },
}));

const generateToken = () => {
  return jwt.sign(
    { userId: 'user-123', role: 'admin' },
    process.env.JWT_SECRET || 'test-secret'
  );
};

describe('Facilities API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    authToken = generateToken();
    
    // Seed test data
    await pool.query(`
      INSERT INTO facilities (id, name, location, timezone, total_zones, status)
      VALUES 
        ('fac-001', 'Test Facility 1', '{"lat": 13.7563, "lng": 100.5018, "address": "Bangkok"}', 'Asia/Bangkok', 10, 'active'),
        ('fac-002', 'Test Facility 2', '{"lat": 13.7563, "lng": 100.5018, "address": "Bangkok"}', 'Asia/Bangkok', 5, 'active')
    `);
  });
  
  afterAll(async () => {
    await pool.query('DELETE FROM facilities WHERE id LIKE \'fac-%\'');
    await pool.end();
  });
  
  describe('GET /api/v1/facilities', () => {
    it('returns list of facilities', async () => {
      const response = await request(app)
        .get('/api/v1/facilities')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
    });
    
    it('requires authentication', async () => {
      await request(app)
        .get('/api/v1/facilities')
        .expect(401);
    });
    
    it('rejects invalid token', async () => {
      await request(app)
        .get('/api/v1/facilities')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });
  });
  
  describe('GET /api/v1/facilities/:id', () => {
    it('returns facility details', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/fac-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data.id).toBe('fac-001');
      expect(response.body.data.name).toBe('Test Facility 1');
      expect(response.body.data.totalZones).toBe(10);
    });
    
    it('returns 404 for non-existent facility', async () => {
      await request(app)
        .get('/api/v1/facilities/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
  
  describe('GET /api/v1/facilities/:id/kpis', () => {
    beforeEach(async () => {
      // Seed battery systems and readings
      await pool.query(`
        INSERT INTO zones (id, facility_id, name, type)
        VALUES ('zone-001', 'fac-001', 'Test Zone', 'room')
        ON CONFLICT (id) DO NOTHING
      `);
      
      await pool.query(`
        INSERT INTO battery_systems (id, zone_id, name, capacity, status)
        VALUES ('bat-001', 'zone-001', 'Test Battery', 100.0, 'operational')
        ON CONFLICT (id) DO NOTHING
      `);
      
      await pool.query(`
        INSERT INTO sensor_readings (time, battery_system_id, voltage, current, temperature, soc, soh, power)
        VALUES (NOW(), 'bat-001', 48.5, 10.2, 25.5, 78.5, 94.2, 494.7)
      `);
    });
    
    it('returns calculated KPIs', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/fac-001/kpis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveProperty('totalCapacity');
      expect(response.body.data).toHaveProperty('averageSoC');
      expect(response.body.data).toHaveProperty('averageSoH');
      expect(response.body.data).toHaveProperty('totalPower');
      expect(response.body.data).toHaveProperty('activeAlerts');
      
      expect(response.body.data.totalCapacity).toBeGreaterThan(0);
      expect(response.body.data.averageSoC).toBeGreaterThanOrEqual(0);
      expect(response.body.data.averageSoC).toBeLessThanOrEqual(100);
    });
  });

  describe('POST /api/v1/facilities/geocode', () => {
    it('should geocode an address', async () => {
      const mockResult = {
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA 94102, USA',
        city: 'San Francisco',
        country: 'United States',
      };

      vi.mocked(geocodingService.geocode).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/facilities/geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ address: '123 Main St, San Francisco, CA' })
        .expect(200);

      expect(response.body.data).toEqual(mockResult);
    });

    it('should return 400 if address is missing', async () => {
      await request(app)
        .post('/api/v1/facilities/geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should return 404 if address not found', async () => {
      vi.mocked(geocodingService.geocode).mockResolvedValue(null);

      await request(app)
        .post('/api/v1/facilities/geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ address: 'invalid address xyz123' })
        .expect(404);
    });
  });

  describe('POST /api/v1/facilities/reverse-geocode', () => {
    it('should reverse geocode coordinates', async () => {
      const mockResult = {
        address: '123 Main St, San Francisco, CA 94102, USA',
        city: 'San Francisco',
        country: 'United States',
      };

      vi.mocked(geocodingService.reverseGeocode).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/facilities/reverse-geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ latitude: 37.7749, longitude: -122.4194 })
        .expect(200);

      expect(response.body.data).toEqual(mockResult);
    });

    it('should return 400 if coordinates are missing', async () => {
      await request(app)
        .post('/api/v1/facilities/reverse-geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ latitude: 37.7749 })
        .expect(400);
    });

    it('should return 404 if location not found', async () => {
      vi.mocked(geocodingService.reverseGeocode).mockResolvedValue(null);

      await request(app)
        .post('/api/v1/facilities/reverse-geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ latitude: 999, longitude: 999 })
        .expect(404);
    });
  });

  describe('PATCH /api/v1/facilities/:id/geolocation', () => {
    beforeEach(async () => {
      // Ensure facility exists
      await pool.query(`
        INSERT INTO facilities (id, name, location, timezone, total_zones, status)
        VALUES ('fac-geo-001', 'Geo Test Facility', 'Test Location', 'UTC', 5, 'active')
        ON CONFLICT (id) DO NOTHING
      `);
    });

    afterAll(async () => {
      await pool.query('DELETE FROM facilities WHERE id = \'fac-geo-001\'');
    });

    it('should update facility geolocation', async () => {
      const response = await request(app)
        .patch('/api/v1/facilities/fac-geo-001/geolocation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Main St, San Francisco, CA',
          city: 'San Francisco',
          country: 'United States',
        })
        .expect(200);

      expect(response.body.data.latitude).toBe('37.7749');
      expect(response.body.data.longitude).toBe('-122.4194');
      expect(response.body.data.city).toBe('San Francisco');
      expect(response.body.data.country).toBe('United States');
    });

    it('should update partial geolocation fields', async () => {
      const response = await request(app)
        .patch('/api/v1/facilities/fac-geo-001/geolocation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          city: 'New York',
          country: 'USA',
        })
        .expect(200);

      expect(response.body.data.city).toBe('New York');
      expect(response.body.data.country).toBe('USA');
    });

    it('should return 400 if no fields provided', async () => {
      await request(app)
        .patch('/api/v1/facilities/fac-geo-001/geolocation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent facility', async () => {
      await request(app)
        .patch('/api/v1/facilities/non-existent/geolocation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ city: 'Test City' })
        .expect(404);
    });
  });
});
