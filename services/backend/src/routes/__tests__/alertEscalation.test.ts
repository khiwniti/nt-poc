/**
 * Alert Escalation API Tests
 * T131: US3 - Test alert escalation API endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { pool } from '../../config/database.js';

const authToken = 'test-token';

describe('Alert Escalation API', () => {
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

  describe('POST /api/v1/alerts/escalation/rules', () => {
    it('should configure escalation rules for a facility', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/escalation/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: 'test-facility',
          infoToMediumMinutes: 100,
          mediumToHighMinutes: 50,
          highToCriticalMinutes: 25,
          enabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.facilityId).toBe('test-facility');
      expect(response.body.data.infoToMediumMinutes).toBe(100);
      expect(response.body.data.mediumToHighMinutes).toBe(50);
      expect(response.body.data.highToCriticalMinutes).toBe(25);
    });

    it('should return 400 if facilityId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/escalation/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          infoToMediumMinutes: 100,
          mediumToHighMinutes: 50,
          highToCriticalMinutes: 25,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('facilityId is required');
    });

    it('should return 400 if time values are not numbers', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/escalation/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: 'test-facility',
          infoToMediumMinutes: 'invalid',
          mediumToHighMinutes: 50,
          highToCriticalMinutes: 25,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be numbers');
    });

    it('should update existing rules', async () => {
      // Create initial rule
      await request(app)
        .post('/api/v1/alerts/escalation/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: 'test-facility',
          infoToMediumMinutes: 100,
          mediumToHighMinutes: 50,
          highToCriticalMinutes: 25,
          enabled: true,
        });

      // Update rule
      const response = await request(app)
        .post('/api/v1/alerts/escalation/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: 'test-facility',
          infoToMediumMinutes: 80,
          mediumToHighMinutes: 40,
          highToCriticalMinutes: 20,
          enabled: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.infoToMediumMinutes).toBe(80);
      expect(response.body.data.mediumToHighMinutes).toBe(40);
      expect(response.body.data.highToCriticalMinutes).toBe(20);
      expect(response.body.data.enabled).toBe(false);
    });
  });

  describe('GET /api/v1/alerts/escalation/rules/:facilityId', () => {
    it('should get escalation rules for a facility', async () => {
      // Create rule first
      await request(app)
        .post('/api/v1/alerts/escalation/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: 'test-facility',
          infoToMediumMinutes: 100,
          mediumToHighMinutes: 50,
          highToCriticalMinutes: 25,
          enabled: true,
        });

      const response = await request(app)
        .get('/api/v1/alerts/escalation/rules/test-facility')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.facilityId).toBe('test-facility');
      expect(response.body.data.infoToMediumMinutes).toBe(100);
    });

    it('should return default rules if facility has no custom rules', async () => {
      const response = await request(app)
        .get('/api/v1/alerts/escalation/rules/non-existent-facility')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.facilityId).toBe('default');
      expect(response.body.data.highToCriticalMinutes).toBe(30);
    });
  });

  describe('GET /api/v1/alerts/:id/escalation-history', () => {
    it('should get escalation history for an alert', async () => {
      const client = await pool.connect();
      let alertId: string;

      try {
        // Create alert
        const alertResult = await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          ['battery-1', 'default', 'Temperature High', 'medium', 'active', 'High temp']
        );
        alertId = alertResult.rows[0].id;

        // Create escalation event
        await client.query(
          `INSERT INTO alert_escalation_events (
            alert_id, from_severity, to_severity, reason
          ) VALUES ($1, $2, $3, $4)`,
          [alertId, 'medium', 'high', 'Auto-escalated']
        );

        const response = await request(app)
          .get(`/api/v1/alerts/${alertId}/escalation-history`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].fromSeverity).toBe('medium');
        expect(response.body.data[0].toSeverity).toBe('high');
      } finally {
        client.release();
      }
    });

    it('should return empty array for alert with no escalations', async () => {
      const client = await pool.connect();
      let alertId: string;

      try {
        const alertResult = await client.query(
          `INSERT INTO alerts (
            battery_system_id, facility_id, type, severity, status, message
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          ['battery-1', 'default', 'Temperature High', 'high', 'active', 'High temp']
        );
        alertId = alertResult.rows[0].id;

        const response = await request(app)
          .get(`/api/v1/alerts/${alertId}/escalation-history`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(0);
      } finally {
        client.release();
      }
    });
  });

  describe('GET /api/v1/alerts/escalation/job-status', () => {
    it('should get escalation job status', async () => {
      const response = await request(app)
        .get('/api/v1/alerts/escalation/job-status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('lastRun');
      expect(response.body.data).toHaveProperty('metrics');
    });
  });

  describe('POST /api/v1/alerts/escalation/trigger', () => {
    it('should manually trigger escalation job', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/escalation/trigger')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Escalation job triggered successfully');
      expect(response.body.data.triggeredAt).toBeDefined();
    });
  });
});
