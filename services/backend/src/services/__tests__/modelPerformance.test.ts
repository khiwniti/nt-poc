import { describe, it, expect, beforeEach } from 'vitest';
import { ModelPerformanceService } from '../../services/modelPerformance';

describe('ModelPerformanceService', () => {
  describe('calculateMAE', () => {
    it('should calculate Mean Absolute Error correctly', () => {
      const predicted = [10, 20, 30, 40, 50];
      const actual = [12, 18, 32, 38, 52];

      const mae = ModelPerformanceService.calculateMAE(predicted, actual);

      expect(mae).toBe(2);
    });

    it('should handle perfect predictions', () => {
      const predicted = [10, 20, 30];
      const actual = [10, 20, 30];

      const mae = ModelPerformanceService.calculateMAE(predicted, actual);

      expect(mae).toBe(0);
    });

    it('should throw error for empty arrays', () => {
      expect(() => {
        ModelPerformanceService.calculateMAE([], []);
      }).toThrow('Arrays must be non-empty and of equal length');
    });

    it('should throw error for mismatched array lengths', () => {
      expect(() => {
        ModelPerformanceService.calculateMAE([1, 2, 3], [1, 2]);
      }).toThrow('Arrays must be non-empty and of equal length');
    });
  });

  describe('calculateRMSE', () => {
    it('should calculate Root Mean Square Error correctly', () => {
      const predicted = [10, 20, 30];
      const actual = [12, 18, 32];

      const rmse = ModelPerformanceService.calculateRMSE(predicted, actual);

      // sqrt((4 + 4 + 4) / 3) = sqrt(4) = 2
      expect(rmse).toBeCloseTo(2, 5);
    });

    it('should handle perfect predictions', () => {
      const predicted = [10, 20, 30];
      const actual = [10, 20, 30];

      const rmse = ModelPerformanceService.calculateRMSE(predicted, actual);

      expect(rmse).toBe(0);
    });

    it('should throw error for empty arrays', () => {
      expect(() => {
        ModelPerformanceService.calculateRMSE([], []);
      }).toThrow('Arrays must be non-empty and of equal length');
    });
  });

  describe('calculateR2', () => {
    it('should calculate R-squared correctly', () => {
      const predicted = [10, 20, 30, 40, 50];
      const actual = [10, 20, 30, 40, 50];

      const r2 = ModelPerformanceService.calculateR2(predicted, actual);

      // Perfect prediction should give R² = 1
      expect(r2).toBe(1);
    });

    it('should calculate R-squared for imperfect predictions', () => {
      const predicted = [2.5, 3.5, 4.5];
      const actual = [3, 4, 5];

      const r2 = ModelPerformanceService.calculateR2(predicted, actual);

      // R² should be reasonably high for consistent predictions
      expect(r2).toBeGreaterThan(0.5);
    });

    it('should return 0 for constant actual values', () => {
      const predicted = [10, 20, 30];
      const actual = [15, 15, 15];

      const r2 = ModelPerformanceService.calculateR2(predicted, actual);

      expect(r2).toBe(0);
    });

    it('should throw error for empty arrays', () => {
      expect(() => {
        ModelPerformanceService.calculateR2([], []);
      }).toThrow('Arrays must be non-empty and of equal length');
    });
  });

  describe('calculateKSStatistic', () => {
    it('should calculate KS statistic for identical distributions', () => {
      const baseline = [1, 2, 3, 4, 5];
      const comparison = [1, 2, 3, 4, 5];

      const ks = ModelPerformanceService.calculateKSStatistic(baseline, comparison);

      // Identical distributions should give KS = 0
      expect(ks).toBe(0);
    });

    it('should calculate KS statistic for different distributions', () => {
      const baseline = [1, 2, 3, 4, 5];
      const comparison = [6, 7, 8, 9, 10];

      const ks = ModelPerformanceService.calculateKSStatistic(baseline, comparison);

      // Completely separated distributions should give KS = 1
      expect(ks).toBe(1);
    });

    it('should calculate KS statistic for partially overlapping distributions', () => {
      const baseline = [1, 2, 3, 4, 5];
      const comparison = [3, 4, 5, 6, 7];

      const ks = ModelPerformanceService.calculateKSStatistic(baseline, comparison);

      // Partially overlapping distributions should give 0 < KS < 1
      expect(ks).toBeGreaterThan(0);
      expect(ks).toBeLessThan(1);
    });

    it('should throw error for empty arrays', () => {
      expect(() => {
        ModelPerformanceService.calculateKSStatistic([], [1, 2, 3]);
      }).toThrow('Arrays must be non-empty');

      expect(() => {
        ModelPerformanceService.calculateKSStatistic([1, 2, 3], []);
      }).toThrow('Arrays must be non-empty');
    });
  });

  describe('calculateHealthScore', () => {
    it('should calculate excellent health score', () => {
      const accuracyMetrics = {
        mae: { soc: 0.5, soh: 0.3, temperature: 0.2, power: 1.0 },
        rmse: { soc: 0.7, soh: 0.5, temperature: 0.3, power: 1.5 },
        r2: { soc: 0.95, soh: 0.98, temperature: 0.96, power: 0.94 }
      };
      const driftScore = 0.05;
      const dataQualityMetrics = {
        totalRecords: 1000,
        missingCounts: { voltage: 0, current: 0, temperature: 0, soc: 0, soh: 0 },
        outlierCounts: { voltage: 1, current: 1, temperature: 0, soc: 0 },
        rangeViolations: { voltage: 0, current: 0, temperature: 0, soc: 0 },
        maxTimeGapSeconds: 60
      };

      const healthScore = ModelPerformanceService.calculateHealthScore(
        accuracyMetrics,
        driftScore,
        dataQualityMetrics
      );

      expect(healthScore.overallHealthScore).toBeGreaterThan(90);
      expect(healthScore.healthStatus).toBe('excellent');
    });

    it('should calculate poor health score', () => {
      const accuracyMetrics = {
        mae: { soc: 5.0, soh: 4.0, temperature: 3.0, power: 10.0 },
        rmse: { soc: 7.0, soh: 6.0, temperature: 5.0, power: 15.0 },
        r2: { soc: 0.3, soh: 0.4, temperature: 0.35, power: 0.25 }
      };
      const driftScore = 0.5;
      const dataQualityMetrics = {
        totalRecords: 1000,
        missingCounts: { voltage: 200, current: 150, temperature: 100, soc: 80, soh: 50 },
        outlierCounts: { voltage: 50, current: 40, temperature: 30, soc: 20 },
        rangeViolations: { voltage: 30, current: 25, temperature: 15, soc: 10 },
        maxTimeGapSeconds: 3600
      };

      const healthScore = ModelPerformanceService.calculateHealthScore(
        accuracyMetrics,
        driftScore,
        dataQualityMetrics
      );

      expect(healthScore.overallHealthScore).toBeLessThan(60);
      expect(healthScore.healthStatus).toMatch(/poor|critical/);
    });

    it('should calculate component scores correctly', () => {
      const accuracyMetrics = {
        mae: { soc: 1.0, soh: 1.0, temperature: 1.0, power: 1.0 },
        rmse: { soc: 1.5, soh: 1.5, temperature: 1.5, power: 1.5 },
        r2: { soc: 0.8, soh: 0.75, temperature: 0.85, power: 0.7 }
      };
      const driftScore = 0.15;
      const dataQualityMetrics = {
        totalRecords: 1000,
        missingCounts: { voltage: 10, current: 10, temperature: 10, soc: 10, soh: 10 },
        outlierCounts: { voltage: 5, current: 5, temperature: 5, soc: 5 },
        rangeViolations: { voltage: 2, current: 2, temperature: 2, soc: 2 },
        maxTimeGapSeconds: 120
      };

      const healthScore = ModelPerformanceService.calculateHealthScore(
        accuracyMetrics,
        driftScore,
        dataQualityMetrics
      );

      expect(healthScore.accuracyScore).toBeGreaterThan(0);
      expect(healthScore.accuracyScore).toBeLessThan(100);
      expect(healthScore.driftScore).toBeGreaterThan(0);
      expect(healthScore.driftScore).toBeLessThan(100);
      expect(healthScore.dataQualityScore).toBeGreaterThan(0);
      expect(healthScore.dataQualityScore).toBeLessThan(100);
      expect(healthScore.overallHealthScore).toBeGreaterThan(0);
      expect(healthScore.overallHealthScore).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small numbers', () => {
      const predicted = [0.001, 0.002, 0.003];
      const actual = [0.0011, 0.0019, 0.0031];

      const mae = ModelPerformanceService.calculateMAE(predicted, actual);
      const rmse = ModelPerformanceService.calculateRMSE(predicted, actual);
      const r2 = ModelPerformanceService.calculateR2(predicted, actual);

      expect(mae).toBeGreaterThan(0);
      expect(rmse).toBeGreaterThan(0);
      expect(r2).toBeGreaterThan(0.9);
    });

    it('should handle negative values', () => {
      const predicted = [-10, -20, -30];
      const actual = [-12, -18, -32];

      const mae = ModelPerformanceService.calculateMAE(predicted, actual);
      const rmse = ModelPerformanceService.calculateRMSE(predicted, actual);

      expect(mae).toBe(2);
      expect(rmse).toBeCloseTo(2, 5);
    });

    it('should handle large numbers', () => {
      const predicted = [1000000, 2000000, 3000000];
      const actual = [1000100, 2000100, 3000100];

      const mae = ModelPerformanceService.calculateMAE(predicted, actual);

      expect(mae).toBe(100);
    });
  });
});
