import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import reportAnalyticsService from '../services/reportAnalyticsService.js';
import { TrackEventPayload, AnalyticsQueryParams } from '../types/reportAnalytics.js';

const router = express.Router();
router.use(authenticate);

/**
 * POST /api/v1/report-analytics/track
 * Track a report analytics event
 */
router.post('/track', async (req: AuthRequest, res: Response) => {
  try {
    const { report_id, event_type, format, metadata } = req.body;

    if (!report_id || !event_type) {
      return res.status(400).json({
        error: 'Missing required fields: report_id, event_type',
      });
    }

    const payload: TrackEventPayload = {
      report_id,
      event_type,
      format,
      user_id: req.user?.userId,
      user_email: req.user?.email,
      metadata,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    };

    const event = await reportAnalyticsService.trackEvent(payload);

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    res.status(500).json({ error: 'Failed to track analytics event' });
  }
});

/**
 * GET /api/v1/report-analytics/events
 * Get analytics events with optional filters
 */
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    const params: AnalyticsQueryParams = {
      report_id: req.query.report_id as string,
      event_type: req.query.event_type as any,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const events = await reportAnalyticsService.getEvents(params);

    res.json({
      events,
      count: events.length,
      params,
    });
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    res.status(500).json({ error: 'Failed to fetch analytics events' });
  }
});

/**
 * GET /api/v1/report-analytics/summary/:reportId
 * Get analytics summary for a specific report
 */
router.get('/summary/:reportId', async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;

    const summary = await reportAnalyticsService.getSummary(reportId);

    if (!summary) {
      return res.status(404).json({
        error: 'Analytics summary not found for this report',
      });
    }

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

/**
 * GET /api/v1/report-analytics/popular
 * Get popular reports ranking
 */
router.get('/popular', async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const popularReports = await reportAnalyticsService.getPopularReports(limit);

    res.json({
      reports: popularReports,
      count: popularReports.length,
    });
  } catch (error) {
    console.error('Error fetching popular reports:', error);
    res.status(500).json({ error: 'Failed to fetch popular reports' });
  }
});

/**
 * GET /api/v1/report-analytics/dashboard
 * Get comprehensive analytics dashboard data
 */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const dashboardData = await reportAnalyticsService.getDashboardData(days);

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch analytics dashboard' });
  }
});

/**
 * GET /api/v1/report-analytics/export
 * Export analytics data to CSV
 */
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const params: AnalyticsQueryParams = {
      report_id: req.query.report_id as string,
      event_type: req.query.event_type as any,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };

    const csv = await reportAnalyticsService.exportToCSV(params);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=report-analytics.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

export default router;
