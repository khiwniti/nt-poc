import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { alertsApi, Alert, AlertFilters, TimelineDataPoint, AlertStats } from '../api/alerts';
import { Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alertsResponse, timelineResponse, statsResponse] = await Promise.all([
        alertsApi.getAlerts(filters),
        alertsApi.getTimelineData({ 
          batteryId: filters.batteryId, 
          zoneId: filters.zoneId,
          days: 30 
        }),
        alertsApi.getAlertStats({ 
          batteryId: filters.batteryId, 
          zoneId: filters.zoneId 
        }),
      ]);

      setAlerts(alertsResponse.data);
      setPagination(alertsResponse.pagination);
      setTimelineData(timelineResponse.data);
      setStats(statsResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alert data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AlertFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
      page: key !== 'page' ? 1 : prev.page, // Reset to page 1 when changing filters
    }));
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
        <h2 style={{ margin: 0 }}>Alert History</h2>
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

      {/* Statistics Summary */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Alerts</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Critical</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.bySeverity.critical}</div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fed7aa' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Warning</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.bySeverity.warning}</div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Avg Resolution</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
              {formatDuration(stats.averageResolutionTime || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Visualization */}
      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Alert Timeline (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Legend />
            <Line type="monotone" dataKey="critical" stroke="#ef4444" name="Critical" strokeWidth={2} />
            <Line type="monotone" dataKey="warning" stroke="#f59e0b" name="Warning" strokeWidth={2} />
            <Line type="monotone" dataKey="info" stroke="#3b82f6" name="Info" strokeWidth={2} />
            <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: '#f9fafb', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Filter size={16} />
          <h3 style={{ margin: 0 }}>Filters</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
              Battery ID
            </label>
            <input
              type="text"
              value={filters.batteryId || ''}
              onChange={(e) => handleFilterChange('batteryId', e.target.value)}
              placeholder="e.g., battery-1"
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
              Zone ID
            </label>
            <input
              type="text"
              value={filters.zoneId || ''}
              onChange={(e) => handleFilterChange('zoneId', e.target.value)}
              placeholder="e.g., zone-1"
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
              Severity
            </label>
            <select
              value={filters.severity || ''}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

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
