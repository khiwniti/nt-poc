/**
 * Extended facility interface with full details
 * Basic Facility interface (id, name) is defined in dashboard.ts
 */
export interface FacilityDetails {
  id: string;
  name: string;
  location: string;
  timezone: string;
  totalZones: number;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Extended KPIs interface for facilities
 * Base KPIs interface (totalCapacity, averageSoC) is defined in dashboard.ts
 */
export interface FacilityKPIs {
  totalCapacity: number;
  averageSoC: number;
  averageSoH: number;
  totalPower: number;
  activeAlerts: number;
}

export interface FacilityListResponse {
  data: FacilityDetails[];
  total: number;
}

export interface FacilityResponse {
  data: FacilityDetails;
}

export interface FacilityKPIsResponse {
  data: FacilityKPIs;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const facilitiesApi = {
  /**
   * Get list of all active facilities
   */
  async getFacilities(): Promise<FacilityListResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/facilities`);
    if (!response.ok) {
      throw new Error(`Failed to fetch facilities: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get a specific facility by ID
   */
  async getFacilityById(id: string): Promise<FacilityResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/facilities/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch facility: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get KPIs (Key Performance Indicators) for a specific facility
   */
  async getFacilityKPIs(id: string): Promise<FacilityKPIsResponse> {
    const response = await fetch(`${API_BASE_URL}/v1/facilities/${id}/kpis`);
    if (!response.ok) {
      throw new Error(`Failed to fetch facility KPIs: ${response.statusText}`);
    }
    return response.json();
  },
};
