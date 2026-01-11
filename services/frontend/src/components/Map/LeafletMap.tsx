import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ReactNode } from 'react';

interface LeafletMapProps {
  children: ReactNode;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

/**
 * LeafletMap - Base map component using react-leaflet
 *
 * Provides OpenStreetMap tiles and container for facility markers
 * Default center is Bangkok (13.7563°N, 100.5018°E)
 */
export function LeafletMap({
  children,
  center = [13.7563, 100.5018], // Bangkok center
  zoom = 11,
  className = 'map-container'
}: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
