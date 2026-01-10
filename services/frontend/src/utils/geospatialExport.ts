export type FacilityLocation = {
  lat: number;
  lng: number;
  address?: string;
};

export type FacilityForExport = {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  timezone?: string;
  totalZones?: number;
  location: FacilityLocation;
  alertSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warning';
  createdAt?: string;
  updatedAt?: string;
};

export type MapExportFilters = {
  statuses?: Array<FacilityForExport['status']>;
  severities?: Array<NonNullable<FacilityForExport['alertSeverity']>>;
  search?: string;
};

export type MapViewState = {
  center?: { lat: number; lng: number };
  zoom?: number;
};

export type ExportMetadata = {
  generatedAt: string;
  app: { name: string; version?: string };
  export: {
    type: 'facilities' | 'map-view';
    format: 'geojson' | 'kml' | 'png';
  };
  filters?: MapExportFilters;
  mapView?: MapViewState;
  recordCount?: number;
};

type GeoJSONPoint = {
  type: 'Point';
  coordinates: [number, number];
};

type GeoJSONFeature = {
  type: 'Feature';
  id?: string;
  geometry: GeoJSONPoint;
  properties: Record<string, unknown>;
};

export type FacilitiesGeoJSON = {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata: ExportMetadata;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toDataEntry = (name: string, value: string) =>
  `<Data name="${escapeXml(name)}"><value>${escapeXml(value)}</value></Data>`;

export function facilitiesToGeoJSON(
  facilities: FacilityForExport[],
  metadata: ExportMetadata
): FacilitiesGeoJSON {
  const features: GeoJSONFeature[] = facilities.map((facility) => ({
    type: 'Feature',
    id: facility.id,
    geometry: {
      type: 'Point',
      coordinates: [facility.location.lng, facility.location.lat],
    },
    properties: {
      id: facility.id,
      name: facility.name,
      status: facility.status,
      timezone: facility.timezone,
      totalZones: facility.totalZones,
      address: facility.location.address,
      alertSeverity: facility.alertSeverity,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      ...metadata,
      recordCount: features.length,
    },
  };
}

export function facilitiesToKml(facilities: FacilityForExport[], metadata: ExportMetadata): string {
  const documentExtendedData = [
    toDataEntry('generatedAt', metadata.generatedAt),
    toDataEntry('appName', metadata.app.name),
    metadata.app.version ? toDataEntry('appVersion', metadata.app.version) : '',
    toDataEntry('format', metadata.export.format),
    metadata.filters ? toDataEntry('filters', JSON.stringify(metadata.filters)) : '',
    metadata.mapView ? toDataEntry('mapView', JSON.stringify(metadata.mapView)) : '',
    toDataEntry('recordCount', String(facilities.length)),
  ]
    .filter(Boolean)
    .join('');

  const placemarks = facilities
    .map((facility) => {
      const facilityData = [
        toDataEntry('id', facility.id),
        toDataEntry('status', facility.status),
        facility.timezone ? toDataEntry('timezone', facility.timezone) : '',
        facility.totalZones !== undefined
          ? toDataEntry('totalZones', String(facility.totalZones))
          : '',
        facility.location.address ? toDataEntry('address', facility.location.address) : '',
        facility.alertSeverity ? toDataEntry('alertSeverity', facility.alertSeverity) : '',
        facility.createdAt ? toDataEntry('createdAt', facility.createdAt) : '',
        facility.updatedAt ? toDataEntry('updatedAt', facility.updatedAt) : '',
      ]
        .filter(Boolean)
        .join('');

      const description = escapeXml(
        [
          `Status: ${facility.status}`,
          facility.alertSeverity ? `Alert Severity: ${facility.alertSeverity}` : undefined,
          facility.location.address ? `Address: ${facility.location.address}` : undefined,
        ]
          .filter(Boolean)
          .join('\n')
      );

      return `
    <Placemark>
      <name>${escapeXml(facility.name)}</name>
      <description>${description}</description>
      <ExtendedData>${facilityData}</ExtendedData>
      <Point><coordinates>${facility.location.lng},${facility.location.lat},0</coordinates></Point>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Facilities Export</name>
    <ExtendedData>${documentExtendedData}</ExtendedData>
    ${placemarks}
  </Document>
</kml>
`;
}
