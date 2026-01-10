import React, { useEffect, useMemo, useState } from 'react';

type PreviewRow = {
  label: string;
  value: string;
  change: string;
};

type ScheduleState = {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string;
  timezone: string;
  recipients: string;
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const dateRangeLabel = (range: string) => {
  switch (range) {
    case 'last-7-days':
      return 'Last 7 days';
    case 'last-30-days':
      return 'Last 30 days';
    case 'quarter-to-date':
      return 'Quarter to date';
    default:
      return 'Custom range';
  }
};

const buildPreviewRows = (template: string, includeForecast: boolean, focus: string): PreviewRow[] => {
  const rows: PreviewRow[] = [
    { label: 'Utilization', value: focus === 'cost' ? '$12,430' : '82%', change: '+2%' },
    { label: 'Energy Usage', value: '15,420 kWh', change: '-5%' },
    { label: 'Anomalies Detected', value: '3', change: '-1' },
  ];

  if (template === 'reliability') {
    rows[0] = { label: 'Availability', value: '99.1%', change: '+0.2%' };
  }

  if (template === 'sustainability') {
    rows[1] = { label: 'Carbon Intensity', value: '112 gCO₂/kWh', change: '-8%' };
  }

  if (includeForecast) {
    rows.push({ label: 'Forecasted Peak', value: focus === 'cost' ? '$14,200' : '92%', change: '+4%' });
  }

  return rows;
};

function ReportsPage() {
  const [reportName, setReportName] = useState('Weekly Utilization');
  const [template, setTemplate] = useState('utilization');
  const [metricFocus, setMetricFocus] = useState('energy');
  const [dateRange, setDateRange] = useState('last-7-days');
  const [includeForecast, setIncludeForecast] = useState(true);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>(buildPreviewRows('utilization', true, 'energy'));
  const [generationStatus, setGenerationStatus] = useState('Ready to generate');
  const [exportStatus, setExportStatus] = useState('No exports yet');
  const [schedule, setSchedule] = useState<ScheduleState>({
    enabled: true,
    frequency: 'weekly',
    day: 'monday',
    time: '09:00',
    timezone: 'UTC',
    recipients: 'ops@example.com',
  });
  const [scheduleStatus, setScheduleStatus] = useState('Schedule not configured');
  const [emailStatus, setEmailStatus] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer' | 'analyst'>('admin');

  useEffect(() => {
    const storedRole = (localStorage.getItem('role') as 'admin' | 'viewer' | 'analyst' | null) || 'admin';
    setRole(storedRole);
  }, []);

  const canManageReports = role !== 'viewer';
  const dateLabel = dateRangeLabel(dateRange);
  const previewTitle = useMemo(
    () =>
      `${reportName || 'Custom Report'} • ${dateLabel} • ${
        template === 'utilization' ? 'Utilization' : template === 'reliability' ? 'Reliability' : 'Sustainability'
      }`,
    [reportName, dateLabel, template]
  );
  const nextRun = useMemo(
    () =>
      `${schedule.frequency === 'weekly' ? `Next ${capitalize(schedule.day)}` : schedule.frequency === 'monthly' ? 'Next Month' : 'Tomorrow'} at ${
        schedule.time
      } ${schedule.timezone}`,
    [schedule]
  );

  const handleGenerate = async () => {
    if (!canManageReports) {
      setGenerationStatus('Access restricted for your role');
      return;
    }

    setGenerationStatus('Generating report...');
    await new Promise((resolve) => setTimeout(resolve, 150));
    setPreviewRows(buildPreviewRows(template, includeForecast, metricFocus));
    setGenerationStatus('Report ready for preview');
  };

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    if (!canManageReports) {
      setExportStatus('Export blocked for your role');
      return;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setExportStatus(`${format.toUpperCase()} export prepared at ${timestamp}`);
  };

  const handleScheduleSave = () => {
    if (!canManageReports) {
      setScheduleStatus('Scheduling blocked for your role');
      return;
    }

    if (!schedule.enabled) {
      setScheduleStatus('Schedule disabled');
      return;
    }

    const frequencyLabel =
      schedule.frequency === 'weekly'
        ? `Weekly on ${capitalize(schedule.day)}`
        : schedule.frequency === 'monthly'
        ? 'Monthly on day 1'
        : 'Daily';

    setScheduleStatus(`${frequencyLabel} at ${schedule.time} (${schedule.timezone})`);
  };

  const handleTestEmail = () => {
    if (!canManageReports) {
      setEmailStatus('Email delivery blocked for your role');
      return;
    }

    if (!schedule.recipients.trim()) {
      setEmailStatus('Add at least one recipient');
      return;
    }

    setEmailStatus(`Delivery queued to ${schedule.recipients}`);
  };

  return (
    <div className="reports-page" style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
      <div
        data-testid="access-banner"
        style={{
          padding: '1rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: canManageReports ? '#f6f8ff' : '#fff5f5',
        }}
      >
        <div style={{ fontWeight: 600 }}>Reporting Workspace</div>
        <p style={{ margin: '0.25rem 0 0' }}>
          {canManageReports
            ? 'Create, preview, export, and schedule facility reports in one place.'
            : 'You have view-only access. Report generation, export, and scheduling are disabled.'}
        </p>
      </div>

      <section
        data-testid="report-builder"
        style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: '#fff' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Custom Report Generator</h2>
          <span aria-label="report-permission">Role: {capitalize(role)}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Report name
            <input
              data-testid="report-name-input"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g. Weekly Utilization"
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Template
            <select
              data-testid="report-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="utilization">Utilization</option>
              <option value="reliability">Reliability</option>
              <option value="sustainability">Sustainability</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Date range
            <select
              data-testid="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="last-7-days">Last 7 days</option>
              <option value="last-30-days">Last 30 days</option>
              <option value="quarter-to-date">Quarter to date</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Focus metric
            <select
              data-testid="metric-focus"
              value={metricFocus}
              onChange={(e) => setMetricFocus(e.target.value)}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="energy">Energy Efficiency</option>
              <option value="reliability">Reliability</option>
              <option value="cost">Cost Savings</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.75rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              data-testid="include-forecast"
              checked={includeForecast}
              onChange={(e) => setIncludeForecast(e.target.checked)}
            />
            Include forecasted trends
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" data-testid="share-with-team" defaultChecked />
            Share with team
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
          <button
            data-testid="generate-report"
            onClick={handleGenerate}
            disabled={!reportName.trim() || !canManageReports}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: canManageReports ? '#111827' : '#9ca3af',
              color: '#fff',
              cursor: canManageReports ? 'pointer' : 'not-allowed',
            }}
          >
            Generate report
          </button>
          <span data-testid="generation-status" style={{ color: '#6b7280' }}>
            {generationStatus}
          </span>
        </div>
      </section>

      <section
        data-testid="preview-section"
        style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', background: '#fff' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Report Preview</h3>
            <div data-testid="preview-title" style={{ color: '#6b7280' }}>
              {previewTitle}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>Next scheduled delivery</div>
            <div data-testid="next-run" style={{ color: '#6b7280' }}>
              {nextRun}
            </div>
          </div>
        </div>

        <div data-testid="report-preview" style={{ display: 'grid', gap: '1rem' }}>
          <div
            data-testid="preview-chart"
            role="img"
            aria-label="Report preview chart"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.5rem',
            }}
          >
            {previewRows.map((row) => (
              <div
                key={row.label}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                }}
              >
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{row.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{row.value}</div>
                <div style={{ color: '#10b981' }}>{row.change}</div>
              </div>
            ))}
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <table data-testid="preview-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f3f4f6' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Section</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Value</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={`${row.label}-table`}>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb' }}>{row.label}</td>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb' }}>{row.value}</td>
                    <td style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb' }}>{row.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        data-testid="export-section"
        style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', background: '#fff' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Export & Delivery</h3>
          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Supported: PDF, CSV, XLSX</div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
          <button
            data-testid="export-pdf"
            onClick={() => handleExport('pdf')}
            disabled={!canManageReports}
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #111827',
              background: canManageReports ? '#111827' : '#9ca3af',
              color: '#fff',
              cursor: canManageReports ? 'pointer' : 'not-allowed',
            }}
          >
            Export PDF
          </button>
          <button
            data-testid="export-csv"
            onClick={() => handleExport('csv')}
            disabled={!canManageReports}
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #111827',
              background: canManageReports ? '#111827' : '#9ca3af',
              color: '#fff',
              cursor: canManageReports ? 'pointer' : 'not-allowed',
            }}
          >
            Export CSV
          </button>
          <button
            data-testid="export-xlsx"
            onClick={() => handleExport('xlsx')}
            disabled={!canManageReports}
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #111827',
              background: canManageReports ? '#111827' : '#9ca3af',
              color: '#fff',
              cursor: canManageReports ? 'pointer' : 'not-allowed',
            }}
          >
            Export XLSX
          </button>
        </div>

        <div data-testid="export-status" style={{ marginTop: '0.75rem', color: '#6b7280' }}>
          {exportStatus}
        </div>
      </section>

      <section
        data-testid="schedule-section"
        style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', background: '#fff' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Scheduled Delivery</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              data-testid="schedule-toggle"
              checked={schedule.enabled}
              onChange={(e) => setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
            Enable schedule
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Frequency
            <select
              data-testid="schedule-frequency"
              value={schedule.frequency}
              onChange={(e) =>
                setSchedule((prev) => ({ ...prev, frequency: e.target.value as ScheduleState['frequency'] }))
              }
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              disabled={!canManageReports}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Day of week
            <select
              data-testid="schedule-day"
              value={schedule.day}
              onChange={(e) =>
                setSchedule((prev) => ({ ...prev, day: e.target.value as ScheduleState['day'] }))
              }
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              disabled={!canManageReports}
            >
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Delivery time
            <input
              type="time"
              data-testid="schedule-time"
              value={schedule.time}
              onChange={(e) => setSchedule((prev) => ({ ...prev, time: e.target.value }))}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              disabled={!canManageReports}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Timezone
            <select
              data-testid="schedule-timezone"
              value={schedule.timezone}
              onChange={(e) => setSchedule((prev) => ({ ...prev, timezone: e.target.value }))}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              disabled={!canManageReports}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Bangkok">Asia/Bangkok</option>
            </select>
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
          Recipients
          <input
            data-testid="schedule-recipients"
            value={schedule.recipients}
            onChange={(e) => setSchedule((prev) => ({ ...prev, recipients: e.target.value }))}
            placeholder="team@example.com, manager@example.com"
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            disabled={!canManageReports}
          />
        </label>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
          <button
            data-testid="save-schedule"
            onClick={handleScheduleSave}
            disabled={!canManageReports}
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #111827',
              background: canManageReports ? '#111827' : '#9ca3af',
              color: '#fff',
              cursor: canManageReports ? 'pointer' : 'not-allowed',
            }}
          >
            Save schedule
          </button>
          <button
            data-testid="send-test-email"
            onClick={handleTestEmail}
            disabled={!canManageReports}
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #111827',
              background: canManageReports ? '#111827' : '#9ca3af',
              color: '#fff',
              cursor: canManageReports ? 'pointer' : 'not-allowed',
            }}
          >
            Send test email
          </button>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem', color: '#6b7280' }}>
          <div data-testid="schedule-status">{scheduleStatus}</div>
          <div data-testid="email-status">{emailStatus}</div>
        </div>
      </section>
    </div>
  );
}

export default ReportsPage;
