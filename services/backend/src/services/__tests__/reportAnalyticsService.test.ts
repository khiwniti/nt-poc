import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import reportAnalyticsService from '../reportAnalyticsService';
import knex from '../../config/knex';

describe('ReportAnalyticsService', () => {
  let testReportId: string;

  beforeEach(async () => {
    const [report] = await knex('reports')
      .insert({
        name: 'Test Report',
        description: 'Test report for analytics',
        template: 'utilization',
        configuration: JSON.stringify({}),
      })
      .returning('*');
    testReportId = report.id;
  });

  afterEach(async () => {
    await knex('report_analytics_events').delete();
    await knex('report_analytics_summary').delete();
    await knex('reports').delete();
  });

  describe('trackEvent', () => {
    it('should track a view event', async () => {
      const event = await reportAnalyticsService.trackEvent({
        report_id: testReportId,
        event_type: 'view',
        user_id: 'user123',
        metadata: { source: 'dashboard' },
      });

      expect(event.report_id).toBe(testReportId);
      expect(event.event_type).toBe('view');
      expect(event.user_id).toBe('user123');
    });

    it('should track a download event with format', async () => {
      const event = await reportAnalyticsService.trackEvent({
        report_id: testReportId,
        event_type: 'download',
        format: 'pdf',
      });

      expect(event.event_type).toBe('download');
      expect(event.format).toBe('pdf');
    });

    it('should update summary after tracking event', async () => {
      await reportAnalyticsService.trackEvent({
        report_id: testReportId,
        event_type: 'view',
      });

      // Wait a bit for async summary update
      await new Promise(resolve => setTimeout(resolve, 100));

      const summary = await reportAnalyticsService.getSummary(testReportId);
      expect(summary).toBeDefined();
      expect(summary!.total_views).toBe(1);
    });

    it('should increment download counts by format', async () => {
      await reportAnalyticsService.trackEvent({
        report_id: testReportId,
        event_type: 'download',
        format: 'pdf',
      });

      await reportAnalyticsService.trackEvent({
        report_id: testReportId,
        event_type: 'download',
        format: 'csv',
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const summary = await reportAnalyticsService.getSummary(testReportId);
      expect(summary!.total_downloads).toBe(2);
      expect(summary!.pdf_downloads).toBe(1);
      expect(summary!.csv_downloads).toBe(1);
    });
  });

  describe('getEvents', () => {
    beforeEach(async () => {
      await knex('report_analytics_events').insert([
        {
          report_id: testReportId,
          event_type: 'view',
          metadata: JSON.stringify({}),
          created_at: new Date('2024-01-01'),
        },
        {
          report_id: testReportId,
          event_type: 'download',
          format: 'pdf',
          metadata: JSON.stringify({}),
          created_at: new Date('2024-01-02'),
        },
      ]);
    });

    it('should get all events', async () => {
      const events = await reportAnalyticsService.getEvents({});
      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by report_id', async () => {
      const events = await reportAnalyticsService.getEvents({
        report_id: testReportId,
      });
      expect(events.every(e => e.report_id === testReportId)).toBe(true);
    });

    it('should filter by event_type', async () => {
      const events = await reportAnalyticsService.getEvents({
        event_type: 'view',
      });
      expect(events.every(e => e.event_type === 'view')).toBe(true);
    });

    it('should filter by date range', async () => {
      const events = await reportAnalyticsService.getEvents({
        start_date: '2024-01-01',
        end_date: '2024-01-01',
      });
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      const events = await reportAnalyticsService.getEvents({
        limit: 1,
        offset: 0,
      });
      expect(events).toHaveLength(1);
    });
  });

  describe('getSummary', () => {
    it('should return null for report without analytics', async () => {
      const summary = await reportAnalyticsService.getSummary(testReportId);
      expect(summary).toBeNull();
    });

    it('should get summary for report with analytics', async () => {
      await knex('report_analytics_summary').insert({
        report_id: testReportId,
        total_views: 10,
        total_downloads: 5,
        total_email_opens: 3,
      });

      const summary = await reportAnalyticsService.getSummary(testReportId);
      expect(summary).toBeDefined();
      expect(summary!.total_views).toBe(10);
      expect(summary!.total_downloads).toBe(5);
    });
  });

  describe('getPopularReports', () => {
    beforeEach(async () => {
      const [report1, report2] = await knex('reports')
        .insert([
          { name: 'Popular', template: 'utilization', configuration: JSON.stringify({}) },
          { name: 'Less Popular', template: 'reliability', configuration: JSON.stringify({}) },
        ])
        .returning('*');

      await knex('report_analytics_summary').insert([
        {
          report_id: report1.id,
          total_views: 100,
          total_downloads: 50,
          total_email_opens: 30,
          total_email_clicks: 20,
        },
        {
          report_id: report2.id,
          total_views: 10,
          total_downloads: 5,
          total_email_opens: 3,
          total_email_clicks: 2,
        },
      ]);
    });

    it('should return popular reports ranked by engagement', async () => {
      const reports = await reportAnalyticsService.getPopularReports(10);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].report_name).toBe('Popular');
      expect(reports[0].engagement_score).toBeGreaterThan(reports[1].engagement_score);
    });

    it('should respect limit parameter', async () => {
      const reports = await reportAnalyticsService.getPopularReports(1);
      expect(reports).toHaveLength(1);
    });
  });

  describe('getDashboardData', () => {
    beforeEach(async () => {
      await knex('report_analytics_events').insert([
        {
          report_id: testReportId,
          event_type: 'view',
          metadata: JSON.stringify({}),
          created_at: new Date(),
        },
        {
          report_id: testReportId,
          event_type: 'download',
          format: 'pdf',
          metadata: JSON.stringify({}),
          created_at: new Date(),
        },
      ]);

      await knex('report_analytics_summary').insert({
        report_id: testReportId,
        total_views: 10,
        total_downloads: 5,
        total_email_opens: 3,
        pdf_downloads: 3,
        csv_downloads: 1,
        xlsx_downloads: 1,
      });
    });

    it('should return dashboard data with all sections', async () => {
      const data = await reportAnalyticsService.getDashboardData(30);
      
      expect(data.overview).toBeDefined();
      expect(data.overview.total_reports).toBeGreaterThan(0);
      expect(data.popular_reports).toBeDefined();
      expect(data.recent_activity).toBeDefined();
      expect(data.downloads_by_format).toBeDefined();
      expect(data.timeline).toBeDefined();
    });

    it('should calculate correct format distribution', async () => {
      const data = await reportAnalyticsService.getDashboardData(30);
      
      expect(data.downloads_by_format.pdf).toBe(3);
      expect(data.downloads_by_format.csv).toBe(1);
      expect(data.downloads_by_format.xlsx).toBe(1);
    });

    it('should respect days parameter', async () => {
      const data = await reportAnalyticsService.getDashboardData(7);
      expect(data.overview).toBeDefined();
    });
  });

  describe('exportToCSV', () => {
    beforeEach(async () => {
      await knex('report_analytics_events').insert([
        {
          report_id: testReportId,
          event_type: 'view',
          user_id: 'user123',
          user_email: 'user@example.com',
          metadata: JSON.stringify({}),
        },
      ]);
    });

    it('should export events as CSV', async () => {
      const csv = await reportAnalyticsService.exportToCSV({});
      
      expect(csv).toContain('ID,Report ID,Event Type');
      expect(csv).toContain('view');
      expect(csv).toContain('user123');
      expect(csv).toContain('user@example.com');
    });

    it('should support filters in export', async () => {
      const csv = await reportAnalyticsService.exportToCSV({
        event_type: 'view',
      });
      
      expect(csv).toContain('view');
      const lines = csv.split('\n').filter(l => l.trim());
      expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least 1 row
    });
  });
});
