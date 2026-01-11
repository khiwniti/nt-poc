/**
 * Map style constants for Mapbox GL JS
 */

export const MAP_STYLES = {
  STREET: 'mapbox://styles/mapbox/streets-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
} as const;

export type MapStyleType = (typeof MAP_STYLES)[keyof typeof MAP_STYLES];

/**
 * Default map configuration
 */
export const DEFAULT_MAP_CONFIG = {
  center: [100.5018, 13.7563] as [number, number], // Bangkok, Thailand
  zoom: 5,
  minZoom: 2,
  maxZoom: 18,
};

/**
 * Facility status colors
 */
export const FACILITY_COLORS = {
  active: '#10B981', // Green
  maintenance: '#F59E0B', // Yellow
  inactive: '#EF4444', // Red
  critical: '#DC2626', // Critical Red
} as const;

/**
 * LocalStorage key for map style preference
 */
export const MAP_STYLE_STORAGE_KEY = 'nt-poc:map-style-preference';
