import { FacilityMap } from '../components/geospatial/FacilityMap';
import { useMapLayers } from '../hooks/useMapLayers';
import type { FacilityMarkerData } from '../components/geospatial/FacilityMarker';

const sampleFacilities: FacilityMarkerData[] = [
  {
    id: 'facility-1',
    name: 'Mountain View Facility',
    coordinates: { latitude: 37.4224764, longitude: -122.0842499 },
  },
  {
    id: 'facility-2',
    name: 'San Francisco Hub',
    coordinates: { latitude: 37.7749295, longitude: -122.4194155 },
  },
  {
    id: 'facility-3',
    name: 'Oakland Center',
    coordinates: { latitude: 37.8043637, longitude: -122.2711137 },
  },
  {
    id: 'facility-4',
    name: 'San Jose Plant',
    coordinates: { latitude: 37.3382082, longitude: -121.8863286 },
  },
  {
    id: 'facility-5',
    name: 'Berkeley Station',
    coordinates: { latitude: 37.8715226, longitude: -122.272747 },
  },
];

export function GeospatialDashboard() {
  const { layers, toggleLayer, setMapStyle, savePreferences } = useMapLayers();

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>
          Geospatial Dashboard
        </h1>
        <p style={{ fontSize: '16px', color: '#666' }}>
          Interactive facility map with customizable layer controls
        </p>
      </header>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '24px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            Facility Locations
          </h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            {sampleFacilities.length} facilities across the Bay Area
          </p>
        </div>

        <FacilityMap
          facilities={sampleFacilities}
          height={600}
          showLayerControls={true}
          layers={layers}
          onLayerToggle={toggleLayer}
          onMapStyleChange={setMapStyle}
          onSaveLayerPreferences={savePreferences}
        />

        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
              Active Layers
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(layers)
                .filter(([, enabled]) => enabled)
                .map(([layer]) => (
                  <span
                    key={layer}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {layer}
                  </span>
                ))}
              {Object.values(layers).every((v) => !v) && (
                <span style={{ fontSize: '14px', color: '#999' }}>No layers active</span>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
              Legend
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#2196F3',
                  }}
                />
                <span>Facility Location</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#FF9800',
                    border: '2px solid #1976D2',
                  }}
                />
                <span>Selected Facility</span>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
              Statistics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
              <div>
                Total Facilities:{' '}
                <strong style={{ color: '#1a1a1a' }}>{sampleFacilities.length}</strong>
              </div>
              <div>
                Coverage Area:{' '}
                <strong style={{ color: '#2196F3' }}>Bay Area, CA</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: '#E3F2FD',
          borderRadius: '8px',
          border: '1px solid #2196F3',
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1976D2',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ℹ️ Layer Controls
        </h3>
        <ul
          style={{
            fontSize: '13px',
            color: '#0D47A1',
            lineHeight: '1.6',
            paddingLeft: '20px',
            margin: 0,
          }}
        >
          <li>Click the "Layers" button in the top-right corner to open layer controls</li>
          <li>Toggle individual layers (Heatmap, Weather, Clustering, Traffic) on/off</li>
          <li>Click "Save Preferences" to persist your layer settings</li>
          <li>Your preferences are saved to browser storage and restored on reload</li>
        </ul>
      </div>
    </div>
  );
}
