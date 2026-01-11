import { useEffect, useState } from 'react';
import { FacilityMap } from '../components/FacilityMap';

interface Facility {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: string;
  total_zones?: number;
  timezone?: string;
}

export function GeospatialView() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token');
        }

        const response = await fetch('http://localhost:3000/api/facilities', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch facilities');
        }

        const result = await response.json();
        
        const validFacilities = result.data.filter(
          (f: Facility) => f.latitude != null && f.longitude != null
        );
        
        setFacilities(validFacilities);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load facilities');
        setLoading(false);
      }
    };

    fetchFacilities();
  }, []);

  const handleMarkerClick = (facility: Facility) => {
    setSelectedFacility(facility);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666',
      }}>
        Loading map...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#ef4444',
      }}>
        Error: {error}
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666',
      }}>
        No facilities with location data found
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      height: isMobile ? '100vh' : 'calc(100vh - 64px)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {!isMobile && (
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              Facility Locations
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              {facilities.length} facilities displayed
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                }}></div>
                <span>Active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                }}></div>
                <span>Maintenance</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                }}></div>
                <span>Inactive</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(8px)',
          maxWidth: 'calc(100% - 80px)',
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            📍 {facilities.length} Facilities
          </h2>
        </div>
      )}

      <div style={{ 
        height: isMobile ? '100%' : 'calc(100% - 73px)',
        width: '100%',
      }}>
        <FacilityMap
          facilities={facilities}
          onMarkerClick={handleMarkerClick}
          isMobile={isMobile}
        />
      </div>

      {isMobile && selectedFacility && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          backgroundColor: 'white',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '20px',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1001,
          maxHeight: '40vh',
          overflowY: 'auto',
        }}>
          <div style={{
            width: '40px',
            height: '4px',
            backgroundColor: '#d1d5db',
            borderRadius: '2px',
            margin: '0 auto 16px',
          }}></div>
          
          <button
            onClick={() => setSelectedFacility(null)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: '1',
              color: '#9ca3af',
            }}
            aria-label="Close"
          >
            ×
          </button>

          <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 'bold' }}>
            {selectedFacility.name}
          </h3>
          
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <p style={{ margin: '8px 0' }}>
              <strong>Location:</strong> {selectedFacility.location}
            </p>
            {selectedFacility.total_zones && (
              <p style={{ margin: '8px 0' }}>
                <strong>Zones:</strong> {selectedFacility.total_zones}
              </p>
            )}
            {selectedFacility.timezone && (
              <p style={{ margin: '8px 0' }}>
                <strong>Timezone:</strong> {selectedFacility.timezone}
              </p>
            )}
            <p style={{ margin: '8px 0' }}>
              <strong>Status:</strong>{' '}
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor:
                  selectedFacility.status === 'active'
                    ? '#d1fae5'
                    : selectedFacility.status === 'maintenance'
                    ? '#fef3c7'
                    : '#fee2e2',
                color:
                  selectedFacility.status === 'active'
                    ? '#065f46'
                    : selectedFacility.status === 'maintenance'
                    ? '#92400e'
                    : '#991b1b',
              }}>
                {selectedFacility.status.toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GeospatialView;
