export interface Facility {
  id: string;
  name: string;
}

export interface KPIs {
  totalCapacity: number;
  averageSoC: number;
  [key: string]: number;
}

export interface Alert {
  id: string;
  severity?: string;
  [key: string]: unknown;
}

export interface DashboardData {
  facility: Facility;
  kpis: KPIs;
  alerts: Alert[];
  timestamp: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const dashboardApi = {
  async getFacilityDashboard(facilityId: string): Promise<DashboardData> {
    const response = await fetch(`${API_BASE_URL}/facilities/${facilityId}/dashboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
    }
    return response.json();
  },
};
