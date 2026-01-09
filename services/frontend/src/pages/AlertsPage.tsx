import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { alertsApi, Alert, AlertFilters, TimelineDataPoint, AlertStats } from '../api/alerts';
import { Download, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { AlertFilterControls } from '../components/AlertFilterControls';
import { useAlertFilterStore } from '../stores/alertFilterStore';
import AlertStatsDashboard from '../components/AlertStatsDashboard';

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showStatsDashboard, setShowStatsDashboard] = useState(true);

  // Filter store
  const filterStore = useAlertFilterStore();

  // Filters
  const [filters, setFilters] = useState<AlertFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Initialize filters from URL on mount
  useEffect(() => {
    filterStore.setFromURLParams(searchParams);
  }, []);

  // Apply filters to API
  const applyFiltersToAPI = () => {
    const newFilters: AlertFilters = {
      ...filters,
      page: 1,
    };

    // Add filter store filters
    if (filterStore.status.length > 0) {
      newFilters.status = filterStore.status.join(',');
    }
    if (filterStore.severity.length > 0) {
      newFilters.severity = filterStore.severity.join(',');
    }

    setFilters(newFilters);

    // Update URL params
    const params = filterStore.getURLParams();
    setSearchParams(params);
  };

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range in days
      let days = 30;
      if (filterStore.dateRange === '24h') days = 1;
      else if (filterStore.dateRange === '7d') days = 7;
      else if (filterStore.dateRange === '30d') days = 30;

      const [alertsResponse, timelineResponse, statsResponse] = await Promise.all([
        alertsApi.getAlerts(filters),
        alertsApi.getTimelineData({ 
          batteryId: filters.batteryId, 
          zoneId: filters.zoneId,
          days 
        }),
        alertsApi.getAlertStats({ 
          batteryId: filters.batteryId, 
          zoneId: filters.zoneId 
        }),
      ]);

      // Filter by date range on frontend if custom
      let filteredAlerts = alertsResponse.data;
      if (filterStore.dateRange === 'custom' && filterStore.customStartDate && filterStore.customEndDate) {
        const startTime = new Date(filterStore.customStartDate).getTime();
        const endTime = new Date(filterStore.customEndDate).getTime() + 86400000; // Add 1 day
        filteredAlerts = filteredAlerts.filter(a => a.createdAt >= startTime && a.createdAt < endTime);
      }

      // Filter by type on frontend
      if (filterStore.type.length > 0) {
        filteredAlerts = filteredAlerts.filter(a => filterStore.type.includes(a.type as any));
      }

      setAlerts(filteredAlerts);
      setPagination({
        ...alertsResponse.pagination,
        total: filteredAlerts.length,
        totalPages: Math.ceil(filteredAlerts.length / alertsResponse.pagination.limit),
      });
      setTimelineData(timelineResponse.data);
      setStats(statsResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alert data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AlertFilters, value: string | number | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined,
      page: key !== 'page' ? 1 : filters.page,
    };
    setFilters(newFilters);
    
    // Update URL if not a pagination change
    if (key !== 'page') {
      const params = filterStore.getURLParams();
      setSearchParams(params);
    }
  };

  const handleExport = () => {
    alertsApi.exportToCSV(alerts);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return '#ef4444';
      case 'acknowledged': return '#f59e0b';
      case 'resolved': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading alert history...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Alert Management</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowStatsDashboard(!showStatsDashboard)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showStatsDashboard ? '#6366f1' : '#f3f4f6',
              color: showStatsDashboard ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <BarChart3 size={16} />
            {showStatsDashboard ? 'Hide Statistics' : 'Show Statistics'}
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Download size={16} />
            Export to CSV
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee2e2', 
          color: '#991b1b', 
          borderRadius: '8px',
          marginBottom: '2rem' 
        }}>
          {error}
        </div>
      )}

      {/* Statistics Dashboard */}
      {showStatsDashboard && (
        <div style={{ marginBottom: '2rem' }}>
          <AlertStatsDashboard filters={filters} />
        </div>
      )}

      {/* Filters */}
      <AlertFilterControls onApplyFilters={applyFiltersToAPI} />

      {/* Alert History Section */}
      <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>Alert History</h3>

      {/* Alert List */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>ID</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Battery</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Zone</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Severity</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Created</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, index) => (
                <tr 
                  key={alert.id}
                  style={{ 
                    borderBottom: index < alerts.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                  }}
                >
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>{alert.id}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>{alert.batterySystemId}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>{alert.zoneId}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>{alert.type}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: `${getSeverityColor(alert.severity)}20`,
                      color: getSeverityColor(alert.severity)
                    }}>
                      {alert.severity}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: `${getStatusBadgeColor(alert.status)}20`,
                      color: getStatusBadgeColor(alert.status)
                    }}>
                      {alert.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                    {formatDate(alert.createdAt)}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                    {formatDuration(alert.duration || null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ 
          padding: '1rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page === 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ 
              padding: '0.5rem 1rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}>
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <button
              onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page === pagination.totalPages}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                opacity: pagination.page === pagination.totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertsPage;
