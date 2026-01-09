import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import emailNotificationService from '../services/emailNotificationService.js';
import { EmailNotificationConfig } from '../types/emailNotification.js';

const router = express.Router();

router.use(authenticate);

// Mock data generator for alerts
const generateMockAlerts = (count: number, batteryId?: string, zoneId?: string) => {
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

// GET /api/v1/alerts - List all alerts with filtering
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { 
      batteryId, 
      zoneId, 
      severity, 
      status,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Generate mock data
    let alerts = generateMockAlerts(100);

    // Apply filters
    if (batteryId) {
      alerts = alerts.filter(a => a.batterySystemId === batteryId);
    }
    if (zoneId) {
      alerts = alerts.filter(a => a.zoneId === zoneId);
    }
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }

    // Sort
    alerts.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] as number;
      const bVal = b[sortBy as keyof typeof b] as number;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Paginate
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
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
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alerts/:id - Get single alert details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const alerts = generateMockAlerts(100);
    const alert = alerts.find(a => a.id === id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ data: alert });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alerts/stats/summary - Get alert statistics
router.get('/stats/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { batteryId, zoneId, timeRange = '7d' } = req.query;
    
    const alerts = generateMockAlerts(100, batteryId as string, zoneId as string);
    
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
      averageResolutionTime: alerts
        .filter(a => a.duration)
        .reduce((sum, a) => sum + (a.duration || 0), 0) / 
        alerts.filter(a => a.duration).length || 0,
    };

    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alerts/timeline - Get alerts for timeline visualization
router.get('/timeline/data', async (req: AuthRequest, res: Response) => {
  try {
    const { batteryId, zoneId, days = 30 } = req.query;
    
    const alerts = generateMockAlerts(100, batteryId as string, zoneId as string);
    const daysNum = parseInt(days as string);
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
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/alerts/email/configure - Configure email notifications for a facility
router.post('/email/configure', async (req: AuthRequest, res: Response) => {
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

    const config: EmailNotificationConfig = {
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
  } catch (error) {
    console.error('Error configuring email notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alerts/email/configure/:facilityId - Get email configuration for a facility
router.get('/email/configure/:facilityId', async (req: AuthRequest, res: Response) => {
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
  } catch (error) {
    console.error('Error fetching email configuration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alerts/email/configure - Get all email configurations
router.get('/email/configure', async (req: AuthRequest, res: Response) => {
  try {
    const configs = emailNotificationService.getAllFacilityConfigs();
    res.json({ data: configs });
  } catch (error) {
    console.error('Error fetching email configurations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/alerts/:id/notify - Send email notification for an alert
router.post('/:id/notify', async (req: AuthRequest, res: Response) => {
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
      severity: alert.severity as 'critical',
      message: alert.message,
      createdAt: alert.createdAt,
      metadata: alert.metadata,
      dashboardLink: `${dashboardBaseUrl}/alerts/${alert.id}`,
    };

    // Send email notification
    const deliveryStatus = await emailNotificationService.sendAlertNotification(
      facilityId,
      alertData
    );

    res.json({
      success: deliveryStatus.status === 'sent',
      deliveryStatus,
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alerts/:id/email-status - Get email delivery status for an alert
router.get('/:id/email-status', async (req: AuthRequest, res: Response) => {
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
  } catch (error) {
    console.error('Error fetching email status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
