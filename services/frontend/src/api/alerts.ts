import type { Alert, AlertSeverity, AlertType, AlertStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export type { Alert, AlertSeverity, AlertType, AlertStatus };

export interface AlertStats {
  total: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  byStatus: {
    active: number;
    acknowledged: number;
    resolved: number;
  };
  byType: Record<string, number>;
  averageResolutionTime: number;
}

export interface TimelineDataPoint {
  date: string;
  timestamp: number;
  total: number;
  critical: number;
  warning: number;
  info: number;
  resolved: number;
}

export interface AlertListResponse {
  data: Alert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AlertFilters {
  batteryId?: string;
  zoneId?: string;
  severity?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const alertsApi = {
  async getAlerts(filters: AlertFilters = {}): Promise<AlertListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE_URL}/alerts?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.statusText}`);
    }
    return response.json();
  },

  async getAlert(id: string): Promise<{ data: Alert }> {
    const response = await fetch(`${API_BASE_URL}/alerts/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch alert: ${response.statusText}`);
    }
    return response.json();
  },

  async getAlertStats(
    filters: { batteryId?: string; zoneId?: string; timeRange?: string } = {}
  ): Promise<{ data: AlertStats }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE_URL}/alerts/stats/summary?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch alert stats: ${response.statusText}`);
    }
    return response.json();
  },

  async getTimelineData(
    filters: { batteryId?: string; zoneId?: string; days?: number } = {}
  ): Promise<{ data: TimelineDataPoint[] }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE_URL}/alerts/timeline/data?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
    }
    return response.json();
  },

  async getSensorHistory(alertId: string): Promise<{ readings: any[]; timeline: any[] }> {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/history`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sensor history: ${response.statusText}`);
    }
    return response.json();
  },

  async acknowledgeAlert(alertId: string): Promise<{ data: Alert }> {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
    }
    return response.json();
  },

  async resolveAlert(alertId: string, notes: string): Promise<{ data: Alert }> {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) {
      throw new Error(`Failed to resolve alert: ${response.statusText}`);
    }
    return response.json();
  },

  exportToCSV(alerts: Alert[]): void {
    const headers = [
      'ID',
      'Battery ID',
      'Zone ID',
      'Type',
      'Severity',
      'Status',
      'Message',
      'Created At',
      'Acknowledged At',
      'Resolved At',
      'Duration (hours)',
    ];

    const rows = alerts.map((alert) => [
      alert.id,
      alert.batterySystemId,
      alert.zoneId,
      alert.type,
      alert.severity,
      alert.status,
      alert.message,
      new Date(alert.createdAt).toISOString(),
      alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toISOString() : '',
      alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : '',
      alert.duration ? (alert.duration / (1000 * 60 * 60)).toFixed(2) : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alert-history-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
