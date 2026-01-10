export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface FacilityLocation {
  id: string;
  name: string;
  location: string;
  coordinates: Coordinates;
  timezone: string;
  totalZones: number;
  status: 'active' | 'inactive';
  healthStatus: HealthStatus;
  healthScore: number; // 0-100
  activeAlerts: number;
  lastUpdated: string;
}

export interface FacilityCluster {
  id: string;
  coordinates: Coordinates;
  facilityCount: number;
  healthBreakdown: {
    healthy: number;
    warning: number;
    critical: number;
  };
}

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface FacilityMapConfig {
  accessToken: string;
  style?: string;
  initialViewport?: MapViewport;
  clusterRadius?: number;
  maxZoom?: number;
}

export const HEALTH_STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: '#22c55e', // green-500
  warning: '#eab308', // yellow-500
  critical: '#ef4444', // red-500
};

export const DEFAULT_MAP_CONFIG: Partial<FacilityMapConfig> = {
  style: 'mapbox://styles/mapbox/light-v11',
  initialViewport: {
    latitude: 13.7563, // Bangkok default
    longitude: 100.5018,
    zoom: 5,
  },
  clusterRadius: 50,
  maxZoom: 18,
};
