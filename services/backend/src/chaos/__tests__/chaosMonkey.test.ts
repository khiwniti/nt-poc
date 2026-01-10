import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChaosMonkey, type ChaosConfig } from '../chaosMonkey.js';

describe('ChaosMonkey', () => {
  let config: ChaosConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      failureRate: 0.5,
      scenarios: {
        serviceFailure: true,
        networkLatency: true,
        databaseFailure: true,
        redisFailure: true,
      },
      networkLatencyMs: {
        min: 100,
        max: 500,
      },
    };
  });

  describe('isEnabled', () => {
    it('should return true when chaos is enabled', () => {
      const monkey = new ChaosMonkey(config);
      expect(monkey.isEnabled()).toBe(true);
    });

    it('should return false when chaos is disabled', () => {
      config.enabled = false;
      const monkey = new ChaosMonkey(config);
      expect(monkey.isEnabled()).toBe(false);
    });
  });

  describe('shouldInjectFailure', () => {
    it('should return false when chaos is disabled', () => {
      config.enabled = false;
      const monkey = new ChaosMonkey(config);
      expect(monkey.shouldInjectFailure()).toBe(false);
    });

    it('should respect failure rate', () => {
      config.failureRate = 1.0;
      const monkey = new ChaosMonkey(config);
      expect(monkey.shouldInjectFailure()).toBe(true);

      config.failureRate = 0.0;
      const monkey2 = new ChaosMonkey(config);
      expect(monkey2.shouldInjectFailure()).toBe(false);
    });
  });

  describe('injectServiceFailure', () => {
    it('should throw error when service failure is injected', async () => {
      config.failureRate = 1.0;
      const monkey = new ChaosMonkey(config);

      await expect(monkey.injectServiceFailure()).rejects.toThrow(
        'Chaos Monkey: Service failure simulated'
      );
    });

    it('should not throw when scenario is disabled', async () => {
      config.scenarios.serviceFailure = false;
      config.failureRate = 1.0;
      const monkey = new ChaosMonkey(config);

      await expect(monkey.injectServiceFailure()).resolves.toBeUndefined();
    });

    it('should not throw when failure rate is 0', async () => {
      config.failureRate = 0.0;
      const monkey = new ChaosMonkey(config);

      await expect(monkey.injectServiceFailure()).resolves.toBeUndefined();
    });
  });

  describe('injectNetworkLatency', () => {
    it('should introduce delay when latency is injected', async () => {
      config.failureRate = 1.0;
      config.networkLatencyMs = { min: 50, max: 100 };
      const monkey = new ChaosMonkey(config);

      const start = Date.now();
      await monkey.injectNetworkLatency();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(150);
    });

    it('should not delay when scenario is disabled', async () => {
      config.scenarios.networkLatency = false;
      config.failureRate = 1.0;
      const monkey = new ChaosMonkey(config);

      const start = Date.now();
      await monkey.injectNetworkLatency();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('shouldInjectDatabaseFailure', () => {
    it('should return true when database failure should be injected', () => {
      config.failureRate = 1.0;
      const monkey = new ChaosMonkey(config);

      expect(monkey.shouldInjectDatabaseFailure()).toBe(true);
    });

    it('should return false when scenario is disabled', () => {
      config.scenarios.databaseFailure = false;
      config.failureRate = 1.0;
      const monkey = new ChaosMonkey(config);

      expect(monkey.shouldInjectDatabaseFailure()).toBe(false);
    });
  });

  describe('shouldInjectRedisFailure', () => {
    it('should return true when redis failure should be injected', () => {
      config.failureRate = 1.0;
      const monkey = new ChaosMonkey(config);

      expect(monkey.shouldInjectRedisFailure()).toBe(true);
    });

    it('should return false when scenario is disabled', () => {
      config.scenarios.redisFailure = false;
      config.failureRate = 1.0;
      const monkey = new ChaosMonkey(config);

      expect(monkey.shouldInjectRedisFailure()).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const monkey = new ChaosMonkey(config);
      
      monkey.updateConfig({ enabled: false, failureRate: 0.2 });
      
      const newConfig = monkey.getConfig();
      expect(newConfig.enabled).toBe(false);
      expect(newConfig.failureRate).toBe(0.2);
    });

    it('should partially update configuration', () => {
      const monkey = new ChaosMonkey(config);
      
      monkey.updateConfig({ failureRate: 0.8 });
      
      const newConfig = monkey.getConfig();
      expect(newConfig.enabled).toBe(true); // unchanged
      expect(newConfig.failureRate).toBe(0.8);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const monkey = new ChaosMonkey(config);
      
      const retrievedConfig = monkey.getConfig();
      
      expect(retrievedConfig).toEqual(config);
      expect(retrievedConfig).not.toBe(config); // should be a copy
    });
  });
});
