/**
 * Battery Systems API Client
 * Handles fetching battery system data with pagination and filtering
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface BatterySystem {
  id: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  capacity_kwh: number;
  status: 'operational' | 'maintenance' | 'fault';
  zone_id: string;
  zone_name?: string;
  facility_id?: string;
  facility_name?: string;
  installation_date: string;
  last_maintenance_date?: string;

  // 3D layout fields
  position_x?: number;
  position_y?: number;
  position_z?: number;
  rotation_pitch?: number;
  rotation_yaw?: number;
  rotation_roll?: number;
  width_m?: number;
  height_m?: number;
  depth_m?: number;
  display_color?: string;
}

export interface BatterySystemWithMetrics extends BatterySystem {
  // Latest sensor readings
  voltage?: number;
  current?: number;
  temperature?: number;
  soc?: number;
  soh?: number;
  power?: number;
  last_reading_time?: string;

  // RUL prediction
  rul_days?: number;
  rul_confidence?: number;
  rul_prediction_time?: string;
}

export interface BatteryListResponse {
  data: BatterySystemWithMetrics[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FacilityStats {
  facilityId: string;
  facilityName: string;
  totalBatteries: number;
  operationalCount: number;
  maintenanceCount: number;
  faultCount: number;
  averageSoC: number;
  averageSoH: number;
  averageTemperature: number;
  totalCapacityKwh: number;
  criticalBatteries: number;
}

export interface FleetSummary {
  totalBatteries: number;
  totalFacilities: number;
  totalStrings: number;
  totalCapacityKwh: number;
  operationalCount: number;
  maintenanceCount: number;
  faultCount: number;
  criticalBatteries: number;
  averageSoC: number;
  averageSoH: number;
  facilities: FacilityStats[];
}

export const batterySystemsApi = {
  /**
   * Get paginated list of battery systems with optional filtering
   */
  async getBatteries(params: {
    page?: number;
    pageSize?: number;
    facilityId?: string;
    zoneId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<BatteryListResponse> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.facilityId) queryParams.append('facilityId', params.facilityId);
    if (params.zoneId) queryParams.append('zoneId', params.zoneId);
    if (params.status) queryParams.append('status', params.status);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(
      `${API_BASE_URL}/api/v1/battery-systems?${queryParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch batteries: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get single battery system by ID with latest metrics
   */
  async getBatteryById(id: string): Promise<BatterySystemWithMetrics> {
    const response = await fetch(`${API_BASE_URL}/api/v1/battery-systems/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch battery: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Get fleet-wide summary statistics
   */
  async getFleetSummary(): Promise<FleetSummary> {
    const response = await fetch(`${API_BASE_URL}/api/v1/battery-systems/fleet/summary`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch fleet summary: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Get statistics for a specific facility
   */
  async getFacilityStats(facilityId: string): Promise<FacilityStats> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/battery-systems/facility/${facilityId}/stats`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch facility stats: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Search batteries by serial number or model
   */
  async searchBatteries(query: string, limit: number = 20): Promise<BatterySystem[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/battery-systems/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search batteries: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },
};
