import html2canvas from 'html2canvas';
import type { FacilityMarkerData } from '../components/geospatial/FacilityMarker';

export interface ExportMetadata {
  exportDate: string;
  facilityCount: number;
  filters?: Record<string, unknown>;
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    name: string;
    status: string;
    [key: string]: unknown;
  };
}

export interface GeoJSONExport {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata: ExportMetadata;
}

export async function exportMapAsPNG(
  mapElement: HTMLElement,
  filename: string = 'facility-map.png'
): Promise<void> {
  try {
    const canvas = await html2canvas(mapElement, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });

    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error exporting map as PNG:', error);
    throw new Error('Failed to export map as PNG');
  }
}

export function exportFacilitiesAsGeoJSON(
  facilities: FacilityMarkerData[],
  filters?: Record<string, unknown>,
  filename: string = 'facilities.geojson'
): void {
  const features: GeoJSONFeature[] = facilities.map((facility) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [facility.coordinates.longitude, facility.coordinates.latitude],
    },
    properties: {
      id: facility.id,
      name: facility.name,
      status: facility.status,
      ...facility,
    },
  }));

  const bounds = computeBounds(facilities);

  const geoJSON: GeoJSONExport = {
    type: 'FeatureCollection',
    features,
    metadata: {
      exportDate: new Date().toISOString(),
      facilityCount: facilities.length,
      filters,
      bounds,
    },
  };

  const blob = new Blob([JSON.stringify(geoJSON, null, 2)], {
    type: 'application/geo+json',
  });

  downloadBlob(blob, filename);
}

export function exportFacilitiesAsKML(
  facilities: FacilityMarkerData[],
  filters?: Record<string, unknown>,
  filename: string = 'facilities.kml'
): void {
  const metadata = {
    exportDate: new Date().toISOString(),
    facilityCount: facilities.length,
    filters: filters ? JSON.stringify(filters) : 'none',
  };

  const placemarks = facilities
    .map(
      (facility) => `
    <Placemark>
      <name>${escapeXML(facility.name)}</name>
      <description>
        <![CDATA[
          <b>ID:</b> ${escapeXML(facility.id)}<br/>
          <b>Status:</b> ${escapeXML(facility.status)}<br/>
          <b>Coordinates:</b> ${facility.coordinates.latitude}, ${facility.coordinates.longitude}
        ]]>
      </description>
      <ExtendedData>
        <Data name="id"><value>${escapeXML(facility.id)}</value></Data>
        <Data name="status"><value>${escapeXML(facility.status)}</value></Data>
      </ExtendedData>
      <Point>
        <coordinates>${facility.coordinates.longitude},${facility.coordinates.latitude},0</coordinates>
      </Point>
    </Placemark>`
    )
    .join('');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Facility Export</name>
    <description>
      <![CDATA[
        Export Date: ${metadata.exportDate}<br/>
        Facility Count: ${metadata.facilityCount}<br/>
        Filters: ${metadata.filters}
      ]]>
    </description>
    ${placemarks}
  </Document>
</kml>`;

  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function computeBounds(facilities: FacilityMarkerData[]) {
  if (facilities.length === 0) return undefined;

  const lats = facilities.map((f) => f.coordinates.latitude);
  const lngs = facilities.map((f) => f.coordinates.longitude);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}
