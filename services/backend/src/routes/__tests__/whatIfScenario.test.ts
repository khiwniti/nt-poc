import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database.js';

vi.mock('../../config/database.js');
vi.mock('../../middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => next(),
  AuthRequest: class {},
}));

describe('What-If Scenario Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/what-if/simulate', () => {
    it('simulates a scenario with valid parameters', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          {
            predicted_rul: 180,
            confidence: 0.92,
            features: {
              temperature: 25,
              load_percentage: 50,
              cycle_frequency: 1,
            },
          },
        ],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app)
        .post('/api/v1/what-if/simulate')
        .send({
          batterySystemId: 'test-battery-id',
          parameters: {
            temperature: 35,
            loadPercentage: 80,
            cycleFrequency: 2,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rul');
      expect(response.body).toHaveProperty('healthScore');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('parameters');
    });

    it('returns 400 for missing parameters', async () => {
      const response = await request(app)
        .post('/api/v1/what-if/simulate')
        .send({
          batterySystemId: 'test-battery-id',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing batterySystemId or parameters');
    });

    it('returns 400 for invalid parameter values', async () => {
      const response = await request(app)
        .post('/api/v1/what-if/simulate')
        .send({
          batterySystemId: 'test-battery-id',
          parameters: {
            temperature: 100, // Invalid: > 60
            loadPercentage: 50,
            cycleFrequency: 1,
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid parameter values');
    });

    it('returns 404 when no predictions exist for battery', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app)
        .post('/api/v1/what-if/simulate')
        .send({
          batterySystemId: 'non-existent-battery',
          parameters: {
            temperature: 25,
            loadPercentage: 50,
            cycleFrequency: 1,
          },
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No predictions found for this battery system');
    });

    it('simulates decreased RUL with higher temperature', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          {
            predicted_rul: 180,
            confidence: 0.92,
            features: {
              temperature: 25,
              load_percentage: 50,
              cycle_frequency: 1,
            },
          },
        ],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app)
        .post('/api/v1/what-if/simulate')
        .send({
          batterySystemId: 'test-battery-id',
          parameters: {
            temperature: 45, // 20 degrees higher
            loadPercentage: 50,
            cycleFrequency: 1,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.rul).toBeLessThan(180);
    });
  });

  describe('GET /api/v1/what-if/current/:batteryId', () => {
    it('returns current prediction for battery system', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          {
            predicted_rul: 180,
            confidence: 0.92,
            features: {
              temperature: 25,
              load_percentage: 50,
              cycle_frequency: 1,
            },
          },
        ],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app).get('/api/v1/what-if/current/test-battery-id');

      expect(response.status).toBe(200);
      expect(response.body.rul).toBe(180);
      expect(response.body.healthScore).toBeDefined();
      expect(response.body.confidence).toBe(0.92);
      expect(response.body.parameters).toEqual({
        temperature: 25,
        loadPercentage: 50,
        cycleFrequency: 1,
      });
    });

    it('returns 404 when no predictions exist', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app).get('/api/v1/what-if/current/non-existent-battery');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No predictions found for this battery system');
    });
  });

  describe('POST /api/v1/what-if/scenarios', () => {
    it('saves a scenario successfully', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'scenario-1',
            battery_system_id: 'test-battery-id',
            name: 'High Temperature Scenario',
            description: 'Test scenario',
            parameters: {
              temperature: 35,
              loadPercentage: 80,
              cycleFrequency: 2,
            },
            prediction: {
              rul: 150,
              healthScore: 75,
              confidence: 0.88,
              parameters: {
                temperature: 35,
                loadPercentage: 80,
                cycleFrequency: 2,
              },
            },
            created_at: new Date(),
          },
        ],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app)
        .post('/api/v1/what-if/scenarios')
        .send({
          batterySystemId: 'test-battery-id',
          name: 'High Temperature Scenario',
          description: 'Test scenario',
          parameters: {
            temperature: 35,
            loadPercentage: 80,
            cycleFrequency: 2,
          },
          prediction: {
            rul: 150,
            healthScore: 75,
            confidence: 0.88,
            parameters: {
              temperature: 35,
              loadPercentage: 80,
              cycleFrequency: 2,
            },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('scenario-1');
      expect(response.body.name).toBe('High Temperature Scenario');
    });

    it('returns 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/what-if/scenarios')
        .send({
          batterySystemId: 'test-battery-id',
          name: 'Test Scenario',
          // Missing parameters and prediction
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('GET /api/v1/what-if/scenarios/:batteryId', () => {
    it('returns all saved scenarios for battery system', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'scenario-1',
            battery_system_id: 'test-battery-id',
            name: 'Scenario 1',
            description: 'First scenario',
            parameters: { temperature: 30, loadPercentage: 60, cycleFrequency: 1.5 },
            prediction: { rul: 160, healthScore: 80, confidence: 0.9, parameters: {} },
            created_at: new Date(),
          },
          {
            id: 'scenario-2',
            battery_system_id: 'test-battery-id',
            name: 'Scenario 2',
            description: null,
            parameters: { temperature: 40, loadPercentage: 70, cycleFrequency: 2 },
            prediction: { rul: 140, healthScore: 70, confidence: 0.85, parameters: {} },
            created_at: new Date(),
          },
        ],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app).get('/api/v1/what-if/scenarios/test-battery-id');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Scenario 1');
      expect(response.body.data[1].name).toBe('Scenario 2');
    });

    it('returns empty array when no scenarios exist', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app).get('/api/v1/what-if/scenarios/test-battery-id');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('DELETE /api/v1/what-if/scenarios/:scenarioId', () => {
    it('deletes a scenario successfully', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [{ id: 'scenario-1' }],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app).delete('/api/v1/what-if/scenarios/scenario-1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Scenario deleted successfully');
    });

    it('returns 404 when scenario does not exist', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      vi.mocked(pool).query = mockQuery;

      const response = await request(app).delete('/api/v1/what-if/scenarios/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Scenario not found');
    });
  });
});
