import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import {
  geocodeAddress,
  reverseGeocode,
  getWeatherData,
  calculateDistance,
  getMapTileUrl,
} from '../geospatialService.js';
import * as mapCache from '../mapCache.js';

vi.mock('axios');
vi.mock('../mapCache');

describe('geospatialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAPBOX_ACCESS_TOKEN = 'test-mapbox-token';
    process.env.WEATHER_API_KEY = 'test-weather-key';
  });

  afterEach(() => {
    delete process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.WEATHER_API_KEY;
  });

  describe('geocodeAddress', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        address: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        placeName: 'New York, NY, USA',
        relevance: 1,
      };

      vi.mocked(mapCache.getCachedData).mockResolvedValue(cachedResult);

      const result = await geocodeAddress('New York');

      expect(result).toEqual(cachedResult);
      expect(mapCache.getCachedData).toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should fetch from Mapbox API when not cached', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          features: [
            {
              center: [-74.006, 40.7128],
              place_name: 'New York, NY, USA',
              relevance: 1,
            },
          ],
        },
      });

      const result = await geocodeAddress('New York');

      expect(result).toEqual({
        address: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        placeName: 'New York, NY, USA',
        relevance: 1,
      });
      expect(mapCache.setCachedData).toHaveBeenCalled();
    });

    it('should return null when Mapbox token is missing', async () => {
      delete process.env.MAPBOX_ACCESS_TOKEN;
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);

      const result = await geocodeAddress('New York');

      expect(result).toBeNull();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should return null when no results found', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: { features: [] },
      });

      const result = await geocodeAddress('NonexistentPlace');

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockRejectedValue(new Error('API error'));

      const result = await geocodeAddress('New York');

      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        address: 'New York, NY, USA',
        latitude: 40.7128,
        longitude: -74.006,
        placeName: 'New York, NY, USA',
        relevance: 1,
      };

      vi.mocked(mapCache.getCachedData).mockResolvedValue(cachedResult);

      const result = await reverseGeocode(40.7128, -74.006);

      expect(result).toEqual(cachedResult);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should fetch from Mapbox API when not cached', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          features: [
            {
              place_name: 'New York, NY, USA',
              relevance: 1,
            },
          ],
        },
      });

      const result = await reverseGeocode(40.7128, -74.006);

      expect(result).toEqual({
        address: 'New York, NY, USA',
        latitude: 40.7128,
        longitude: -74.006,
        placeName: 'New York, NY, USA',
        relevance: 1,
      });
      expect(mapCache.setCachedData).toHaveBeenCalled();
    });

    it('should return null when Mapbox token is missing', async () => {
      delete process.env.MAPBOX_ACCESS_TOKEN;
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);

      const result = await reverseGeocode(40.7128, -74.006);

      expect(result).toBeNull();
    });
  });

  describe('getWeatherData', () => {
    it('should return cached result if available', async () => {
      const cachedWeather = {
        temperature: 20,
        humidity: 65,
        windSpeed: 5,
        description: 'Clear sky',
        icon: '01d',
        timestamp: Date.now(),
      };

      vi.mocked(mapCache.getCachedData).mockResolvedValue(cachedWeather);

      const result = await getWeatherData(40.7128, -74.006);

      expect(result).toEqual(cachedWeather);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should fetch from weather API when not cached', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          main: {
            temp: 20,
            humidity: 65,
          },
          wind: {
            speed: 5,
          },
          weather: [
            {
              description: 'Clear sky',
              icon: '01d',
            },
          ],
        },
      });

      const result = await getWeatherData(40.7128, -74.006);

      expect(result).toMatchObject({
        temperature: 20,
        humidity: 65,
        windSpeed: 5,
        description: 'Clear sky',
        icon: '01d',
      });
      expect(result?.timestamp).toBeDefined();
      expect(mapCache.setCachedData).toHaveBeenCalled();
    });

    it('should return null when weather API key is missing', async () => {
      delete process.env.WEATHER_API_KEY;
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);

      const result = await getWeatherData(40.7128, -74.006);

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockRejectedValue(new Error('API error'));

      const result = await getWeatherData(40.7128, -74.006);

      expect(result).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    const from = { latitude: 40.7128, longitude: -74.006 };
    const to = { latitude: 34.0522, longitude: -118.2437 };

    it('should return cached result if available', async () => {
      const cachedDistance = {
        distanceKm: 3944,
        durationMinutes: 2520,
      };

      vi.mocked(mapCache.getCachedData).mockResolvedValue(cachedDistance);

      const result = await calculateDistance(from, to);

      expect(result).toEqual(cachedDistance);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should fetch from Mapbox Directions API when not cached', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          routes: [
            {
              distance: 3944000, // meters
              duration: 151200, // seconds
            },
          ],
        },
      });

      const result = await calculateDistance(from, to);

      expect(result).toEqual({
        distanceKm: 3944,
        durationMinutes: 2520,
      });
      expect(mapCache.setCachedData).toHaveBeenCalled();
    });

    it('should support different travel profiles', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          routes: [{ distance: 100000, duration: 6000 }],
        },
      });

      await calculateDistance(from, to, 'walking');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/walking/'),
        expect.any(Object)
      );
    });

    it('should return null when Mapbox token is missing', async () => {
      delete process.env.MAPBOX_ACCESS_TOKEN;
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);

      const result = await calculateDistance(from, to);

      expect(result).toBeNull();
    });

    it('should return null when no route found', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: { routes: [] },
      });

      const result = await calculateDistance(from, to);

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockRejectedValue(new Error('API error'));

      const result = await calculateDistance(from, to);

      expect(result).toBeNull();
    });
  });

  describe('getMapTileUrl', () => {
    it('should generate correct tile URL', () => {
      const url = getMapTileUrl(10, 150, 200, 'streets-v11');

      expect(url).toContain('mapbox.com');
      expect(url).toContain('/10/150/200');
      expect(url).toContain('streets-v11');
      expect(url).toContain('test-mapbox-token');
    });

    it('should use default style if not specified', () => {
      const url = getMapTileUrl(10, 150, 200);

      expect(url).toContain('streets-v11');
    });

    it('should return empty string when token is missing', () => {
      delete process.env.MAPBOX_ACCESS_TOKEN;

      const url = getMapTileUrl(10, 150, 200);

      expect(url).toBe('');
    });
  });
});
