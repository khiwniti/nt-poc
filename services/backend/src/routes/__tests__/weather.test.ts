import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database.js';
import jwt from 'jsonwebtoken';

vi.mock('../../services/weatherService', () => ({
  weatherService: {
    getCurrentWeather: vi.fn().mockResolvedValue({
      temperature: 28,
      humidity: 65,
      windSpeed: 12,
      conditions: 'Clear',
      timestamp: new Date(),
    }),
    getWeatherForecast: vi.fn().mockResolvedValue([
      {
        date: new Date(),
        temperature: { min: 25, max: 32 },
        humidity: 60,
        conditions: 'Sunny',
        precipitation: 0,
      },
    ]),
    getHistoricalWeather: vi.fn().mockResolvedValue([
      {
        timestamp: new Date(),
        temperature: 27,
        humidity: 70,
        conditions: 'Partly Cloudy',
      },
    ]),
  },
}));

const generateToken = () => {
  return jwt.sign({ userId: 'user-123', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
};

describe('Weather API Integration Tests', () => {
  let authToken: string;
  let facilityId: string;

  beforeAll(async () => {
    authToken = generateToken();

    const result = await pool.query(`
      INSERT INTO facilities (id, name, location, timezone, total_zones, status)
      VALUES ('weather-test-fac', 'Weather Test Facility', '{"lat": 13.7563, "lng": 100.5018, "address": "Bangkok"}', 'Asia/Bangkok', 1, 'active')
      RETURNING id
    `);
    facilityId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM facilities WHERE id = $1', [facilityId]);
  });

  describe('GET /api/v1/weather/current', () => {
    it('should return current weather for facility', async () => {
      const response = await request(app)
        .get('/api/v1/weather/current')
        .query({ facility_id: facilityId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.temperature).toBeDefined();
      expect(response.body.data.humidity).toBeDefined();
      expect(response.body.data.conditions).toBeDefined();
    });

    it('should return current weather by coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/weather/current')
        .query({ lat: 13.7563, lng: 100.5018 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.temperature).toBeDefined();
      expect(response.body.data.humidity).toBeDefined();
    });

    it('should require facility_id or coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/weather/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/weather/current')
        .query({ facility_id: facilityId })
        .expect(401);
    });
  });

  describe('GET /api/v1/weather/forecast', () => {
    it('should return weather forecast for facility', async () => {
      const response = await request(app)
        .get('/api/v1/weather/forecast')
        .query({ facility_id: facilityId, days: 7 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].date).toBeDefined();
      expect(response.body.data[0].temperature).toBeDefined();
    });

    it('should return forecast by coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/weather/forecast')
        .query({ lat: 13.7563, lng: 100.5018, days: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should validate days parameter', async () => {
      const response = await request(app)
        .get('/api/v1/weather/forecast')
        .query({ facility_id: facilityId, days: 20 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should default to 7 days if not specified', async () => {
      const response = await request(app)
        .get('/api/v1/weather/forecast')
        .query({ facility_id: facilityId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/weather/forecast')
        .query({ facility_id: facilityId })
        .expect(401);
    });
  });

  describe('GET /api/v1/weather/historical', () => {
    it('should return historical weather data', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/v1/weather/historical')
        .query({
          facility_id: facilityId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should require date range', async () => {
      const response = await request(app)
        .get('/api/v1/weather/historical')
        .query({ facility_id: facilityId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate date range', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 10);

      const response = await request(app)
        .get('/api/v1/weather/historical')
        .query({
          facility_id: facilityId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should limit historical range to 90 days', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 100);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/v1/weather/historical')
        .query({
          facility_id: facilityId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('90 days');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/weather/historical')
        .query({
          facility_id: facilityId,
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/weather/impact', () => {
    it('should return weather impact on battery performance', async () => {
      const response = await request(app)
        .get('/api/v1/weather/impact')
        .query({ facility_id: facilityId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.temperature_impact).toBeDefined();
      expect(response.body.data.recommendations).toBeInstanceOf(Array);
    });

    it('should include severity levels', async () => {
      const response = await request(app)
        .get('/api/v1/weather/impact')
        .query({ facility_id: facilityId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.severity).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(response.body.data.severity);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/weather/impact')
        .query({ facility_id: facilityId })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid facility_id', async () => {
      const response = await request(app)
        .get('/api/v1/weather/current')
        .query({ facility_id: 'invalid-id' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should handle invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/weather/current')
        .query({ lat: 'invalid', lng: 100 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle weather service errors', async () => {
      const { weatherService } = await import('../../services/weatherService');
      vi.mocked(weatherService.getCurrentWeather).mockRejectedValueOnce(
        new Error('Weather service unavailable')
      );

      const response = await request(app)
        .get('/api/v1/weather/current')
        .query({ facility_id: facilityId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
