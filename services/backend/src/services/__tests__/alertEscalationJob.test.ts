/**
 * Alert Escalation Job Tests
 * T131: US3 - Test scheduled escalation job
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlertEscalationJob } from '../alertEscalationJob';
import { pool } from '../../config/database';

describe('AlertEscalationJob', () => {
  let job: AlertEscalationJob;

  beforeEach(async () => {
    // Clean up test data
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM alert_escalation_events');
      await client.query('DELETE FROM alerts');
    } finally {
      client.release();
    }

    job = new AlertEscalationJob(1); // 1 minute interval for testing
  });

  afterEach(() => {
    job.stop();
  });

  describe('start and stop', () => {
    it('should start the job successfully', () => {
      job.start();
      const status = job.getStatus();
      expect(status.isRunning).toBe(false); // Not running until cron triggers
    });

    it('should not start if already started', () => {
      job.start();
      const consoleSpy = vi.spyOn(console, 'log');
      job.start();
      expect(consoleSpy).toHaveBeenCalledWith('Alert escalation job is already running');
    });

    it('should stop the job', () => {
      job.start();
      job.stop();
      const status = job.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('triggerManually', () => {
    it('should trigger job manually', async () => {
      await job.triggerManually();
      const status = job.getStatus();

      expect(status.lastRun).not.toBeNull();
      expect(status.metrics).not.toBeNull();
      expect(status.metrics?.alertsChecked).toBeGreaterThanOrEqual(0);
    });

    it('should throw error if job is already running', async () => {
      // Start manual trigger but don't await
      const promise = job.triggerManually();

      // Try to trigger again immediately
      await expect(job.triggerManually()).rejects.toThrow('Job is already running');

      // Wait for first trigger to complete
      await promise;
    });
  });

  describe('getStatus', () => {
    it('should return correct status after job execution', async () => {
      await job.triggerManually();
      const status = job.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.lastRun).toBeInstanceOf(Date);
      expect(status.metrics).toBeDefined();
      expect(status.metrics?.startTime).toBeInstanceOf(Date);
      expect(status.metrics?.endTime).toBeInstanceOf(Date);
      expect(status.metrics?.alertsChecked).toBeGreaterThanOrEqual(0);
      expect(status.metrics?.alertsEscalated).toBeGreaterThanOrEqual(0);
      expect(status.metrics?.notificationsSent).toBeGreaterThanOrEqual(0);
      expect(status.metrics?.errors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('job execution', () => {
    it('should escalate eligible alerts', async () => {
      const client = await pool.connect();
      try {
        // Create a high severity alert from 31 minutes ago
        const createdAt = new Date(Date.now() - 31 * 60 * 1000);
        await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['battery-1', 'default', 'Temperature High', 'high', 'active', 'High temperature', createdAt]
        );

        await job.triggerManually();
        const status = job.getStatus();

        expect(status.metrics?.alertsChecked).toBe(1);
        expect(status.metrics?.alertsEscalated).toBe(1);

        // Verify alert was escalated
        const alertResult = await client.query(
          'SELECT severity FROM alerts WHERE battery_system_id = $1',
          ['battery-1']
        );
        expect(alertResult.rows[0].severity).toBe('critical');
      } finally {
        client.release();
      }
    });
  });
});
