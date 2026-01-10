/**
 * Alert Rule Routes Tests
 * T118: US3 - Test API endpoints for alert rule management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { pool } from '../../config/database.js';

describe('Alert Rule Routes', () => {
  let authToken: string;
  let testFacilityId: string;
  let testRuleId: string;

  beforeEach(async () => {
    authToken = 'test-token';
    process.env.JWT_SECRET = 'test-secret';

    const client = await pool.connect();
    try {
      const facilityResult = await client.query(
        `INSERT INTO facilities (name, location, timezone) VALUES ($1, $2, $3) RETURNING id`,
        ['Test Facility', 'Test Location', 'UTC']
      );
      testFacilityId = facilityResult.rows[0].id;
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    const client = await pool.connect();
    try {
      if (testRuleId) {
        await client.query(`DELETE FROM alert_rules WHERE id = $1`, [testRuleId]);
      }
      await client.query(`DELETE FROM facilities WHERE id = $1`, [testFacilityId]);
    } finally {
      client.release();
    }
  });

  describe('POST /api/v1/alert-rules', () => {
    it('should create a new alert rule', async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          name: 'High Temperature Alert',
          description: 'Alert when temperature exceeds 45°C',
          ruleType: 'temperature',
          operator: '>',
          thresholdValue: 45.0,
          severity: 'high',
          enabled: true,
          debounceMinutes: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('High Temperature Alert');
      expect(response.body.data.ruleType).toBe('temperature');

      testRuleId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          // Missing name
          ruleType: 'temperature',
          operator: '>',
          thresholdValue: 45.0,
          severity: 'high',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name');
    });

    it('should validate rule type', async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          name: 'Test Rule',
          ruleType: 'invalid_type',
          operator: '>',
          thresholdValue: 45.0,
          severity: 'high',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ruleType');
    });

    it('should validate operator', async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          name: 'Test Rule',
          ruleType: 'temperature',
          operator: 'invalid',
          thresholdValue: 45.0,
          severity: 'high',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('operator');
    });
  });

  describe('GET /api/v1/alert-rules', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          name: 'Test Rule',
          ruleType: 'temperature',
          operator: '>',
          thresholdValue: 45.0,
          severity: 'high',
        });
      testRuleId = response.body.data.id;
    });

    it('should list rules for a facility', async () => {
      const response = await request(app)
        .get('/api/v1/alert-rules')
        .query({ facilityId: testFacilityId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require facilityId parameter', async () => {
      const response = await request(app)
        .get('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('facilityId');
    });
  });

  describe('GET /api/v1/alert-rules/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          name: 'Test Rule',
          ruleType: 'temperature',
          operator: '>',
          thresholdValue: 45.0,
          severity: 'high',
        });
      testRuleId = response.body.data.id;
    });

    it('should get a rule by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/alert-rules/${testRuleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testRuleId);
      expect(response.body.data.name).toBe('Test Rule');
    });

    it('should return 404 for non-existent rule', async () => {
      const response = await request(app)
        .get('/api/v1/alert-rules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/alert-rules/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          name: 'Original Name',
          ruleType: 'temperature',
          operator: '>',
          thresholdValue: 45.0,
          severity: 'high',
        });
      testRuleId = response.body.data.id;
    });

    it('should update a rule', async () => {
      const response = await request(app)
        .patch(`/api/v1/alert-rules/${testRuleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          thresholdValue: 50.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.thresholdValue).toBe(50.0);
    });

    it('should validate operator on update', async () => {
      const response = await request(app)
        .patch(`/api/v1/alert-rules/${testRuleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operator: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('operator');
    });
  });

  describe('DELETE /api/v1/alert-rules/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          name: 'To Delete',
          ruleType: 'temperature',
          operator: '>',
          thresholdValue: 45.0,
          severity: 'high',
        });
      testRuleId = response.body.data.id;
    });

    it('should delete a rule', async () => {
      const response = await request(app)
        .delete(`/api/v1/alert-rules/${testRuleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/v1/alert-rules/${testRuleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
      testRuleId = ''; // Cleared since deleted
    });
  });

  describe('GET /api/v1/alert-rules/:id/audit-log', () => {
    it('should get audit log for a rule', async () => {
      const createResponse = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          facilityId: testFacilityId,
          name: 'Test Audit',
          ruleType: 'temperature',
          operator: '>',
          thresholdValue: 45.0,
          severity: 'high',
        });
      testRuleId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/alert-rules/${testRuleId}/audit-log`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/alert-rules/job/status', () => {
    it('should get job status', async () => {
      const response = await request(app)
        .get('/api/v1/alert-rules/job/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.isRunning).toBeDefined();
    });
  });

  describe('POST /api/v1/alert-rules/job/trigger', () => {
    it('should trigger job manually', async () => {
      const response = await request(app)
        .post('/api/v1/alert-rules/job/trigger')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
