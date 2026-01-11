import logger from './logger.js';

// Redis is optional - stub if not available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RedisClient = any;

let redisClient: RedisClient | null = null;

const getRedisUrl = (): string | null => {
  const url = process.env.REDIS_URL?.trim();
  return url ? url : null;
};

export const getRedisClient = (): RedisClient | null => {
  // Redis is optional and not installed - caching disabled
  logger.info('Redis not available - caching disabled');
  return null;
};

