import { describe, it, expect } from 'vitest';
import {
  calculateFacilityHealth,
  getHealthColor,
  getHealthLabel,
  type HealthStatus,
} from '../facilityHealth';

describe('facilityHealth utilities', () => {
  describe('calculateFacilityHealth', () => {
    it('should return critical for inactive status', () => {
      const health = calculateFacilityHealth({ status: 'inactive' });
      expect(health).toBe('critical');
    });

    it('should return critical for offline status', () => {
      const health = calculateFacilityHealth({ status: 'offline' });
      expect(health).toBe('critical');
    });

    it('should return critical for many alerts', () => {
      const health = calculateFacilityHealth({ activeAlerts: 6, averageSoH: 90 });
      expect(health).toBe('critical');
    });

    it('should return critical for low SoH', () => {
      const health = calculateFacilityHealth({ averageSoH: 55, activeAlerts: 0 });
      expect(health).toBe('critical');
    });

    it('should return warning for moderate alerts', () => {
      const health = calculateFacilityHealth({
        activeAlerts: 3,
        averageSoH: 90,
        status: 'active',
      });
      expect(health).toBe('warning');
    });

    it('should return warning for moderate SoH', () => {
      const health = calculateFacilityHealth({
        averageSoH: 75,
        activeAlerts: 0,
        status: 'active',
      });
      expect(health).toBe('warning');
    });

    it('should return warning for maintenance status', () => {
      const health = calculateFacilityHealth({
        status: 'maintenance',
        averageSoH: 95,
        activeAlerts: 0,
      });
      expect(health).toBe('warning');
    });

    it('should return healthy for good metrics', () => {
      const health = calculateFacilityHealth({
        averageSoH: 95,
        activeAlerts: 0,
        status: 'active',
      });
      expect(health).toBe('healthy');
    });

    it('should handle missing metrics gracefully', () => {
      const health = calculateFacilityHealth({});
      expect(health).toBe('healthy');
    });
  });

  describe('getHealthColor', () => {
    it('should return green for healthy', () => {
      expect(getHealthColor('healthy')).toBe('#10b981');
    });

    it('should return amber for warning', () => {
      expect(getHealthColor('warning')).toBe('#f59e0b');
    });

    it('should return red for critical', () => {
      expect(getHealthColor('critical')).toBe('#ef4444');
    });
  });

  describe('getHealthLabel', () => {
    it('should return correct label for healthy', () => {
      expect(getHealthLabel('healthy')).toBe('Healthy');
    });

    it('should return correct label for warning', () => {
      expect(getHealthLabel('warning')).toBe('Warning');
    });

    it('should return correct label for critical', () => {
      expect(getHealthLabel('critical')).toBe('Critical');
    });
  });
});
