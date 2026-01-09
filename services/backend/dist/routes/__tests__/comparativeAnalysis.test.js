import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { pool } from '../../config/database.js';
describe('Comparative Analysis API', () => {
    let authToken;
    let testFacilityId;
    let testBatterySystemId;
    beforeAll(async () => {
        // Create test user
        await pool.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ('test@example.com', 'hashed_password', 'admin')
      ON CONFLICT (email) DO NOTHING
    `);
        // Login to get token
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'password' });
        authToken = loginRes.body.token || 'mock_token';
        // Create test data
        const facilityRes = await pool.query(`
      INSERT INTO facilities (name, location, timezone, total_zones, status)
      VALUES ('Test Facility', 'Test Location', 'UTC', 1, 'active')
      RETURNING id
    `);
        testFacilityId = facilityRes.rows[0].id;
        const zoneRes = await pool.query(`
      INSERT INTO zones (facility_id, name, zone_type, capacity_kwh, status)
      VALUES ($1, 'Test Zone', 'storage', 100, 'active')
      RETURNING id
    `, [testFacilityId]);
        const batteryRes = await pool.query(`
      INSERT INTO battery_systems (zone_id, battery_type, capacity, installation_date, status)
      VALUES ($1, 'lithium-ion', 50, NOW() - INTERVAL '365 days', 'operational')
      RETURNING id
    `, [zoneRes.rows[0].id]);
        testBatterySystemId = batteryRes.rows[0].id;
        // Create ML predictions
        await pool.query(`
      INSERT INTO ml_predictions (battery_system_id, prediction_type, predicted_value, predicted_rul, confidence_score, prediction_date)
      VALUES
        ($1, 'rul', 350, 350, 0.85, NOW() - INTERVAL '30 days'),
        ($1, 'anomaly', true, NULL, 0.90, NOW() - INTERVAL '7 days')
    `, [testBatterySystemId]);
        // Update battery system with decommission date for testing
        await pool.query(`
      UPDATE battery_systems
      SET decommission_date = NOW() - INTERVAL '15 days'
      WHERE id = $1
    `, [testBatterySystemId]);
        // Create test alert
        await pool.query(`
      INSERT INTO alerts (battery_system_id, alert_type, severity, message, status, created_at)
      VALUES ($1, 'performance_degradation', 'critical', 'Test alert', 'resolved', NOW() - INTERVAL '6 days')
    `, [testBatterySystemId]);
    });
    afterAll(async () => {
        // Cleanup
        await pool.query('DELETE FROM alerts WHERE battery_system_id = $1', [testBatterySystemId]);
        await pool.query('DELETE FROM ml_predictions WHERE battery_system_id = $1', [testBatterySystemId]);
        await pool.query('DELETE FROM battery_systems WHERE id = $1', [testBatterySystemId]);
        await pool.query('DELETE FROM zones WHERE facility_id = $1', [testFacilityId]);
        await pool.query('DELETE FROM facilities WHERE id = $1', [testFacilityId]);
        await pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
    });
    describe('GET /api/v1/comparative-analysis/rul-comparison', () => {
        it('should return RUL comparison data', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/rul-comparison')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('total');
        });
        it('should filter by facility ID', async () => {
            const res = await request(app)
                .get(`/api/v1/comparative-analysis/rul-comparison?facilityId=${testFacilityId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0]).toHaveProperty('batterySystemId');
            expect(res.body.data[0]).toHaveProperty('predictedRul');
            expect(res.body.data[0]).toHaveProperty('actualLifespan');
            expect(res.body.data[0]).toHaveProperty('absoluteError');
        });
        it('should filter by date range', async () => {
            const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
            const endDate = new Date().toISOString();
            const res = await request(app)
                .get(`/api/v1/comparative-analysis/rul-comparison?startDate=${startDate}&endDate=${endDate}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
        });
        it('should require authentication', async () => {
            await request(app)
                .get('/api/v1/comparative-analysis/rul-comparison')
                .expect(401);
        });
    });
    describe('GET /api/v1/comparative-analysis/anomaly-comparison', () => {
        it('should return anomaly comparison data', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/anomaly-comparison')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('total');
        });
        it('should include prediction type classification', async () => {
            const res = await request(app)
                .get(`/api/v1/comparative-analysis/anomaly-comparison?facilityId=${testFacilityId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            if (res.body.data.length > 0) {
                expect(res.body.data[0]).toHaveProperty('predictionType');
                expect(['true_positive', 'false_positive', 'false_negative', 'true_negative'])
                    .toContain(res.body.data[0].predictionType);
            }
        });
        it('should filter by battery type', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/anomaly-comparison?batteryType=lithium-ion')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
        });
    });
    describe('GET /api/v1/comparative-analysis/accuracy-metrics', () => {
        it('should return accuracy metrics by battery type', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/accuracy-metrics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should include RUL and anomaly metrics', async () => {
            const res = await request(app)
                .get(`/api/v1/comparative-analysis/accuracy-metrics?facilityId=${testFacilityId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            if (res.body.data.length > 0) {
                const metrics = res.body.data[0];
                expect(metrics).toHaveProperty('batteryType');
                expect(metrics).toHaveProperty('rulMae');
                expect(metrics).toHaveProperty('rulRmse');
                expect(metrics).toHaveProperty('anomalyPrecision');
                expect(metrics).toHaveProperty('anomalyRecall');
                expect(metrics).toHaveProperty('anomalyAccuracy');
            }
        });
        it('should calculate metrics correctly', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/accuracy-metrics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            if (res.body.data.length > 0) {
                const metrics = res.body.data[0];
                expect(metrics.anomalyPrecision).toBeGreaterThanOrEqual(0);
                expect(metrics.anomalyPrecision).toBeLessThanOrEqual(1);
                expect(metrics.anomalyRecall).toBeGreaterThanOrEqual(0);
                expect(metrics.anomalyRecall).toBeLessThanOrEqual(1);
            }
        });
    });
    describe('GET /api/v1/comparative-analysis/error-distribution', () => {
        it('should return error distribution data', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/error-distribution')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should include error magnitude and confidence', async () => {
            const res = await request(app)
                .get(`/api/v1/comparative-analysis/error-distribution?facilityId=${testFacilityId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            if (res.body.data.length > 0) {
                expect(res.body.data[0]).toHaveProperty('errorMagnitude');
                expect(res.body.data[0]).toHaveProperty('batteryType');
                expect(res.body.data[0]).toHaveProperty('confidenceScore');
            }
        });
    });
    describe('GET /api/v1/comparative-analysis/root-cause', () => {
        it('should return root cause analysis', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/root-cause')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should include root cause identification', async () => {
            const res = await request(app)
                .get(`/api/v1/comparative-analysis/root-cause?facilityId=${testFacilityId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            if (res.body.data.length > 0) {
                expect(res.body.data[0]).toHaveProperty('batteryType');
                expect(res.body.data[0]).toHaveProperty('poorPredictionCount');
                expect(res.body.data[0]).toHaveProperty('avgError');
                expect(res.body.data[0]).toHaveProperty('primaryRootCause');
            }
        });
        it('should respect error threshold parameter', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/root-cause?errorThreshold=50')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
        });
    });
    describe('GET /api/v1/comparative-analysis/export', () => {
        it('should export CSV report', async () => {
            const res = await request(app)
                .get('/api/v1/comparative-analysis/export')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.headers['content-disposition']).toContain('attachment');
            expect(res.text).toContain('Comparative Analysis Report');
        });
        it('should include all data sections in export', async () => {
            const res = await request(app)
                .get(`/api/v1/comparative-analysis/export?facilityId=${testFacilityId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(res.text).toContain('RUL Predictions vs Actual Lifespan');
            expect(res.text).toContain('Anomaly Detection Metrics');
        });
        it('should require authentication for export', async () => {
            await request(app)
                .get('/api/v1/comparative-analysis/export')
                .expect(401);
        });
    });
});
