import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FacilityWithMap } from '../api/facilities';

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface FacilityMapProps {
  facilities: FacilityWithMap[];
  onFacilityClick?: (facilityId: string) => void;
}

export function FacilityMap({ facilities, onFacilityClick }: FacilityMapProps) {
  // Calculate map center (average of all facility coordinates)
  const center: [number, number] = facilities.length > 0
    ? [
        facilities.reduce((sum, f) => sum + f.coordinates.latitude, 0) / facilities.length,
        facilities.reduce((sum, f) => sum + f.coordinates.longitude, 0) / facilities.length,
      ]
    : [20, 0]; // Default world center

  // Create custom marker icons based on status
  const getMarkerIcon = (facility: FacilityWithMap) => {
    const color = facility.status === 'active' ? '#10b981' :
                  facility.status === 'maintenance' ? '#f97316' : '#ef4444';

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path fill="${color}" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
          <circle cx="12.5" cy="12.5" r="7" fill="white"/>
          ${facility.alertCount > 0 ? `
            <circle cx="20" cy="8" r="7" fill="#ef4444"/>
            <text x="20" y="12" font-size="10" font-weight="bold" fill="white" text-anchor="middle">${facility.alertCount > 99 ? '99+' : facility.alertCount}</text>
          ` : ''}
        </svg>
      `)}`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -41],
    });
  };

  return (
    <div style={{ height: '600px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <MapContainer
        center={center}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.coordinates.latitude, facility.coordinates.longitude]}
            icon={getMarkerIcon(facility)}
            eventHandlers={{
              click: () => onFacilityClick?.(facility.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -40]}>
              <strong>{facility.name}</strong>
              <br />
              Status: <span style={{
                color: facility.status === 'active' ? '#10b981' :
                       facility.status === 'maintenance' ? '#f97316' : '#ef4444',
                fontWeight: 'bold',
                textTransform: 'capitalize',
              }}>
                {facility.status}
              </span>
              {facility.alertCount > 0 && (
                <>
                  <br />
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                    ⚠️ {facility.alertCount} alert{facility.alertCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </Tooltip>

            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>{facility.name}</h3>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                  <strong>Location:</strong> {facility.location}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    color: facility.status === 'active' ? '#10b981' :
                           facility.status === 'maintenance' ? '#f97316' : '#ef4444',
                    fontWeight: 'bold',
                    textTransform: 'capitalize',
                  }}>
                    {facility.status}
                  </span>
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                  <strong>Zones:</strong> {facility.totalZones}
                </p>
                {facility.alertCount > 0 && (
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Active Alerts:</strong>{' '}
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                      {facility.alertCount}
                    </span>
                  </p>
                )}
                <a
                  href={`/?facilityId=${facility.id}`}
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                >
                  View Dashboard
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
