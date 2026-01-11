import { Facility, FacilityHealthStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface FacilityWithHealth extends Facility {
  health: FacilityHealthStatus;
}

export interface FacilitiesMapResponse {
  data: FacilityWithHealth[];
  total: number;
}

export const facilityApi = {
  /**
   * Fetch facility data optimized for map view with health status
   */
  async getMapData(): Promise<FacilitiesMapResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/facilities/map`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch map data: ${response.statusText}`);
    }

    return response.json();
  }
};
