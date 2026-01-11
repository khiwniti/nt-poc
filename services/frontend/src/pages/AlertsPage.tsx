import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { alertsApi, Alert, AlertFilters } from '../api/alerts';
import { Download, BarChart3 } from 'lucide-react';
import { AlertFilterControls } from '../components/AlertFilterControls';
import { useAlertFilterStore } from '../stores/alertFilterStore';
import AlertStatsDashboard from '../components/AlertStatsDashboard';
import { AlertDetailModal } from '../components/AlertDetailModal';
import { AlertList } from '../components/AlertList';
import { useAlertSoundNotification } from '../hooks/useAlertSoundNotification';

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showStatsDashboard, setShowStatsDashboard] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Filter store
  const filterStore = useAlertFilterStore();

  // Sound notifications
  useAlertSoundNotification(alerts);

  // Filters
  const [filters, setFilters] = useState<AlertFilters>({});

  // Initialize filters from URL on mount
  useEffect(() => {
    filterStore.setFromURLParams(searchParams);
  }, []);

  // Apply filters to API
  const applyFiltersToAPI = () => {
    const newFilters: AlertFilters = {
      ...filters,
    };

    // Add filter store filters
    if (filterStore.status.length > 0) {
      newFilters.status = filterStore.status.join(',');
    }
    if (filterStore.severity.length > 0) {
      newFilters.severity = filterStore.severity.join(',');
    }
    if (filterStore.type.length > 0) {
      newFilters.type = filterStore.type.join(',');
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

      const now = Date.now();
      const rangeMs =
        filterStore.dateRange === '24h'
          ? 24 * 60 * 60 * 1000
          : filterStore.dateRange === '7d'
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
      const createdAfter = now - rangeMs;
      const createdBefore = now;

      // Calculate date range in days for timeline
      const alertsResponse = await alertsApi.getAlerts({
        ...filters,
        page: 1,
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Filter by date range on frontend if custom
      let filteredAlerts = alertsResponse.data;
      if (
        filterStore.dateRange === 'custom' &&
        filterStore.customStartDate &&
        filterStore.customEndDate
      ) {
        const startTime = new Date(filterStore.customStartDate).getTime();
        const endTime = new Date(filterStore.customEndDate).getTime() + 86400000; // Add 1 day
        filteredAlerts = filteredAlerts.filter(
          (a) => a.createdAt >= startTime && a.createdAt < endTime
        );
      } else {
        filteredAlerts = filteredAlerts.filter(
          (a) => a.createdAt >= createdAfter && a.createdAt <= createdBefore
        );
      }

      setAlerts(filteredAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alert data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    alertsApi.exportToCSV(alerts);
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
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
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
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '2rem',
          }}
        >
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
      <h3
        style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}
      >
        Alert History
      </h3>

      {/* Alert List */}
      <AlertList
        alerts={alerts}
        loading={loading}
        onSelectAlert={(alertId) => setSelectedAlertId(alertId)}
        onRefresh={fetchData}
      />

      {/* Alert Detail Modal */}
      {selectedAlertId && (
        <AlertDetailModal
          alertId={selectedAlertId}
          onClose={() => setSelectedAlertId(null)}
          onUpdate={() => fetchData()}
        />
      )}
    </div>
  );
}

export default AlertsPage;
