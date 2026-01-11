import React, { useEffect, useState } from 'react';
import { reportAnalyticsAPI, DashboardData, PopularReport } from '../api/reportAnalytics';

function ReportAnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await reportAnalyticsAPI.getDashboard(timeRange);
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load analytics dashboard');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await reportAnalyticsAPI.exportToCSV();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div data-testid="loading-spinner">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div data-testid="error-message" style={{ color: '#dc2626' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { overview, popular_reports, recent_activity, downloads_by_format, timeline } = dashboardData;

  return (
    <div className="analytics-dashboard" style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Report Analytics Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            data-testid="time-range-selector"
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            data-testid="export-csv-button"
            onClick={handleExportCSV}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #111827',
              background: '#111827',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <section
        data-testid="overview-section"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}
      >
        <div
          data-testid="stat-card-reports"
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Reports</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{overview.total_reports}</div>
        </div>

        <div
          data-testid="stat-card-views"
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Views</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{overview.total_views}</div>
        </div>

        <div
          data-testid="stat-card-downloads"
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Downloads</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{overview.total_downloads}</div>
        </div>

        <div
          data-testid="stat-card-email-opens"
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Email Opens</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{overview.total_email_opens}</div>
        </div>

        <div
          data-testid="stat-card-email-clicks"
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Email Clicks</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{overview.total_email_clicks}</div>
        </div>
      </section>

      {/* Downloads by Format */}
      <section
        data-testid="downloads-by-format"
        style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: '#fff' }}
      >
        <h2 style={{ margin: '0 0 1rem 0' }}>Downloads by Format</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: '#fef3f2' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>PDF</div>
            <div data-testid="pdf-downloads" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {downloads_by_format.pdf}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: '#f0fdf4' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>CSV</div>
            <div data-testid="csv-downloads" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {downloads_by_format.csv}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: '#eff6ff' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>XLSX</div>
            <div data-testid="xlsx-downloads" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {downloads_by_format.xlsx}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Reports */}
      <section
        data-testid="popular-reports-section"
        style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: '#fff' }}
      >
        <h2 style={{ margin: '0 0 1rem 0' }}>Most Popular Reports</h2>
        {popular_reports.length === 0 ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No reports yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table data-testid="popular-reports-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Rank</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Report Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Views</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Downloads</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Email Opens</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {popular_reports.map((report: PopularReport, index: number) => (
                  <tr key={report.report_id} data-testid={`popular-report-${index}`}>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb' }}>#{index + 1}</td>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb', fontWeight: 500 }}>
                      {report.report_name}
                    </td>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                      {report.total_views}
                    </td>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                      {report.total_downloads}
                    </td>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                      {report.total_email_opens}
                    </td>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                      {report.engagement_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Timeline Chart */}
      <section
        data-testid="timeline-chart"
        style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: '#fff' }}
      >
        <h2 style={{ margin: '0 0 1rem 0' }}>Activity Timeline</h2>
        {timeline.length === 0 ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No activity in selected period</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '0.5rem', minWidth: '600px' }}>
              {timeline.map((day) => {
                const maxValue = Math.max(
                  ...timeline.map((d) => Math.max(d.views, d.downloads, d.email_opens))
                );
                const viewsHeight = maxValue > 0 ? (day.views / maxValue) * 100 : 0;
                const downloadsHeight = maxValue > 0 ? (day.downloads / maxValue) * 100 : 0;
                const emailHeight = maxValue > 0 ? (day.email_opens / maxValue) * 100 : 0;

                return (
                  <div key={day.date} style={{ flex: 1, minWidth: '60px' }}>
                    <div
                      style={{
                        height: '150px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '2px',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        title={`Views: ${day.views}`}
                        style={{
                          width: '8px',
                          height: `${viewsHeight}%`,
                          background: '#3b82f6',
                          borderRadius: '2px 2px 0 0',
                        }}
                      />
                      <div
                        title={`Downloads: ${day.downloads}`}
                        style={{
                          width: '8px',
                          height: `${downloadsHeight}%`,
                          background: '#10b981',
                          borderRadius: '2px 2px 0 0',
                        }}
                      />
                      <div
                        title={`Email Opens: ${day.email_opens}`}
                        style={{
                          width: '8px',
                          height: `${emailHeight}%`,
                          background: '#f59e0b',
                          borderRadius: '2px 2px 0 0',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        marginTop: '0.5rem',
                        textAlign: 'center',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'top left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} />
                <span style={{ fontSize: '0.875rem' }}>Views</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
                <span style={{ fontSize: '0.875rem' }}>Downloads</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }} />
                <span style={{ fontSize: '0.875rem' }}>Email Opens</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section
        data-testid="recent-activity-section"
        style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: '#fff' }}
      >
        <h2 style={{ margin: '0 0 1rem 0' }}>Recent Activity</h2>
        {recent_activity.length === 0 ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No recent activity</div>
        ) : (
          <div data-testid="activity-list" style={{ display: 'grid', gap: '0.75rem' }}>
            {recent_activity.slice(0, 10).map((event) => (
              <div
                key={event.id}
                data-testid={`activity-event-${event.event_type}`}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {event.event_type === 'view' && '👁️ Report Viewed'}
                    {event.event_type === 'download' && `⬇️ Downloaded (${event.format?.toUpperCase()})`}
                    {event.event_type === 'email_open' && '📧 Email Opened'}
                    {event.event_type === 'email_click' && '🔗 Email Link Clicked'}
                  </div>
                  {event.user_email && (
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{event.user_email}</div>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {new Date(event.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ReportAnalyticsDashboard;
