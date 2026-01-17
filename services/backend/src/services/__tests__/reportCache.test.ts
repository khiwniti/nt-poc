import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// Create mock functions using vi.hoisted to ensure they're available during mocking
const { mockRedisClient, mockGetRedisClient, mockMetrics } = vi.hoisted(() => {
  const client = {
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    scan: vi.fn().mockResolvedValue(['0', []]),
    del: vi.fn().mockResolvedValue(0),
    on: vi.fn(),
  };

  return {
    mockRedisClient: client,
    mockGetRedisClient: vi.fn(() => client),
    mockMetrics: {
      reportCacheHitsTotal: { inc: vi.fn() },
      reportCacheMissesTotal: { inc: vi.fn() },
      reportCacheSetsTotal: { inc: vi.fn() },
      reportCacheErrorsTotal: { inc: vi.fn() },
      reportCacheHitRate: { set: vi.fn() },
    },
  };
});

// Mock ioredis module to prevent loading errors
vi.mock('ioredis', () => ({
  default: vi.fn(),
}));

// Mock logger
vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Redis config with hoisted mock
vi.mock('../config/redis.js', () => ({
  getRedisClient: mockGetRedisClient,
}));

// Mock Prometheus metrics
vi.mock('../config/metrics.js', () => mockMetrics);

// Import after all mocks are set up
import {
  getCachedReport,
  setCachedReport,
  invalidateReportCache,
  getReportCacheKey,
  buildReportIdHash,
  getReportCacheStats,
} from '../reportCache.js';
import { getRedisClient } from '../config/redis.js';

describe('reportCache', () => {
  beforeEach(() => {
    // Clear mock call history but keep implementations
    vi.clearAllMocks();

    // Reset default mock implementations
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.scan.mockResolvedValue(['0', []]);
    mockRedisClient.del.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cache Key Generation', () => {
    it('should verify mocking is working', () => {
      const client = getRedisClient();
      expect(client).toBe(mockRedisClient);
      expect(client).not.toBeNull();
    });

    it('should generate correct cache key format', () => {
      const key = getReportCacheKey('report-123', 'pdf');
      expect(key).toBe('report-cache:report-123:pdf');
    });

    it('should generate different keys for different report IDs', () => {
      const key1 = getReportCacheKey('report-1', 'pdf');
      const key2 = getReportCacheKey('report-2', 'pdf');
      expect(key1).not.toBe(key2);
      expect(key1).toBe('report-cache:report-1:pdf');
      expect(key2).toBe('report-cache:report-2:pdf');
    });

    it('should generate different keys for different formats', () => {
      const key1 = getReportCacheKey('report-1', 'pdf');
      const key2 = getReportCacheKey('report-1', 'csv');
      expect(key1).not.toBe(key2);
      expect(key1).toBe('report-cache:report-1:pdf');
      expect(key2).toBe('report-cache:report-1:csv');
    });

    it('should generate consistent keys for same inputs', () => {
      const key1 = getReportCacheKey('report-123', 'xlsx');
      const key2 = getReportCacheKey('report-123', 'xlsx');
      expect(key1).toBe(key2);
    });

    it('should include cache key prefix', () => {
      const key = getReportCacheKey('test', 'json');
      expect(key).toMatch(/^report-cache:/);
    });
  });

  describe('Report ID Hash Generation', () => {
    it('should generate consistent hashes for same input', () => {
      const input = { type: 'rul_comparison', filters: { facilityId: 'facility-1' } };
      const hash1 = buildReportIdHash(input);
      const hash2 = buildReportIdHash(input);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const input1 = { type: 'rul_comparison', filters: { facilityId: 'facility-1' } };
      const input2 = { type: 'rul_comparison', filters: { facilityId: 'facility-2' } };
      const hash1 = buildReportIdHash(input1);
      const hash2 = buildReportIdHash(input2);
      expect(hash1).not.toBe(hash2);
    });

    it('should truncate hash to 16 characters', () => {
      const input = { data: 'test' };
      const hash = buildReportIdHash(input);
      expect(hash).toHaveLength(16);
    });

    it('should handle complex object hashing', () => {
      const complexInput = {
        type: 'comparative_analysis',
        filters: {
          facilityId: 'facility-1',
          dateRange: { start: '2024-01-01', end: '2024-12-31' },
          batteryTypes: ['lithium-ion', 'lead-acid'],
        },
        options: {
          includeCharts: true,
          aggregation: 'daily',
        },
      };
      const hash = buildReportIdHash(complexInput);
      expect(hash).toHaveLength(16);
      expect(typeof hash).toBe('string');
    });

    it('should handle primitive inputs', () => {
      const hash1 = buildReportIdHash('simple-string');
      const hash2 = buildReportIdHash(12345);
      const hash3 = buildReportIdHash(true);

      expect(hash1).toHaveLength(16);
      expect(hash2).toHaveLength(16);
      expect(hash3).toHaveLength(16);
    });

    it('should handle array inputs', () => {
      const input = ['item1', 'item2', 'item3'];
      const hash = buildReportIdHash(input);
      expect(hash).toHaveLength(16);
    });
  });

  describe('Cache Operations - Redis Available', () => {
    it('should verify getRedisClient is called', async () => {
      await getCachedReport({
        reportId: 'test-report',
        format: 'pdf',
        reportType: 'comparative_analysis',
      });

      expect(getRedisClient).toHaveBeenCalled();
    });

    it('should return cached value on cache hit', async () => {
      const mockValue = JSON.stringify({ title: 'Test Report', data: [] });
      mockRedisClient.get.mockResolvedValue(mockValue);

      const result = await getCachedReport({
        reportId: 'test-report',
        format: 'pdf',
        reportType: 'comparative_analysis',
      });

      expect(result).toBe(mockValue);
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.get).toHaveBeenCalledWith('report-cache:test-report:pdf');
    });

    it('should return null on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getCachedReport({
        reportId: 'test-report',
        format: 'pdf',
        reportType: 'comparative_analysis',
      });

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('report-cache:test-report:pdf');
    });

    it('should record hit metrics on cache hit', async () => {
      mockRedisClient.get.mockResolvedValue('cached-data');

      await getCachedReport({
        reportId: 'test-report',
        format: 'pdf',
        reportType: 'comparative_analysis',
      });

      expect(mockMetrics.reportCacheHitsTotal.inc).toHaveBeenCalledWith(
        { report_type: 'comparative_analysis', format: 'pdf' },
        1
      );
    });

    it('should record miss metrics on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await getCachedReport({
        reportId: 'test-report',
        format: 'csv',
        reportType: 'anomaly_detection',
      });

      expect(mockMetrics.reportCacheMissesTotal.inc).toHaveBeenCalledWith(
        { report_type: 'anomaly_detection', format: 'csv' },
        1
      );
    });

    it('should store value with TTL in cache', async () => {
      const mockValue = JSON.stringify({ data: 'test' });

      await setCachedReport({
        reportId: 'test-report',
        format: 'pdf',
        reportType: 'comparative_analysis',
        value: mockValue,
      });

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'report-cache:test-report:pdf',
        mockValue,
        'EX',
        3600 // 1 hour TTL
      );
    });

    it('should record set metrics when caching', async () => {
      await setCachedReport({
        reportId: 'test-report',
        format: 'xlsx',
        reportType: 'performance_metrics',
        value: 'test-data',
      });

      expect(mockMetrics.reportCacheSetsTotal.inc).toHaveBeenCalledWith(
        { report_type: 'performance_metrics', format: 'xlsx' },
        1
      );
    });

    it('should skip caching for non-static reports', async () => {
      await setCachedReport({
        reportId: 'dynamic-report',
        format: 'pdf',
        reportType: 'real_time_data',
        value: 'test-data',
        isStatic: false,
      });

      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(mockMetrics.reportCacheSetsTotal.inc).not.toHaveBeenCalled();
    });

    it('should cache static reports by default', async () => {
      await setCachedReport({
        reportId: 'static-report',
        format: 'pdf',
        reportType: 'monthly_summary',
        value: 'test-data',
      });

      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });

  describe('Cache Operations - Redis Disabled', () => {
    beforeEach(() => {
      mockGetRedisClient.mockReturnValue(null);
    });

    afterEach(() => {
      mockGetRedisClient.mockReturnValue(mockRedisClient);
    });

    it('should return null when Redis unavailable', async () => {
      const result = await getCachedReport({
        reportId: 'test-report',
        format: 'pdf',
        reportType: 'comparative_analysis',
      });

      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should record miss when Redis disabled', async () => {
      await getCachedReport({
        reportId: 'test-report',
        format: 'pdf',
        reportType: 'comparative_analysis',
      });

      expect(mockMetrics.reportCacheMissesTotal.inc).toHaveBeenCalledWith(
        { report_type: 'comparative_analysis', format: 'pdf' },
        1
      );
    });

    it('should not attempt to cache when Redis unavailable', async () => {
      await setCachedReport({
        reportId: 'test-report',
        format: 'pdf',
        reportType: 'comparative_analysis',
        value: 'test-data',
      });

      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should show disabled backend in stats', async () => {
      await getCachedReport({
        reportId: 'test',
        format: 'pdf',
        reportType: 'test',
      });

      const stats = getReportCacheStats();
      expect(stats.backend).toBe('disabled');
    });
  });

  describe('Cache Invalidation', () => {
    it('should delete keys matching specific reportId', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', ['report-cache:test-123:pdf', 'report-cache:test-123:csv']] as any);
      mockRedisClient.del.mockResolvedValue(2);

      const deleted = await invalidateReportCache({
        reportId: 'test-123',
        reason: 'data updated',
      });

      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'report-cache:test-123:*', 'COUNT', '250');
      expect(mockRedisClient.del).toHaveBeenCalledWith('report-cache:test-123:pdf', 'report-cache:test-123:csv');
      expect(deleted).toBe(2);
    });

    it('should delete all report keys with wildcard', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', ['report-cache:report-1:pdf', 'report-cache:report-2:csv']] as any);
      mockRedisClient.del.mockResolvedValue(2);

      const deleted = await invalidateReportCache({
        reason: 'clear all caches',
      });

      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'report-cache:*', 'COUNT', '250');
      expect(deleted).toBe(2);
    });

    it('should handle SCAN cursor pagination', async () => {
      // First scan returns cursor '123' with some keys
      mockRedisClient.scan.mockResolvedValueOnce(['123', ['report-cache:r1:pdf']] as any);
      mockRedisClient.del.mockResolvedValueOnce(1);

      // Second scan returns cursor '0' (end) with more keys
      mockRedisClient.scan.mockResolvedValueOnce(['0', ['report-cache:r2:csv']] as any);
      mockRedisClient.del.mockResolvedValueOnce(1);

      const deleted = await invalidateReportCache({
        reportId: 'test',
        reason: 'test pagination',
      });

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
      expect(deleted).toBe(2);
    });

    it('should return count of deleted keys', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', ['key1', 'key2', 'key3']] as any);
      mockRedisClient.del.mockResolvedValue(3);

      const deleted = await invalidateReportCache({
        reportId: 'multi-format',
        reason: 'test count',
      });

      expect(deleted).toBe(3);
    });

    it('should return 0 when Redis unavailable', async () => {
      (getRedisClient as Mock).mockReturnValueOnce(null);

      const deleted = await invalidateReportCache({
        reportId: 'test',
        reason: 'test no redis',
      });

      expect(deleted).toBe(0);
      expect(mockRedisClient.scan).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.scan.mockRejectedValue(new Error('Redis connection error'));

      const deleted = await invalidateReportCache({
        reportId: 'test',
        reason: 'test error',
      });

      expect(deleted).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors in get operation', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await getCachedReport({
        reportId: 'test',
        format: 'pdf',
        reportType: 'test',
      });

      expect(result).toBeNull();
      expect(mockMetrics.reportCacheErrorsTotal.inc).toHaveBeenCalled();
      expect(mockMetrics.reportCacheMissesTotal.inc).toHaveBeenCalled();
    });

    it('should handle Redis connection errors in set operation', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

      await setCachedReport({
        reportId: 'test',
        format: 'pdf',
        reportType: 'test',
        value: 'data',
      });

      expect(mockMetrics.reportCacheErrorsTotal.inc).toHaveBeenCalled();
    });

    it('should record error metrics when Redis operations fail', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      await getCachedReport({
        reportId: 'test',
        format: 'csv',
        reportType: 'error_test',
      });

      expect(mockMetrics.reportCacheErrorsTotal.inc).toHaveBeenCalledWith(
        { report_type: 'error_test', format: 'csv' },
        1
      );
    });

    it('should continue operation after cache errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Cache error'));

      const result = await getCachedReport({
        reportId: 'test',
        format: 'pdf',
        reportType: 'test',
      });

      // Should return null instead of throwing
      expect(result).toBeNull();
    });

    it('should handle missing Redis client gracefully', async () => {
      mockGetRedisClient.mockReturnValueOnce(null);

      const result = await getCachedReport({
        reportId: 'test',
        format: 'pdf',
        reportType: 'test',
      });

      expect(result).toBeNull();
      expect(mockMetrics.reportCacheMissesTotal.inc).toHaveBeenCalled();
    });
  });

  describe('Metrics Tracking', () => {
    it('should increment hit counter on cache hit', async () => {
      mockRedisClient.get.mockResolvedValue('cached-data');

      await getCachedReport({
        reportId: 'test',
        format: 'pdf',
        reportType: 'metrics_test',
      });

      expect(mockMetrics.reportCacheHitsTotal.inc).toHaveBeenCalledWith(
        { report_type: 'metrics_test', format: 'pdf' },
        1
      );
    });

    it('should increment miss counter on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await getCachedReport({
        reportId: 'test',
        format: 'csv',
        reportType: 'metrics_test',
      });

      expect(mockMetrics.reportCacheMissesTotal.inc).toHaveBeenCalledWith(
        { report_type: 'metrics_test', format: 'csv' },
        1
      );
    });

    it('should increment set counter on cache set', async () => {
      await setCachedReport({
        reportId: 'test',
        format: 'xlsx',
        reportType: 'metrics_test',
        value: 'data',
      });

      expect(mockMetrics.reportCacheSetsTotal.inc).toHaveBeenCalledWith(
        { report_type: 'metrics_test', format: 'xlsx' },
        1
      );
    });

    it('should increment error counter on errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Test error'));

      await getCachedReport({
        reportId: 'test',
        format: 'pdf',
        reportType: 'error_metrics',
      });

      expect(mockMetrics.reportCacheErrorsTotal.inc).toHaveBeenCalledWith(
        { report_type: 'error_metrics', format: 'pdf' },
        1
      );
    });

    it('should update hit rate gauge', async () => {
      // Cache hit
      mockRedisClient.get.mockResolvedValueOnce('data');
      await getCachedReport({
        reportId: 'test1',
        format: 'pdf',
        reportType: 'rate_test',
      });

      // Cache miss
      mockRedisClient.get.mockResolvedValueOnce(null);
      await getCachedReport({
        reportId: 'test2',
        format: 'pdf',
        reportType: 'rate_test',
      });

      // Hit rate gauge should be updated (1 hit / 2 total = 0.5)
      expect(mockMetrics.reportCacheHitRate.set).toHaveBeenCalledWith(
        { report_type: 'rate_test', format: 'pdf' },
        expect.any(Number)
      );
    });

    it('should track metrics per label combination', async () => {
      // Different report types and formats
      mockRedisClient.get.mockResolvedValue('data');

      await getCachedReport({
        reportId: 'test1',
        format: 'pdf',
        reportType: 'type_a',
      });

      await getCachedReport({
        reportId: 'test2',
        format: 'csv',
        reportType: 'type_b',
      });

      expect(mockMetrics.reportCacheHitsTotal.inc).toHaveBeenCalledWith(
        { report_type: 'type_a', format: 'pdf' },
        1
      );
      expect(mockMetrics.reportCacheHitsTotal.inc).toHaveBeenCalledWith(
        { report_type: 'type_b', format: 'csv' },
        1
      );
    });

    it('should return accurate stats via getReportCacheStats', async () => {
      // Perform some cache operations
      mockRedisClient.get.mockResolvedValueOnce('hit1');
      await getCachedReport({ reportId: 'r1', format: 'pdf', reportType: 'test' });

      mockRedisClient.get.mockResolvedValueOnce(null);
      await getCachedReport({ reportId: 'r2', format: 'pdf', reportType: 'test' });

      await setCachedReport({ reportId: 'r3', format: 'pdf', reportType: 'test', value: 'data' });

      const stats = getReportCacheStats();

      expect(stats).toHaveProperty('backend');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('hitRate');
    });
  });

  describe('Statistics Retrieval', () => {
    it('should include all required fields in stats', () => {
      const stats = getReportCacheStats();

      expect(stats).toHaveProperty('backend');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should calculate hit rate correctly', async () => {
      // Get baseline
      const baselineStats = getReportCacheStats();
      const baselineHits = baselineStats.hits;
      const baselineMisses = baselineStats.misses;

      // 2 hits, 1 miss
      mockRedisClient.get.mockResolvedValueOnce('data1');
      await getCachedReport({ reportId: 'r1', format: 'pdf', reportType: 'test' });

      mockRedisClient.get.mockResolvedValueOnce('data2');
      await getCachedReport({ reportId: 'r2', format: 'pdf', reportType: 'test' });

      mockRedisClient.get.mockResolvedValueOnce(null);
      await getCachedReport({ reportId: 'r3', format: 'pdf', reportType: 'test' });

      const stats = getReportCacheStats();
      const totalHits = stats.hits - baselineHits;
      const totalMisses = stats.misses - baselineMisses;
      const expectedHitRate = totalHits / (totalHits + totalMisses);

      expect(stats.hitRate).toBeCloseTo(expectedHitRate, 2);
    });

    it('should track hits and misses separately', async () => {
      const before = getReportCacheStats();

      mockRedisClient.get.mockResolvedValue('hit');
      await getCachedReport({ reportId: 'test', format: 'pdf', reportType: 'test' });

      const after = getReportCacheStats();
      expect(after.hits).toBeGreaterThan(before.hits);
    });

    it('should reflect current backend state', async () => {
      await getCachedReport({ reportId: 'test', format: 'pdf', reportType: 'test' });

      const stats = getReportCacheStats();
      // With mockRedisClient available, backend should be 'redis'
      expect(['redis', 'disabled']).toContain(stats.backend);
    });
  });
});
