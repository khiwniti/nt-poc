import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { alertsApi, AlertStats, TimelineDataPoint, AlertFilters } from '../api/alerts';

interface AlertStatsDashboardProps {
  filters?: AlertFilters;
}

function AlertStatsDashboard({ filters = {} }: AlertStatsDashboardProps) {
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [trendData, setTrendData] = useState<TimelineDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, [filters]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, trendResponse] = await Promise.all([
        alertsApi.getAlertStats({ 
          batteryId: filters.batteryId, 
          zoneId: filters.zoneId 
        }),
        alertsApi.getTimelineData({ 
          batteryId: filters.batteryId, 
          zoneId: filters.zoneId,
          days: 7 
        }),
      ]);

      setStats(statsResponse.data);
      setTrendData(trendResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#fee2e2', 
        color: '#991b1b', 
        borderRadius: '8px',
        margin: '1rem 0'
      }}>
        {error}
      </div>
    );
  }

  if (!stats) return null;

  // Prepare data for charts
  const severityData = [
    { name: 'Critical', value: stats.bySeverity.critical, color: '#ef4444' },
    { name: 'Warning', value: stats.bySeverity.warning, color: '#f59e0b' },
    { name: 'Info', value: stats.bySeverity.info, color: '#3b82f6' },
  ];

  const typeData = Object.entries(stats.byType).map(([name, value]) => ({
    name: name.replace(' ', '\n'),
    count: value,
  }));

  return (
    <div style={{ padding: '0' }}>
      {/* Stat Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Alerts</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{stats.total}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <AlertCircle size={24} color="#6b7280" />
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #fecaca',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Active Alerts</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.byStatus.active}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #fed7aa',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Acknowledged</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.byStatus.acknowledged}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
              <Clock size={24} color="#f59e0b" />
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #bbf7d0',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Resolved</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{stats.byStatus.resolved}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#d1fae5', borderRadius: '8px' }}>
              <CheckCircle size={24} color="#10b981" />
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Resolution Time */}
      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Average Resolution Time</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>
              {stats.averageResolutionTime > 0 ? formatDuration(stats.averageResolutionTime) : 'N/A'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              Time from alert creation to resolution
            </div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: '#eef2ff', borderRadius: '8px' }}>
            <Clock size={24} color="#6366f1" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Breakdown by Severity */}
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
            Breakdown by Severity
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {severityData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color }}></div>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown by Type */}
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
            Breakdown by Type
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp size={20} color="#6366f1" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
            7-Day Trend
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
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
            <Line type="monotone" dataKey="total" stroke="#6366f1" name="Total" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AlertStatsDashboard;
