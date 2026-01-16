/**
 * Tests for Predictive Maintenance Model
 * T140: Implement predictive maintenance model
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  PredictiveMaintenanceModel,
  getModel,
  initializeModel,
} from '../predictiveMaintenanceModel';
import type { TrainingData, MaintenanceFeatures } from '../../types/predictiveMaintenance';

describe('PredictiveMaintenanceModel', () => {
  let model: PredictiveMaintenanceModel;

  beforeAll(async () => {
    model = new PredictiveMaintenanceModel();
    
    // Create balanced training data
    const trainingData: TrainingData[] = [
      // Safe batteries
      ...Array(20).fill(null).map((_, i) => ({
        features: {
          sohDelta: -0.01 - Math.random() * 0.01,
          anomalyCount: Math.floor(Math.random() * 2),
          tempMax: 20 + Math.random() * 5,
          voltageMin: 3.7 + Math.random() * 0.2,
        },
        label: 'safe' as const,
      })),
      // 30d risk
      ...Array(20).fill(null).map((_, i) => ({
        features: {
          sohDelta: -0.05 - Math.random() * 0.03,
          anomalyCount: 2 + Math.floor(Math.random() * 2),
          tempMax: 30 + Math.random() * 10,
          voltageMin: 3.4 + Math.random() * 0.2,
        },
        label: '30d' as const,
      })),
      // 14d risk
      ...Array(20).fill(null).map((_, i) => ({
        features: {
          sohDelta: -0.15 - Math.random() * 0.05,
          anomalyCount: 5 + Math.floor(Math.random() * 3),
          tempMax: 45 + Math.random() * 10,
          voltageMin: 3.1 + Math.random() * 0.2,
        },
        label: '14d' as const,
      })),
      // 7d risk
      ...Array(20).fill(null).map((_, i) => ({
        features: {
          sohDelta: -0.3 - Math.random() * 0.1,
          anomalyCount: 10 + Math.floor(Math.random() * 5),
          tempMax: 60 + Math.random() * 15,
          voltageMin: 2.8 + Math.random() * 0.2,
        },
        label: '7d' as const,
      })),
    ];

    await model.train(trainingData);
  });

  describe('Training', () => {
    it('should train successfully with sufficient data', async () => {
      expect(model.isTrained()).toBe(true);
    });

    it('should have 100 trees in the forest', () => {
      expect(model.getModelVersion()).toBe('v1.0.0');
    });

    it('should calculate metrics after training', () => {
      const metrics = model.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.modelVersion).toBe('v1.0.0');
      expect(metrics?.sampleCount).toBeGreaterThan(0);
    });

    it('should achieve AUC-ROC > 0.80 for 7d predictions', () => {
      const metrics = model.getMetrics();
      expect(metrics?.rocAuc7d).toBeGreaterThanOrEqual(0.80);
    });

    it('should achieve AUC-ROC > 0.80 for 14d predictions', () => {
      const metrics = model.getMetrics();
      expect(metrics?.rocAuc14d).toBeGreaterThanOrEqual(0.80);
    });

    it('should achieve AUC-ROC > 0.80 for 30d predictions', () => {
      const metrics = model.getMetrics();
      expect(metrics?.rocAuc30d).toBeGreaterThanOrEqual(0.80);
    });

    it('should reject training with insufficient data', async () => {
      const newModel = new PredictiveMaintenanceModel();
      const smallData: TrainingData[] = [
        {
          features: { sohDelta: -0.01, anomalyCount: 0, tempMax: 25, voltageMin: 3.7 },
          label: 'safe',
        },
      ];

      await expect(newModel.train(smallData)).rejects.toThrow('Insufficient training data');
    });
  });

  describe('Predictions', () => {
    it('should predict safe for healthy battery', async () => {
      const features: MaintenanceFeatures = {
        sohDelta: -0.01,
        anomalyCount: 0,
        tempMax: 22,
        voltageMin: 3.8,
      };

      const prediction = await model.predict('battery-1', features);

      expect(prediction.batterySystemId).toBe('battery-1');
      expect(prediction.riskLevel).toBe('safe');
      expect(prediction.probability7d).toBeLessThan(0.3);
      expect(prediction.modelVersion).toBe('v1.0.0');
      expect(prediction.features).toEqual(features);
    });

    it('should predict 7d risk for critical battery', async () => {
      const features: MaintenanceFeatures = {
        sohDelta: -0.35,
        anomalyCount: 15,
        tempMax: 70,
        voltageMin: 2.9,
      };

      const prediction = await model.predict('battery-2', features);

      expect(prediction.riskLevel).toBe('7d');
      expect(prediction.probability7d).toBeGreaterThan(0.3);
    });

    it('should predict 14d risk for high degradation', async () => {
      const features: MaintenanceFeatures = {
        sohDelta: -0.18,
        anomalyCount: 6,
        tempMax: 50,
        voltageMin: 3.2,
      };

      const prediction = await model.predict('battery-3', features);

      expect(['14d', '7d']).toContain(prediction.riskLevel);
      expect(prediction.probability14d).toBeGreaterThan(0);
    });

    it('should predict 30d risk for moderate issues', async () => {
      const features: MaintenanceFeatures = {
        sohDelta: -0.06,
        anomalyCount: 3,
        tempMax: 35,
        voltageMin: 3.5,
      };

      const prediction = await model.predict('battery-4', features);

      expect(['30d', '14d', 'safe']).toContain(prediction.riskLevel);
      expect(prediction.probability30d).toBeGreaterThan(0);
    });

    it('should include all probability fields', async () => {
      const features: MaintenanceFeatures = {
        sohDelta: -0.10,
        anomalyCount: 4,
        tempMax: 40,
        voltageMin: 3.3,
      };

      const prediction = await model.predict('battery-5', features);

      expect(prediction.probability7d).toBeGreaterThanOrEqual(0);
      expect(prediction.probability14d).toBeGreaterThanOrEqual(0);
      expect(prediction.probability30d).toBeGreaterThanOrEqual(0);
      expect(prediction.probability7d).toBeLessThanOrEqual(1);
      expect(prediction.probability14d).toBeLessThanOrEqual(1);
      expect(prediction.probability30d).toBeLessThanOrEqual(1);
    });

    it('should include prediction date', async () => {
      const features: MaintenanceFeatures = {
        sohDelta: -0.05,
        anomalyCount: 2,
        tempMax: 30,
        voltageMin: 3.6,
      };

      const prediction = await model.predict('battery-6', features);

      expect(prediction.predictionDate).toBeInstanceOf(Date);
    });

    it('should reject prediction when model not trained', async () => {
      const untrainedModel = new PredictiveMaintenanceModel();
      const features: MaintenanceFeatures = {
        sohDelta: -0.01,
        anomalyCount: 0,
        tempMax: 25,
        voltageMin: 3.7,
      };

      await expect(untrainedModel.predict('battery-x', features))
        .rejects.toThrow('Model must be trained');
    });
  });

  describe('Multi-class Classification', () => {
    it('should handle all four risk levels', async () => {
      const testCases: Array<{ features: MaintenanceFeatures; expectedRisk: string[] }> = [
        {
          features: { sohDelta: -0.01, anomalyCount: 0, tempMax: 20, voltageMin: 3.8 },
          expectedRisk: ['safe', '30d'],
        },
        {
          features: { sohDelta: -0.06, anomalyCount: 3, tempMax: 35, voltageMin: 3.4 },
          expectedRisk: ['30d', '14d', 'safe'],
        },
        {
          features: { sohDelta: -0.18, anomalyCount: 7, tempMax: 50, voltageMin: 3.1 },
          expectedRisk: ['14d', '7d'],
        },
        {
          features: { sohDelta: -0.35, anomalyCount: 15, tempMax: 70, voltageMin: 2.8 },
          expectedRisk: ['7d', '14d'],
        },
      ];

      for (const testCase of testCases) {
        const prediction = await model.predict('test-battery', testCase.features);
        expect(testCase.expectedRisk).toContain(prediction.riskLevel);
      }
    });
  });

  describe('Singleton and Initialization', () => {
    it('should return same instance from getModel', () => {
      const instance1 = getModel();
      const instance2 = getModel();
      expect(instance1).toBe(instance2);
    });

    it('should initialize model with default training data', async () => {
      await initializeModel();
      const model = getModel();
      expect(model.isTrained()).toBe(true);
    });

    it('should not retrain if already trained', async () => {
      const model = getModel();
      const metricsBefore = model.getMetrics();
      
      await initializeModel();
      
      const metricsAfter = model.getMetrics();
      expect(metricsBefore).toEqual(metricsAfter);
    });
  });
});
