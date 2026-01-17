import knex from '../config/knex.js';
import {
  ReportAnalyticsEvent,
  ReportAnalyticsSummary,
  TrackEventPayload,
  AnalyticsQueryParams,
  PopularReportStats,
  AnalyticsDashboardData,
} from '../types/reportAnalytics.js';
import { logger } from '../observability/logger.js';

export class ReportAnalyticsService {
  /**
   * Track a report analytics event
   */
  async trackEvent(payload: TrackEventPayload): Promise<ReportAnalyticsEvent> {
    try {
      const [event] = await knex('report_analytics_events')
        .insert({
          report_id: payload.report_id,
          event_type: payload.event_type,
          format: payload.format,
          user_id: payload.user_id,
          user_email: payload.user_email,
          metadata: JSON.stringify(payload.metadata || {}),
          ip_address: payload.ip_address,
          user_agent: payload.user_agent,
        })
        .returning('*');

      // Update summary asynchronously
      this.updateSummary(payload.report_id, payload.event_type, payload.format).catch((err) =>
        logger.error('failed_to_update_analytics_summary', { error: err.message })
      );

      return event;
    } catch (error) {
      logger.error('failed_to_track_analytics_event', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Update analytics summary for a report
   */
  private async updateSummary(
    reportId: string,
    eventType: string,
    format?: string
  ): Promise<void> {
    const updateFields: any = { updated_at: knex.fn.now() };

    switch (eventType) {
      case 'view':
        updateFields.total_views = knex.raw('total_views + 1');
        updateFields.last_viewed_at = knex.fn.now();
        break;
      case 'download':
        updateFields.total_downloads = knex.raw('total_downloads + 1');
        updateFields.last_downloaded_at = knex.fn.now();
        if (format === 'pdf') updateFields.pdf_downloads = knex.raw('pdf_downloads + 1');
        if (format === 'csv') updateFields.csv_downloads = knex.raw('csv_downloads + 1');
        if (format === 'xlsx') updateFields.xlsx_downloads = knex.raw('xlsx_downloads + 1');
        break;
      case 'email_open':
        updateFields.total_email_opens = knex.raw('total_email_opens + 1');
        break;
      case 'email_click':
        updateFields.total_email_clicks = knex.raw('total_email_clicks + 1');
        break;
    }

    // Upsert summary record
    const existing = await knex('report_analytics_summary')
      .where({ report_id: reportId })
      .first();

    if (existing) {
      await knex('report_analytics_summary').where({ report_id: reportId }).update(updateFields);
    } else {
      await knex('report_analytics_summary').insert({
        report_id: reportId,
        ...updateFields,
      });
    }
  }

  /**
   * Get analytics events with filters
   */
  async getEvents(params: AnalyticsQueryParams): Promise<ReportAnalyticsEvent[]> {
    let query = knex('report_analytics_events').select('*');

    if (params.report_id) {
      query = query.where('report_id', params.report_id);
    }

    if (params.event_type) {
      query = query.where('event_type', params.event_type);
    }

    if (params.start_date) {
      query = query.where('created_at', '>=', params.start_date);
    }

    if (params.end_date) {
      query = query.where('created_at', '<=', params.end_date);
    }

    query = query.orderBy('created_at', 'desc');

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.offset(params.offset);
    }

    return await query;
  }

  /**
   * Get analytics summary for a report
   */
  async getSummary(reportId: string): Promise<ReportAnalyticsSummary | null> {
    const summary = await knex('report_analytics_summary')
      .where({ report_id: reportId })
      .first();

    return summary || null;
  }

  /**
   * Get popular reports ranking
   */
  async getPopularReports(limit: number = 10): Promise<PopularReportStats[]> {
    const results = await knex('report_analytics_summary')
      .join('reports', 'report_analytics_summary.report_id', 'reports.id')
      .select(
        'reports.id as report_id',
        'reports.name as report_name',
        'report_analytics_summary.total_views',
        'report_analytics_summary.total_downloads',
        'report_analytics_summary.total_email_opens',
        'report_analytics_summary.total_email_clicks',
        'report_analytics_summary.updated_at as last_activity'
      )
      .orderByRaw(
        '(total_views * 1 + total_downloads * 3 + total_email_opens * 2 + total_email_clicks * 4) DESC'
      )
      .limit(limit);

    return results.map((r: any) => ({
      report_id: r.report_id,
      report_name: r.report_name,
      total_views: r.total_views,
      total_downloads: r.total_downloads,
      total_email_opens: r.total_email_opens,
      total_email_clicks: r.total_email_clicks,
      engagement_score:
        r.total_views * 1 +
        r.total_downloads * 3 +
        r.total_email_opens * 2 +
        r.total_email_clicks * 4,
      last_activity: r.last_activity,
    }));
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(days: number = 30): Promise<AnalyticsDashboardData> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Overview stats
    const overviewQuery = await knex('report_analytics_summary').select(
      knex.raw('COUNT(DISTINCT report_id) as total_reports'),
      knex.raw('SUM(total_views) as total_views'),
      knex.raw('SUM(total_downloads) as total_downloads'),
      knex.raw('SUM(total_email_opens) as total_email_opens'),
      knex.raw('SUM(total_email_clicks) as total_email_clicks')
    );

    const overview = {
      total_reports: parseInt(overviewQuery[0].total_reports) || 0,
      total_views: parseInt(overviewQuery[0].total_views) || 0,
      total_downloads: parseInt(overviewQuery[0].total_downloads) || 0,
      total_email_opens: parseInt(overviewQuery[0].total_email_opens) || 0,
      total_email_clicks: parseInt(overviewQuery[0].total_email_clicks) || 0,
    };

    // Popular reports
    const popular_reports = await this.getPopularReports(10);

    // Recent activity
    const recent_activity = await this.getEvents({ limit: 20 });

    // Downloads by format
    const formatStats = await knex('report_analytics_summary').select(
      knex.raw('SUM(pdf_downloads) as pdf'),
      knex.raw('SUM(csv_downloads) as csv'),
      knex.raw('SUM(xlsx_downloads) as xlsx')
    );

    const downloads_by_format = {
      pdf: parseInt(formatStats[0].pdf) || 0,
      csv: parseInt(formatStats[0].csv) || 0,
      xlsx: parseInt(formatStats[0].xlsx) || 0,
    };

    // Timeline data
    const timelineData = await knex('report_analytics_events')
      .select(knex.raw("DATE(created_at) as date"))
      .select(
        knex.raw("SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views"),
        knex.raw("SUM(CASE WHEN event_type = 'download' THEN 1 ELSE 0 END) as downloads"),
        knex.raw("SUM(CASE WHEN event_type = 'email_open' THEN 1 ELSE 0 END) as email_opens")
      )
      .where('created_at', '>=', startDate.toISOString())
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc');

    const timeline = timelineData.map((row: any) => ({
      date: row.date,
      views: parseInt(row.views) || 0,
      downloads: parseInt(row.downloads) || 0,
      email_opens: parseInt(row.email_opens) || 0,
    }));

    return {
      overview,
      popular_reports,
      recent_activity,
      downloads_by_format,
      timeline,
    };
  }

  /**
   * Export analytics data to CSV format
   */
  async exportToCSV(params: AnalyticsQueryParams): Promise<string> {
    const events = await this.getEvents(params);

    const headers = [
      'ID',
      'Report ID',
      'Event Type',
      'Format',
      'User ID',
      'User Email',
      'IP Address',
      'Created At',
    ];

    const rows = events.map((e) => [
      e.id,
      e.report_id,
      e.event_type,
      e.format || '',
      e.user_id || '',
      e.user_email || '',
      e.ip_address || '',
      new Date(e.created_at).toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return csv;
  }
}

export default new ReportAnalyticsService();
