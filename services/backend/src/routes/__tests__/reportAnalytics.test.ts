import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import knex from '../../config/knex';

describe('Report Analytics Routes', () => {
  const validToken = 'Bearer valid-test-token';
  let testReportId: string;

  beforeEach(async () => {
    // Create a test report
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

  describe('POST /api/v1/report-analytics/track', () => {
    it('should track a view event', async () => {
      const response = await request(app)
        .post('/api/v1/report-analytics/track')
        .set('Authorization', validToken)
        .send({
          report_id: testReportId,
          event_type: 'view',
          metadata: { source: 'dashboard' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.event).toBeDefined();
      expect(response.body.event.event_type).toBe('view');
    });

    it('should track a download event with format', async () => {
      const response = await request(app)
        .post('/api/v1/report-analytics/track')
        .set('Authorization', validToken)
        .send({
          report_id: testReportId,
          event_type: 'download',
          format: 'pdf',
          metadata: { size: 1024 },
        });

      expect(response.status).toBe(200);
      expect(response.body.event.format).toBe('pdf');
    });

    it('should track email open event', async () => {
      const response = await request(app)
        .post('/api/v1/report-analytics/track')
        .set('Authorization', validToken)
        .send({
          report_id: testReportId,
          event_type: 'email_open',
        });

      expect(response.status).toBe(200);
      expect(response.body.event.event_type).toBe('email_open');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/report-analytics/track')
        .set('Authorization', validToken)
        .send({
          event_type: 'view',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/report-analytics/track')
        .send({
          report_id: testReportId,
          event_type: 'view',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/report-analytics/events', () => {
    beforeEach(async () => {
      // Insert test events
      await knex('report_analytics_events').insert([
        {
          report_id: testReportId,
          event_type: 'view',
          metadata: JSON.stringify({}),
        },
        {
          report_id: testReportId,
          event_type: 'download',
          format: 'pdf',
          metadata: JSON.stringify({}),
        },
      ]);
    });

    it('should get all events', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/events')
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should filter events by report_id', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/events')
        .query({ report_id: testReportId })
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.events.every((e: any) => e.report_id === testReportId)).toBe(true);
    });

    it('should filter events by event_type', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/events')
        .query({ event_type: 'view' })
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.events.every((e: any) => e.event_type === 'view')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/events')
        .query({ limit: 1, offset: 0 })
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
    });
  });

  describe('GET /api/v1/report-analytics/summary/:reportId', () => {
    beforeEach(async () => {
      await knex('report_analytics_summary').insert({
        report_id: testReportId,
        total_views: 10,
        total_downloads: 5,
        total_email_opens: 3,
        total_email_clicks: 2,
        pdf_downloads: 3,
        csv_downloads: 1,
        xlsx_downloads: 1,
      });
    });

    it('should get analytics summary for a report', async () => {
      const response = await request(app)
        .get(`/api/v1/report-analytics/summary/${testReportId}`)
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.summary.total_views).toBe(10);
      expect(response.body.summary.total_downloads).toBe(5);
      expect(response.body.summary.pdf_downloads).toBe(3);
    });

    it('should return 404 for non-existent report', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/report-analytics/summary/${fakeId}`)
        .set('Authorization', validToken);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/report-analytics/popular', () => {
    beforeEach(async () => {
      // Create multiple reports with different engagement
      const [report1, report2] = await knex('reports')
        .insert([
          { name: 'Popular Report', template: 'utilization', configuration: JSON.stringify({}) },
          { name: 'Less Popular Report', template: 'reliability', configuration: JSON.stringify({}) },
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

    it('should get popular reports ranked by engagement', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/popular')
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.reports.length).toBeGreaterThan(0);
      expect(response.body.reports[0].report_name).toBe('Popular Report');
      expect(response.body.reports[0].engagement_score).toBeGreaterThan(
        response.body.reports[1].engagement_score
      );
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/popular')
        .query({ limit: 1 })
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.reports).toHaveLength(1);
    });
  });

  describe('GET /api/v1/report-analytics/dashboard', () => {
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

    it('should get dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/dashboard')
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.overview).toBeDefined();
      expect(response.body.overview.total_reports).toBeGreaterThan(0);
      expect(response.body.popular_reports).toBeDefined();
      expect(response.body.recent_activity).toBeDefined();
      expect(response.body.downloads_by_format).toBeDefined();
      expect(response.body.timeline).toBeDefined();
    });

    it('should support days parameter', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/dashboard')
        .query({ days: 7 })
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.body.overview).toBeDefined();
    });
  });

  describe('GET /api/v1/report-analytics/export', () => {
    beforeEach(async () => {
      await knex('report_analytics_events').insert([
        {
          report_id: testReportId,
          event_type: 'view',
          metadata: JSON.stringify({}),
        },
      ]);
    });

    it('should export analytics data as CSV', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/export')
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('ID,Report ID,Event Type');
    });

    it('should support filter parameters', async () => {
      const response = await request(app)
        .get('/api/v1/report-analytics/export')
        .query({ event_type: 'view' })
        .set('Authorization', validToken);

      expect(response.status).toBe(200);
      expect(response.text).toContain('view');
    });
  });
});
