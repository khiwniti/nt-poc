import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import emailNotificationService from '../../services/emailNotificationService.js';
// Mock authentication middleware
vi.mock('../../middleware/auth.js', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 'test-user', email: 'test@example.com' };
        next();
    },
    AuthRequest: {},
}));
describe('Alert Email Notification Endpoints', () => {
    beforeEach(() => {
        // Set environment variables first
        process.env.SENDGRID_API_KEY = 'test-api-key';
        process.env.DASHBOARD_BASE_URL = 'http://localhost:3001';
        // Clear service state
        emailNotificationService.clearRateLimitCache();
        emailNotificationService.clearDeliveryStatusCache();
        emailNotificationService.clearFacilityConfigs();
        emailNotificationService.reinitializeApiKey();
    });
    describe('POST /api/v1/alerts/email/configure', () => {
        it('should configure email notifications for a facility', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [
                    { email: 'admin@example.com', name: 'Admin' },
                    { email: 'manager@example.com', name: 'Manager' },
                ],
                enabled: true,
            };
            const response = await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.config).toEqual(config);
        });
        it('should default enabled to true', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'admin@example.com' }],
            };
            const response = await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config)
                .expect(200);
            expect(response.body.config.enabled).toBe(true);
        });
        it('should reject request without facilityId', async () => {
            const config = {
                recipients: [{ email: 'admin@example.com' }],
                enabled: true,
            };
            const response = await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config)
                .expect(400);
            expect(response.body.error).toContain('facilityId is required');
        });
        it('should reject request without recipients array', async () => {
            const config = {
                facilityId: 'facility-1',
                enabled: true,
            };
            const response = await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config)
                .expect(400);
            expect(response.body.error).toContain('recipients must be an array');
        });
        it('should reject invalid email addresses', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [
                    { email: 'valid@example.com' },
                    { email: 'invalid-email' },
                ],
                enabled: true,
            };
            const response = await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config)
                .expect(400);
            expect(response.body.error).toContain('Invalid email address');
        });
        it('should allow disabling notifications', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'admin@example.com' }],
                enabled: false,
            };
            const response = await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config)
                .expect(200);
            expect(response.body.config.enabled).toBe(false);
        });
    });
    describe('GET /api/v1/alerts/email/configure/:facilityId', () => {
        it('should retrieve facility email configuration', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'admin@example.com' }],
                enabled: true,
            };
            // Configure first
            await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config);
            // Then retrieve
            const response = await request(app)
                .get('/api/v1/alerts/email/configure/facility-1')
                .expect(200);
            expect(response.body.data).toEqual(config);
        });
        it('should return 404 for non-existent facility', async () => {
            const response = await request(app)
                .get('/api/v1/alerts/email/configure/non-existent')
                .expect(404);
            expect(response.body.error).toContain('not found');
        });
    });
    describe('GET /api/v1/alerts/email/configure', () => {
        it('should retrieve all facility configurations', async () => {
            const config1 = {
                facilityId: 'facility-1',
                recipients: [{ email: 'admin1@example.com' }],
                enabled: true,
            };
            const config2 = {
                facilityId: 'facility-2',
                recipients: [{ email: 'admin2@example.com' }],
                enabled: true,
            };
            // Configure facilities
            await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config1);
            await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config2);
            // Retrieve all
            const response = await request(app)
                .get('/api/v1/alerts/email/configure')
                .expect(200);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data).toEqual(expect.arrayContaining([config1, config2]));
        });
        it('should return empty array when no configurations', async () => {
            const response = await request(app)
                .get('/api/v1/alerts/email/configure')
                .expect(200);
            expect(response.body.data).toEqual([]);
        });
    });
    describe('POST /api/v1/alerts/:id/notify', () => {
        beforeEach(() => {
            // Mock fetch for SendGrid API
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: {
                    get: () => 'msg-123',
                },
            });
        });
        it('should send email notification for critical alert', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'admin@example.com' }],
                enabled: true,
            };
            // Configure facility
            await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config);
            // Send notification
            const response = await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({ facilityId: 'facility-1' })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.deliveryStatus.status).toBe('sent');
            expect(response.body.deliveryStatus.alertId).toBe('alert-1');
        });
        it('should reject request without facilityId', async () => {
            const response = await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({})
                .expect(400);
            expect(response.body.error).toContain('facilityId is required');
        });
        it('should return 404 for non-existent alert', async () => {
            const response = await request(app)
                .post('/api/v1/alerts/non-existent/notify')
                .send({ facilityId: 'facility-1' })
                .expect(404);
            expect(response.body.error).toContain('Alert not found');
        });
        it('should reject non-critical alerts', async () => {
            // Mock alerts will have different severities based on their index
            // We need to find an alert that's not critical
            const response = await request(app)
                .post('/api/v1/alerts/alert-2/notify')
                .send({ facilityId: 'facility-1' })
                .expect(400);
            expect(response.body.error).toContain('only sent for critical alerts');
        });
        it('should respect rate limiting', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'admin@example.com' }],
                enabled: true,
            };
            await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config);
            // Send first notification
            const response1 = await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({ facilityId: 'facility-1' })
                .expect(200);
            expect(response1.body.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(1);
            // Try to send second notification for same alert
            const response2 = await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({ facilityId: 'facility-1' })
                .expect(200);
            // Should return cached status, not send new email
            expect(response2.body.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1 call
        });
        it('should handle facility without configuration', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: { get: () => null },
            });
            const response = await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({ facilityId: 'unconfigured-facility' })
                .expect(200);
            expect(response.body.success).toBe(false);
            expect(response.body.deliveryStatus.status).toBe('failed');
            expect(response.body.deliveryStatus.error).toContain('not enabled');
        });
        it('should include dashboard link in notification', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'admin@example.com' }],
                enabled: true,
            };
            await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config);
            let capturedBody;
            global.fetch = vi.fn().mockImplementation(async (url, options) => {
                capturedBody = JSON.parse(options.body);
                return {
                    ok: true,
                    status: 202,
                    headers: { get: () => null },
                };
            });
            await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({ facilityId: 'facility-1' })
                .expect(200);
            const htmlContent = capturedBody.content.find((c) => c.type === 'text/html').value;
            expect(htmlContent).toContain('http://localhost:3001/alerts/alert-1');
        });
    });
    describe('GET /api/v1/alerts/:id/email-status', () => {
        beforeEach(() => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: { get: () => 'msg-123' },
            });
        });
        it('should retrieve email delivery status', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'admin@example.com' }],
                enabled: true,
            };
            await request(app)
                .post('/api/v1/alerts/email/configure')
                .send(config);
            // Send notification first
            await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({ facilityId: 'facility-1' });
            // Get status
            const response = await request(app)
                .get('/api/v1/alerts/alert-1/email-status')
                .expect(200);
            expect(response.body.data.alertId).toBe('alert-1');
            expect(response.body.data.status).toBe('sent');
            expect(response.body.data.recipients).toEqual(['admin@example.com']);
        });
        it('should return 404 when no status exists', async () => {
            const response = await request(app)
                .get('/api/v1/alerts/non-existent/email-status')
                .expect(404);
            expect(response.body.error).toContain('No email delivery status found');
        });
    });
    describe('Integration test: Full workflow', () => {
        it('should complete full notification workflow', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: { get: () => 'msg-456' },
            });
            // Step 1: Configure facility
            const configResponse = await request(app)
                .post('/api/v1/alerts/email/configure')
                .send({
                facilityId: 'facility-1',
                recipients: [
                    { email: 'admin@example.com', name: 'Admin' },
                    { email: 'manager@example.com', name: 'Manager' },
                ],
                enabled: true,
            })
                .expect(200);
            expect(configResponse.body.success).toBe(true);
            // Step 2: Verify configuration
            const getConfigResponse = await request(app)
                .get('/api/v1/alerts/email/configure/facility-1')
                .expect(200);
            expect(getConfigResponse.body.data.recipients).toHaveLength(2);
            // Step 3: Send notification
            const notifyResponse = await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({ facilityId: 'facility-1' })
                .expect(200);
            expect(notifyResponse.body.success).toBe(true);
            expect(notifyResponse.body.deliveryStatus.status).toBe('sent');
            // Step 4: Check delivery status
            const statusResponse = await request(app)
                .get('/api/v1/alerts/alert-1/email-status')
                .expect(200);
            expect(statusResponse.body.data.status).toBe('sent');
            expect(statusResponse.body.data.recipients).toEqual([
                'admin@example.com',
                'manager@example.com',
            ]);
            // Step 5: Verify rate limiting prevents duplicate
            const duplicateResponse = await request(app)
                .post('/api/v1/alerts/alert-1/notify')
                .send({ facilityId: 'facility-1' })
                .expect(200);
            expect(duplicateResponse.body.success).toBe(true);
            // Fetch should still only have been called once
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });
});
