import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export interface TrackEventPayload {
  report_id: string;
  event_type: 'view' | 'download' | 'email_open' | 'email_click';
  format?: 'pdf' | 'csv' | 'xlsx';
  metadata?: Record<string, any>;
}

export interface AnalyticsEvent {
  id: string;
  report_id: string;
  event_type: string;
  format?: string;
  user_id?: string;
  user_email?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AnalyticsSummary {
  id: string;
  report_id: string;
  total_views: number;
  total_downloads: number;
  total_email_opens: number;
  total_email_clicks: number;
  pdf_downloads: number;
  csv_downloads: number;
  xlsx_downloads: number;
  last_viewed_at?: string;
  last_downloaded_at?: string;
  updated_at: string;
}

export interface PopularReport {
  report_id: string;
  report_name: string;
  total_views: number;
  total_downloads: number;
  total_email_opens: number;
  total_email_clicks: number;
  engagement_score: number;
  last_activity: string;
}

export interface DashboardData {
  overview: {
    total_reports: number;
    total_views: number;
    total_downloads: number;
    total_email_opens: number;
    total_email_clicks: number;
  };
  popular_reports: PopularReport[];
  recent_activity: AnalyticsEvent[];
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

export const reportAnalyticsAPI = {
  trackEvent: async (payload: TrackEventPayload) => {
    const response = await axios.post(`${API_BASE_URL}/report-analytics/track`, payload);
    return response.data;
  },

  getEvents: async (params?: {
    report_id?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await axios.get(`${API_BASE_URL}/report-analytics/events`, { params });
    return response.data.events as AnalyticsEvent[];
  },

  getSummary: async (reportId: string) => {
    const response = await axios.get(`${API_BASE_URL}/report-analytics/summary/${reportId}`);
    return response.data.summary as AnalyticsSummary;
  },

  getPopularReports: async (limit: number = 10) => {
    const response = await axios.get(`${API_BASE_URL}/report-analytics/popular`, {
      params: { limit },
    });
    return response.data.reports as PopularReport[];
  },

  getDashboard: async (days: number = 30) => {
    const response = await axios.get(`${API_BASE_URL}/report-analytics/dashboard`, {
      params: { days },
    });
    return response.data as DashboardData;
  },

  exportToCSV: async (params?: {
    report_id?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await axios.get(`${API_BASE_URL}/report-analytics/export`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
