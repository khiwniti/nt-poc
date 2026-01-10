import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import chaosRouter from '../chaos.js';
import { chaosMonkey } from '../../chaos/chaosMonkey.js';

const app = express();
app.use(express.json());
app.use('/api/v1/chaos', chaosRouter);

describe('Chaos Routes', () => {
  beforeEach(() => {
    // Reset chaos monkey to known state
    chaosMonkey.updateConfig({
      enabled: false,
      failureRate: 0.1,
      scenarios: {
        serviceFailure: true,
        networkLatency: true,
        databaseFailure: true,
        redisFailure: true,
      },
    });
  });

  afterEach(() => {
    // Disable chaos after each test
    chaosMonkey.updateConfig({ enabled: false });
  });

  describe('GET /api/v1/chaos/config', () => {
    it('should return current chaos configuration', async () => {
      const response = await request(app).get('/api/v1/chaos/config');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('failureRate');
      expect(response.body).toHaveProperty('scenarios');
      expect(response.body).toHaveProperty('networkLatencyMs');
    });
  });

  describe('POST /api/v1/chaos/config', () => {
    it('should update chaos configuration', async () => {
      const response = await request(app)
        .post('/api/v1/chaos/config')
        .send({
          enabled: true,
          failureRate: 0.5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.enabled).toBe(true);
      expect(response.body.config.failureRate).toBe(0.5);
    });

    it('should validate failure rate range', async () => {
      const response = await request(app)
        .post('/api/v1/chaos/config')
        .send({
          failureRate: 1.5, // invalid
        });

      // Should still succeed but ignore invalid value
      expect(response.status).toBe(200);
      expect(chaosMonkey.getConfig().failureRate).not.toBe(1.5);
    });

    it('should update specific scenarios', async () => {
      const response = await request(app)
        .post('/api/v1/chaos/config')
        .send({
          scenarios: {
            serviceFailure: false,
            networkLatency: true,
            databaseFailure: false,
            redisFailure: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.config.scenarios.serviceFailure).toBe(false);
      expect(response.body.config.scenarios.networkLatency).toBe(true);
    });

    it('should update network latency settings', async () => {
      const response = await request(app)
        .post('/api/v1/chaos/config')
        .send({
          networkLatencyMs: {
            min: 200,
            max: 1000,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.config.networkLatencyMs.min).toBe(200);
      expect(response.body.config.networkLatencyMs.max).toBe(1000);
    });
  });

  describe('POST /api/v1/chaos/enable', () => {
    it('should enable chaos testing', async () => {
      const response = await request(app).post('/api/v1/chaos/enable');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enabled).toBe(true);
      expect(chaosMonkey.isEnabled()).toBe(true);
    });
  });

  describe('POST /api/v1/chaos/disable', () => {
    it('should disable chaos testing', async () => {
      chaosMonkey.updateConfig({ enabled: true });

      const response = await request(app).post('/api/v1/chaos/disable');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enabled).toBe(false);
      expect(chaosMonkey.isEnabled()).toBe(false);
    });
  });

  describe('POST /api/v1/chaos/test/:scenario', () => {
    beforeEach(() => {
      chaosMonkey.updateConfig({ enabled: true, failureRate: 1.0 });
    });

    it('should test service-failure scenario', async () => {
      const response = await request(app).post('/api/v1/chaos/test/service-failure');

      // With 100% failure rate, should fail
      expect([200, 500]).toContain(response.status);
      if (response.status === 500) {
        expect(response.body.failureInjected).toBe(true);
      }
    });

    it('should test network-latency scenario', async () => {
      const response = await request(app).post('/api/v1/chaos/test/network-latency');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('latencyMs');
    });

    it('should test database-failure scenario', async () => {
      const response = await request(app).post('/api/v1/chaos/test/database-failure');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.failureInjected).toBe('boolean');
    });

    it('should test redis-failure scenario', async () => {
      const response = await request(app).post('/api/v1/chaos/test/redis-failure');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.failureInjected).toBe('boolean');
    });

    it('should return error for unknown scenario', async () => {
      const response = await request(app).post('/api/v1/chaos/test/unknown-scenario');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Unknown scenario');
    });
  });
});
