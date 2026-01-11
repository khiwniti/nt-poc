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

describe('Facilities API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    authToken = generateToken();

    // Seed test data with coordinates
    await pool.query(`
      INSERT INTO facilities (id, name, location, latitude, longitude, timezone, total_zones, status)
      VALUES
        ('fac-001', 'Test Facility 1', '{"lat": 13.7563, "lng": 100.5018, "address": "Bangkok"}', 13.7563, 100.5018, 'Asia/Bangkok', 10, 'active'),
        ('fac-002', 'Test Facility 2', '{"lat": 13.5990, "lng": 100.5998, "address": "Samut Prakan"}', 13.5990, 100.5998, 'Asia/Bangkok', 5, 'active'),
        ('fac-003', 'Test Facility 3', '{"lat": 13.8621, "lng": 100.5144, "address": "Nonthaburi"}', 13.8621, 100.5144, 'Asia/Bangkok', 8, 'active')
      ON CONFLICT (id) DO NOTHING
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

  describe('GET /api/v1/facilities/nearby/:id', () => {
    it('should return nearest facilities with distances', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/nearby/fac-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('origin');
      expect(response.body.origin.id).toBe('fac-001');
      expect(response.body.origin).toHaveProperty('coordinates');
      expect(response.body).toHaveProperty('nearbyFacilities');
      expect(Array.isArray(response.body.nearbyFacilities)).toBe(true);
      expect(response.body.nearbyFacilities.length).toBeGreaterThan(0);

      const nearest = response.body.nearbyFacilities[0];
      expect(nearest).toHaveProperty('id');
      expect(nearest).toHaveProperty('name');
      expect(nearest).toHaveProperty('distance');
      expect(nearest.distance).toHaveProperty('km');
      expect(nearest.distance).toHaveProperty('formatted');
      expect(nearest).toHaveProperty('travelTime');
      expect(nearest.travelTime).toHaveProperty('minutes');
      expect(nearest.travelTime).toHaveProperty('formatted');
      expect(nearest).toHaveProperty('directionsUrl');
      expect(nearest.directionsUrl).toContain('google.com/maps');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/nearby/fac-001?limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.nearbyFacilities.length).toBe(1);
    });

    it('should filter by maxDistance', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/nearby/fac-001?maxDistance=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.nearbyFacilities.forEach((facility: any) => {
        expect(facility.distance.km).toBeLessThanOrEqual(10);
      });
    });

    it('should return distance matrix when requested', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/nearby/fac-001?includeMatrix=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('distanceMatrix');
      expect(Array.isArray(response.body.distanceMatrix)).toBe(true);
      expect(response.body.distanceMatrix.length).toBeGreaterThan(0);

      const matrixEntry = response.body.distanceMatrix[0];
      expect(matrixEntry).toHaveProperty('from');
      expect(matrixEntry).toHaveProperty('to');
      expect(matrixEntry).toHaveProperty('distance');
      expect(matrixEntry).toHaveProperty('travelTime');
      expect(matrixEntry.from).toHaveProperty('id');
      expect(matrixEntry.from).toHaveProperty('name');
      expect(matrixEntry.to).toHaveProperty('id');
      expect(matrixEntry.to).toHaveProperty('name');
    });

    it('should return 404 for non-existent facility', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/nearby/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Facility not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/facilities/nearby/fac-001')
        .expect(401);
    });

    it('should sort facilities by distance ascending', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/nearby/fac-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const distances = response.body.nearbyFacilities.map((f: any) => f.distance.km);

      // Verify distances are sorted ascending
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
      }
    });

    it('should include all required fields in response', async () => {
      const response = await request(app)
        .get('/api/v1/facilities/nearby/fac-001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('origin');
      expect(response.body).toHaveProperty('nearbyFacilities');
      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBe(response.body.nearbyFacilities.length);
    });
  });
});
