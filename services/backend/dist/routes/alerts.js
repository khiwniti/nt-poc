import express from 'express';
import { authenticate } from '../middleware/auth';
import emailNotificationService from '../services/emailNotificationService';
import alertEscalationService from '../services/alertEscalationService';
import { getEscalationJob } from '../services/alertEscalationJob';
import alertRealtimeService from '../services/alertRealtimeService';
const router = express.Router();
router.use(authenticate);
// Mock data generator for alerts
const generateMockAlerts = (count, batteryId, zoneId) => {
    const severities = ['critical', 'warning', 'info'];
    const statuses = ['active', 'acknowledged', 'resolved'];
    const types = ['Temperature High', 'Voltage Anomaly', 'SoC Critical', 'Communication Lost', 'Capacity Degraded'];
    return Array.from({ length: count }, (_, i) => {
        const createdAt = Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000; // Last 30 days
        const resolvedAt = statuses[i % 3] === 'resolved' ? createdAt + Math.random() * 24 * 60 * 60 * 1000 : null;
        return {
            id: `alert-${i + 1}`,
            batterySystemId: batteryId || `battery-${Math.floor(Math.random() * 10) + 1}`,
            zoneId: zoneId || `zone-${Math.floor(Math.random() * 5) + 1}`,
            type: types[Math.floor(Math.random() * types.length)],
            severity: severities[i % 3], // Use modulo for predictable pattern: critical, warning, info, critical...
            status: statuses[i % 3],
            message: `Alert ${i + 1}: ${types[Math.floor(Math.random() * types.length)]} detected`,
            createdAt,
            acknowledgedAt: statuses[i % 3] !== 'active' ? createdAt + Math.random() * 3600000 : null,
            resolvedAt,
            duration: resolvedAt ? resolvedAt - createdAt : null,
            metadata: {
                threshold: Math.random() * 100,
                actualValue: Math.random() * 120,
            }
        };
    });
};
// POST /api/v1/alerts - Create an alert (broadcasts via SSE)
router.post('/', async (req, res) => {
    try {
        const { facilityId, zoneId, batterySystemId, type, severity, message, metadata } = req.body || {};
        if (!type || typeof type !== 'string') {
            return res.status(400).json({ error: 'type is required' });
        }
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'message is required' });
        }
        if (!severity || !['critical', 'warning', 'info'].includes(severity)) {
            return res.status(400).json({ error: 'severity must be one of: critical, warning, info' });
        }
        const alert = alertRealtimeService.createAlert({
            facilityId,
            zoneId,
            batterySystemId,
            type,
            severity: severity,
            message,
            metadata,
        });
        res.status(201).json({ data: alert });
    }
    catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts - List all alerts with filtering
router.get('/', async (req, res) => {
    try {
        const { batteryId, zoneId, severity, status, type, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        // Include recently created alerts (newest first)
        let alerts = [...alertRealtimeService.getRecentAlerts(), ...generateMockAlerts(100)];
        // Apply filters
        if (batteryId) {
            alerts = alerts.filter(a => a.batterySystemId === batteryId);
        }
        if (zoneId) {
            alerts = alerts.filter(a => a.zoneId === zoneId);
        }
        if (severity) {
            const severities = severity.split(',');
            alerts = alerts.filter(a => severities.includes(a.severity));
        }
        if (status) {
            const statuses = status.split(',');
            alerts = alerts.filter(a => statuses.includes(a.status));
        }
        if (type) {
            const types = type.split(',');
            alerts = alerts.filter(a => types.includes(a.type));
        }
        // Sort
        alerts.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        });
        // Paginate
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedAlerts = alerts.slice(startIndex, endIndex);
        res.json({
            data: paginatedAlerts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: alerts.length,
                totalPages: Math.ceil(alerts.length / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/stats/summary - Get alert statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const { batteryId, zoneId, timeRange = '7d' } = req.query;
        const alerts = generateMockAlerts(100, batteryId, zoneId);
        // Calculate breakdown by type
        const typeBreakdown = {};
        alerts.forEach(alert => {
            typeBreakdown[alert.type] = (typeBreakdown[alert.type] || 0) + 1;
        });
        const stats = {
            total: alerts.length,
            bySeverity: {
                critical: alerts.filter(a => a.severity === 'critical').length,
                warning: alerts.filter(a => a.severity === 'warning').length,
                info: alerts.filter(a => a.severity === 'info').length,
            },
            byStatus: {
                active: alerts.filter(a => a.status === 'active').length,
                acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
                resolved: alerts.filter(a => a.status === 'resolved').length,
            },
            byType: typeBreakdown,
            averageResolutionTime: alerts
                .filter(a => a.duration)
                .reduce((sum, a) => sum + (a.duration || 0), 0) /
                alerts.filter(a => a.duration).length || 0,
        };
        res.json({ data: stats });
    }
    catch (error) {
        console.error('Error fetching alert stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/timeline - Get alerts for timeline visualization
router.get('/timeline/data', async (req, res) => {
    try {
        const { batteryId, zoneId, days = 30 } = req.query;
        const alerts = generateMockAlerts(100, batteryId, zoneId);
        const daysNum = parseInt(days);
        const now = Date.now();
        const timeRangeStart = now - (daysNum * 24 * 60 * 60 * 1000);
        // Filter by time range
        const filteredAlerts = alerts.filter(a => a.createdAt >= timeRangeStart);
        // Group by day
        const timelineData = [];
        for (let i = 0; i < daysNum; i++) {
            const dayStart = now - ((daysNum - i) * 24 * 60 * 60 * 1000);
            const dayEnd = dayStart + 24 * 60 * 60 * 1000;
            const dayAlerts = filteredAlerts.filter(a => a.createdAt >= dayStart && a.createdAt < dayEnd);
            timelineData.push({
                date: new Date(dayStart).toISOString().split('T')[0],
                timestamp: dayStart,
                total: dayAlerts.length,
                critical: dayAlerts.filter(a => a.severity === 'critical').length,
                warning: dayAlerts.filter(a => a.severity === 'warning').length,
                info: dayAlerts.filter(a => a.severity === 'info').length,
                resolved: dayAlerts.filter(a => a.status === 'resolved').length,
            });
        }
        res.json({ data: timelineData });
    }
    catch (error) {
        console.error('Error fetching timeline data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/summary - Get alert summary statistics (for facility management UI)
router.get('/summary', async (req, res) => {
    try {
        const alerts = [...alertRealtimeService.getRecentAlerts(), ...generateMockAlerts(100)];
        const critical = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length;
        const warning = alerts.filter(a => a.severity === 'warning' && a.status === 'active').length;
        const info = alerts.filter(a => a.severity === 'info' && a.status === 'active').length;
        res.json({
            data: {
                critical,
                warning,
                info,
                total: critical + warning + info,
            },
        });
    }
    catch (error) {
        console.error('Error fetching alert summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/:id - Get single alert details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const alerts = generateMockAlerts(100);
        const alert = alerts.find(a => a.id === id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json({ data: alert });
    }
    catch (error) {
        console.error('Error fetching alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/:id/history - Get sensor history and timeline for an alert
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const alerts = generateMockAlerts(100);
        const alert = alerts.find(a => a.id === id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        // Generate mock sensor readings for the last 24 hours
        const now = Date.now();
        const readings = Array.from({ length: 24 }, (_, i) => {
            const timestamp = now - ((23 - i) * 60 * 60 * 1000);
            return {
                timestamp,
                temperature: 20 + Math.random() * 15 + (i > 18 ? 10 : 0),
                voltage: 3.6 + Math.random() * 0.4,
                soc: 90 - (i * 2) + Math.random() * 5,
            };
        });
        // Generate timeline events
        const timeline = [
            {
                timestamp: alert.createdAt,
                event: 'Alert Created',
                user: 'System',
            },
        ];
        if (alert.acknowledgedAt) {
            timeline.push({
                timestamp: alert.acknowledgedAt,
                event: 'Alert Acknowledged',
                user: 'operator@example.com',
            });
        }
        if (alert.resolvedAt) {
            timeline.push({
                timestamp: alert.resolvedAt,
                event: 'Alert Resolved',
                user: 'operator@example.com',
                notes: 'Issue resolved after system maintenance',
            });
        }
        res.json({ readings, timeline });
    }
    catch (error) {
        console.error('Error fetching alert history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/v1/alerts/:id/acknowledge - Acknowledge an alert
router.post('/:id/acknowledge', async (req, res) => {
    try {
        const { id } = req.params;
        const alerts = generateMockAlerts(100);
        const alert = alerts.find(a => a.id === id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        if (alert.status === 'resolved') {
            return res.status(400).json({ error: 'Cannot acknowledge a resolved alert' });
        }
        alert.status = 'acknowledged';
        alert.acknowledgedAt = Date.now();
        res.json({ data: alert });
    }
    catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/v1/alerts/:id/resolve - Resolve an alert
router.post('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const alerts = generateMockAlerts(100);
        const alert = alerts.find(a => a.id === id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        if (alert.status === 'resolved') {
            return res.status(400).json({ error: 'Alert is already resolved' });
        }
        if (!notes || !notes.trim()) {
            return res.status(400).json({ error: 'Resolution notes are required' });
        }
        alert.status = 'resolved';
        alert.resolvedAt = Date.now();
        alert.duration = alert.resolvedAt - alert.createdAt;
        res.json({ data: alert });
    }
    catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/v1/alerts/email/configure - Configure email notifications for a facility
router.post('/email/configure', async (req, res) => {
    try {
        const { facilityId, recipients, enabled } = req.body;
        if (!facilityId) {
            return res.status(400).json({ error: 'facilityId is required' });
        }
        if (!Array.isArray(recipients)) {
            return res.status(400).json({ error: 'recipients must be an array' });
        }
        // Validate email addresses
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const recipient of recipients) {
            if (!recipient.email || !emailRegex.test(recipient.email)) {
                return res.status(400).json({
                    error: `Invalid email address: ${recipient.email}`
                });
            }
        }
        const config = {
            facilityId,
            recipients,
            enabled: enabled !== false, // Default to true
        };
        emailNotificationService.configureFacility(config);
        res.json({
            success: true,
            message: 'Email notification configuration updated',
            config,
        });
    }
    catch (error) {
        console.error('Error configuring email notifications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/email/configure/:facilityId - Get email configuration for a facility
router.get('/email/configure/:facilityId', async (req, res) => {
    try {
        const { facilityId } = req.params;
        const config = emailNotificationService.getFacilityConfig(facilityId);
        if (!config) {
            return res.status(404).json({
                error: 'Email configuration not found for facility',
                facilityId,
            });
        }
        res.json({ data: config });
    }
    catch (error) {
        console.error('Error fetching email configuration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/email/configure - Get all email configurations
router.get('/email/configure', async (req, res) => {
    try {
        const configs = emailNotificationService.getAllFacilityConfigs();
        res.json({ data: configs });
    }
    catch (error) {
        console.error('Error fetching email configurations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/v1/alerts/:id/notify - Send email notification for an alert
router.post('/:id/notify', async (req, res) => {
    try {
        const { id } = req.params;
        const { facilityId } = req.body;
        if (!facilityId) {
            return res.status(400).json({ error: 'facilityId is required' });
        }
        // Get alert details
        const alerts = generateMockAlerts(100);
        const alert = alerts.find(a => a.id === id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        // Only send emails for critical alerts
        if (alert.severity !== 'critical') {
            return res.status(400).json({
                error: 'Email notifications are only sent for critical alerts',
                severity: alert.severity,
            });
        }
        // Prepare alert data for email
        const dashboardBaseUrl = process.env.DASHBOARD_BASE_URL || 'http://localhost:3001';
        const alertData = {
            alertId: alert.id,
            batterySystemId: alert.batterySystemId,
            zoneId: alert.zoneId,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            createdAt: alert.createdAt,
            metadata: alert.metadata,
            dashboardLink: `${dashboardBaseUrl}/alerts/${alert.id}`,
        };
        // Send email notification
        const deliveryStatus = await emailNotificationService.sendAlertNotification(facilityId, alertData);
        res.json({
            success: deliveryStatus.status === 'sent',
            deliveryStatus,
        });
    }
    catch (error) {
        console.error('Error sending email notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/:id/email-status - Get email delivery status for an alert
router.get('/:id/email-status', async (req, res) => {
    try {
        const { id } = req.params;
        const deliveryStatus = emailNotificationService.getDeliveryStatus(id);
        if (!deliveryStatus) {
            return res.status(404).json({
                error: 'No email delivery status found for this alert',
                alertId: id,
            });
        }
        res.json({ data: deliveryStatus });
    }
    catch (error) {
        console.error('Error fetching email status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/v1/alerts/escalation/rules - Configure escalation rules for a facility
router.post('/escalation/rules', async (req, res) => {
    try {
        const { facilityId, infoToMediumMinutes, mediumToHighMinutes, highToCriticalMinutes, enabled = true, } = req.body;
        if (!facilityId) {
            return res.status(400).json({ error: 'facilityId is required' });
        }
        if (typeof infoToMediumMinutes !== 'number' ||
            typeof mediumToHighMinutes !== 'number' ||
            typeof highToCriticalMinutes !== 'number') {
            return res.status(400).json({
                error: 'infoToMediumMinutes, mediumToHighMinutes, and highToCriticalMinutes must be numbers',
            });
        }
        const rule = await alertEscalationService.upsertEscalationRule(facilityId, infoToMediumMinutes, mediumToHighMinutes, highToCriticalMinutes, enabled);
        res.json({
            success: true,
            message: 'Escalation rules configured successfully',
            data: rule,
        });
    }
    catch (error) {
        console.error('Error configuring escalation rules:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/escalation/rules/:facilityId - Get escalation rules for a facility
router.get('/escalation/rules/:facilityId', async (req, res) => {
    try {
        const { facilityId } = req.params;
        const rule = await alertEscalationService.getEscalationRule(facilityId);
        if (!rule) {
            return res.status(404).json({
                error: 'Escalation rules not found for facility',
                facilityId,
            });
        }
        res.json({ data: rule });
    }
    catch (error) {
        console.error('Error fetching escalation rules:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/:id/escalation-history - Get escalation history for an alert
router.get('/:id/escalation-history', async (req, res) => {
    try {
        const { id } = req.params;
        const history = await alertEscalationService.getEscalationHistory(id);
        res.json({ data: history });
    }
    catch (error) {
        console.error('Error fetching escalation history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/v1/alerts/escalation/job-status - Get escalation job status
router.get('/escalation/job-status', async (req, res) => {
    try {
        const job = getEscalationJob();
        const status = job.getStatus();
        res.json({
            data: {
                isRunning: status.isRunning,
                lastRun: status.lastRun,
                metrics: status.metrics
                    ? {
                        startTime: status.metrics.startTime,
                        endTime: status.metrics.endTime,
                        durationMs: status.metrics.endTime
                            ? status.metrics.endTime.getTime() - status.metrics.startTime.getTime()
                            : null,
                        alertsChecked: status.metrics.alertsChecked,
                        alertsEscalated: status.metrics.alertsEscalated,
                        notificationsSent: status.metrics.notificationsSent,
                        errors: status.metrics.errors,
                        lastError: status.metrics.lastError,
                    }
                    : null,
            },
        });
    }
    catch (error) {
        console.error('Error fetching escalation job status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/v1/alerts/escalation/trigger - Manually trigger escalation job
router.post('/escalation/trigger', async (req, res) => {
    try {
        const job = getEscalationJob();
        job.triggerManually().catch((error) => {
            console.error('Error in manually triggered escalation job:', error);
        });
        res.json({
            success: true,
            message: 'Escalation job triggered successfully',
            data: {
                triggeredAt: new Date(),
            },
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('already running')) {
            return res.status(409).json({ error: 'Job is already running' });
        }
        console.error('Error triggering escalation job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// PATCH /api/v1/alerts/:id/read - Mark alert as read (for facility management UI)
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const alerts = alertRealtimeService.getRecentAlerts();
        const alert = alerts.find(a => a.id === id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        // Mark as acknowledged (treated as "read" in the UI)
        alert.status = 'acknowledged';
        alert.acknowledgedAt = Date.now();
        res.json({ data: alert });
    }
    catch (error) {
        console.error('Error marking alert as read:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/v1/alerts - Clear all alerts (for facility management UI)
router.delete('/', async (req, res) => {
    try {
        // Clear in-memory alerts
        alertRealtimeService.clearAlerts();
        res.json({
            success: true,
            message: 'All alerts cleared successfully',
        });
    }
    catch (error) {
        console.error('Error clearing alerts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
