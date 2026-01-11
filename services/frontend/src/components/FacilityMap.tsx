import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Facility {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: string;
  total_zones?: number;
}

interface FacilityMapProps {
  facilities: Facility[];
  onMarkerClick?: (facility: Facility) => void;
  isMobile?: boolean;
}

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createMarkerIcon = (status: string, isMobile: boolean) => {
  const color = status === 'active' ? '#10b981' : status === 'maintenance' ? '#f59e0b' : '#ef4444';
  const size = isMobile ? 30 : 40;
  
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="transform: rotate(45deg); color: white; font-weight: bold; font-size: ${isMobile ? '12px' : '14px'};">
        ${status === 'active' ? '✓' : status === 'maintenance' ? '⚙' : '⚠'}
      </div>
    </div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const GeolocationButton: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeolocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 13, {
          animate: true,
          duration: 1,
        });
        setLoading(false);
      },
      (error) => {
        setError(error.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: isMobile ? '10px' : '80px',
        right: '10px',
        zIndex: 1000,
      }}
    >
      <button
        onClick={handleGeolocation}
        disabled={loading}
        style={{
          width: isMobile ? '44px' : '50px',
          height: isMobile ? '44px' : '50px',
          backgroundColor: 'white',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? '20px' : '24px',
          boxShadow: '0 1px 5px rgba(0,0,0,0.65)',
          transition: 'all 0.2s',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.backgroundColor = '#f4f4f4';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.backgroundColor = '#f4f4f4';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
        }}
        title="Center on your location"
        aria-label="Center on your location"
      >
        {loading ? '⟳' : '⊙'}
      </button>
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '0',
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            maxWidth: '200px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

const PerformanceMonitor: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    let animationFrameId: number;

    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = Date.now();
      const elapsed = currentTime - lastTimeRef.current;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!isMobile) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      {fps} FPS {fps >= 30 ? '✓' : '⚠'}
    </div>
  );
};

const MapEventHandlers: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const map = useMap();

  useEffect(() => {
    if (!isMobile) return;

    map.touchZoom.enable();
    map.doubleClickZoom.enable();

    const mapContainer = map.getContainer();
    mapContainer.style.touchAction = 'pan-x pan-y';

    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    mapContainer.addEventListener('touchstart', preventZoom, { passive: false });

    return () => {
      mapContainer.removeEventListener('touchstart', preventZoom);
    };
  }, [map, isMobile]);

  return null;
};

export const FacilityMap: React.FC<FacilityMapProps> = ({
  facilities,
  onMarkerClick,
  isMobile = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);

  const center: [number, number] = facilities.length > 0
    ? [
        facilities.reduce((sum, f) => sum + f.latitude, 0) / facilities.length,
        facilities.reduce((sum, f) => sum + f.longitude, 0) / facilities.length,
      ]
    : [39.8283, -98.5795];

  useEffect(() => {
    if (mapRef.current && facilities.length > 0) {
      const bounds = L.latLngBounds(
        facilities.map((f) => [f.latitude, f.longitude] as [number, number])
      );
      mapRef.current.fitBounds(bounds, {
        padding: isMobile ? [20, 20] : [50, 50],
        maxZoom: 15,
      });
    }
  }, [facilities, isMobile]);

  return (
    <div
      style={{
        width: '100%',
        height: isMobile ? '100vh' : '600px',
        position: 'relative',
      }}
    >
      <MapContainer
        center={center}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        scrollWheelZoom={!isMobile}
        touchZoom={isMobile}
        dragging={true}
        zoomControl={!isMobile}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.latitude, facility.longitude]}
            icon={createMarkerIcon(facility.status, isMobile)}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) {
                  onMarkerClick(facility);
                }
              },
            }}
          >
            <Popup
              maxWidth={isMobile ? 200 : 300}
              minWidth={isMobile ? 150 : 200}
              closeButton={!isMobile}
              className={isMobile ? 'mobile-popup' : ''}
            >
              <div style={{ padding: isMobile ? '8px' : '12px' }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 'bold',
                }}>
                  {facility.name}
                </h3>
                <p style={{ 
                  margin: '4px 0', 
                  fontSize: isMobile ? '12px' : '14px',
                  color: '#666',
                }}>
                  📍 {facility.location}
                </p>
                {facility.total_zones && (
                  <p style={{ 
                    margin: '4px 0', 
                    fontSize: isMobile ? '12px' : '14px',
                  }}>
                    🔋 {facility.total_zones} zones
                  </p>
                )}
                <div
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    backgroundColor:
                      facility.status === 'active'
                        ? '#d1fae5'
                        : facility.status === 'maintenance'
                        ? '#fef3c7'
                        : '#fee2e2',
                    borderRadius: '4px',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color:
                      facility.status === 'active'
                        ? '#065f46'
                        : facility.status === 'maintenance'
                        ? '#92400e'
                        : '#991b1b',
                  }}
                >
                  {facility.status.toUpperCase()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <GeolocationButton isMobile={isMobile} />
        <MapEventHandlers isMobile={isMobile} />
        <PerformanceMonitor isMobile={isMobile} />
      </MapContainer>

      <style>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        
        .mobile-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        
        .mobile-popup .leaflet-popup-content {
          margin: 0;
        }
        
        .leaflet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        @media (max-width: 768px) {
          .leaflet-control-zoom {
            display: none;
          }
          
          .leaflet-popup-content-wrapper {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};
