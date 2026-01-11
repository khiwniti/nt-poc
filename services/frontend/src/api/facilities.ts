export interface Facility {
  id: string;
  name: string;
  location: string;
  timezone: string;
  totalZones: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FacilityKPIs {
  totalCapacity: number;
  averageSoC: number;
  averageSoH: number;
  totalPower: number;
  activeAlerts: number;
}

export interface FacilityListResponse {
  data: Facility[];
  total: number;
}

export interface FacilityResponse {
  data: Facility;
}

export interface FacilityKPIsResponse {
  data: FacilityKPIs;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const facilitiesApi = {
  /**
   * Get list of all active facilities
   */
  async getFacilities(): Promise<FacilityListResponse> {
    const response = await fetch(`${API_BASE_URL}/facilities`);
    if (!response.ok) {
      throw new Error(`Failed to fetch facilities: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get a specific facility by ID
   */
  async getFacilityById(id: string): Promise<FacilityResponse> {
    const response = await fetch(`${API_BASE_URL}/facilities/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch facility: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get KPIs (Key Performance Indicators) for a specific facility
   */
  async getFacilityKPIs(id: string): Promise<FacilityKPIsResponse> {
    const response = await fetch(`${API_BASE_URL}/facilities/${id}/kpis`);
    if (!response.ok) {
      throw new Error(`Failed to fetch facility KPIs: ${response.statusText}`);
    }
    return response.json();
  },
};
