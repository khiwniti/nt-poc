import { create } from 'zustand';
import { dashboardApi, type Facility, type KPIs, type Alert } from '../api/dashboard';

interface DashboardState {
  facility: Facility | null;
  kpis: KPIs | null;
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;

  fetchDashboard: (facilityId: string) => Promise<void>;
  updateKPIs: (kpis: Partial<KPIs>) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (alertId: string) => void;
  reset: () => void;
}

const initialState = {
  facility: null,
  kpis: null,
  alerts: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  ...initialState,

  fetchDashboard: async (facilityId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await dashboardApi.getFacilityDashboard(facilityId);
      set({
        facility: data.facility,
        kpis: data.kpis,
        alerts: data.alerts,
        isLoading: false,
        lastUpdated: data.timestamp,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  updateKPIs: (newKPIs: Partial<KPIs>) => {
    set((state) => ({
      kpis: state.kpis ? { ...state.kpis, ...newKPIs } : (newKPIs as KPIs),
      lastUpdated: new Date().toISOString(),
    }));
  },

  addAlert: (alert: Alert) => {
    set((state) => ({
      alerts: [...state.alerts, alert],
    }));
  },

  removeAlert: (alertId: string) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== alertId),
    }));
  },

  reset: () => {
    set(initialState);
  },
}));
