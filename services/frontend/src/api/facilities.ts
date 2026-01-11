const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface FacilityWithMap {
  id: string;
  name: string;
  location: string;
  coordinates: Coordinates;
  timezone: string;
  totalZones: number;
  status: 'active' | 'inactive' | 'maintenance';
  alertCount: number;
  region: string;
  createdAt: string;
  updatedAt: string;
}

export const facilitiesApi = {
  async getFacilitiesForMap(): Promise<FacilityWithMap[]> {
    const response = await fetch(`${API_BASE_URL}/facilities/map`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch facilities: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },
};
