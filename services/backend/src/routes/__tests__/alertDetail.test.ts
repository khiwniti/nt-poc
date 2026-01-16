import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

// Mock authentication middleware
vi.mock('../../middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@example.com' };
    next();
  },
  AuthRequest: {} as any,
}));

describe('Alert Detail Endpoints', () => {
  describe('GET /api/v1/alerts/:id/history', () => {
    it('should return sensor history and timeline for an alert', async () => {
      const response = await request(app)
        .get('/api/v1/alerts/alert-1/history')
        .expect(200);

      expect(response.body).toHaveProperty('readings');
      expect(response.body).toHaveProperty('timeline');
      expect(Array.isArray(response.body.readings)).toBe(true);
      expect(Array.isArray(response.body.timeline)).toBe(true);
      
      if (response.body.readings.length > 0) {
        const reading = response.body.readings[0];
        expect(reading).toHaveProperty('timestamp');
        expect(reading).toHaveProperty('temperature');
        expect(reading).toHaveProperty('voltage');
        expect(reading).toHaveProperty('soc');
      }

      if (response.body.timeline.length > 0) {
        const event = response.body.timeline[0];
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('event');
      }
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .get('/api/v1/alerts/non-existent-alert/history')
        .expect(404);

      expect(response.body.error).toBe('Alert not found');
    });
  });

  describe('POST /api/v1/alerts/:id/acknowledge', () => {
    it('should acknowledge an active alert', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/alert-1/acknowledge')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe('acknowledged');
      expect(response.body.data).toHaveProperty('acknowledgedAt');
      expect(response.body.data.acknowledgedAt).toBeTypeOf('number');
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/non-existent-alert/acknowledge')
        .expect(404);

      expect(response.body.error).toBe('Alert not found');
    });
  });

  describe('POST /api/v1/alerts/:id/resolve', () => {
    it('should resolve an alert with notes', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/alert-1/resolve')
        .send({ notes: 'Fixed temperature issue by cleaning cooling system' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data).toHaveProperty('resolvedAt');
      expect(response.body.data).toHaveProperty('duration');
      expect(response.body.data.resolvedAt).toBeTypeOf('number');
      expect(response.body.data.duration).toBeTypeOf('number');
    });

    it('should return 400 when notes are missing', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/alert-1/resolve')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Resolution notes are required');
    });

    it('should return 400 when notes are empty', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/alert-1/resolve')
        .send({ notes: '   ' })
        .expect(400);

      expect(response.body.error).toBe('Resolution notes are required');
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/non-existent-alert/resolve')
        .send({ notes: 'Test notes' })
        .expect(404);

      expect(response.body.error).toBe('Alert not found');
    });
  });
});
