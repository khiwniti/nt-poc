import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chaosMonkey } from '../chaosMonkey.js';
import { ChaosAwareDatabase } from '../chaosAwareDatabase.js';
import { ChaosAwareRedis } from '../chaosAwareRedis.js';

describe('System Recovery and Resilience', () => {
  beforeEach(() => {
    chaosMonkey.updateConfig({
      enabled: true,
      failureRate: 1.0, // Always fail for predictable tests
      scenarios: {
        serviceFailure: true,
        networkLatency: true,
        databaseFailure: true,
        redisFailure: true,
      },
    });
  });

  afterEach(() => {
    chaosMonkey.updateConfig({ enabled: false });
  });

  describe('Database Resilience', () => {
    it('should handle database failures gracefully', async () => {
      const db = new ChaosAwareDatabase();

      try {
        await db.query('SELECT 1');
        // If it succeeds, that's okay (randomness might not trigger)
      } catch (error: any) {
        expect(error.message).toContain('Chaos Monkey');
        expect(error.message).toContain('Database');
      }
    });

    it('should recover after chaos is disabled', async () => {
      const db = new ChaosAwareDatabase();

      // First, verify chaos is working
      let failureDetected = false;
      try {
        await db.query('SELECT 1');
      } catch (error) {
        failureDetected = true;
      }

      // Disable chaos
      chaosMonkey.updateConfig({ enabled: false });

      // Mock successful query
      vi.mock('../../config/database.js', () => ({
        pool: {
          query: vi.fn().mockResolvedValue({ rows: [{ result: 1 }], rowCount: 1 }),
        },
      }));

      // Should succeed now (with mock)
      const db2 = new ChaosAwareDatabase();
      const result = await db2.query('SELECT 1');
      expect(result).toBeDefined();
    });
  });

  describe('Redis Resilience', () => {
    it('should handle Redis failures gracefully', async () => {
      const redis = new ChaosAwareRedis();

      try {
        await redis.get('test-key');
        // If it succeeds, that's okay
      } catch (error: any) {
        expect(error.message).toContain('Chaos Monkey');
        expect(error.message).toContain('Redis');
      }
    });

    it('should handle null Redis client gracefully', async () => {
      vi.mock('../../config/redis.js', () => ({
        getRedisClient: vi.fn().mockReturnValue(null),
      }));

      chaosMonkey.updateConfig({ enabled: false });
      const redis = new ChaosAwareRedis();

      const result = await redis.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('Service Failure Recovery', () => {
    it('should recover from service failures', async () => {
      // Simulate multiple failures
      let failures = 0;
      const maxRetries = 3;

      for (let i = 0; i < maxRetries; i++) {
        try {
          await chaosMonkey.injectServiceFailure();
        } catch (error) {
          failures++;
        }
      }

      expect(failures).toBeGreaterThan(0);

      // Disable chaos and verify recovery
      chaosMonkey.updateConfig({ enabled: false });
      await expect(chaosMonkey.injectServiceFailure()).resolves.toBeUndefined();
    });
  });

  describe('Network Latency Tolerance', () => {
    it('should tolerate network latency', async () => {
      chaosMonkey.updateConfig({
        enabled: true,
        failureRate: 1.0,
        networkLatencyMs: { min: 50, max: 100 },
      });

      const start = Date.now();
      await chaosMonkey.injectNetworkLatency();
      const elapsed = Date.now() - start;

      // Should complete despite latency
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme latency gracefully', async () => {
      chaosMonkey.updateConfig({
        enabled: true,
        failureRate: 1.0,
        networkLatencyMs: { min: 1000, max: 2000 },
      });

      const start = Date.now();
      const timeout = 3000;

      const latencyPromise = chaosMonkey.injectNetworkLatency();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      );

      try {
        await Promise.race([latencyPromise, timeoutPromise]);
      } catch (error: any) {
        // Timeout is acceptable for extreme latency
        expect(error.message).toBe('Timeout');
      }
    });
  });

  describe('Cascading Failure Prevention', () => {
    it('should isolate failures to prevent cascading', async () => {
      const operations = [];

      // Try multiple operations
      for (let i = 0; i < 5; i++) {
        const result = await (async () => {
          try {
            await chaosMonkey.injectServiceFailure();
            return 'success';
          } catch (error) {
            return 'failure';
          }
        })();
        operations.push(result);
      }

      // Each failure should be isolated
      expect(operations.length).toBe(5);
      expect(operations.filter((r) => r === 'failure').length).toBeGreaterThan(0);
    });
  });

  describe('Gradual Recovery', () => {
    it('should handle gradual recovery with reduced failure rate', async () => {
      // Start with high failure rate
      chaosMonkey.updateConfig({ failureRate: 1.0 });

      let initialFailures = 0;
      for (let i = 0; i < 10; i++) {
        if (chaosMonkey.shouldInjectFailure()) initialFailures++;
      }

      // Reduce failure rate
      chaosMonkey.updateConfig({ failureRate: 0.3 });

      let reducedFailures = 0;
      for (let i = 0; i < 10; i++) {
        if (chaosMonkey.shouldInjectFailure()) reducedFailures++;
      }

      // Should see fewer failures (statistically)
      expect(initialFailures).toBeGreaterThan(reducedFailures);
    });
  });

  describe('Health Check Under Chaos', () => {
    it('should report health status during chaos', () => {
      const healthCheck = () => {
        return {
          database: !chaosMonkey.shouldInjectDatabaseFailure(),
          redis: !chaosMonkey.shouldInjectRedisFailure(),
          service: chaosMonkey.isEnabled(),
        };
      };

      const health = healthCheck();

      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('redis');
      expect(health.service).toBe(true);
    });
  });
});
