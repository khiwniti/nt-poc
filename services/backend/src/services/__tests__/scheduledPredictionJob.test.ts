/**
 * Scheduled Prediction Job Tests
 * T143: Test scheduled ML prediction job functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScheduledPredictionJob } from '../scheduledPredictionJob';
import { pool } from '../../config/database.js';
import * as mlModel from '../../ml/predictiveMaintenanceModel';

// Mock dependencies
vi.mock('../../config/database.js', () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('../../ml/predictiveMaintenanceModel.js', () => ({
  getModel: vi.fn(),
  initializeModel: vi.fn(),
}));

describe('ScheduledPredictionJob', () => {
  let job: ScheduledPredictionJob;
  const mockModel = {
    predict: vi.fn(),
    isTrained: vi.fn(() => true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mlModel.getModel).mockReturnValue(mockModel as any);
    vi.mocked(mlModel.initializeModel).mockResolvedValue(undefined);
    
    // Create job with short interval for testing (1 minute)
    job = new ScheduledPredictionJob(1);
  });

  afterEach(() => {
    job.stop();
  });

  describe('Job Initialization', () => {
    it('should create job with default 60 minute interval', () => {
      const defaultJob = new ScheduledPredictionJob();
      expect(defaultJob).toBeDefined();
    });

    it('should create job with custom interval', () => {
      const customJob = new ScheduledPredictionJob(30);
      expect(customJob).toBeDefined();
    });

    it('should initialize ML model on start', async () => {
      await job.start();
      
      expect(mlModel.initializeModel).toHaveBeenCalledTimes(1);
      
      job.stop();
    });

    it('should throw error if ML model initialization fails', async () => {
      vi.mocked(mlModel.initializeModel).mockRejectedValueOnce(
        new Error('Model init failed')
      );

      await expect(job.start()).rejects.toThrow('Cannot start prediction job without ML model');
    });
  });

  describe('Job Execution', () => {
    it('should process all active batteries', async () => {
      const mockBatteries = [
        {
          id: 'battery-1',
          current_soh: 95,
          last_soh_delta: -0.02,
          anomaly_count: 1,
          max_temp: 25,
          min_voltage: 3.7,
        },
        {
          id: 'battery-2',
          current_soh: 85,
          last_soh_delta: -0.1,
          anomaly_count: 5,
          max_temp: 45,
          min_voltage: 3.3,
        },
      ];

      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: mockBatteries,
        rowCount: 2,
      } as any);

      mockModel.predict.mockResolvedValue({
        batterySystemId: 'battery-1',
        riskLevel: 'safe',
        probability7d: 0.01,
        probability14d: 0.02,
        probability30d: 0.05,
        modelVersion: 'v1.0.0',
        predictionDate: new Date(),
      });

      vi.mocked(pool.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      await job.triggerManually();

      const status = job.getStatus();
      expect(status.metrics?.batteriesProcessed).toBe(2);
      expect(status.metrics?.predictionsCreated).toBe(2);
      expect(status.metrics?.errors).toBe(0);
    });

    it('should handle empty battery list', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await job.triggerManually();

      const status = job.getStatus();
      expect(status.metrics?.batteriesProcessed).toBe(0);
      expect(status.metrics?.predictionsCreated).toBe(0);
    });

    it('should store predictions with correct RUL mapping', async () => {
      const mockBattery = {
        id: 'battery-1',
        current_soh: 80,
        last_soh_delta: -0.15,
        anomaly_count: 8,
        max_temp: 50,
        min_voltage: 3.1,
      };

      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: [mockBattery],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any);

      mockModel.predict.mockResolvedValue({
        batterySystemId: 'battery-1',
        riskLevel: '14d',
        probability7d: 0.15,
        probability14d: 0.45,
        probability30d: 0.25,
        modelVersion: 'v1.0.0',
        predictionDate: new Date(),
      });

      await job.triggerManually();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO rul_predictions'),
        expect.arrayContaining([
          'battery-1',
          14, // RUL for '14d' risk
          0.45, // Highest probability (confidence)
          'v1.0.0',
          expect.any(String),
        ])
      );
    });
  });

  describe('Error Handling', () => {
    it('should retry failed predictions', async () => {
      const mockBattery = {
        id: 'battery-1',
        current_soh: 90,
        last_soh_delta: -0.02,
        anomaly_count: 2,
        max_temp: 30,
        min_voltage: 3.6,
      };

      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: [mockBattery],
          rowCount: 1,
        } as any);

      mockModel.predict
        .mockRejectedValueOnce(new Error('Prediction failed'))
        .mockResolvedValueOnce({
          batterySystemId: 'battery-1',
          riskLevel: 'safe',
          probability7d: 0.01,
          probability14d: 0.02,
          probability30d: 0.05,
          modelVersion: 'v1.0.0',
          predictionDate: new Date(),
        });

      vi.mocked(pool.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      await job.triggerManually();

      const status = job.getStatus();
      expect(status.metrics?.batteriesProcessed).toBe(1);
      expect(status.metrics?.errors).toBe(0);
      expect(mockModel.predict).toHaveBeenCalledTimes(2); // Initial + 1 retry
    }, 15000); // Increase timeout for retries

    it('should record errors after all retries exhausted', async () => {
      const mockBattery = {
        id: 'battery-1',
        current_soh: 90,
        last_soh_delta: -0.02,
        anomaly_count: 2,
        max_temp: 30,
        min_voltage: 3.6,
      };

      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: [mockBattery],
          rowCount: 1,
        } as any);

      mockModel.predict.mockRejectedValue(new Error('Persistent failure'));

      await job.triggerManually();

      const status = job.getStatus();
      expect(status.metrics?.batteriesProcessed).toBe(0); // Failed, so not counted as processed
      expect(status.metrics?.errors).toBe(1);
      expect(status.metrics?.lastError).toBe('Persistent failure');
      expect(mockModel.predict).toHaveBeenCalledTimes(3); // Initial + 2 retries (default)
    }, 30000); // Increase timeout for multiple retries

    it('should continue processing other batteries after error', async () => {
      const mockBatteries = [
        {
          id: 'battery-1',
          current_soh: 90,
          last_soh_delta: -0.02,
          anomaly_count: 2,
          max_temp: 30,
          min_voltage: 3.6,
        },
        {
          id: 'battery-2',
          current_soh: 85,
          last_soh_delta: -0.05,
          anomaly_count: 3,
          max_temp: 35,
          min_voltage: 3.5,
        },
      ];

      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: mockBatteries,
          rowCount: 2,
        } as any);

      mockModel.predict
        .mockRejectedValueOnce(new Error('Battery 1 failed'))
        .mockRejectedValueOnce(new Error('Battery 1 failed'))
        .mockRejectedValueOnce(new Error('Battery 1 failed'))
        .mockResolvedValueOnce({
          batterySystemId: 'battery-2',
          riskLevel: 'safe',
          probability7d: 0.01,
          probability14d: 0.02,
          probability30d: 0.05,
          modelVersion: 'v1.0.0',
          predictionDate: new Date(),
        });

      vi.mocked(pool.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      await job.triggerManually();

      const status = job.getStatus();
      expect(status.metrics?.batteriesProcessed).toBe(1); // Only battery-2 succeeded
      expect(status.metrics?.predictionsCreated).toBe(1);
      expect(status.metrics?.errors).toBe(1); // Battery-1 failed
    }, 30000); // Increase timeout for multiple retries
  });

  describe('Job Status and Metrics', () => {
    it('should return initial status', () => {
      const status = job.getStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.lastRun).toBeNull();
      expect(status.metrics).toBeNull();
    });

    it('should update status after job execution', async () => {
      vi.mocked(pool.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      await job.triggerManually();

      const status = job.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.lastRun).toBeInstanceOf(Date);
      expect(status.metrics).toBeDefined();
      expect(status.metrics?.startTime).toBeInstanceOf(Date);
      expect(status.metrics?.endTime).toBeInstanceOf(Date);
    });

    it('should prevent concurrent job execution', async () => {
      vi.mocked(pool.query).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [], rowCount: 0 } as any), 100))
      );

      const promise1 = job.triggerManually();
      
      // Try to trigger while first is running
      await expect(job.triggerManually()).rejects.toThrow('Job is already running');

      await promise1;
    });
  });

  describe('Feature Extraction', () => {
    it('should extract correct features from battery data', async () => {
      const mockBattery = {
        id: 'battery-1',
        current_soh: 90,
        last_soh_delta: -0.03,
        anomaly_count: 4,
        max_temp: 40,
        min_voltage: 3.4,
      };

      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: [mockBattery],
          rowCount: 1,
        } as any)
        .mockResolvedValue({
          rows: [],
          rowCount: 0,
        } as any);

      mockModel.predict.mockResolvedValue({
        batterySystemId: 'battery-1',
        riskLevel: 'safe',
        probability7d: 0.01,
        probability14d: 0.02,
        probability30d: 0.05,
        modelVersion: 'v1.0.0',
        predictionDate: new Date(),
      });

      await job.triggerManually();

      expect(mockModel.predict).toHaveBeenCalledWith(
        'battery-1',
        {
          sohDelta: -0.03,
          anomalyCount: 4,
          tempMax: 40,
          voltageMin: 3.4,
        }
      );
    });
  });

  describe('RUL Mapping', () => {
    const testCases = [
      { riskLevel: 'safe', expectedRUL: 365 },
      { riskLevel: '30d', expectedRUL: 30 },
      { riskLevel: '14d', expectedRUL: 14 },
      { riskLevel: '7d', expectedRUL: 7 },
    ];

    testCases.forEach(({ riskLevel, expectedRUL }) => {
      it(`should map ${riskLevel} risk to ${expectedRUL} days RUL`, async () => {
        const mockBattery = {
          id: 'battery-1',
          current_soh: 90,
          last_soh_delta: -0.02,
          anomaly_count: 2,
          max_temp: 30,
          min_voltage: 3.6,
        };

        vi.mocked(pool.query)
          .mockResolvedValueOnce({
            rows: [mockBattery],
            rowCount: 1,
          } as any)
          .mockResolvedValue({
            rows: [],
            rowCount: 0,
          } as any);

        mockModel.predict.mockResolvedValue({
          batterySystemId: 'battery-1',
          riskLevel: riskLevel as any,
          probability7d: 0.1,
          probability14d: 0.2,
          probability30d: 0.3,
          modelVersion: 'v1.0.0',
          predictionDate: new Date(),
        });

        await job.triggerManually();

        expect(pool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO rul_predictions'),
          expect.arrayContaining([
            'battery-1',
            expectedRUL,
            expect.any(Number),
            'v1.0.0',
            expect.any(String),
          ])
        );
      });
    });
  });
});
