import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';
import jwt from 'jsonwebtoken';

const generateToken = () => {
  return jwt.sign({ userId: 'user-123', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
};

describe('Explainability API Integration Tests', () => {
  let authToken: string;
  let facilityId: string;
  let batteryId: string;
  let predictionId: string;

  beforeAll(async () => {
    authToken = generateToken();

    const facilityResult = await pool.query(`
      INSERT INTO facilities (id, name, location, timezone, total_zones, status)
      VALUES ('explain-test-fac', 'Explainability Test Facility', '{"lat": 13.7563, "lng": 100.5018}', 'Asia/Bangkok', 1, 'active')
      RETURNING id
    `);
    facilityId = facilityResult.rows[0].id;

    const batteryResult = await pool.query(
      `
      INSERT INTO battery_systems (id, facility_id, name, capacity_kwh, state_of_charge, state_of_health, status)
      VALUES ('explain-test-battery', $1, 'Test Battery', 100, 80, 95, 'operational')
      RETURNING id
    `,
      [facilityId]
    );
    batteryId = batteryResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM predictions WHERE battery_id = $1', [batteryId]);
    await pool.query('DELETE FROM battery_systems WHERE id = $1', [batteryId]);
    await pool.query('DELETE FROM facilities WHERE id = $1', [facilityId]);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM predictions WHERE battery_id = $1', [batteryId]);

    const predResult = await pool.query(
      `
      INSERT INTO predictions (battery_id, predicted_rul_days, confidence_score, model_version, features)
      VALUES ($1, 180, 0.85, '1.0.0', '{"temperature": 25, "voltage": 3.7, "soc": 80}')
      RETURNING id
    `,
      [batteryId]
    );
    predictionId = predResult.rows[0].id;
  });

  describe('GET /api/v1/explainability/:predictionId', () => {
    it('should return SHAP values for prediction', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.prediction_id).toBe(predictionId);
      expect(response.body.data.shap_values).toBeDefined();
      expect(response.body.data.feature_importance).toBeInstanceOf(Array);
    });

    it('should return top contributing features', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.top_features).toBeInstanceOf(Array);
      expect(response.body.data.top_features.length).toBeGreaterThan(0);
      expect(response.body.data.top_features[0]).toHaveProperty('feature');
      expect(response.body.data.top_features[0]).toHaveProperty('importance');
    });

    it('should return 404 for non-existent prediction', async () => {
      await request(app)
        .get('/api/v1/explainability/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/v1/explainability/${predictionId}`).expect(401);
    });
  });

  describe('GET /api/v1/explainability/:predictionId/features', () => {
    it('should return detailed feature analysis', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}/features`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('value');
      expect(response.body.data[0]).toHaveProperty('importance');
      expect(response.body.data[0]).toHaveProperty('contribution');
    });

    it('should sort features by importance', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}/features`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const importances = response.body.data.map((f: { importance: number }) => f.importance);
      const sorted = [...importances].sort((a, b) => b - a);
      expect(importances).toEqual(sorted);
    });

    it('should filter by feature type', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}/features`)
        .query({ type: 'environmental' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/v1/explainability/${predictionId}/features`).expect(401);
    });
  });

  describe('GET /api/v1/explainability/:predictionId/waterfall', () => {
    it('should return waterfall chart data', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}/waterfall`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.base_value).toBeDefined();
      expect(response.body.data.contributions).toBeInstanceOf(Array);
      expect(response.body.data.predicted_value).toBeDefined();
    });

    it('should include cumulative contributions', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}/waterfall`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const contributions = response.body.data.contributions;
      expect(contributions.length).toBeGreaterThan(0);
      expect(contributions[0]).toHaveProperty('feature');
      expect(contributions[0]).toHaveProperty('value');
      expect(contributions[0]).toHaveProperty('cumulative');
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/v1/explainability/${predictionId}/waterfall`).expect(401);
    });
  });

  describe('GET /api/v1/explainability/:predictionId/force-plot', () => {
    it('should return force plot data', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}/force-plot`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.base_value).toBeDefined();
      expect(response.body.data.output_value).toBeDefined();
      expect(response.body.data.positive_features).toBeInstanceOf(Array);
      expect(response.body.data.negative_features).toBeInstanceOf(Array);
    });

    it('should categorize features by impact direction', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}/force-plot`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.positive_features.length).toBeGreaterThanOrEqual(0);
      expect(response.body.data.negative_features.length).toBeGreaterThanOrEqual(0);
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/v1/explainability/${predictionId}/force-plot`).expect(401);
    });
  });

  describe('GET /api/v1/explainability/battery/:batteryId/summary', () => {
    it('should return explainability summary for battery', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/battery/${batteryId}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.battery_id).toBe(batteryId);
      expect(response.body.data.total_predictions).toBeGreaterThan(0);
      expect(response.body.data.avg_feature_importance).toBeDefined();
    });

    it('should include most influential features', async () => {
      const response = await request(app)
        .get(`/api/v1/explainability/battery/${batteryId}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.most_influential_features).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent battery', async () => {
      await request(app)
        .get('/api/v1/explainability/battery/non-existent-id/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/v1/explainability/battery/${batteryId}/summary`).expect(401);
    });
  });

  describe('GET /api/v1/explainability/compare', () => {
    let prediction2Id: string;

    beforeEach(async () => {
      const pred2Result = await pool.query(
        `
        INSERT INTO predictions (battery_id, predicted_rul_days, confidence_score, model_version, features)
        VALUES ($1, 200, 0.90, '1.0.0', '{"temperature": 22, "voltage": 3.8, "soc": 85}')
        RETURNING id
      `,
        [batteryId]
      );
      prediction2Id = pred2Result.rows[0].id;
    });

    it('should compare explainability between predictions', async () => {
      const response = await request(app)
        .get('/api/v1/explainability/compare')
        .query({ prediction_ids: `${predictionId},${prediction2Id}` })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].prediction_id).toBeDefined();
      expect(response.body.data[0].top_features).toBeDefined();
    });

    it('should highlight feature differences', async () => {
      const response = await request(app)
        .get('/api/v1/explainability/compare')
        .query({ prediction_ids: `${predictionId},${prediction2Id}` })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data[0].differences).toBeDefined();
    });

    it('should require at least 2 predictions', async () => {
      const response = await request(app)
        .get('/api/v1/explainability/compare')
        .query({ prediction_ids: predictionId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should limit comparison to 5 predictions', async () => {
      const ids = Array(6).fill(predictionId).join(',');
      const response = await request(app)
        .get('/api/v1/explainability/compare')
        .query({ prediction_ids: ids })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('maximum');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/explainability/compare')
        .query({ prediction_ids: `${predictionId},${prediction2Id}` })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing prediction gracefully', async () => {
      await pool.query('DELETE FROM predictions WHERE id = $1', [predictionId]);

      const response = await request(app)
        .get(`/api/v1/explainability/${predictionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should handle malformed prediction IDs', async () => {
      const response = await request(app)
        .get('/api/v1/explainability/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });
});
