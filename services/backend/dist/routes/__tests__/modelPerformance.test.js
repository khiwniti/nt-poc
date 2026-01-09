import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';
vi.mock('../../config/database', () => ({
    pool: {
        query: vi.fn()
    }
}));
vi.mock('../../middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = { userId: 'test-user' };
        next();
    },
    AuthRequest: {}
}));
describe('Model Performance API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('GET /api/v1/model-performance/metrics', () => {
        it('should return cached metrics if available', async () => {
            const mockMetrics = [{
                    metric_time: '2024-01-15T12:00:00Z',
                    mae_soc: 1.5,
                    mae_soh: 0.8,
                    rmse_soc: 2.0,
                    r2_soc: 0.92
                }];
            pool.query.mockResolvedValueOnce({ rows: mockMetrics, rowCount: 1 });
            const response = await request(app)
                .get('/api/v1/model-performance/metrics')
                .query({
                batterySystemId: 'battery-001',
                startTime: '2024-01-15T00:00:00Z',
                endTime: '2024-01-15T23:59:59Z'
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockMetrics);
            expect(response.body.source).toBe('cached');
        });
        it('should return 400 if required parameters are missing', async () => {
            const response = await request(app)
                .get('/api/v1/model-performance/metrics')
                .query({
                batterySystemId: 'battery-001'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });
    });
    describe('GET /api/v1/model-performance/drift', () => {
        it('should detect drift and store results', async () => {
            const mockSensorData = {
                rows: [
                    { voltage: 3.7, current: 2.5, temperature: 25, soc: 80 },
                    { voltage: 3.8, current: 2.6, temperature: 26, soc: 81 }
                ]
            };
            pool.query
                .mockResolvedValueOnce(mockSensorData) // baseline data
                .mockResolvedValueOnce(mockSensorData) // comparison data
                .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // insert drift metrics
            const response = await request(app)
                .get('/api/v1/model-performance/drift')
                .query({
                batterySystemId: 'battery-001',
                baselineStart: '2024-01-01T00:00:00Z',
                baselineEnd: '2024-01-07T23:59:59Z',
                comparisonStart: '2024-01-08T00:00:00Z',
                comparisonEnd: '2024-01-15T23:59:59Z'
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('driftScores');
            expect(response.body.data).toHaveProperty('overallDriftScore');
            expect(response.body.data).toHaveProperty('driftDetected');
        });
        it('should return 400 if required parameters are missing', async () => {
            const response = await request(app)
                .get('/api/v1/model-performance/drift')
                .query({
                batterySystemId: 'battery-001',
                baselineStart: '2024-01-01T00:00:00Z'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });
    });
    describe('GET /api/v1/model-performance/data-quality', () => {
        it('should return cached data quality metrics if available', async () => {
            const mockQualityMetrics = [{
                    metric_time: '2024-01-15T12:00:00Z',
                    total_records: 1000,
                    missing_voltage_count: 5,
                    voltage_outlier_count: 2
                }];
            pool.query.mockResolvedValueOnce({ rows: mockQualityMetrics, rowCount: 1 });
            const response = await request(app)
                .get('/api/v1/model-performance/data-quality')
                .query({
                batterySystemId: 'battery-001',
                startTime: '2024-01-15T00:00:00Z',
                endTime: '2024-01-15T23:59:59Z'
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockQualityMetrics);
            expect(response.body.source).toBe('cached');
        });
        it('should return 400 if required parameters are missing', async () => {
            const response = await request(app)
                .get('/api/v1/model-performance/data-quality')
                .query({
                batterySystemId: 'battery-001'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });
    });
    describe('GET /api/v1/model-performance/health-score', () => {
        it('should return cached health score if available', async () => {
            const mockHealthScore = {
                score_time: '2024-01-15T12:00:00Z',
                accuracy_score: 85.5,
                drift_score: 92.0,
                data_quality_score: 88.0,
                overall_health_score: 87.2,
                health_status: 'good'
            };
            pool.query.mockResolvedValueOnce({ rows: [mockHealthScore], rowCount: 1 });
            const response = await request(app)
                .get('/api/v1/model-performance/health-score')
                .query({
                batterySystemId: 'battery-001',
                startTime: '2024-01-15T00:00:00Z',
                endTime: '2024-01-15T23:59:59Z'
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockHealthScore);
            expect(response.body.source).toBe('cached');
        });
        it('should return 400 if required parameters are missing', async () => {
            const response = await request(app)
                .get('/api/v1/model-performance/health-score')
                .query({
                batterySystemId: 'battery-001'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });
    });
    describe('GET /api/v1/model-performance/alerts', () => {
        it('should return unresolved alerts', async () => {
            const mockAlerts = [
                {
                    id: 1,
                    battery_system_id: 'battery-001',
                    alert_time: '2024-01-15T12:00:00Z',
                    alert_type: 'accuracy_degradation',
                    severity: 'high',
                    message: 'Model accuracy has degraded',
                    acknowledged: false,
                    resolved: false
                },
                {
                    id: 2,
                    battery_system_id: 'battery-001',
                    alert_time: '2024-01-15T11:00:00Z',
                    alert_type: 'drift_detected',
                    severity: 'medium',
                    message: 'Data drift detected',
                    acknowledged: true,
                    resolved: false
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockAlerts, rowCount: 2 });
            const response = await request(app)
                .get('/api/v1/model-performance/alerts')
                .query({
                batterySystemId: 'battery-001',
                resolved: 'false'
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockAlerts);
            expect(response.body.total).toBe(2);
        });
        it('should return 400 if batterySystemId is missing', async () => {
            const response = await request(app)
                .get('/api/v1/model-performance/alerts');
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });
    });
    describe('PATCH /api/v1/model-performance/alerts/:id/acknowledge', () => {
        it('should acknowledge an alert', async () => {
            pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            const response = await request(app)
                .patch('/api/v1/model-performance/alerts/1/acknowledge');
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('acknowledged');
        });
    });
    describe('PATCH /api/v1/model-performance/alerts/:id/resolve', () => {
        it('should resolve an alert', async () => {
            pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            const response = await request(app)
                .patch('/api/v1/model-performance/alerts/1/resolve');
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('resolved');
        });
    });
    describe('GET /api/v1/model-performance/history', () => {
        it('should return accuracy history', async () => {
            const mockHistory = [
                {
                    metric_time: '2024-01-15T00:00:00Z',
                    mae_soc: 1.5,
                    r2_soc: 0.92
                },
                {
                    metric_time: '2024-01-16T00:00:00Z',
                    mae_soc: 1.3,
                    r2_soc: 0.94
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockHistory, rowCount: 2 });
            const response = await request(app)
                .get('/api/v1/model-performance/history')
                .query({
                batterySystemId: 'battery-001',
                metricType: 'accuracy',
                startTime: '2024-01-15T00:00:00Z',
                endTime: '2024-01-16T23:59:59Z'
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockHistory);
            expect(response.body.total).toBe(2);
        });
        it('should return drift history', async () => {
            const mockHistory = [
                {
                    metric_time: '2024-01-15T00:00:00Z',
                    voltage_drift_score: 0.15,
                    overall_drift_score: 0.18
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockHistory, rowCount: 1 });
            const response = await request(app)
                .get('/api/v1/model-performance/history')
                .query({
                batterySystemId: 'battery-001',
                metricType: 'drift',
                startTime: '2024-01-15T00:00:00Z',
                endTime: '2024-01-15T23:59:59Z'
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockHistory);
        });
        it('should return health score history', async () => {
            const mockHistory = [
                {
                    score_time: '2024-01-15T00:00:00Z',
                    overall_health_score: 87.2,
                    health_status: 'good'
                }
            ];
            pool.query.mockResolvedValueOnce({ rows: mockHistory, rowCount: 1 });
            const response = await request(app)
                .get('/api/v1/model-performance/history')
                .query({
                batterySystemId: 'battery-001',
                metricType: 'health',
                startTime: '2024-01-15T00:00:00Z',
                endTime: '2024-01-15T23:59:59Z'
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockHistory);
        });
        it('should return 400 for invalid metricType', async () => {
            const response = await request(app)
                .get('/api/v1/model-performance/history')
                .query({
                batterySystemId: 'battery-001',
                metricType: 'invalid',
                startTime: '2024-01-15T00:00:00Z',
                endTime: '2024-01-15T23:59:59Z'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid metricType');
        });
        it('should return 400 if required parameters are missing', async () => {
            const response = await request(app)
                .get('/api/v1/model-performance/history')
                .query({
                batterySystemId: 'battery-001',
                metricType: 'accuracy'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });
    });
});
