import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, RefreshCw, AlertCircle, Filter, X } from 'lucide-react';
import { FacilityMap } from '../components/FacilityMap';
import { type FacilityLocation, type HealthStatus } from '../types/facilityMap';
import { facilitiesApi, mockFacilities } from '../api/facilities';

interface FilterState {
  healthStatus: HealthStatus | 'all';
}

export function FacilityMapPage() {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<FacilityLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityLocation | null>(null);
  const [filters, setFilters] = useState<FilterState>({ healthStatus: 'all' });
  const [showFilters, setShowFilters] = useState(false);

  // Get Mapbox token from environment
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await facilitiesApi.getFacilities();
      setFacilities(response.data);
    } catch (err) {
      console.error('Failed to fetch facilities, using mock data:', err);
      // Use mock data if API is not available
      setFacilities(mockFacilities);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const handleFacilityClick = useCallback(
    (facility: FacilityLocation) => {
      // Navigate to facility dashboard
      navigate(`/zones/${facility.id}`);
    },
    [navigate]
  );

  const handleFacilitySelect = useCallback((facility: FacilityLocation | null) => {
    setSelectedFacility(facility);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const handleFilterChange = useCallback((healthStatus: HealthStatus | 'all') => {
    setFilters({ healthStatus });
  }, []);

  const filteredFacilities = facilities.filter((facility) => {
    if (filters.healthStatus === 'all') return true;
    return facility.healthStatus === filters.healthStatus;
  });

  const healthCounts = facilities.reduce(
    (acc, f) => {
      acc[f.healthStatus]++;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0 }
  );

  if (!mapboxToken) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <h2>Mapbox Token Required</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Please set the <code>VITE_MAPBOX_ACCESS_TOKEN</code> environment variable to enable the
          facility map.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          Get your token at{' '}
          <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer">
            mapbox.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Map size={24} style={{ color: '#3b82f6' }} />
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Facility Map</h1>
          <span
            style={{
              backgroundColor: '#f3f4f6',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            {filteredFacilities.length} facilities
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: showFilters ? '#3b82f6' : 'white',
              color: showFilters ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            <Filter size={16} />
            Filters
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
            Health Status:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['all', 'healthy', 'warning', 'critical'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  backgroundColor:
                    filters.healthStatus === status
                      ? status === 'all'
                        ? '#3b82f6'
                        : status === 'healthy'
                          ? '#22c55e'
                          : status === 'warning'
                            ? '#eab308'
                            : '#ef4444'
                      : 'white',
                  color: filters.healthStatus === status ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                }}
              >
                {status} {status !== 'all' && `(${healthCounts[status]})`}
              </button>
            ))}
          </div>
          {filters.healthStatus !== 'all' && (
            <button
              onClick={() => handleFilterChange('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '0.75rem',
              }}
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              backgroundColor: 'white',
              padding: '1.5rem 2rem',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <RefreshCw
              size={24}
              style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ margin: '0.5rem 0 0', color: '#6b7280' }}>Loading facilities...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              position: 'absolute',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <FacilityMap
          facilities={filteredFacilities}
          accessToken={mapboxToken}
          onFacilityClick={handleFacilityClick}
          onFacilitySelect={handleFacilitySelect}
        />
      </div>

      {/* Selected Facility Info Bar */}
      {selectedFacility && (
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: 'white',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontWeight: 600 }}>{selectedFacility.name}</span>
            <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
              {selectedFacility.location}
            </span>
          </div>
          <button
            onClick={() => handleFacilityClick(selectedFacility)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            View Dashboard →
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default FacilityMapPage;
