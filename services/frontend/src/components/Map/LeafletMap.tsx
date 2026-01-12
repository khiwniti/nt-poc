import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ReactNode } from 'react';
import type { MapStyle } from '../geospatial/MapLayerControls';

interface LeafletMapProps {
  children: ReactNode;
  center?: [number, number];
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
}

const tileLayerConfig: Record<MapStyle, { url: string; attribution: string; className?: string }> = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">HOT</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    className: 'dark-mode-tiles',
  },
};

/**
 * LeafletMap - Base map component using react-leaflet
 *
 * Provides multiple map styles and container for facility markers
 * Default center is Bangkok (13.7563°N, 100.5018°E)
 */
export function LeafletMap({
  children,
  center = [13.7563, 100.5018], // Bangkok center
  zoom = 11,
  className = 'map-container',
  mapStyle = 'standard',
}: LeafletMapProps) {
  const tileConfig = tileLayerConfig[mapStyle];

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        key={mapStyle}
        attribution={tileConfig.attribution}
        url={tileConfig.url}
        className={tileConfig.className}
      />
      {children}
    </MapContainer>
  );
}
