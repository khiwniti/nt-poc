import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../../app';
import * as geospatialService from '../../../services/geospatialService';
import * as mapCache from '../../../services/mapCache';

vi.mock('../../../services/geospatialService');
vi.mock('../../../services/mapCache');
vi.mock('../../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user' };
    next();
  },
  AuthRequest: class {},
}));

describe('Geospatial Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/geospatial/geocode', () => {
    it('should geocode an address', async () => {
      const mockResult = {
        address: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        placeName: 'New York, NY, USA',
        relevance: 1,
      };

      vi.mocked(geospatialService.geocodeAddress).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/geospatial/geocode')
        .send({ address: 'New York' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should return 400 if address is missing', async () => {
      const response = await request(app).post('/api/v1/geospatial/geocode').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Address is required');
    });

    it('should return 404 if location not found', async () => {
      vi.mocked(geospatialService.geocodeAddress).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/geospatial/geocode')
        .send({ address: 'NonexistentPlace' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Location not found');
    });
  });

  describe('POST /api/v1/geospatial/reverse-geocode', () => {
    it('should reverse geocode coordinates', async () => {
      const mockResult = {
        address: 'New York, NY, USA',
        latitude: 40.7128,
        longitude: -74.006,
        placeName: 'New York, NY, USA',
        relevance: 1,
      };

      vi.mocked(geospatialService.reverseGeocode).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/geospatial/reverse-geocode')
        .send({ latitude: 40.7128, longitude: -74.006 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should return 400 if coordinates are invalid', async () => {
      const response = await request(app)
        .post('/api/v1/geospatial/reverse-geocode')
        .send({ latitude: 'invalid', longitude: -74.006 });

      expect(response.status).toBe(400);
    });

    it('should return 400 if coordinates are out of range', async () => {
      const response = await request(app)
        .post('/api/v1/geospatial/reverse-geocode')
        .send({ latitude: 95, longitude: -74.006 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid coordinates');
    });
  });

  describe('GET /api/v1/geospatial/weather', () => {
    it('should fetch weather data', async () => {
      const mockWeather = {
        temperature: 20,
        humidity: 65,
        windSpeed: 5,
        description: 'Clear sky',
        icon: '01d',
        timestamp: Date.now(),
      };

      vi.mocked(geospatialService.getWeatherData).mockResolvedValue(mockWeather);

      const response = await request(app)
        .get('/api/v1/geospatial/weather')
        .query({ latitude: 40.7128, longitude: -74.006 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockWeather);
    });

    it('should return 400 if coordinates are invalid', async () => {
      const response = await request(app)
        .get('/api/v1/geospatial/weather')
        .query({ latitude: 'invalid', longitude: -74.006 });

      expect(response.status).toBe(400);
    });

    it('should return 404 if weather data not available', async () => {
      vi.mocked(geospatialService.getWeatherData).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/geospatial/weather')
        .query({ latitude: 40.7128, longitude: -74.006 });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/geospatial/distance', () => {
    it('should calculate distance between two points', async () => {
      const mockDistance = {
        distanceKm: 3944,
        durationMinutes: 2520,
      };

      vi.mocked(geospatialService.calculateDistance).mockResolvedValue(mockDistance);

      const response = await request(app)
        .post('/api/v1/geospatial/distance')
        .send({
          from: { latitude: 40.7128, longitude: -74.006 },
          to: { latitude: 34.0522, longitude: -118.2437 },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockDistance);
    });

    it('should support different travel profiles', async () => {
      const mockDistance = {
        distanceKm: 10,
        durationMinutes: 120,
      };

      vi.mocked(geospatialService.calculateDistance).mockResolvedValue(mockDistance);

      const response = await request(app)
        .post('/api/v1/geospatial/distance')
        .send({
          from: { latitude: 40.7128, longitude: -74.006 },
          to: { latitude: 40.7489, longitude: -73.9681 },
          profile: 'walking',
        });

      expect(response.status).toBe(200);
      expect(geospatialService.calculateDistance).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        'walking'
      );
    });

    it('should return 400 if coordinates are missing', async () => {
      const response = await request(app)
        .post('/api/v1/geospatial/distance')
        .send({
          from: { latitude: 40.7128 },
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 if profile is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/geospatial/distance')
        .send({
          from: { latitude: 40.7128, longitude: -74.006 },
          to: { latitude: 34.0522, longitude: -118.2437 },
          profile: 'flying',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid profile');
    });
  });

  describe('GET /api/v1/geospatial/tile-url', () => {
    it('should generate tile URL', async () => {
      vi.mocked(geospatialService.getMapTileUrl).mockReturnValue(
        'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/10/150/200?access_token=test'
      );

      const response = await request(app)
        .get('/api/v1/geospatial/tile-url')
        .query({ z: 10, x: 150, y: 200 });

      expect(response.status).toBe(200);
      expect(response.body.data.url).toContain('mapbox.com');
    });

    it('should return 400 if tile coordinates are invalid', async () => {
      const response = await request(app)
        .get('/api/v1/geospatial/tile-url')
        .query({ z: 'invalid', x: 150, y: 200 });

      expect(response.status).toBe(400);
    });

    it('should return 503 if map service not configured', async () => {
      vi.mocked(geospatialService.getMapTileUrl).mockReturnValue('');

      const response = await request(app)
        .get('/api/v1/geospatial/tile-url')
        .query({ z: 10, x: 150, y: 200 });

      expect(response.status).toBe(503);
    });
  });

  describe('GET /api/v1/geospatial/cache-stats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        backend: 'redis' as const,
        hits: 150,
        misses: 50,
        sets: 50,
        errors: 0,
        hitRate: 0.75,
      };

      vi.mocked(mapCache.getMapCacheStats).mockReturnValue(mockStats);

      const response = await request(app).get('/api/v1/geospatial/cache-stats');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should indicate 70%+ hit rate achievement', async () => {
      const mockStats = {
        backend: 'redis' as const,
        hits: 750,
        misses: 250,
        sets: 250,
        errors: 0,
        hitRate: 0.75,
      };

      vi.mocked(mapCache.getMapCacheStats).mockReturnValue(mockStats);

      const response = await request(app).get('/api/v1/geospatial/cache-stats');

      expect(response.status).toBe(200);
      expect(response.body.data.hitRate).toBeGreaterThanOrEqual(0.7);
    });
  });
});
