import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChaosAwareRedis } from '../chaosAwareRedis.js';
import { chaosMonkey } from '../chaosMonkey.js';

vi.mock('../chaosMonkey.js', () => ({
  chaosMonkey: {
    shouldInjectRedisFailure: vi.fn(),
  },
}));

vi.mock('../../config/redis.js', () => ({
  getRedisClient: vi.fn(),
}));

describe('ChaosAwareRedis', () => {
  let redis: ChaosAwareRedis;
  const mockRedisClient = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const { getRedisClient } = require('../../config/redis.js');
    getRedisClient.mockReturnValue(mockRedisClient);
    redis = new ChaosAwareRedis();
  });

  describe('get', () => {
    it('should get value when no chaos is injected', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(false);
      mockRedisClient.get.mockResolvedValue('test-value');

      const result = await redis.get('test-key');

      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should throw error when Redis failure is injected', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(true);

      await expect(redis.get('test-key')).rejects.toThrow(
        'Chaos Monkey: Redis unavailability simulated'
      );

      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return null when Redis client is unavailable', async () => {
      const { getRedisClient } = require('../../config/redis.js');
      getRedisClient.mockReturnValue(null);
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(false);

      const redis2 = new ChaosAwareRedis();
      const result = await redis2.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value when no chaos is injected', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(false);
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await redis.set('test-key', 'test-value');

      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should set value with expiry', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(false);
      mockRedisClient.set.mockResolvedValue('OK');

      await redis.set('test-key', 'test-value', 'EX', 3600);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 3600);
    });

    it('should throw error when Redis failure is injected', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(true);

      await expect(redis.set('test-key', 'test-value')).rejects.toThrow(
        'Chaos Monkey: Redis unavailability simulated'
      );
    });
  });

  describe('del', () => {
    it('should delete key when no chaos is injected', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(false);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await redis.del('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should throw error when Redis failure is injected', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(true);

      await expect(redis.del('test-key')).rejects.toThrow(
        'Chaos Monkey: Redis unavailability simulated'
      );
    });
  });

  describe('exists', () => {
    it('should check existence when no chaos is injected', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(false);
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await redis.exists('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('should throw error when Redis failure is injected', async () => {
      vi.mocked(chaosMonkey.shouldInjectRedisFailure).mockReturnValue(true);

      await expect(redis.exists('test-key')).rejects.toThrow(
        'Chaos Monkey: Redis unavailability simulated'
      );
    });
  });
});
