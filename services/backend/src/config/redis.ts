import IORedis, { type Redis as RedisInstance } from 'ioredis';
import logger from './logger.js';

// Handle both CJS and ESM exports
const Redis = (IORedis as any).default || IORedis;

export type RedisClient = RedisInstance;

let redisClient: RedisClient | null = null;

const getRedisUrl = (): string | null => {
  const url = process.env.REDIS_URL?.trim();
  return url ? url : null;
};

export const getRedisClient = (): RedisClient | null => {
  if (redisClient) return redisClient;

  const redisUrl = getRedisUrl();
  if (!redisUrl) return null;

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  if (redisClient) {
    redisClient.on('connect', () => logger.info('redis_connected'));
    redisClient.on('error', (error: Error) => logger.error('redis_error', { error }));
    redisClient.on('close', () => logger.warn('redis_connection_closed'));
  }

  return redisClient;
};
