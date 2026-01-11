import { create } from 'zustand';

export type FacilityStatus = 'active' | 'inactive' | 'maintenance';
export type AlertRange = '0-5' | '6-10' | '10+' | 'none';

export interface FacilityMapFilterState {
  healthStatus: FacilityStatus[];
  alertRange: AlertRange | null;
  regions: string[];
  searchQuery: string;

  setHealthStatus: (status: FacilityStatus[]) => void;
  setAlertRange: (range: AlertRange | null) => void;
  setRegions: (regions: string[]) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  getURLParams: () => URLSearchParams;
  setFromURLParams: (params: URLSearchParams) => void;
}

const initialState = {
  healthStatus: [] as FacilityStatus[],
  alertRange: null,
  regions: [] as string[],
  searchQuery: '',
};

export const useFacilityMapFilterStore = create<FacilityMapFilterState>((set, get) => ({
  ...initialState,

  setHealthStatus: (healthStatus) => set({ healthStatus }),
  setAlertRange: (alertRange) => set({ alertRange }),
  setRegions: (regions) => set({ regions }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  clearFilters: () => set(initialState),

  getURLParams: () => {
    const state = get();
    const params = new URLSearchParams();

    if (state.healthStatus.length > 0) {
      params.set('status', state.healthStatus.join(','));
    }
    if (state.alertRange) {
      params.set('alertRange', state.alertRange);
    }
    if (state.regions.length > 0) {
      params.set('regions', state.regions.join(','));
    }
    if (state.searchQuery) {
      params.set('q', state.searchQuery);
    }

    return params;
  },

  setFromURLParams: (params) => {
    const healthStatus = (params.get('status')?.split(',').filter(Boolean) as FacilityStatus[]) || [];
    const alertRange = (params.get('alertRange') as AlertRange) || null;
    const regions = params.get('regions')?.split(',').filter(Boolean) || [];
    const searchQuery = params.get('q') || '';

    set({ healthStatus, alertRange, regions, searchQuery });
  },
}));
