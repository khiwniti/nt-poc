/**
 * Alert Escalation Service Tests
 * T131: US3 - Test alert escalation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pool } from '../../config/database.js';
import alertEscalationService from '../alertEscalationService.js';
import type { Alert, AlertSeverity } from '../../types/alertEscalation.js';

describe('AlertEscalationService', () => {
  beforeEach(async () => {
    // Clean up test data
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM alert_escalation_events');
      await client.query('DELETE FROM alerts');
      await client.query('DELETE FROM escalation_rules WHERE facility_id != $1', ['default']);
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    // Clean up test data
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM alert_escalation_events');
      await client.query('DELETE FROM alerts');
      await client.query('DELETE FROM escalation_rules WHERE facility_id != $1', ['default']);
    } finally {
      client.release();
    }
  });

  describe('getEscalationRule', () => {
    it('should return default rule when facility has no custom rule', async () => {
      const rule = await alertEscalationService.getEscalationRule('test-facility');

      expect(rule).toBeDefined();
      expect(rule?.facilityId).toBe('default');
      expect(rule?.infoToMediumMinutes).toBe(120);
      expect(rule?.mediumToHighMinutes).toBe(60);
      expect(rule?.highToCriticalMinutes).toBe(30);
      expect(rule?.enabled).toBe(true);
    });

    it('should return custom rule when facility has one', async () => {
      await alertEscalationService.upsertEscalationRule('custom-facility', 90, 45, 20, true);

      const rule = await alertEscalationService.getEscalationRule('custom-facility');

      expect(rule).toBeDefined();
      expect(rule?.facilityId).toBe('custom-facility');
      expect(rule?.infoToMediumMinutes).toBe(90);
      expect(rule?.mediumToHighMinutes).toBe(45);
      expect(rule?.highToCriticalMinutes).toBe(20);
    });
  });

  describe('upsertEscalationRule', () => {
    it('should create a new escalation rule', async () => {
      const rule = await alertEscalationService.upsertEscalationRule(
        'new-facility',
        100,
        50,
        25,
        true
      );

      expect(rule.facilityId).toBe('new-facility');
      expect(rule.infoToMediumMinutes).toBe(100);
      expect(rule.mediumToHighMinutes).toBe(50);
      expect(rule.highToCriticalMinutes).toBe(25);
      expect(rule.enabled).toBe(true);
    });

    it('should update existing escalation rule', async () => {
      await alertEscalationService.upsertEscalationRule('update-facility', 100, 50, 25, true);

      const updatedRule = await alertEscalationService.upsertEscalationRule(
        'update-facility',
        80,
        40,
        20,
        false
      );

      expect(updatedRule.facilityId).toBe('update-facility');
      expect(updatedRule.infoToMediumMinutes).toBe(80);
      expect(updatedRule.mediumToHighMinutes).toBe(40);
      expect(updatedRule.highToCriticalMinutes).toBe(20);
      expect(updatedRule.enabled).toBe(false);
    });
  });

  describe('findEscalationCandidates', () => {
    it('should find high severity alerts eligible for escalation to critical', async () => {
      const client = await pool.connect();
      try {
        // Create a high severity alert from 31 minutes ago
        const createdAt = new Date(Date.now() - 31 * 60 * 1000);
        await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['battery-1', 'default', 'Temperature High', 'high', 'active', 'High temperature detected', createdAt]
        );

        const candidates = await alertEscalationService.findEscalationCandidates();

        expect(candidates).toHaveLength(1);
        expect(candidates[0].alert.severity).toBe('high');
        expect(candidates[0].targetSeverity).toBe('critical');
        expect(candidates[0].minutesSinceCreated).toBeGreaterThan(30);
      } finally {
        client.release();
      }
    });

    it('should find medium severity alerts eligible for escalation to high', async () => {
      const client = await pool.connect();
      try {
        // Create a medium severity alert from 61 minutes ago
        const createdAt = new Date(Date.now() - 61 * 60 * 1000);
        await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['battery-1', 'default', 'Voltage Anomaly', 'medium', 'active', 'Voltage anomaly detected', createdAt]
        );

        const candidates = await alertEscalationService.findEscalationCandidates();

        expect(candidates).toHaveLength(1);
        expect(candidates[0].alert.severity).toBe('medium');
        expect(candidates[0].targetSeverity).toBe('high');
        expect(candidates[0].minutesSinceCreated).toBeGreaterThan(60);
      } finally {
        client.release();
      }
    });

    it('should not find alerts that are acknowledged', async () => {
      const client = await pool.connect();
      try {
        // Create an acknowledged high severity alert from 31 minutes ago
        const createdAt = new Date(Date.now() - 31 * 60 * 1000);
        await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message, created_at, acknowledged_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          ['battery-1', 'default', 'Temperature High', 'high', 'acknowledged', 'High temperature detected', createdAt]
        );

        const candidates = await alertEscalationService.findEscalationCandidates();

        expect(candidates).toHaveLength(0);
      } finally {
        client.release();
      }
    });

    it('should not find critical alerts (cannot escalate beyond critical)', async () => {
      const client = await pool.connect();
      try {
        // Create a critical alert from 31 minutes ago
        const createdAt = new Date(Date.now() - 31 * 60 * 1000);
        await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['battery-1', 'default', 'Critical Failure', 'critical', 'active', 'Critical failure detected', createdAt]
        );

        const candidates = await alertEscalationService.findEscalationCandidates();

        expect(candidates).toHaveLength(0);
      } finally {
        client.release();
      }
    });
  });

  describe('escalateAlert', () => {
    it('should escalate alert and create escalation event', async () => {
      const client = await pool.connect();
      let alertId: string;

      try {
        // Create a high severity alert
        const result = await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          ['battery-1', 'default', 'Temperature High', 'high', 'active', 'High temperature detected']
        );
        alertId = result.rows[0].id;

        // Escalate the alert
        const event = await alertEscalationService.escalateAlert(
          alertId,
          'critical',
          'Auto-escalated after 30 minutes'
        );

        expect(event.alertId).toBe(alertId);
        expect(event.fromSeverity).toBe('high');
        expect(event.toSeverity).toBe('critical');
        expect(event.autoEscalated).toBe(true);

        // Verify alert was updated
        const alertResult = await client.query('SELECT severity FROM alerts WHERE id = $1', [alertId]);
        expect(alertResult.rows[0].severity).toBe('critical');
      } finally {
        client.release();
      }
    });

    it('should throw error for non-existent alert', async () => {
      await expect(
        alertEscalationService.escalateAlert('non-existent-id', 'critical', 'Test')
      ).rejects.toThrow();
    });
  });

  describe('getEscalationHistory', () => {
    it('should return escalation history for an alert', async () => {
      const client = await pool.connect();
      let alertId: string;

      try {
        // Create a medium severity alert
        const alertResult = await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          ['battery-1', 'default', 'Temperature High', 'medium', 'active', 'Temperature rising']
        );
        alertId = alertResult.rows[0].id;

        // Escalate twice
        await alertEscalationService.escalateAlert(alertId, 'high', 'First escalation');
        await alertEscalationService.escalateAlert(alertId, 'critical', 'Second escalation');

        const history = await alertEscalationService.getEscalationHistory(alertId);

        expect(history).toHaveLength(2);
        expect(history[0].toSeverity).toBe('critical');
        expect(history[1].toSeverity).toBe('high');
      } finally {
        client.release();
      }
    });
  });

  describe('processEscalations', () => {
    it('should process multiple escalation candidates', async () => {
      const client = await pool.connect();
      try {
        // Create multiple alerts eligible for escalation
        const highCreatedAt = new Date(Date.now() - 31 * 60 * 1000);
        await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message, created_at
          ) VALUES 
            ($1, $2, $3, $4, $5, $6, $7),
            ($8, $9, $10, $11, $12, $13, $14)`,
          [
            'battery-1', 'default', 'Temperature High', 'high', 'active', 'High temp', highCreatedAt,
            'battery-2', 'default', 'Voltage Low', 'high', 'active', 'Low voltage', highCreatedAt,
          ]
        );

        const result = await alertEscalationService.processEscalations();

        expect(result.checked).toBe(2);
        expect(result.escalated).toBe(2);
        expect(result.errors).toHaveLength(0);
      } finally {
        client.release();
      }
    });
  });
});
