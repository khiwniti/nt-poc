import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

type FacilityHealth = 'healthy' | 'warning' | 'critical';

type FacilityMapItem = {
  id: string;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  stats: { batteryCount: number; averageSoH: number; activeAlerts: number };
};

const FACILITIES: FacilityMapItem[] = [
  {
    id: 'fac-001',
    name: 'Riverside Energy Storage',
    location: 'Riverside, CA',
    coordinates: { lat: 33.9806, lng: -117.3755 },
    stats: { batteryCount: 84, averageSoH: 92.1, activeAlerts: 0 },
  },
  {
    id: 'fac-008',
    name: 'Westside Battery Park',
    location: 'Los Angeles, CA',
    coordinates: { lat: 34.0522, lng: -118.2437 },
    stats: { batteryCount: 48, averageSoH: 86.3, activeAlerts: 1 },
  },
  {
    id: 'fac-009',
    name: 'Harbor Grid Support',
    location: 'Long Beach, CA',
    coordinates: { lat: 33.7701, lng: -118.1937 },
    stats: { batteryCount: 60, averageSoH: 81.5, activeAlerts: 0 },
  },
  {
    id: 'fac-010',
    name: 'Coastal Reserve Station',
    location: 'San Diego, CA',
    coordinates: { lat: 32.7157, lng: -117.1611 },
    stats: { batteryCount: 90, averageSoH: 77.2, activeAlerts: 2 },
  },
  {
    id: 'fac-002',
    name: 'Pioneer Grid Hub',
    location: 'Phoenix, AZ',
    coordinates: { lat: 33.4484, lng: -112.074 },
    stats: { batteryCount: 120, averageSoH: 78.4, activeAlerts: 2 },
  },
  {
    id: 'fac-003',
    name: 'Bayline Storage',
    location: 'San Jose, CA',
    coordinates: { lat: 37.3382, lng: -121.8863 },
    stats: { batteryCount: 64, averageSoH: 66.2, activeAlerts: 6 },
  },
  {
    id: 'fac-011',
    name: 'Peninsula Stabilizer',
    location: 'San Mateo, CA',
    coordinates: { lat: 37.563, lng: -122.3255 },
    stats: { batteryCount: 40, averageSoH: 90.0, activeAlerts: 0 },
  },
  {
    id: 'fac-012',
    name: 'East Bay Peak Shaving',
    location: 'Oakland, CA',
    coordinates: { lat: 37.8044, lng: -122.2711 },
    stats: { batteryCount: 58, averageSoH: 72.8, activeAlerts: 4 },
  },
  {
    id: 'fac-004',
    name: 'Lakeshore Substation',
    location: 'Chicago, IL',
    coordinates: { lat: 41.8781, lng: -87.6298 },
    stats: { batteryCount: 96, averageSoH: 88.7, activeAlerts: 1 },
  },
  {
    id: 'fac-005',
    name: 'Seaboard Power Yard',
    location: 'Boston, MA',
    coordinates: { lat: 42.3601, lng: -71.0589 },
    stats: { batteryCount: 52, averageSoH: 94.6, activeAlerts: 0 },
  },
  {
    id: 'fac-006',
    name: 'Rainier Backup Station',
    location: 'Seattle, WA',
    coordinates: { lat: 47.6062, lng: -122.3321 },
    stats: { batteryCount: 72, averageSoH: 73.9, activeAlerts: 3 },
  },
  {
    id: 'fac-007',
    name: 'Gulf Coast Storage',
    location: 'Houston, TX',
    coordinates: { lat: 29.7604, lng: -95.3698 },
    stats: { batteryCount: 140, averageSoH: 58.2, activeAlerts: 9 },
  },
];

function getFacilityHealth(stats: FacilityMapItem['stats']): FacilityHealth {
  if (stats.activeAlerts >= 5 || stats.averageSoH < 65) return 'critical';
  if (stats.activeAlerts > 0 || stats.averageSoH < 80) return 'warning';
  return 'healthy';
}

function getMarkerSvg(health: FacilityHealth) {
  const colors: Record<FacilityHealth, { fill: string; ring: string; glyph: string }> = {
    healthy: { fill: '#16a34a', ring: '#14532d', glyph: '✓' },
    warning: { fill: '#f59e0b', ring: '#78350f', glyph: '!' },
    critical: { fill: '#dc2626', ring: '#7f1d1d', glyph: '!' },
  };

  const { fill, ring, glyph } = colors[health];

  return `
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 2c7.2 0 13 5.8 13 13 0 9.4-10.5 22.2-12 24.1-.5.6-1.5.6-2 0C17.5 37.2 7 24.4 7 15 7 7.8 12.8 2 20 2z" fill="${fill}" stroke="${ring}" stroke-width="2" />
      <circle cx="20" cy="15" r="7.5" fill="#ffffff" opacity="0.95" />
      <text x="20" y="18" text-anchor="middle" font-size="12" font-family="Inter, system-ui, sans-serif" fill="${ring}">
        ${glyph}
      </text>
    </svg>
  `;
}

function createFacilityDivIcon(health: FacilityHealth) {
  return L.divIcon({
    className: `facility-marker map-marker facility-marker--${health}`,
    html: `<div class="facility-marker__inner">${getMarkerSvg(health)}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 38],
    popupAnchor: [0, -34],
  });
}

function FitToMarkers({ facilities }: { facilities: FacilityMapItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (facilities.length === 0) return;
    const bounds = L.latLngBounds(facilities.map((f) => [f.coordinates.lat, f.coordinates.lng]));
    map.fitBounds(bounds.pad(0.2), { animate: false });
  }, [facilities, map]);

  return null;
}

export default function MapView() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 150);
    return () => window.clearTimeout(timer);
  }, []);

  const icons = useMemo(() => {
    return {
      healthy: createFacilityDivIcon('healthy'),
      warning: createFacilityDivIcon('warning'),
      critical: createFacilityDivIcon('critical'),
    } as const;
  }, []);

  const center: [number, number] = [39.5, -98.35]; // US centroid fallback

  return (
    <div className="map-page">
      <div className="map-page__header">
        <h2>Facilities Map</h2>
        <p className="map-page__subheading">Click a marker for quick stats and navigation.</p>
      </div>

      {isLoading ? (
        <div className="map-loading-skeleton skeleton-map" aria-label="Loading map">
          <div className="map-loading-skeleton__bar" />
          <div className="map-loading-skeleton__bar map-loading-skeleton__bar--short" />
        </div>
      ) : (
        <MapContainer className="map-container" center={center} zoom={4} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitToMarkers facilities={FACILITIES} />

          <MarkerClusterGroup chunkedLoading>
            {FACILITIES.map((facility) => {
              const health = getFacilityHealth(facility.stats);
              return (
                <Marker
                  key={facility.id}
                  position={[facility.coordinates.lat, facility.coordinates.lng]}
                  icon={icons[health]}
                >
                  <Popup className="map-popup marker-popup">
                    <div className="map-popup__content">
                      <div className="map-popup__title">{facility.name}</div>
                      <div className="map-popup__meta">
                        <span className="map-popup__location">{facility.location}</span>
                        <span className={`map-popup__health map-popup__health--${health}`}>
                          {health.toUpperCase()}
                        </span>
                      </div>

                      <div className="map-popup__stats">
                        <div className="map-popup__stat">
                          <div className="map-popup__stat-label">Batteries</div>
                          <div className="map-popup__stat-value">{facility.stats.batteryCount}</div>
                        </div>
                        <div className="map-popup__stat">
                          <div className="map-popup__stat-label">Avg SoH</div>
                          <div className="map-popup__stat-value">
                            {facility.stats.averageSoH.toFixed(1)}%
                          </div>
                        </div>
                        <div className="map-popup__stat">
                          <div className="map-popup__stat-label">Active Alerts</div>
                          <div className="map-popup__stat-value">{facility.stats.activeAlerts}</div>
                        </div>
                      </div>

                      <div className="map-popup__actions">
                        <Link
                          className="popup-view-details"
                          to={`/?facilityId=${encodeURIComponent(facility.id)}`}
                        >
                          View facility dashboard
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      )}
    </div>
  );
}
