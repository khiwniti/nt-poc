/**
 * Tests for ML Predictive Maintenance API
 * T140: Implement predictive maintenance model
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app.js';
import { initializeModel } from '../../ml/predictiveMaintenanceModel.js';
const generateToken = () => {
    return jwt.sign({ userId: 'user-123', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
};
describe('ML API Endpoints', () => {
    let authToken;
    beforeAll(async () => {
        authToken = generateToken();
        // Initialize model before running tests
        await initializeModel();
    });
    describe('POST /api/v1/ml/predict-maintenance', () => {
        it('should predict maintenance risk for healthy battery', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                batterySystemId: 'battery-test-1',
                features: {
                    sohDelta: -0.01,
                    anomalyCount: 0,
                    tempMax: 22,
                    voltageMin: 3.8,
                },
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('prediction');
            expect(response.body.prediction.batterySystemId).toBe('battery-test-1');
            expect(response.body.prediction.riskLevel).toBe('safe');
            expect(response.body.prediction.probability7d).toBeGreaterThanOrEqual(0);
            expect(response.body.prediction.probability14d).toBeGreaterThanOrEqual(0);
            expect(response.body.prediction.probability30d).toBeGreaterThanOrEqual(0);
            expect(response.body.prediction.modelVersion).toBe('v1.0.0');
        });
        it('should predict 7d risk for critical battery', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                batterySystemId: 'battery-test-2',
                features: {
                    sohDelta: -0.35,
                    anomalyCount: 15,
                    tempMax: 70,
                    voltageMin: 2.9,
                },
            });
            expect(response.status).toBe(200);
            expect(response.body.prediction.riskLevel).toBe('7d');
            expect(response.body.prediction.probability7d).toBeGreaterThan(0.3);
        });
        it('should return AUC-ROC metrics', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                batterySystemId: 'battery-test-3',
                features: {
                    sohDelta: -0.10,
                    anomalyCount: 5,
                    tempMax: 40,
                    voltageMin: 3.3,
                },
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('rocAuc');
            expect(response.body.rocAuc['7d']).toBeGreaterThanOrEqual(0.80);
            expect(response.body.rocAuc['14d']).toBeGreaterThanOrEqual(0.80);
            expect(response.body.rocAuc['30d']).toBeGreaterThanOrEqual(0.80);
        });
        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .send({
                batterySystemId: 'battery-test-4',
                features: {
                    sohDelta: -0.05,
                    anomalyCount: 2,
                    tempMax: 30,
                    voltageMin: 3.6,
                },
            });
            expect(response.status).toBe(401);
        });
        it('should validate required batterySystemId', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                features: {
                    sohDelta: -0.05,
                    anomalyCount: 2,
                    tempMax: 30,
                    voltageMin: 3.6,
                },
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('batterySystemId');
        });
        it('should validate required features', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                batterySystemId: 'battery-test-5',
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('features');
        });
        it('should validate feature types', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                batterySystemId: 'battery-test-6',
                features: {
                    sohDelta: 'invalid',
                    anomalyCount: 2,
                    tempMax: 30,
                    voltageMin: 3.6,
                },
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('numbers');
        });
        it('should validate anomaly count is non-negative', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                batterySystemId: 'battery-test-7',
                features: {
                    sohDelta: -0.05,
                    anomalyCount: -5,
                    tempMax: 30,
                    voltageMin: 3.6,
                },
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('non-negative');
        });
        it('should handle all four feature fields', async () => {
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                batterySystemId: 'battery-test-8',
                features: {
                    sohDelta: -0.08,
                    anomalyCount: 4,
                    tempMax: 38,
                    voltageMin: 3.4,
                },
            });
            expect(response.status).toBe(200);
            expect(response.body.prediction.features).toEqual({
                sohDelta: -0.08,
                anomalyCount: 4,
                tempMax: 38,
                voltageMin: 3.4,
            });
        });
    });
    describe('GET /api/v1/ml/model-metrics', () => {
        it('should return model metrics', async () => {
            const response = await request(app)
                .get('/api/v1/ml/model-metrics')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('metrics');
            expect(response.body).toHaveProperty('modelVersion');
            expect(response.body.modelVersion).toBe('v1.0.0');
            expect(response.body.metrics.rocAuc7d).toBeGreaterThanOrEqual(0.80);
            expect(response.body.metrics.rocAuc14d).toBeGreaterThanOrEqual(0.80);
            expect(response.body.metrics.rocAuc30d).toBeGreaterThanOrEqual(0.80);
            expect(response.body.metrics.accuracy).toBeGreaterThan(0);
            expect(response.body.metrics.sampleCount).toBeGreaterThan(0);
        });
        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/v1/ml/model-metrics');
            expect(response.status).toBe(401);
        });
    });
    describe('POST /api/v1/ml/train', () => {
        it('should train model with default data', async () => {
            const response = await request(app)
                .post('/api/v1/ml/train')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.modelVersion).toBe('v1.0.0');
            expect(response.body.metrics).toBeDefined();
        });
        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/ml/train')
                .send({});
            expect(response.status).toBe(401);
        });
    });
    describe('Multi-class predictions', () => {
        it('should classify into 7d, 14d, 30d, or safe risk levels', async () => {
            const testCases = [
                {
                    batteryId: 'multi-1',
                    features: { sohDelta: -0.01, anomalyCount: 0, tempMax: 20, voltageMin: 3.8 },
                    expectedLevels: ['safe', '30d'],
                },
                {
                    batteryId: 'multi-2',
                    features: { sohDelta: -0.06, anomalyCount: 3, tempMax: 35, voltageMin: 3.4 },
                    expectedLevels: ['30d', '14d', 'safe'],
                },
                {
                    batteryId: 'multi-3',
                    features: { sohDelta: -0.18, anomalyCount: 7, tempMax: 50, voltageMin: 3.1 },
                    expectedLevels: ['14d', '7d'],
                },
                {
                    batteryId: 'multi-4',
                    features: { sohDelta: -0.35, anomalyCount: 15, tempMax: 70, voltageMin: 2.8 },
                    expectedLevels: ['7d', '14d'],
                },
            ];
            for (const testCase of testCases) {
                const response = await request(app)
                    .post('/api/v1/ml/predict-maintenance')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    batterySystemId: testCase.batteryId,
                    features: testCase.features,
                });
                expect(response.status).toBe(200);
                expect(testCase.expectedLevels).toContain(response.body.prediction.riskLevel);
            }
        });
    });
    describe('Feature importance', () => {
        it('should use all four features for prediction', async () => {
            const baseFeatures = {
                sohDelta: -0.10,
                anomalyCount: 5,
                tempMax: 40,
                voltageMin: 3.3,
            };
            const response = await request(app)
                .post('/api/v1/ml/predict-maintenance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                batterySystemId: 'feature-test',
                features: baseFeatures,
            });
            expect(response.status).toBe(200);
            expect(response.body.prediction.features).toEqual(baseFeatures);
        });
    });
});
