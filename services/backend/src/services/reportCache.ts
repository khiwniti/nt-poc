import crypto from 'node:crypto';
import { getRedisClient } from '../config/redis';
import {
  reportCacheErrorsTotal,
  reportCacheHitsTotal,
  reportCacheHitRate,
  reportCacheMissesTotal,
  reportCacheSetsTotal,
} from '../config/metrics.js';

type CacheBackend = 'redis' | 'disabled';

type CacheLabels = {
  report_type: string;
  format: string;
};

type CacheStats = {
  backend: CacheBackend;
  hits: number;
  misses: number;
  sets: number;
  errors: number;
};

const CACHE_KEY_PREFIX = 'report-cache:';
const STATIC_REPORT_TTL_SECONDS = 60 * 60;

const stats: CacheStats = {
  backend: 'disabled',
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0,
};

const localLabelCounts = new Map<string, { hits: number; misses: number }>();

const labelsKey = (labels: CacheLabels): string => `${labels.report_type}::${labels.format}`;

const updateHitRateGauge = (labels: CacheLabels): void => {
  const counts = localLabelCounts.get(labelsKey(labels));
  if (!counts) return;
  const total = counts.hits + counts.misses;
  reportCacheHitRate.set(labels, total > 0 ? counts.hits / total : 0);
};

const recordHit = (labels: CacheLabels): void => {
  stats.hits += 1;
  reportCacheHitsTotal.inc(labels, 1);

  const key = labelsKey(labels);
  const existing = localLabelCounts.get(key) || { hits: 0, misses: 0 };
  existing.hits += 1;
  localLabelCounts.set(key, existing);
  updateHitRateGauge(labels);
};

const recordMiss = (labels: CacheLabels): void => {
  stats.misses += 1;
  reportCacheMissesTotal.inc(labels, 1);

  const key = labelsKey(labels);
  const existing = localLabelCounts.get(key) || { hits: 0, misses: 0 };
  existing.misses += 1;
  localLabelCounts.set(key, existing);
  updateHitRateGauge(labels);
};

const recordSet = (labels: CacheLabels): void => {
  stats.sets += 1;
  reportCacheSetsTotal.inc(labels, 1);
};

const recordError = (labels: CacheLabels): void => {
  stats.errors += 1;
  reportCacheErrorsTotal.inc(labels, 1);
};

export const getReportCacheKey = (reportId: string, format: string): string => {
  return `${CACHE_KEY_PREFIX}${reportId}:${format}`;
};

export const buildReportIdHash = (input: unknown): string => {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
};

const resolveBackend = (): CacheBackend => {
  const redis = getRedisClient();
  if (redis) return 'redis';
  return 'disabled';
};

export const getCachedReport = async (params: {
  reportId: string;
  format: string;
  reportType: string;
}): Promise<string | null> => {
  const labels: CacheLabels = { report_type: params.reportType, format: params.format };
  const redis = getRedisClient();

  stats.backend = resolveBackend();
  if (!redis) {
    recordMiss(labels);
    return null;
  }

  try {
    await redis.connect();
    const value = await redis.get(getReportCacheKey(params.reportId, params.format));
    if (value === null) {
      recordMiss(labels);
      return null;
    }
    recordHit(labels);
    return value;
  } catch (_error) {
    recordError(labels);
    recordMiss(labels);
    return null;
  }
};

export const setCachedReport = async (params: {
  reportId: string;
  format: string;
  reportType: string;
  value: string;
  isStatic?: boolean;
}): Promise<void> => {
  const labels: CacheLabels = { report_type: params.reportType, format: params.format };
  const redis = getRedisClient();

  stats.backend = resolveBackend();
  if (!redis) return;

  const ttlSeconds = params.isStatic === false ? 0 : STATIC_REPORT_TTL_SECONDS;
  if (ttlSeconds <= 0) return;

  try {
    await redis.connect();
    await redis.set(getReportCacheKey(params.reportId, params.format), params.value, 'EX', ttlSeconds);
    recordSet(labels);
  } catch (_error) {
    recordError(labels);
  }
};

export const invalidateReportCache = async (params: {
  reportId?: string;
  reason: string;
}): Promise<number> => {
  const redis = getRedisClient();
  stats.backend = resolveBackend();
  if (!redis) return 0;

  const match = params.reportId ? `${CACHE_KEY_PREFIX}${params.reportId}:*` : `${CACHE_KEY_PREFIX}*`;

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
  } catch (_error) {
    return 0;
  }
};

export const getReportCacheStats = (): CacheStats & { hitRate: number } => {
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    hitRate: total > 0 ? stats.hits / total : 0,
  };
};

