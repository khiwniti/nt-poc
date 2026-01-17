import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildCacheKey,
  getCachedData,
  setCachedData,
  invalidateMapCache,
  getMapCacheStats,
} from '../mapCache.js';
import * as redis from '../../config/redis.js';

vi.mock('../../config/redis');

describe('mapCache', () => {
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      connect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      set: vi.fn(),
      scan: vi.fn(),
      del: vi.fn(),
    };
  });

  describe('buildCacheKey', () => {
    it('should generate consistent cache keys for same input', () => {
      const input = { address: 'New York' };
      const key1 = buildCacheKey('geocoding', input);
      const key2 = buildCacheKey('geocoding', input);
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^geocoding:/);
    });

    it('should generate different keys for different cache types', () => {
      const input = { lat: 40.7, lon: -74.0 };
      const geocodingKey = buildCacheKey('geocoding', input);
      const weatherKey = buildCacheKey('weather', input);
      expect(geocodingKey).not.toBe(weatherKey);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = buildCacheKey('geocoding', { address: 'New York' });
      const key2 = buildCacheKey('geocoding', { address: 'Boston' });
      expect(key1).not.toBe(key2);
    });
  });

  describe('getCachedData', () => {
    it('should return null when redis is not available', async () => {
      vi.mocked(redis.getRedisClient).mockReturnValue(null);

      const result = await getCachedData('geocoding', 'test-key');
      expect(result).toBeNull();
    });

    it('should return cached data when available', async () => {
      const cachedData = { latitude: 40.7, longitude: -74.0 };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      const result = await getCachedData('geocoding', 'test-key');
      expect(result).toEqual(cachedData);
      expect(mockRedis.connect).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when cache key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      const result = await getCachedData('geocoding', 'test-key');
      expect(result).toBeNull();
    });

    it('should handle redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      const result = await getCachedData('geocoding', 'test-key');
      expect(result).toBeNull();
    });
  });

  describe('setCachedData', () => {
    it('should not set cache when redis is not available', async () => {
      vi.mocked(redis.getRedisClient).mockReturnValue(null);

      await setCachedData('geocoding', 'test-key', { data: 'test' });
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should set cache with default TTL', async () => {
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);
      const data = { latitude: 40.7 };

      await setCachedData('geocoding', 'test-key', data);

      expect(mockRedis.connect).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data),
        'EX',
        24 * 60 * 60 // 24 hours for geocoding
      );
    });

    it('should set cache with custom TTL', async () => {
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);
      const data = { temperature: 25 };
      const customTTL = 600; // 10 minutes

      await setCachedData('weather', 'test-key', data, customTTL);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(data), 'EX', customTTL);
    });

    it('should use correct TTL for different cache types', async () => {
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      await setCachedData('tile', 'tile-key', { data: 'tile' });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'tile-key',
        JSON.stringify({ data: 'tile' }),
        'EX',
        7 * 24 * 60 * 60 // 7 days
      );

      await setCachedData('weather', 'weather-key', { data: 'weather' });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'weather-key',
        JSON.stringify({ data: 'weather' }),
        'EX',
        60 * 60 // 1 hour
      );
    });

    it('should handle redis errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      await expect(setCachedData('geocoding', 'test-key', { data: 'test' })).resolves.not.toThrow();
    });
  });

  describe('invalidateMapCache', () => {
    it('should return 0 when redis is not available', async () => {
      vi.mocked(redis.getRedisClient).mockReturnValue(null);

      const result = await invalidateMapCache();
      expect(result).toBe(0);
    });

    it('should invalidate all map cache when no type specified', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', ['key1', 'key2']]);
      mockRedis.del.mockResolvedValue(2);
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      const result = await invalidateMapCache();

      expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'map-*', 'COUNT', '250');
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
      expect(result).toBe(2);
    });

    it('should invalidate specific cache type', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', ['geocoding:key1']]);
      mockRedis.del.mockResolvedValue(1);
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      const result = await invalidateMapCache('geocoding');

      expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'geocoding:*', 'COUNT', '250');
      expect(result).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['123', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);
      mockRedis.del.mockResolvedValue(1);
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      const result = await invalidateMapCache('weather');

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
      expect(result).toBe(2);
    });

    it('should handle redis errors gracefully', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Redis error'));
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);

      const result = await invalidateMapCache();
      expect(result).toBe(0);
    });
  });

  describe('getMapCacheStats', () => {
    it('should return initial stats', () => {
      const stats = getMapCacheStats();
      expect(stats).toHaveProperty('backend');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should calculate hit rate correctly', async () => {
      vi.mocked(redis.getRedisClient).mockReturnValue(mockRedis);
      mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'test' }));

      // Generate some hits
      await getCachedData('geocoding', 'key1');
      await getCachedData('geocoding', 'key2');

      // Generate a miss
      mockRedis.get.mockResolvedValue(null);
      await getCachedData('geocoding', 'key3');

      const stats = getMapCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThan(1);
    });
  });
});
