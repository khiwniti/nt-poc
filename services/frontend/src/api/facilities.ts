import type { FacilityLocation, Coordinates } from '../types/facilityMap';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface FacilityFilters {
  lat?: number;
  lng?: number;
  radius?: number;
  bbox?: string;
  healthStatus?: string;
}

export interface FacilitiesResponse {
  data: FacilityLocation[];
  total: number;
}

export interface FacilityDetailResponse {
  data: FacilityLocation;
}

export const facilitiesApi = {
  /**
   * Get all facilities with geolocation data
   */
  async getFacilities(filters?: FacilityFilters): Promise<FacilitiesResponse> {
    const params = new URLSearchParams();
    if (filters?.lat !== undefined) params.append('lat', String(filters.lat));
    if (filters?.lng !== undefined) params.append('lng', String(filters.lng));
    if (filters?.radius !== undefined) params.append('radius', String(filters.radius));
    if (filters?.bbox) params.append('bbox', filters.bbox);
    if (filters?.healthStatus) params.append('healthStatus', filters.healthStatus);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/facilities${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch facilities: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get a single facility by ID with full details
   */
  async getFacilityById(id: string): Promise<FacilityDetailResponse> {
    const response = await fetch(`${API_BASE_URL}/facilities/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch facility: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Find facilities near a specific coordinate
   */
  async getNearbyFacilities(
    coordinates: Coordinates,
    radius: number = 50,
    limit: number = 10
  ): Promise<FacilitiesResponse> {
    const params = new URLSearchParams({
      lat: String(coordinates.latitude),
      lng: String(coordinates.longitude),
      radius: String(radius),
      limit: String(limit),
    });

    const response = await fetch(`${API_BASE_URL}/facilities/nearby?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch nearby facilities: ${response.statusText}`);
    }
    return response.json();
  },
};

/**
 * Mock data for development/testing when API is not available
 */
export const mockFacilities: FacilityLocation[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Bangkok Energy Facility',
    location: 'Bangkok, Thailand',
    coordinates: { latitude: 13.7563, longitude: 100.5018 },
    timezone: 'Asia/Bangkok',
    totalZones: 5,
    status: 'active',
    healthStatus: 'healthy',
    healthScore: 92,
    activeAlerts: 0,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Chiang Mai Station',
    location: 'Chiang Mai, Thailand',
    coordinates: { latitude: 18.7883, longitude: 98.9853 },
    timezone: 'Asia/Bangkok',
    totalZones: 3,
    status: 'active',
    healthStatus: 'warning',
    healthScore: 68,
    activeAlerts: 2,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Phuket Power Center',
    location: 'Phuket, Thailand',
    coordinates: { latitude: 7.8804, longitude: 98.3923 },
    timezone: 'Asia/Bangkok',
    totalZones: 4,
    status: 'active',
    healthStatus: 'critical',
    healthScore: 35,
    activeAlerts: 5,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Pattaya Grid Hub',
    location: 'Pattaya, Thailand',
    coordinates: { latitude: 12.9236, longitude: 100.8825 },
    timezone: 'Asia/Bangkok',
    totalZones: 6,
    status: 'active',
    healthStatus: 'healthy',
    healthScore: 88,
    activeAlerts: 1,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Khon Kaen Energy Plant',
    location: 'Khon Kaen, Thailand',
    coordinates: { latitude: 16.4322, longitude: 102.8236 },
    timezone: 'Asia/Bangkok',
    totalZones: 4,
    status: 'active',
    healthStatus: 'warning',
    healthScore: 72,
    activeAlerts: 1,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Hat Yai Distribution Center',
    location: 'Hat Yai, Thailand',
    coordinates: { latitude: 7.0086, longitude: 100.4747 },
    timezone: 'Asia/Bangkok',
    totalZones: 3,
    status: 'active',
    healthStatus: 'healthy',
    healthScore: 95,
    activeAlerts: 0,
    lastUpdated: new Date().toISOString(),
  },
];
