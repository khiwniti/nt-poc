import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FacilityMap } from '../components/FacilityMap';
import { FacilityMapFilters } from '../components/FacilityMapFilters';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import { facilitiesApi, FacilityWithMap } from '../api/facilities';
import { useFacilityMapFilterStore } from '../stores/facilityMapFilterStore';

export default function FacilityMapPage() {
  const [facilities, setFacilities] = useState<FacilityWithMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    healthStatus,
    alertRange,
    regions,
    searchQuery,
  } = useFacilityMapFilterStore();

  // Fetch facilities on mount
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        setLoading(true);
        const data = await facilitiesApi.getFacilitiesForMap();
        setFacilities(data);
      } catch (err) {
        console.error('Error fetching facilities:', err);
        setError('Failed to load facilities. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, []);

  // Extract unique regions from facilities
  const availableRegions = useMemo(() => {
    const regionSet = new Set(facilities.map(f => f.region));
    return Array.from(regionSet).sort();
  }, [facilities]);

  // Apply filters
  const filteredFacilities = useMemo(() => {
    let filtered = [...facilities];

    // Filter by health status
    if (healthStatus.length > 0) {
      filtered = filtered.filter(f => healthStatus.includes(f.status));
    }

    // Filter by alert range
    if (alertRange !== null) {
      filtered = filtered.filter(f => {
        const count = f.alertCount;
        if (alertRange === 'none') return count === 0;
        if (alertRange === '0-5') return count >= 0 && count <= 5;
        if (alertRange === '6-10') return count >= 6 && count <= 10;
        if (alertRange === '10+') return count > 10;
        return true;
      });
    }

    // Filter by region
    if (regions.length > 0) {
      filtered = filtered.filter(f => regions.includes(f.region));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [facilities, healthStatus, alertRange, regions, searchQuery]);

  const handleFacilityClick = (facilityId: string) => {
    navigate(`/?facilityId=${facilityId}`);
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically via useMemo
    // This handler is for explicit "Apply" button clicks
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontSize: '1.125rem', marginBottom: '1rem' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111827' }}>
          Facilities Map
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          Showing {filteredFacilities.length} of {facilities.length} facilities
        </p>
      </div>

      <FacilityMapFilters
        availableRegions={availableRegions}
        onApplyFilters={handleApplyFilters}
      />

      <FacilityMap
        facilities={filteredFacilities}
        onFacilityClick={handleFacilityClick}
      />
    </div>
  );
}
