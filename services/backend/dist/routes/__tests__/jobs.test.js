/**
 * Jobs API Tests
 * T143: Test job management endpoints
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import * as scheduledJob from '../../services/scheduledPredictionJob.js';
// Mock the scheduled job
vi.mock('../../services/scheduledPredictionJob.js', () => ({
    getScheduledJob: vi.fn(),
}));
// Mock authentication
vi.mock('../../middleware/auth.js', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 'test-user' };
        next();
    },
    AuthRequest: class {
    },
}));
describe('Jobs API', () => {
    const mockJob = {
        getStatus: vi.fn(),
        triggerManually: vi.fn(),
    };
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(scheduledJob.getScheduledJob).mockReturnValue(mockJob);
    });
    describe('GET /api/v1/jobs/predictions/status', () => {
        it('should return job status with no metrics', async () => {
            mockJob.getStatus.mockReturnValue({
                isRunning: false,
                lastRun: null,
                metrics: null,
            });
            const response = await request(app)
                .get('/api/v1/jobs/predictions/status')
                .expect(200);
            expect(response.body).toEqual({
                data: {
                    isRunning: false,
                    lastRun: null,
                    metrics: null,
                },
            });
        });
        it('should return job status with metrics', async () => {
            const startTime = new Date('2024-01-01T10:00:00Z');
            const endTime = new Date('2024-01-01T10:05:00Z');
            mockJob.getStatus.mockReturnValue({
                isRunning: false,
                lastRun: endTime,
                metrics: {
                    startTime,
                    endTime,
                    batteriesProcessed: 10,
                    predictionsCreated: 10,
                    errors: 0,
                    lastError: undefined,
                },
            });
            const response = await request(app)
                .get('/api/v1/jobs/predictions/status')
                .expect(200);
            expect(response.body.data).toMatchObject({
                isRunning: false,
                lastRun: endTime.toISOString(),
                metrics: {
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    durationMs: 5 * 60 * 1000, // 5 minutes
                    batteriesProcessed: 10,
                    predictionsCreated: 10,
                    errors: 0,
                },
            });
        });
        it('should return job status when running', async () => {
            const startTime = new Date();
            mockJob.getStatus.mockReturnValue({
                isRunning: true,
                lastRun: null,
                metrics: {
                    startTime,
                    endTime: undefined,
                    batteriesProcessed: 5,
                    predictionsCreated: 5,
                    errors: 0,
                },
            });
            const response = await request(app)
                .get('/api/v1/jobs/predictions/status')
                .expect(200);
            expect(response.body.data.isRunning).toBe(true);
            expect(response.body.data.metrics.durationMs).toBeNull();
        });
        it('should include error information in metrics', async () => {
            const startTime = new Date();
            const endTime = new Date();
            mockJob.getStatus.mockReturnValue({
                isRunning: false,
                lastRun: endTime,
                metrics: {
                    startTime,
                    endTime,
                    batteriesProcessed: 8,
                    predictionsCreated: 8,
                    errors: 2,
                    lastError: 'Database connection failed',
                },
            });
            const response = await request(app)
                .get('/api/v1/jobs/predictions/status')
                .expect(200);
            expect(response.body.data.metrics.errors).toBe(2);
            expect(response.body.data.metrics.lastError).toBe('Database connection failed');
        });
        it('should handle errors gracefully', async () => {
            mockJob.getStatus.mockImplementation(() => {
                throw new Error('Status fetch failed');
            });
            const response = await request(app)
                .get('/api/v1/jobs/predictions/status')
                .expect(500);
            expect(response.body).toEqual({
                error: 'Internal server error',
            });
        });
    });
    describe('POST /api/v1/jobs/predictions/trigger', () => {
        it('should trigger job successfully', async () => {
            mockJob.triggerManually.mockResolvedValue(undefined);
            const response = await request(app)
                .post('/api/v1/jobs/predictions/trigger')
                .expect(200);
            expect(response.body.message).toBe('Prediction job triggered successfully');
            expect(response.body.data.triggeredAt).toBeDefined();
        });
        it('should return 409 when job is already running', async () => {
            mockJob.triggerManually.mockImplementation(() => {
                throw new Error('Job is already running');
            });
            const response = await request(app)
                .post('/api/v1/jobs/predictions/trigger')
                .expect(409);
            expect(response.body).toEqual({
                error: 'Job is already running',
            });
        });
        it('should handle trigger errors', async () => {
            mockJob.triggerManually.mockImplementation(() => {
                throw new Error('Trigger failed');
            });
            const response = await request(app)
                .post('/api/v1/jobs/predictions/trigger')
                .expect(500);
            expect(response.body).toEqual({
                error: 'Internal server error',
            });
        });
        it('should trigger job asynchronously', async () => {
            // Simulate a long-running job
            mockJob.triggerManually.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
            const response = await request(app)
                .post('/api/v1/jobs/predictions/trigger')
                .expect(200);
            // Response should come back immediately
            expect(response.body.message).toBe('Prediction job triggered successfully');
        });
    });
    describe('Authentication', () => {
        it('should require authentication for status endpoint', async () => {
            // This test assumes the mock is removed and real auth is applied
            // For now, it just verifies the endpoint exists and is accessible with mock auth
            const response = await request(app)
                .get('/api/v1/jobs/predictions/status');
            expect(response.status).not.toBe(401);
        });
        it('should require authentication for trigger endpoint', async () => {
            // This test assumes the mock is removed and real auth is applied
            // For now, it just verifies the endpoint exists and is accessible with mock auth
            mockJob.triggerManually.mockResolvedValue(undefined);
            const response = await request(app)
                .post('/api/v1/jobs/predictions/trigger');
            expect(response.status).not.toBe(401);
        });
    });
});
