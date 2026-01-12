// Redis is optional - if ioredis is not installed, features will be disabled
import logger from './logger.js';

// Type-only import to avoid runtime error if ioredis is not installed
export type RedisClient = any;

let redisClient: RedisClient | null = null;

const getRedisUrl = (): string | null => {
  const url = process.env.REDIS_URL?.trim();
  return url ? url : null;
};

export const getRedisClient = (): RedisClient | null => {
  if (redisClient) return redisClient;

  // Return null if ioredis is not installed or REDIS_URL is not set
  const redisUrl = getRedisUrl();
  if (!redisUrl) return null;

  try {
    // Dynamic require to handle optional dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisClient.on('connect', () => logger.info('redis_connected'));
    redisClient.on('error', (error: Error) => logger.error('redis_error', { error }));
    redisClient.on('close', () => logger.warn('redis_connection_closed'));

    return redisClient;
  } catch (error) {
    logger.warn('ioredis not available - Redis features disabled');
    return null;
  }
};

