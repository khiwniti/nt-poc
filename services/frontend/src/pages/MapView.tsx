import { useMemo, useRef, useState } from 'react';
import { downloadBlob, downloadText } from '../utils/download';
import { elementToPngBlob } from '../utils/exportImage';
import {
  facilitiesToGeoJSON,
  facilitiesToKml,
  FacilityForExport,
  MapExportFilters,
} from '../utils/geospatialExport';

const SAMPLE_FACILITIES: FacilityForExport[] = [
  {
    id: 'fac-bkk-001',
    name: 'Bangkok Central',
    status: 'active',
    timezone: 'Asia/Bangkok',
    totalZones: 10,
    alertSeverity: 'high',
    location: { lat: 13.7563, lng: 100.5018, address: 'Bangkok' },
  },
  {
    id: 'fac-bkk-002',
    name: 'Bangkok Riverside',
    status: 'maintenance',
    timezone: 'Asia/Bangkok',
    totalZones: 6,
    alertSeverity: 'medium',
    location: { lat: 13.722, lng: 100.5146, address: 'Bangkok' },
  },
  {
    id: 'fac-bkk-003',
    name: 'Bangkok East',
    status: 'active',
    timezone: 'Asia/Bangkok',
    totalZones: 8,
    alertSeverity: 'low',
    location: { lat: 13.7567, lng: 100.566, address: 'Bangkok' },
  },
  {
    id: 'fac-bkk-004',
    name: 'Bangkok West',
    status: 'inactive',
    timezone: 'Asia/Bangkok',
    totalZones: 4,
    alertSeverity: 'critical',
    location: { lat: 13.755, lng: 100.438, address: 'Bangkok' },
  },
  {
    id: 'fac-chi-001',
    name: 'Chiang Mai North',
    status: 'active',
    timezone: 'Asia/Bangkok',
    totalZones: 5,
    alertSeverity: 'info',
    location: { lat: 18.7883, lng: 98.9853, address: 'Chiang Mai' },
  },
];

const STATUS_OPTIONS: Array<FacilityForExport['status']> = ['active', 'maintenance', 'inactive'];
const SEVERITY_OPTIONS: Array<NonNullable<FacilityForExport['alertSeverity']>> = [
  'critical',
  'high',
  'medium',
  'low',
  'warning',
  'info',
];

function severityColor(severity: FacilityForExport['alertSeverity']): string {
  switch (severity) {
    case 'critical':
      return '#dc2626';
    case 'high':
      return '#ea580c';
    case 'medium':
    case 'warning':
      return '#ca8a04';
    case 'low':
    case 'info':
      return '#2563eb';
    default:
      return '#6b7280';
  }
}

function formatFilters(filters: MapExportFilters): string {
  const parts = [
    filters.statuses?.length ? `Status: ${filters.statuses.join(', ')}` : undefined,
    filters.severities?.length ? `Severity: ${filters.severities.join(', ')}` : undefined,
    filters.search?.trim() ? `Search: "${filters.search.trim()}"` : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'No filters';
}

function computeBounds(facilities: FacilityForExport[]) {
  if (facilities.length === 0) {
    return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  }

  let minLat = facilities[0].location.lat;
  let maxLat = facilities[0].location.lat;
  let minLng = facilities[0].location.lng;
  let maxLng = facilities[0].location.lng;

  for (const facility of facilities) {
    minLat = Math.min(minLat, facility.location.lat);
    maxLat = Math.max(maxLat, facility.location.lat);
    minLng = Math.min(minLng, facility.location.lng);
    maxLng = Math.max(maxLng, facility.location.lng);
  }

  const latPad = (maxLat - minLat) * 0.15 || 0.05;
  const lngPad = (maxLng - minLng) * 0.15 || 0.05;

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Array<FacilityForExport['status']>>([
    'active',
    'maintenance',
    'inactive',
  ]);
  const [selectedSeverities, setSelectedSeverities] = useState<
    Array<NonNullable<FacilityForExport['alertSeverity']>>
  >(['critical', 'high', 'medium', 'low', 'warning', 'info']);
  const [zoom, setZoom] = useState(1);
  const [selectedFacility, setSelectedFacility] = useState<FacilityForExport | null>(null);

  const filters: MapExportFilters = useMemo(
    () => ({
      statuses: selectedStatuses,
      severities: selectedSeverities,
      search,
    }),
    [selectedStatuses, selectedSeverities, search]
  );

  const filteredFacilities = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();
    return SAMPLE_FACILITIES.filter((facility) => {
      if (selectedStatuses.length && !selectedStatuses.includes(facility.status)) return false;
      if (
        facility.alertSeverity &&
        selectedSeverities.length &&
        !selectedSeverities.includes(facility.alertSeverity)
      )
        return false;
      if (trimmedSearch && !facility.name.toLowerCase().includes(trimmedSearch)) return false;
      return true;
    });
  }, [search, selectedStatuses, selectedSeverities]);

  const bounds = useMemo(
    () => computeBounds(filteredFacilities.length ? filteredFacilities : SAMPLE_FACILITIES),
    [filteredFacilities]
  );

  const mapCenter = useMemo(() => {
    const facilitiesForCenter = filteredFacilities.length ? filteredFacilities : SAMPLE_FACILITIES;
    if (facilitiesForCenter.length === 0) return { lat: 0, lng: 0 };
    const avg = facilitiesForCenter.reduce(
      (acc, facility) => ({
        lat: acc.lat + facility.location.lat / facilitiesForCenter.length,
        lng: acc.lng + facility.location.lng / facilitiesForCenter.length,
      }),
      { lat: 0, lng: 0 }
    );
    return avg;
  }, [filteredFacilities]);

  const exportMetadataBase = useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      app: { name: 'Facility Manager' },
      filters,
      mapView: { center: mapCenter, zoom },
    }),
    [filters, mapCenter, zoom]
  );

  const handleExportGeoJSON = () => {
    const geojson = facilitiesToGeoJSON(filteredFacilities, {
      ...exportMetadataBase,
      export: { type: 'facilities', format: 'geojson' },
    });

    const date = new Date().toISOString().split('T')[0];
    downloadText(JSON.stringify(geojson, null, 2), {
      filename: `facilities-${date}.geojson`,
      mimeType: 'application/geo+json;charset=utf-8;',
    });
    setExportOpen(false);
  };

  const handleExportKml = () => {
    const kml = facilitiesToKml(filteredFacilities, {
      ...exportMetadataBase,
      export: { type: 'facilities', format: 'kml' },
    });

    const date = new Date().toISOString().split('T')[0];
    downloadText(kml, {
      filename: `facilities-${date}.kml`,
      mimeType: 'application/vnd.google-earth.kml+xml;charset=utf-8;',
    });
    setExportOpen(false);
  };

  const handleExportPng = async () => {
    if (!mapRef.current) return;

    try {
      const blob = await elementToPngBlob(mapRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const date = new Date().toISOString().split('T')[0];
      downloadBlob(blob, { filename: `map-view-${date}.png` });
      setExportOpen(false);
    } catch (error) {
      console.error('Failed to export map view:', error);
      alert('Failed to export map view. Please try again.');
    }
  };

  const toggleStatus = (status: FacilityForExport['status']) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleSeverity = (severity: NonNullable<FacilityForExport['alertSeverity']>) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedStatuses(['active', 'maintenance', 'inactive']);
    setSelectedSeverities(['critical', 'high', 'medium', 'low', 'warning', 'info']);
  };

  return (
    <div style={{ padding: '2rem', display: 'grid', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Map</h2>
          <div style={{ marginTop: '0.25rem', color: '#6b7280', fontSize: '0.875rem' }}>
            {filteredFacilities.length} facilities • {formatFilters(filters)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="map-filter-button" onClick={() => setFiltersOpen((v) => !v)}>
            Filter
          </button>

          <div style={{ position: 'relative' }}>
            <button className="map-export-button" onClick={() => setExportOpen((v) => !v)}>
              Export
            </button>
            {exportOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '260px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  background: '#fff',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                  padding: '0.5rem',
                  zIndex: 20,
                }}
                role="menu"
              >
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderRadius: '8px',
                  }}
                  onClick={handleExportPng}
                >
                  Export map view (PNG)
                </button>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderRadius: '8px',
                  }}
                  onClick={handleExportGeoJSON}
                >
                  Export facilities (GeoJSON)
                </button>
                <button
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderRadius: '8px',
                  }}
                  onClick={handleExportKml}
                >
                  Export facilities (KML)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div
          className="map-filter-panel"
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1rem',
            background: '#fff',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search facilities"
                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </label>

            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {STATUS_OPTIONS.map((status) => (
                  <label
                    key={status}
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                  >
                    <input
                      type="checkbox"
                      value={status}
                      checked={selectedStatuses.includes(status)}
                      onChange={() => toggleStatus(status)}
                      name={`status-${status}`}
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Alert Severity</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {SEVERITY_OPTIONS.map((severity) => (
                  <label
                    key={severity}
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                  >
                    <input
                      type="checkbox"
                      value={severity}
                      checked={selectedSeverities.includes(severity)}
                      onChange={() => toggleSeverity(severity)}
                      name={`severity-${severity}`}
                    />
                    {severity}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button className="clear-filters" onClick={clearFilters}>
              Clear
            </button>
            <button onClick={() => setFiltersOpen(false)}>Close</button>
          </div>
        </div>
      )}

      <div
        className="map-container"
        ref={mapRef}
        style={{
          height: '520px',
          border: '1px solid #e5e7eb',
          borderRadius: '14px',
          background: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: 0.9,
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 16,
            padding: '0.5rem 0.75rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(0,0,0,0.08)',
            backdropFilter: 'blur(6px)',
            maxWidth: '70%',
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Facilities Map</div>
          <div style={{ marginTop: '0.15rem', fontSize: '0.8rem', color: '#4b5563' }}>
            {formatFilters(filters)} • Exported {exportMetadataBase.generatedAt}
          </div>
        </div>

        <div
          className="map-zoom-controls"
          style={{ position: 'absolute', right: 16, top: 16, zIndex: 10 }}
        >
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.92)',
              overflow: 'hidden',
              display: 'grid',
            }}
          >
            <button
              className="zoom-in"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
            >
              +
            </button>
            <button
              className="zoom-out"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            >
              –
            </button>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            zIndex: 5,
          }}
        >
          {filteredFacilities.map((facility) => {
            const x =
              ((facility.location.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) *
              100;
            const y =
              ((bounds.maxLat - facility.location.lat) / (bounds.maxLat - bounds.minLat || 1)) *
              100;
            const color = severityColor(facility.alertSeverity);

            return (
              <button
                key={facility.id}
                className="facility-marker"
                data-severity={facility.alertSeverity}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '14px',
                  height: '14px',
                  borderRadius: '999px',
                  background: color,
                  border: '2px solid #fff',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
                  cursor: 'pointer',
                }}
                aria-label={`Facility marker: ${facility.name}`}
                title={facility.name}
                onClick={() => setSelectedFacility(facility)}
              />
            );
          })}
        </div>

        {selectedFacility && (
          <div
            className="map-popup"
            style={{
              position: 'absolute',
              left: 16,
              bottom: 16,
              width: 'min(420px, calc(100% - 32px))',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 16px 30px rgba(0,0,0,0.14)',
              padding: '1rem',
              zIndex: 15,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selectedFacility.name}</div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#4b5563' }}>
                  {selectedFacility.location.address || '—'} • {selectedFacility.status} •{' '}
                  {selectedFacility.alertSeverity || 'no alerts'}
                </div>
              </div>
              <button
                className="popup-close"
                onClick={() => setSelectedFacility(null)}
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <a className="popup-view-details" href={`/zones/${selectedFacility.id}`}>
                View Details
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
