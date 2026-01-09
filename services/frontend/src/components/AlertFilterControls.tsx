import { X } from 'lucide-react';
import { useAlertFilterStore, AlertSeverity, AlertStatus, AlertType, DateRange } from '../stores/alertFilterStore';

const ALERT_TYPES: AlertType[] = [
  'Temperature High',
  'Voltage Anomaly',
  'SoC Critical',
  'Communication Lost',
  'Capacity Degraded',
];

interface AlertFilterControlsProps {
  onApplyFilters: () => void;
}

export function AlertFilterControls({ onApplyFilters }: AlertFilterControlsProps) {
  const {
    status,
    severity,
    type,
    dateRange,
    customStartDate,
    customEndDate,
    setStatus,
    setSeverity,
    setType,
    setDateRange,
    setCustomDateRange,
    clearFilters,
  } = useAlertFilterStore();

  const handleStatusChange = (selectedStatus: AlertStatus) => {
    const newStatus = status.includes(selectedStatus)
      ? status.filter(s => s !== selectedStatus)
      : [...status, selectedStatus];
    setStatus(newStatus);
  };

  const handleSeverityChange = (selectedSeverity: AlertSeverity) => {
    const newSeverity = severity.includes(selectedSeverity)
      ? severity.filter(s => s !== selectedSeverity)
      : [...severity, selectedSeverity];
    setSeverity(newSeverity);
  };

  const handleTypeChange = (selectedType: AlertType) => {
    const newType = type.includes(selectedType)
      ? type.filter(t => t !== selectedType)
      : [...type, selectedType];
    setType(newType);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    if (range !== 'custom') {
      onApplyFilters();
    }
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onApplyFilters();
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    onApplyFilters();
  };

  const hasActiveFilters = status.length > 0 || severity.length > 0 || type.length > 0 || dateRange !== '30d';

  return (
    <div style={{ 
      padding: '1.5rem', 
      backgroundColor: '#f9fafb', 
      borderRadius: '8px', 
      border: '1px solid #e5e7eb',
      marginBottom: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#374151',
            }}
          >
            <X size={14} />
            Clear All
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Status Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', color: '#374151' }}>
            Status
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(['active', 'acknowledged', 'resolved'] as AlertStatus[]).map((s) => (
              <label
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: status.includes(s) ? '#3b82f6' : 'white',
                  color: status.includes(s) ? 'white' : '#374151',
                  border: '1px solid',
                  borderColor: status.includes(s) ? '#3b82f6' : '#d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={status.includes(s)}
                  onChange={() => handleStatusChange(s)}
                  style={{ margin: 0, cursor: 'pointer' }}
                />
                <span style={{ textTransform: 'capitalize' }}>{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Severity Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', color: '#374151' }}>
            Severity
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(['critical', 'warning', 'info'] as AlertSeverity[]).map((s) => {
              const colors = {
                critical: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
                warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
                info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
              };
              const color = colors[s];
              return (
                <label
                  key={s}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: severity.includes(s) ? color.border : 'white',
                    color: severity.includes(s) ? 'white' : color.text,
                    border: '1px solid',
                    borderColor: color.border,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={severity.includes(s)}
                    onChange={() => handleSeverityChange(s)}
                    style={{ margin: 0, cursor: 'pointer' }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{s}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', color: '#374151' }}>
            Alert Type
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {ALERT_TYPES.map((t) => (
              <label
                key={t}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: type.includes(t) ? '#10b981' : 'white',
                  color: type.includes(t) ? 'white' : '#374151',
                  border: '1px solid',
                  borderColor: type.includes(t) ? '#10b981' : '#d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={type.includes(t)}
                  onChange={() => handleTypeChange(t)}
                  style={{ margin: 0, cursor: 'pointer' }}
                />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', color: '#374151' }}>
            Date Range
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['24h', '7d', '30d', 'custom'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: dateRange === range ? '#6366f1' : 'white',
                    color: dateRange === range ? 'white' : '#374151',
                    border: '1px solid',
                    borderColor: dateRange === range ? '#6366f1' : '#d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                >
                  {range === '24h' ? 'Last 24 Hours' : 
                   range === '7d' ? 'Last 7 Days' : 
                   range === '30d' ? 'Last 30 Days' : 
                   'Custom Range'}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#6b7280' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate || ''}
                    onChange={(e) => setCustomDateRange(e.target.value, customEndDate || '')}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#6b7280' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate || ''}
                    onChange={(e) => setCustomDateRange(customStartDate || '', e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <button
                  onClick={handleCustomDateChange}
                  disabled={!customStartDate || !customEndDate}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: customStartDate && customEndDate ? '#6366f1' : '#e5e7eb',
                    color: customStartDate && customEndDate ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: customStartDate && customEndDate ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginTop: '1.25rem',
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Apply Filters Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button
            onClick={onApplyFilters}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
