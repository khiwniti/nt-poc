/**
 * Security Tests - SQL Injection
 * Tests for SQL injection vulnerabilities
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import db from '../../../config/database.js';

describe('SQL Injection Prevention', () => {
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "1' OR '1' = '1",
    "' OR 1=1--",
    "admin'--",
    "1' UNION SELECT NULL--",
    "' OR 'a'='a",
    "1'; DROP TABLE facilities;--",
    "' OR EXISTS(SELECT * FROM facilities)--",
    "1' AND 1=CONVERT(int, (SELECT @@version))--",
  ];

  describe('GET /api/v1/facilities - Query Parameter Injection', () => {
    it.each(sqlInjectionPayloads)(
      'should safely handle SQL injection payload: %s',
      async (payload) => {
        const response = await request(app)
          .get('/api/v1/facilities')
          .query({ id: payload });

        // Should not expose SQL errors
        expect(response.status).not.toBe(500);
        expect(response.body).not.toHaveProperty('sql');
        expect(response.body).not.toHaveProperty('sqlMessage');
        
        // Should return valid response (400, 404, or 200 with sanitized data)
        expect([200, 400, 404]).toContain(response.status);
      }
    );

    it('should use parameterized queries for search', async () => {
      const maliciousSearch = "test'; DROP TABLE facilities; --";
      const response = await request(app)
        .get('/api/v1/facilities')
        .query({ search: maliciousSearch });

      expect(response.status).not.toBe(500);
      
      // Verify table still exists
      const result = await db.raw('SELECT COUNT(*) as count FROM facilities');
      expect(result.rows[0].count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/v1/sensor-readings - SQL Injection in Filters', () => {
    it.each(sqlInjectionPayloads)(
      'should sanitize facilityId parameter: %s',
      async (payload) => {
        const response = await request(app)
          .get('/api/v1/sensor-readings')
          .query({ facilityId: payload });

        expect(response.status).not.toBe(500);
        expect(response.body).not.toHaveProperty('sql');
      }
    );

    it('should prevent injection in sort parameter', async () => {
      const maliciousSort = "timestamp; DROP TABLE sensor_readings; --";
      const response = await request(app)
        .get('/api/v1/sensor-readings')
        .query({ sort: maliciousSort });

      expect([200, 400]).toContain(response.status);
      
      // Verify table integrity
      const result = await db.raw('SELECT COUNT(*) as count FROM sensor_readings');
      expect(result.rows).toBeDefined();
    });
  });

  describe('POST /api/v1/alerts - SQL Injection in Request Body', () => {
    it('should sanitize alert creation payload', async () => {
      const maliciousPayload = {
        facilityId: "1'; DROP TABLE alerts; --",
        severity: 'high',
        message: "' OR '1'='1",
        metadata: { test: "'; DELETE FROM alerts WHERE '1'='1" },
      };

      const response = await request(app)
        .post('/api/v1/alerts')
        .send(maliciousPayload);

      expect([200, 201, 400, 404]).toContain(response.status);
      expect(response.body).not.toHaveProperty('sql');
      
      // Verify alerts table exists
      const result = await db.raw('SELECT COUNT(*) as count FROM alerts');
      expect(result.rows).toBeDefined();
    });
  });

  describe('Database Connection - Raw Query Protection', () => {
    it('should prevent SQL injection in raw queries', async () => {
      const maliciousInput = "1' OR '1'='1";
      
      // Test parameterized query (safe)
      const safeQuery = await db
        .select('*')
        .from('facilities')
        .where('id', maliciousInput)
        .limit(1);

      // Should return empty or single facility, not all facilities
      expect(safeQuery.length).toBeLessThanOrEqual(1);
    });

    it('should validate numeric IDs', async () => {
      const invalidIds = ["abc", "1' OR '1'='1", "NULL", "undefined"];
      
      for (const id of invalidIds) {
        const response = await request(app)
          .get(`/api/v1/facilities/${id}`);
        
        // Should handle gracefully, not execute SQL
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Advanced SQL Injection Patterns', () => {
    it('should prevent time-based blind SQL injection', async () => {
      const timeBasedPayload = "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--";
      
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/facilities')
        .query({ id: timeBasedPayload });
      const duration = Date.now() - startTime;

      // Should not delay response (indicating SLEEP was executed)
      expect(duration).toBeLessThan(2000);
      expect([200, 400, 404]).toContain(response.status);
    });

    it('should prevent UNION-based SQL injection', async () => {
      const unionPayload = "1' UNION SELECT id, name, NULL, NULL FROM facilities--";
      
      const response = await request(app)
        .get('/api/v1/sensor-readings')
        .query({ facilityId: unionPayload });

      expect(response.status).not.toBe(500);
      
      // Response should not contain data from unauthorized UNION
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should prevent error-based SQL injection', async () => {
      const errorPayload = "1' AND 1=CONVERT(int, (SELECT TOP 1 name FROM facilities))--";
      
      const response = await request(app)
        .get('/api/v1/facilities')
        .query({ id: errorPayload });

      // Should not expose database error details
      expect(response.body).not.toMatch(/convert|syntax|error|sql/i);
    });
  });
});
