import { X } from 'lucide-react';
import { useFacilityMapFilterStore, FacilityStatus, AlertRange } from '../stores/facilityMapFilterStore';

const ALERT_RANGES: AlertRange[] = ['none', '0-5', '6-10', '10+'];

interface FacilityMapFiltersProps {
  availableRegions: string[];
  onApplyFilters: () => void;
}

export function FacilityMapFilters({ availableRegions, onApplyFilters }: FacilityMapFiltersProps) {
  const {
    healthStatus,
    alertRange,
    regions,
    searchQuery,
    setHealthStatus,
    setAlertRange,
    setRegions,
    setSearchQuery,
    clearFilters,
  } = useFacilityMapFilterStore();

  const handleStatusChange = (status: FacilityStatus) => {
    const newStatus = healthStatus.includes(status)
      ? healthStatus.filter(s => s !== status)
      : [...healthStatus, status];
    setHealthStatus(newStatus);
  };

  const handleRegionChange = (region: string) => {
    const newRegions = regions.includes(region)
      ? regions.filter(r => r !== region)
      : [...regions, region];
    setRegions(newRegions);
  };

  const handleClearFilters = () => {
    clearFilters();
    onApplyFilters();
  };

  const hasActiveFilters =
    healthStatus.length > 0 ||
    alertRange !== null ||
    regions.length > 0 ||
    searchQuery !== '';

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginBottom: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Map Filters</h3>
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
        {/* Search by Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', color: '#374151' }}>
            Search by Name
          </label>
          <input
            type="text"
            placeholder="Search facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Health Status Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', color: '#374151' }}>
            Health Status
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(['active', 'maintenance', 'inactive'] as FacilityStatus[]).map((status) => (
              <label
                key={status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: healthStatus.includes(status) ? '#10b981' : 'white',
                  color: healthStatus.includes(status) ? 'white' : '#374151',
                  border: '1px solid',
                  borderColor: healthStatus.includes(status) ? '#10b981' : '#d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={healthStatus.includes(status)}
                  onChange={() => handleStatusChange(status)}
                  style={{ margin: 0, cursor: 'pointer' }}
                />
                <span style={{ textTransform: 'capitalize' }}>{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Alert Count Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', color: '#374151' }}>
            Alert Count
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {ALERT_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setAlertRange(alertRange === range ? null : range)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: alertRange === range ? '#ef4444' : 'white',
                  color: alertRange === range ? 'white' : '#374151',
                  border: '1px solid',
                  borderColor: alertRange === range ? '#ef4444' : '#d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                {range === 'none' ? 'No Alerts' : `${range} Alerts`}
              </button>
            ))}
          </div>
        </div>

        {/* Region Filter */}
        {availableRegions.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.75rem', color: '#374151' }}>
              Region / Country
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {availableRegions.map((region) => (
                <label
                  key={region}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: regions.includes(region) ? '#6366f1' : 'white',
                    color: regions.includes(region) ? 'white' : '#374151',
                    border: '1px solid',
                    borderColor: regions.includes(region) ? '#6366f1' : '#d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={regions.includes(region)}
                    onChange={() => handleRegionChange(region)}
                    style={{ margin: 0, cursor: 'pointer' }}
                  />
                  <span>{region}</span>
                </label>
              ))}
            </div>
          </div>
        )}

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
