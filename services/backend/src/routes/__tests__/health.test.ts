import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';

describe('Health API Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should include service info', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.service).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/api/health/ready').expect(200);

      expect(response.body.ready).toBe(true);
      expect(response.body.checks).toBeDefined();
    });

    it('should check database connection', async () => {
      const response = await request(app).get('/api/health/ready').expect(200);

      expect(response.body.checks.database).toBeDefined();
    });
  });

  describe('GET /api/health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app).get('/api/health/live').expect(200);

      expect(response.body.alive).toBe(true);
    });
  });
});
