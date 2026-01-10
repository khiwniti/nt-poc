import { getRedisClient, type RedisClient } from '../config/redis.js';
import { chaosMonkey } from '../chaos/chaosMonkey.js';

export class ChaosAwareRedis {
  private client: RedisClient | null;

  constructor() {
    this.client = getRedisClient();
  }

  getClient(): RedisClient | null {
    if (chaosMonkey.shouldInjectRedisFailure()) {
      throw new Error('Chaos Monkey: Redis unavailability simulated');
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    if (!client) return null;
    return client.get(key);
  }

  async set(key: string, value: string, expiryMode?: string, time?: number): Promise<'OK' | null> {
    const client = this.getClient();
    if (!client) return null;
    if (expiryMode && time) {
      return client.set(key, value, expiryMode, time);
    }
    return client.set(key, value);
  }

  async del(key: string): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;
    return client.del(key);
  }

  async exists(key: string): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;
    return client.exists(key);
  }
}

export const chaosAwareRedis = new ChaosAwareRedis();
