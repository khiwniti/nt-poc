import logger from '../config/logger.js';

export interface ChaosConfig {
  enabled: boolean;
  failureRate: number; // 0.0 to 1.0
  scenarios: {
    serviceFailure: boolean;
    networkLatency: boolean;
    databaseFailure: boolean;
    redisFailure: boolean;
  };
  networkLatencyMs: {
    min: number;
    max: number;
  };
}

export class ChaosMonkey {
  private config: ChaosConfig;

  constructor(config: ChaosConfig) {
    this.config = config;
    if (this.config.enabled) {
      logger.info('chaos_monkey_enabled', {
        failureRate: this.config.failureRate,
        scenarios: this.config.scenarios,
      });
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  shouldInjectFailure(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < this.config.failureRate;
  }

  async injectServiceFailure(): Promise<void> {
    if (!this.config.enabled || !this.config.scenarios.serviceFailure) return;
    if (!this.shouldInjectFailure()) return;

    logger.warn('chaos_injected_service_failure');
    throw new Error('Chaos Monkey: Service failure simulated');
  }

  async injectNetworkLatency(): Promise<void> {
    if (!this.config.enabled || !this.config.scenarios.networkLatency) return;
    if (!this.shouldInjectFailure()) return;

    const delay = Math.floor(
      Math.random() * (this.config.networkLatencyMs.max - this.config.networkLatencyMs.min) +
        this.config.networkLatencyMs.min
    );

    logger.warn('chaos_injected_network_latency', { delayMs: delay });
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  shouldInjectDatabaseFailure(): boolean {
    if (!this.config.enabled || !this.config.scenarios.databaseFailure) return false;
    const shouldFail = this.shouldInjectFailure();
    if (shouldFail) {
      logger.warn('chaos_injected_database_failure');
    }
    return shouldFail;
  }

  shouldInjectRedisFailure(): boolean {
    if (!this.config.enabled || !this.config.scenarios.redisFailure) return false;
    const shouldFail = this.shouldInjectFailure();
    if (shouldFail) {
      logger.warn('chaos_injected_redis_failure');
    }
    return shouldFail;
  }

  updateConfig(config: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('chaos_monkey_config_updated', { config: this.config });
  }

  getConfig(): ChaosConfig {
    return { ...this.config };
  }
}

// Global chaos monkey instance
const chaosConfig: ChaosConfig = {
  enabled: process.env.CHAOS_ENABLED === 'true',
  failureRate: parseFloat(process.env.CHAOS_FAILURE_RATE || '0.1'),
  scenarios: {
    serviceFailure: process.env.CHAOS_SERVICE_FAILURE !== 'false',
    networkLatency: process.env.CHAOS_NETWORK_LATENCY !== 'false',
    databaseFailure: process.env.CHAOS_DATABASE_FAILURE !== 'false',
    redisFailure: process.env.CHAOS_REDIS_FAILURE !== 'false',
  },
  networkLatencyMs: {
    min: parseInt(process.env.CHAOS_LATENCY_MIN || '100'),
    max: parseInt(process.env.CHAOS_LATENCY_MAX || '3000'),
  },
};

export const chaosMonkey = new ChaosMonkey(chaosConfig);
