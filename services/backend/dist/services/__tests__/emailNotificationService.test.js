import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailNotificationService } from '../emailNotificationService.js';
describe('EmailNotificationService', () => {
    let service;
    beforeEach(() => {
        // Reset singleton instance
        EmailNotificationService.instance = undefined;
        service = EmailNotificationService.getInstance();
        service.clearRateLimitCache();
        service.clearDeliveryStatusCache();
        // Mock environment variables
        process.env.SENDGRID_API_KEY = 'test-api-key';
        process.env.EMAIL_FROM = 'test@example.com';
        process.env.EMAIL_FROM_NAME = 'Test System';
        process.env.DASHBOARD_BASE_URL = 'http://localhost:3001';
    });
    describe('Singleton pattern', () => {
        it('should return same instance', () => {
            const instance1 = EmailNotificationService.getInstance();
            const instance2 = EmailNotificationService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe('Facility configuration', () => {
        it('should configure facility email settings', () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [
                    { email: 'admin@example.com', name: 'Admin' },
                    { email: 'manager@example.com', name: 'Manager' },
                ],
                enabled: true,
            };
            service.configureFacility(config);
            const retrieved = service.getFacilityConfig('facility-1');
            expect(retrieved).toEqual(config);
        });
        it('should retrieve all facility configs', () => {
            const config1 = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test1@example.com' }],
                enabled: true,
            };
            const config2 = {
                facilityId: 'facility-2',
                recipients: [{ email: 'test2@example.com' }],
                enabled: true,
            };
            service.configureFacility(config1);
            service.configureFacility(config2);
            const allConfigs = service.getAllFacilityConfigs();
            expect(allConfigs).toHaveLength(2);
            expect(allConfigs).toContainEqual(config1);
            expect(allConfigs).toContainEqual(config2);
        });
        it('should return undefined for non-existent facility', () => {
            const config = service.getFacilityConfig('non-existent');
            expect(config).toBeUndefined();
        });
        it('should update existing facility config', () => {
            const config1 = {
                facilityId: 'facility-1',
                recipients: [{ email: 'old@example.com' }],
                enabled: true,
            };
            const config2 = {
                facilityId: 'facility-1',
                recipients: [{ email: 'new@example.com' }],
                enabled: false,
            };
            service.configureFacility(config1);
            service.configureFacility(config2);
            const retrieved = service.getFacilityConfig('facility-1');
            expect(retrieved).toEqual(config2);
        });
    });
    describe('Rate limiting', () => {
        it('should allow sending email for new alert', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: {
                    get: () => 'msg-123',
                },
            });
            const status = await service.sendAlertNotification('facility-1', alertData);
            expect(status.status).toBe('sent');
            expect(status.alertId).toBe('alert-1');
        });
        it('should prevent sending duplicate email for same alert', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: {
                    get: () => 'msg-123',
                },
            });
            // Send first email
            const status1 = await service.sendAlertNotification('facility-1', alertData);
            expect(status1.status).toBe('sent');
            // Try to send second email for same alert
            const status2 = await service.sendAlertNotification('facility-1', alertData);
            expect(status2.status).toBe('sent'); // Returns cached status
            expect(status2.alertId).toBe('alert-1');
            // Fetch should only be called once
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });
    describe('Email sending', () => {
        it('should fail when SendGrid API key not configured', async () => {
            delete process.env.SENDGRID_API_KEY;
            EmailNotificationService.instance = undefined;
            service = EmailNotificationService.getInstance();
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            const status = await service.sendAlertNotification('facility-1', alertData);
            expect(status.status).toBe('failed');
            expect(status.error).toContain('SendGrid API key not configured');
        });
        it('should fail when facility not configured', async () => {
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            // Ensure API key is configured for this test
            process.env.SENDGRID_API_KEY = 'test-api-key';
            EmailNotificationService.instance = undefined;
            service = EmailNotificationService.getInstance();
            const status = await service.sendAlertNotification('non-existent', alertData);
            expect(status.status).toBe('failed');
            expect(status.error).toContain('not enabled for facility');
        });
        it('should fail when notifications disabled', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: false,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            const status = await service.sendAlertNotification('facility-1', alertData);
            expect(status.status).toBe('failed');
            expect(status.error).toContain('not enabled for facility');
        });
        it('should fail when no recipients configured', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            const status = await service.sendAlertNotification('facility-1', alertData);
            expect(status.status).toBe('failed');
            expect(status.error).toContain('No recipients configured');
        });
        it('should send email successfully', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [
                    { email: 'test1@example.com', name: 'Test User 1' },
                    { email: 'test2@example.com', name: 'Test User 2' },
                ],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                zoneId: 'zone-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                metadata: { threshold: 80, actualValue: 95 },
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: {
                    get: () => 'msg-123',
                },
            });
            const status = await service.sendAlertNotification('facility-1', alertData);
            expect(status.status).toBe('sent');
            expect(status.alertId).toBe('alert-1');
            expect(status.recipients).toEqual(['test1@example.com', 'test2@example.com']);
            expect(status.sendGridMessageId).toBe('msg-123');
            expect(global.fetch).toHaveBeenCalledWith('https://api.sendgrid.com/v3/mail/send', expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-api-key',
                    'Content-Type': 'application/json',
                }),
            }));
        });
        it('should handle SendGrid API errors', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            // Mock fetch with error
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                text: async () => 'Invalid API key',
            });
            const status = await service.sendAlertNotification('facility-1', alertData);
            expect(status.status).toBe('failed');
            expect(status.error).toContain('SendGrid API error');
            expect(status.error).toContain('400');
        });
        it('should handle network errors', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            // Mock fetch with network error
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const status = await service.sendAlertNotification('facility-1', alertData);
            expect(status.status).toBe('failed');
            expect(status.error).toBe('Network error');
        });
    });
    describe('Delivery status tracking', () => {
        it('should track delivery status', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: {
                    get: () => 'msg-123',
                },
            });
            await service.sendAlertNotification('facility-1', alertData);
            const deliveryStatus = service.getDeliveryStatus('alert-1');
            expect(deliveryStatus).toBeDefined();
            expect(deliveryStatus?.status).toBe('sent');
            expect(deliveryStatus?.alertId).toBe('alert-1');
        });
        it('should return undefined for non-existent alert', () => {
            const status = service.getDeliveryStatus('non-existent');
            expect(status).toBeUndefined();
        });
    });
    describe('Email content generation', () => {
        it('should include all alert details in email', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-1',
                batterySystemId: 'battery-1',
                zoneId: 'zone-1',
                type: 'Temperature High',
                severity: 'critical',
                message: 'Temperature exceeded threshold',
                createdAt: Date.now(),
                metadata: { threshold: 80, actualValue: 95 },
                dashboardLink: 'http://localhost:3001/alerts/alert-1',
            };
            let capturedBody;
            global.fetch = vi.fn().mockImplementation(async (url, options) => {
                capturedBody = JSON.parse(options.body);
                return {
                    ok: true,
                    status: 202,
                    headers: { get: () => null },
                };
            });
            await service.sendAlertNotification('facility-1', alertData);
            expect(capturedBody.subject).toContain('CRITICAL');
            expect(capturedBody.subject).toContain('Temperature High');
            expect(capturedBody.subject).toContain('battery-1');
            const htmlContent = capturedBody.content.find((c) => c.type === 'text/html').value;
            expect(htmlContent).toContain('alert-1');
            expect(htmlContent).toContain('battery-1');
            expect(htmlContent).toContain('zone-1');
            expect(htmlContent).toContain('Temperature High');
            expect(htmlContent).toContain('Temperature exceeded threshold');
            expect(htmlContent).toContain('http://localhost:3001/alerts/alert-1');
            expect(htmlContent).toContain('threshold');
            expect(htmlContent).toContain('80');
            expect(htmlContent).toContain('actualValue');
            expect(htmlContent).toContain('95');
            const textContent = capturedBody.content.find((c) => c.type === 'text/plain').value;
            expect(textContent).toContain('CRITICAL ALERT');
            expect(textContent).toContain('alert-1');
            expect(textContent).toContain('battery-1');
        });
        it('should handle alerts with minimal data', async () => {
            const config = {
                facilityId: 'facility-1',
                recipients: [{ email: 'test@example.com' }],
                enabled: true,
            };
            service.configureFacility(config);
            const alertData = {
                alertId: 'alert-2',
                batterySystemId: 'battery-2',
                type: 'Voltage Anomaly',
                severity: 'critical',
                message: 'Voltage anomaly detected',
                createdAt: Date.now(),
                dashboardLink: 'http://localhost:3001/alerts/alert-2',
            };
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 202,
                headers: { get: () => null },
            });
            const status = await service.sendAlertNotification('facility-1', alertData);
            expect(status.status).toBe('sent');
        });
    });
});
