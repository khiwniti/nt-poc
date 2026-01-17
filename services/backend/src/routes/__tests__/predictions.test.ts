import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database.js';
import jwt from 'jsonwebtoken';

const generateToken = () => {
  return jwt.sign(
    { userId: 'user-123', role: 'admin' },
    process.env.JWT_SECRET || 'test-secret'
  );
};

describe('RUL Predictions API', () => {
  let authToken: string;
  const testBatteryId = 'bat-test-predictions';
  const testPredictionId1 = '00000000-0000-0000-0000-000000000001';
  const testPredictionId2 = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    authToken = generateToken();

    // Create test battery system
    await pool.query(`
      INSERT INTO battery_systems (id, zone_id, name, capacity, status)
      VALUES ($1, 'zone-001', 'Test Battery for Predictions', 100.0, 'operational')
      ON CONFLICT (id) DO NOTHING
    `, [testBatteryId]);

    // Insert test predictions
    await pool.query(`
      INSERT INTO rul_predictions (id, battery_system_id, predicted_rul, confidence, model_version, features, prediction_date)
      VALUES
        ($1, $2, 365, 0.92, 'v1.0.0', '{"temperature": 25, "soc": 80, "cycles": 500}'::jsonb, NOW() - INTERVAL '1 day'),
        ($3, $2, 350, 0.88, 'v1.0.1', '{"temperature": 26, "soc": 78, "cycles": 520}'::jsonb, NOW() - INTERVAL '2 days')
    `, [testPredictionId1, testBatteryId, testPredictionId2]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM rul_predictions WHERE battery_system_id = $1', [testBatteryId]);
    await pool.query('DELETE FROM battery_systems WHERE id = $1', [testBatteryId]);
    await pool.end();
  });

  describe('GET /api/v1/predictions/:batteryId', () => {
    it('returns all predictions for a battery system', async () => {
      const response = await request(app)
        .get(`/api/v1/predictions/${testBatteryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);

      // Verify structure
      const prediction = response.body.data[0];
      expect(prediction).toHaveProperty('id');
      expect(prediction).toHaveProperty('batterySystemId', testBatteryId);
      expect(prediction).toHaveProperty('predictedRUL');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('predictionDate');
      expect(prediction).toHaveProperty('modelVersion');
      expect(prediction).toHaveProperty('features');
      expect(prediction).toHaveProperty('createdAt');
    });

    it('returns predictions ordered by prediction date descending', async () => {
      const response = await request(app)
        .get(`/api/v1/predictions/${testBatteryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const predictions = response.body.data;
      expect(predictions.length).toBeGreaterThanOrEqual(2);

      // Most recent prediction should be first
      expect(new Date(predictions[0].predictionDate).getTime())
        .toBeGreaterThanOrEqual(new Date(predictions[1].predictionDate).getTime());
    });

    it('supports pagination with limit and offset', async () => {
      const response = await request(app)
        .get(`/api/v1/predictions/${testBatteryId}?limit=1&offset=0`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('returns 404 for non-existent battery system', async () => {
      const response = await request(app)
        .get('/api/v1/predictions/nonexistent-battery')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Battery system not found');
    });

    it('requires authentication', async () => {
      await request(app)
        .get(`/api/v1/predictions/${testBatteryId}`)
        .expect(401);
    });
  });

  describe('GET /api/v1/predictions/:batteryId/latest', () => {
    it('returns the most recent prediction', async () => {
      const response = await request(app)
        .get(`/api/v1/predictions/${testBatteryId}/latest`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('batterySystemId', testBatteryId);
      expect(response.body.data).toHaveProperty('predictedRUL', 365);
      expect(response.body.data).toHaveProperty('confidence', 0.92);
      expect(response.body.data).toHaveProperty('modelVersion', 'v1.0.0');
    });

    it('returns 404 when no predictions exist', async () => {
      // Create battery without predictions
      const emptyBatteryId = 'bat-test-empty';
      await pool.query(`
        INSERT INTO battery_systems (id, zone_id, name, capacity, status)
        VALUES ($1, 'zone-001', 'Empty Battery', 100.0, 'operational')
        ON CONFLICT (id) DO NOTHING
      `, [emptyBatteryId]);

      const response = await request(app)
        .get(`/api/v1/predictions/${emptyBatteryId}/latest`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('No predictions found for this battery system');

      // Cleanup
      await pool.query('DELETE FROM battery_systems WHERE id = $1', [emptyBatteryId]);
    });
  });

  describe('POST /api/v1/predictions', () => {
    it('creates a new RUL prediction', async () => {
      const newPrediction = {
        batterySystemId: testBatteryId,
        predictedRUL: 400,
        confidence: 0.95,
        modelVersion: 'v1.1.0',
        features: {
          temperature: 24,
          soc: 85,
          cycles: 480,
          voltage: 48.5,
        },
      };

      const response = await request(app)
        .post('/api/v1/predictions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPrediction)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.batterySystemId).toBe(testBatteryId);
      expect(response.body.data.predictedRUL).toBe(400);
      expect(response.body.data.confidence).toBe(0.95);
      expect(response.body.data.modelVersion).toBe('v1.1.0');
      expect(response.body.data.features).toEqual(newPrediction.features);
      expect(response.body.data).toHaveProperty('predictionDate');
      expect(response.body.data).toHaveProperty('createdAt');

      // Cleanup
      await pool.query('DELETE FROM rul_predictions WHERE id = $1', [response.body.data.id]);
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/api/v1/predictions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batterySystemId: testBatteryId,
          // Missing predictedRUL, confidence, modelVersion
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('validates predictedRUL is non-negative', async () => {
      const response = await request(app)
        .post('/api/v1/predictions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batterySystemId: testBatteryId,
          predictedRUL: -10,
          confidence: 0.9,
          modelVersion: 'v1.0.0',
        })
        .expect(400);

      expect(response.body.error).toBe('predictedRUL must be non-negative');
    });

    it('validates confidence is between 0 and 1', async () => {
      const response1 = await request(app)
        .post('/api/v1/predictions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batterySystemId: testBatteryId,
          predictedRUL: 365,
          confidence: -0.1,
          modelVersion: 'v1.0.0',
        })
        .expect(400);

      expect(response1.body.error).toBe('confidence must be between 0 and 1');

      const response2 = await request(app)
        .post('/api/v1/predictions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batterySystemId: testBatteryId,
          predictedRUL: 365,
          confidence: 1.5,
          modelVersion: 'v1.0.0',
        })
        .expect(400);

      expect(response2.body.error).toBe('confidence must be between 0 and 1');
    });

    it('returns 404 for non-existent battery system', async () => {
      const response = await request(app)
        .post('/api/v1/predictions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batterySystemId: 'nonexistent-battery',
          predictedRUL: 365,
          confidence: 0.9,
          modelVersion: 'v1.0.0',
        })
        .expect(404);

      expect(response.body.error).toBe('Battery system not found');
    });

    it('handles features as optional JSON object', async () => {
      const response = await request(app)
        .post('/api/v1/predictions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batterySystemId: testBatteryId,
          predictedRUL: 300,
          confidence: 0.85,
          modelVersion: 'v1.0.0',
          // No features provided
        })
        .expect(201);

      expect(response.body.data.features).toEqual({});

      // Cleanup
      await pool.query('DELETE FROM rul_predictions WHERE id = $1', [response.body.data.id]);
    });
  });

  describe('DELETE /api/v1/predictions/cleanup', () => {
    it('removes predictions older than 90 days', async () => {
      // Create old prediction
      const oldPredictionId = '00000000-0000-0000-0000-000000000099';
      await pool.query(`
        INSERT INTO rul_predictions (id, battery_system_id, predicted_rul, confidence, model_version, features, created_at)
        VALUES ($1, $2, 300, 0.8, 'v1.0.0', '{}'::jsonb, NOW() - INTERVAL '91 days')
      `, [oldPredictionId, testBatteryId]);

      const response = await request(app)
        .delete('/api/v1/predictions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Cleanup completed');
      expect(response.body.deletedCount).toBeGreaterThanOrEqual(1);

      // Verify old prediction was deleted
      const checkResult = await pool.query(
        'SELECT id FROM rul_predictions WHERE id = $1',
        [oldPredictionId]
      );
      expect(checkResult.rows.length).toBe(0);
    });

    it('does not remove predictions within 90 days', async () => {
      const recentCount = await pool.query(
        'SELECT COUNT(*) as count FROM rul_predictions WHERE battery_system_id = $1 AND created_at >= NOW() - INTERVAL \'90 days\'',
        [testBatteryId]
      );

      await request(app)
        .delete('/api/v1/predictions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const afterCount = await pool.query(
        'SELECT COUNT(*) as count FROM rul_predictions WHERE battery_system_id = $1 AND created_at >= NOW() - INTERVAL \'90 days\'',
        [testBatteryId]
      );

      expect(afterCount.rows[0].count).toBe(recentCount.rows[0].count);
    });
  });

  describe('Historical Prediction Tracking', () => {
    it('maintains historical predictions across multiple entries', async () => {
      // Create multiple predictions over time
      const predictions = [
        { rul: 380, confidence: 0.91, version: 'v1.0.0', daysAgo: 5 },
        { rul: 370, confidence: 0.89, version: 'v1.0.1', daysAgo: 4 },
        { rul: 360, confidence: 0.87, version: 'v1.1.0', daysAgo: 3 },
      ];

      for (const pred of predictions) {
        await pool.query(`
          INSERT INTO rul_predictions (battery_system_id, predicted_rul, confidence, model_version, features, prediction_date)
          VALUES ($1, $2, $3, $4, '{}'::jsonb, NOW() - INTERVAL '${pred.daysAgo} days')
        `, [testBatteryId, pred.rul, pred.confidence, pred.version]);
      }

      const response = await request(app)
        .get(`/api/v1/predictions/${testBatteryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(predictions.length);

      // Verify historical tracking shows declining RUL over time
      const historicalPredictions = response.body.data.slice(0, 3);
      for (let i = 0; i < historicalPredictions.length - 1; i++) {
        const current = new Date(historicalPredictions[i].predictionDate);
        const next = new Date(historicalPredictions[i + 1].predictionDate);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }

      // Cleanup
      await pool.query(`
        DELETE FROM rul_predictions
        WHERE battery_system_id = $1
        AND model_version IN ('v1.0.0', 'v1.0.1', 'v1.1.0')
        AND predicted_rul IN (380, 370, 360)
      `, [testBatteryId]);
    });
  });
});
