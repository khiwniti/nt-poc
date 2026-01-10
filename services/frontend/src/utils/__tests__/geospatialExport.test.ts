import { describe, it, expect } from 'vitest';
import { facilitiesToGeoJSON, facilitiesToKml } from '../geospatialExport';

describe('geospatialExport', () => {
  const metadata = {
    generatedAt: '2026-01-10T00:00:00.000Z',
    app: { name: 'nt-poc', version: '0.0.0-test' },
    export: { type: 'facilities' as const, format: 'geojson' as const },
    filters: { statuses: ['active' as const], severities: ['high' as const], search: 'bang' },
    mapView: { center: { lat: 13.75, lng: 100.5 }, zoom: 6 },
    recordCount: 0,
  };

  const facilities = [
    {
      id: 'fac-001',
      name: 'Bangkok Test Facility',
      status: 'active' as const,
      timezone: 'Asia/Bangkok',
      totalZones: 10,
      location: { lat: 13.7563, lng: 100.5018, address: 'Bangkok' },
      alertSeverity: 'high' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ];

  it('builds GeoJSON FeatureCollection with metadata and [lng,lat] coordinates', () => {
    const geojson = facilitiesToGeoJSON(facilities, metadata);

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.metadata.filters).toEqual(metadata.filters);
    expect(geojson.metadata.recordCount).toBe(1);
    expect(geojson.features).toHaveLength(1);
    expect(geojson.features[0].geometry.type).toBe('Point');
    expect(geojson.features[0].geometry.coordinates).toEqual([100.5018, 13.7563]);
    expect(geojson.features[0].properties).toMatchObject({
      id: 'fac-001',
      name: 'Bangkok Test Facility',
      status: 'active',
      timezone: 'Asia/Bangkok',
      totalZones: 10,
      address: 'Bangkok',
      alertSeverity: 'high',
    });
  });

  it('builds KML with document and placemark metadata', () => {
    const kml = facilitiesToKml(facilities, {
      ...metadata,
      export: { type: 'facilities', format: 'kml' },
    });

    expect(kml).toContain('<kml');
    expect(kml).toContain('<Document>');
    expect(kml).toContain('<name>Facilities Export</name>');
    expect(kml).toContain('recordCount');
    expect(kml).toContain('filters');
    expect(kml).toContain('Bangkok Test Facility');
    expect(kml).toContain('<coordinates>100.5018,13.7563,0</coordinates>');
    expect(kml).toContain('alertSeverity');
  });
});
