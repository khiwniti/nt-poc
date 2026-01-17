import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  getCurrentWeather,
  getWeatherForecast,
  getHistoricalWeather,
} from '../weatherService.js';
import * as mapCache from '../mapCache.js';

vi.mock('axios');
vi.mock('../mapCache.js');
vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('weatherService', () => {
  const mockWeatherApiKey = 'test-api-key';

  beforeEach(() => {
    process.env.WEATHER_API_KEY = mockWeatherApiKey;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.WEATHER_API_KEY;
  });

  describe('getCurrentWeather', () => {
    it('should return current weather data', async () => {
      const latitude = 40.7128;
      const longitude = -74.006;

      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          main: {
            temp: 20,
            feels_like: 18,
            humidity: 65,
            pressure: 1013,
          },
          wind: {
            speed: 5.5,
            deg: 180,
          },
          weather: [
            {
              description: 'clear sky',
              icon: '01d',
            },
          ],
        },
      });

      const result = await getCurrentWeather(latitude, longitude);

      expect(result).toBeDefined();
      expect(result?.temperature).toBe(20);
      expect(result?.humidity).toBe(65);
      expect(result?.windSpeed).toBe(5.5);
      expect(result?.description).toBe('clear sky');
      expect(result?.icon).toBe('01d');
    });

    it('should return cached weather data', async () => {
      const cachedWeather = {
        temperature: 22,
        feelsLike: 20,
        humidity: 70,
        pressure: 1015,
        windSpeed: 4,
        windDirection: 90,
        description: 'cloudy',
        icon: '02d',
        timestamp: Date.now(),
      };

      vi.mocked(mapCache.getCachedData).mockResolvedValue(cachedWeather);

      const result = await getCurrentWeather(40.7128, -74.006);

      expect(result).toEqual(cachedWeather);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should generate extreme heat alerts', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          main: {
            temp: 42,
            feels_like: 45,
            humidity: 30,
            pressure: 1010,
          },
          wind: {
            speed: 2,
            deg: 270,
          },
          weather: [
            {
              description: 'very hot',
              icon: '01d',
            },
          ],
        },
      });

      const result = await getCurrentWeather(40.7128, -74.006);

      expect(result?.alerts).toBeDefined();
      expect(result?.alerts?.length).toBeGreaterThan(0);
      expect(result?.alerts?.[0].severity).toBe('extreme');
      expect(result?.alerts?.[0].type).toBe('heat');
    });

    it('should generate extreme cold alerts', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          main: {
            temp: -25,
            feels_like: -30,
            humidity: 80,
            pressure: 1020,
          },
          wind: {
            speed: 8,
            deg: 0,
          },
          weather: [
            {
              description: 'very cold',
              icon: '13d',
            },
          ],
        },
      });

      const result = await getCurrentWeather(40.7128, -74.006);

      expect(result?.alerts).toBeDefined();
      expect(result?.alerts?.length).toBeGreaterThan(0);
      expect(result?.alerts?.[0].severity).toBe('extreme');
      expect(result?.alerts?.[0].type).toBe('cold');
    });

    it('should return null when API key is missing', async () => {
      delete process.env.WEATHER_API_KEY;
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);

      const result = await getCurrentWeather(40.7128, -74.006);

      expect(result).toBeNull();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockRejectedValue(new Error('API error'));

      const result = await getCurrentWeather(40.7128, -74.006);

      expect(result).toBeNull();
    });
  });

  describe('getWeatherForecast', () => {
    it('should return 7-day forecast', async () => {
      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              temp: {
                min: 15,
                max: 25,
                day: 20,
                night: 17,
              },
              humidity: 60,
              speed: 5,
              weather: [
                {
                  description: 'partly cloudy',
                  icon: '02d',
                },
              ],
              pop: 0.2,
            },
          ],
        },
      });

      const result = await getWeatherForecast(40.7128, -74.006);

      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result?.[0].temperature.min).toBe(15);
      expect(result?.[0].temperature.max).toBe(25);
    });

    it('should return cached forecast', async () => {
      const cachedForecast = [
        {
          date: '2024-01-15',
          temperature: { min: 10, max: 20, day: 15, night: 12 },
          humidity: 65,
          windSpeed: 4,
          description: 'sunny',
          icon: '01d',
          pop: 0.1,
        },
      ];

      vi.mocked(mapCache.getCachedData).mockResolvedValue(cachedForecast);

      const result = await getWeatherForecast(40.7128, -74.006);

      expect(result).toEqual(cachedForecast);
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe('getHistoricalWeather', () => {
    it('should return historical weather data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      vi.mocked(mapCache.getCachedData).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          current: {
            temp: 18,
            humidity: 70,
            weather: [
              {
                description: 'cloudy',
              },
            ],
          },
        },
      });

      const result = await getHistoricalWeather(40.7128, -74.006, startDate, endDate);

      expect(result).toBeDefined();
      expect(result?.length).toBeGreaterThan(0);
    });

    it('should return cached historical data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      const cachedData = [
        {
          date: '2024-01-01',
          temperature: 18,
          humidity: 70,
          description: 'cloudy',
        },
      ];

      vi.mocked(mapCache.getCachedData).mockResolvedValue(cachedData);

      const result = await getHistoricalWeather(40.7128, -74.006, startDate, endDate);

      expect(result).toEqual(cachedData);
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});
