import crypto from 'node:crypto';
import { getRedisClient } from '../config/redis';
import {
  mapCacheHitsTotal,
  mapCacheMissesTotal,
  mapCacheSetsTotal,
  mapCacheErrorsTotal,
  mapCacheHitRate,
} from '../config/metrics';

type CacheBackend = 'redis' | 'disabled';

type MapCacheType = 'tile' | 'geocoding' | 'weather' | 'distance' | 'weather_current' | 'weather_forecast' | 'weather_historical';

type CacheLabels = {
  cache_type: MapCacheType;
};

type CacheStats = {
  backend: CacheBackend;
  hits: number;
  misses: number;
  sets: number;
  errors: number;
};

const CACHE_KEY_PREFIXES: Record<MapCacheType, string> = {
  tile: 'map-tile:',
  geocoding: 'geocoding:',
  weather: 'weather:',
  distance: 'distance:',
  weather_current: 'weather:current:',
  weather_forecast: 'weather:forecast:',
  weather_historical: 'weather:historical:',
};

const CACHE_TTL_SECONDS: Record<MapCacheType, number> = {
  tile: 7 * 24 * 60 * 60, // 7 days for map tiles
  geocoding: 24 * 60 * 60, // 24 hours for geocoding
  weather: 60 * 60, // 1 hour for weather
  distance: 7 * 24 * 60 * 60, // 7 days for distance calculations
  weather_current: 60 * 60, // 1 hour for current weather
  weather_forecast: 3 * 60 * 60, // 3 hours for forecast
  weather_historical: 24 * 60 * 60, // 24 hours for historical
};

const stats: CacheStats = {
  backend: 'disabled',
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0,
};

const localLabelCounts = new Map<string, { hits: number; misses: number }>();

const labelsKey = (labels: CacheLabels): string => labels.cache_type;

const updateHitRateGauge = (labels: CacheLabels): void => {
  const counts = localLabelCounts.get(labelsKey(labels));
  if (!counts) return;
  const total = counts.hits + counts.misses;
  mapCacheHitRate.set(labels, total > 0 ? counts.hits / total : 0);
};

const recordHit = (labels: CacheLabels): void => {
  stats.hits += 1;
  mapCacheHitsTotal.inc(labels, 1);

  const key = labelsKey(labels);
  const existing = localLabelCounts.get(key) || { hits: 0, misses: 0 };
  existing.hits += 1;
  localLabelCounts.set(key, existing);
  updateHitRateGauge(labels);
};

const recordMiss = (labels: CacheLabels): void => {
  stats.misses += 1;
  mapCacheMissesTotal.inc(labels, 1);

  const key = labelsKey(labels);
  const existing = localLabelCounts.get(key) || { hits: 0, misses: 0 };
  existing.misses += 1;
  localLabelCounts.set(key, existing);
  updateHitRateGauge(labels);
};

const recordSet = (labels: CacheLabels): void => {
  stats.sets += 1;
  mapCacheSetsTotal.inc(labels, 1);
};

const recordError = (labels: CacheLabels): void => {
  stats.errors += 1;
  mapCacheErrorsTotal.inc(labels, 1);
};

export const buildCacheKey = (cacheType: MapCacheType, input: unknown): string => {
  const hash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
  return `${CACHE_KEY_PREFIXES[cacheType]}${hash}`;
};

const resolveBackend = (): CacheBackend => {
  const redis = getRedisClient();
  if (redis) return 'redis';
  return 'disabled';
};

export const getCachedData = async <T>(
  cacheType: MapCacheType,
  cacheKey: string
): Promise<T | null> => {
  const labels: CacheLabels = { cache_type: cacheType };
  const redis = getRedisClient();

  stats.backend = resolveBackend();
  if (!redis) {
    recordMiss(labels);
    return null;
  }

  try {
    await redis.connect();
    const value = await redis.get(cacheKey);
    if (value === null) {
      recordMiss(labels);
      return null;
    }
    recordHit(labels);
    return JSON.parse(value) as T;
  } catch {
    recordError(labels);
    recordMiss(labels);
    return null;
  }
};

export const setCachedData = async <T>(
  cacheType: MapCacheType,
  cacheKey: string,
  value: T,
  customTTL?: number
): Promise<void> => {
  const labels: CacheLabels = { cache_type: cacheType };
  const redis = getRedisClient();

  stats.backend = resolveBackend();
  if (!redis) return;

  const ttlSeconds = customTTL ?? CACHE_TTL_SECONDS[cacheType];

  try {
    await redis.connect();
    await redis.set(cacheKey, JSON.stringify(value), 'EX', ttlSeconds);
    recordSet(labels);
  } catch {
    recordError(labels);
  }
};

export const invalidateMapCache = async (cacheType?: MapCacheType): Promise<number> => {
  const redis = getRedisClient();
  stats.backend = resolveBackend();
  if (!redis) return 0;

  const match = cacheType ? `${CACHE_KEY_PREFIXES[cacheType]}*` : 'map-*';

  let deleted = 0;
  try {
    await redis.connect();

    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', '250');
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await redis.del(...keys);
      }
    } while (cursor !== '0');

    return deleted;
  } catch {
    return 0;
  }
};

export const getMapCacheStats = (): CacheStats & { hitRate: number } => {
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    hitRate: total > 0 ? stats.hits / total : 0,
  };
};
