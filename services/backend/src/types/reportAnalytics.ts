export type ReportAnalyticsEventType = 'view' | 'download' | 'email_open' | 'email_click';

export type ReportDownloadFormat = 'pdf' | 'csv' | 'xlsx';

export interface ReportAnalyticsEvent {
  id: string;
  report_id: string;
  event_type: ReportAnalyticsEventType;
  format?: ReportDownloadFormat;
  user_id?: string;
  user_email?: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface ReportAnalyticsSummary {
  id: string;
  report_id: string;
  total_views: number;
  total_downloads: number;
  total_email_opens: number;
  total_email_clicks: number;
  pdf_downloads: number;
  csv_downloads: number;
  xlsx_downloads: number;
  last_viewed_at?: Date;
  last_downloaded_at?: Date;
  updated_at: Date;
}

export interface TrackEventPayload {
  report_id: string;
  event_type: ReportAnalyticsEventType;
  format?: ReportDownloadFormat;
  user_id?: string;
  user_email?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface AnalyticsQueryParams {
  report_id?: string;
  event_type?: ReportAnalyticsEventType;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface PopularReportStats {
  report_id: string;
  report_name: string;
  total_views: number;
  total_downloads: number;
  total_email_opens: number;
  total_email_clicks: number;
  engagement_score: number;
  last_activity: Date;
}

export interface AnalyticsDashboardData {
  overview: {
    total_reports: number;
    total_views: number;
    total_downloads: number;
    total_email_opens: number;
    total_email_clicks: number;
  };
  popular_reports: PopularReportStats[];
  recent_activity: ReportAnalyticsEvent[];
  downloads_by_format: {
    pdf: number;
    csv: number;
    xlsx: number;
  };
  timeline: {
    date: string;
    views: number;
    downloads: number;
    email_opens: number;
  }[];
}
